import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";
import { writeJson } from "https://deno.land/x/jsonfile@1.0.0/write_json.ts";
import { exportCsv } from "../output/csv.ts";

import {
  AbstractState,
  backtrack,
  getBackTrackEngine,
  Order,
  TradeResult,
} from "../backtrack-engine.ts";
import {
  BinanceItemArray,
  getTradeDataWithCache,
  TradeData,
  transformArrayToObject,
} from "../binance-api.ts";
import { CornixConfiguration } from "../cornix.ts";

export interface PreBacktrackedData {
  order: Order;
  info: any;
  sortedUniqueCrosses: any[];
  tradeData: TradeData[];
}

export interface BackTrackArgs {
  orderFiles: string[];
  cornixConfigFile: string;
  candlesFiles?: string[];
  downloadBinanceData?: boolean;
  debug?: boolean;
  verbose?: boolean;
  detailedLog?: boolean;
  fromDetailedLog?: boolean;
  fromDate?: string;
  toDate?: string;
  finishRunning?: boolean;
  outputPath?: string;
  anonymize?: boolean;
  locale?: string;
  delimiter?: string;
  cachePath?: string;
}

async function getFileContent<T>(path: string): Promise<T> {
  const isReadableFile = await fs.exists(path, {
    isReadable: true,
    isFile: true,
  });

  if (!isReadableFile) {
    throw new Error(`Invalid file ${path}`);
  }

  const fileContent = await Deno.readTextFile(path);
  const fixedFileContent = fileContent
    ?.replace(/\n/g, " ")
    ?.replace(/\r/g, " ")
    ?.replace(/\t/g, " ") ?? "";
  return JSON.parse(fixedFileContent) as T;
}

export async function readInputFilesFromJson<T>(
  inputPaths: string[],
): Promise<T[]> {
  let messages: T[] = [];

  for (const path of inputPaths) {
    const isReadableDir = await fs.exists(path, {
      isReadable: true,
      isDirectory: true,
    });

    const isReadableFile = await fs.exists(path, {
      isReadable: true,
      isFile: true,
    });

    if (isReadableDir) {
      const directory = path;
      for await (const dirEntry of Deno.readDir(directory)) {
        if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
          const messagesFromFile = await getFileContent<T[]>(
            `${directory}/${dirEntry.name}`,
          );
          messages = [...messages, ...messagesFromFile];
        }
      }
    } else if (isReadableFile) {
      const messagesFromFile = await getFileContent<T[]>(path);
      messages = [...messages, ...messagesFromFile];
    } else {
      console.error(`Could not read file ${path}`);
    }
  }

  return messages;
}

export const defaultCornixConfig: CornixConfiguration = {
  amount: 100,
  entries: "One Target",
  tps: "Evenly Divided",
  trailingStop: { type: "moving-target", trigger: 1 },
  trailingTakeProfit: 0.02,
};

export async function backtrackCommand(args: BackTrackArgs) {
  if (args.debug) {
    console.log("Arguments: ");
    console.log(JSON.stringify(args));
  }

  const cornixConfig = args.cornixConfigFile != null
    ? await getFileContent<CornixConfiguration>(args.cornixConfigFile)
    : defaultCornixConfig;

  const getInput = async () => {
    const rawData = args.fromDetailedLog
      ? await readInputFilesFromJson<PreBacktrackedData>(args.orderFiles)
      : (await readInputFilesFromJson<Order>(args.orderFiles)).map((x) => ({
        order: x,
        tradeData: null,
      }));

    return rawData.map((x) => {
      const events = x.order?.events?.map(event => ({
        ...event,
        date: new Date(event.date),
      })) ?? [];

      return {
        ...x,
        order: {
          ...x.order,
          direction: x.order.direction?.toUpperCase(),
          date: x.order.date != null
            ? new Date(x.order.date)
            : new Date(Date.now()),
          events,
        },
      };
    });
  };

  const rawData = await getInput();
  let orders = rawData.map((x) => x.order);

  const tradesForOrders = (rawData as any[]).reduce(
    (map: Map<Order, PreBacktrackedData>, orderData: PreBacktrackedData) => {
      return map.set(orderData.order, orderData);
    },
    new Map(),
  ) as Map<Order, PreBacktrackedData>;

  if (args.fromDate) {
    const from = new Date(parseInt(args.fromDate));
    orders = orders.filter((x) => x.date >= from);
  }

  if (args.toDate) {
    const to = new Date(parseInt(args.toDate));
    orders = orders.filter((x) => x.date <= to);
  }

  let count = 0;
  const ordersWithResults = [];

  for (const order of orders) {
    try {
      console.log(
        `Backtracking trade ${order.coin} ${order.direction} ${order.date}`,
      );

      if (args.debug) {
        console.log(JSON.stringify(order));
      }

      performance.mark("backtrack_start");

      let result = null;

      if (args.downloadBinanceData) {
        result = await backtrackWithBinanceUntilTradeCloseOrCurrentDate(
          args,
          order,
          cornixConfig,
        );
      } else {
        const tradeData = tradesForOrders.get(order)?.tradeData ?? undefined;
        result = await backTrackSingleOrder(
          args,
          order,
          cornixConfig,
          tradeData,
        );
      }

      performance.mark("backtrack_end");
      const time = performance.measure(
        "backtracking",
        "backtrack_start",
        "backtrack_end",
      );

      if (args.debug) {
        console.log(`It took ${time.duration}ms`);
      }

      if (args.debug) {
        const eventsWithoutCross = result.events
            .filter(x => x.type !== 'cross')
            .filter(x => x.level !== 'verbose' || args.verbose)
            .map(x => ({...x, date: new Date(x.timestamp)}));
        eventsWithoutCross.forEach((event) => console.log(JSON.stringify(event)));
      }

      const results = result?.state?.info;

      console.log(`Open time: ${results.openTime}`);
      console.log(`Close time: ${results.closeTime}`);
      console.log(`Is closed: ${results.isClosed}`);
      console.log(`Is cancelled: ${results.isCancelled}`);
      console.log(`Is profitable: ${results.isProfitable}`);
      console.log(`PnL: ${results.pnl?.toFixed(2)}%`);
      console.log(`Profit: ${results.profit?.toFixed(2)}`);
      console.log(`Hit SL: ${results.hitSl}`);
      console.log(
        `Average entry price: ${results.averageEntryPrice.toFixed(6)}`,
      );
      console.log("---------------------------------------");

      //      console.log(JSON.stringify(results));

      let sortedUniqueCrosses: any[] = [];

      if (args.detailedLog) {
        const crosses = result?.events?.filter((x) => x.type === "cross") ?? [];
        const uniqueCrosses: { [key: string]: any } = {};

        crosses.forEach((cross, idx) => {
          const crossType = cross.subtype.indexOf("trailing") === -1
            ? cross.subtype
            : `${cross.subtype}-${idx}`;
          const key = `${crossType}-${cross.id ?? 0}-${cross.direction}`;
          if (!Object.hasOwn(uniqueCrosses, key)) {
            uniqueCrosses[key] = cross;
          }
        });

        sortedUniqueCrosses = Object.keys(uniqueCrosses)
          .map((x) => uniqueCrosses[x])
          .toSorted((a, b) => a.timestamp - b.timestamp)
          .map(x => ({
            ...x,
            date: new Date(x.timestamp)
          }));
      }

      if (result != null) {
        ordersWithResults.push({
          order,
          info: result.state.info,
          sortedUniqueCrosses: sortedUniqueCrosses.map((x) => {
            const cloneOfX = { ...x };
            delete cloneOfX.tradeData;

            return cloneOfX;
          }),
          events: result.events.filter(x => x.level !== 'verbose'),
          tradeData: sortedUniqueCrosses.map((x) => x.tradeData),
        });
      }
    } catch (error) {
      console.error(error);
    }

    count++;

    if (args.debug) {
      console.log(
        `Progress: ${count} / ${orders.length} = ${
          (count / orders.length * 100).toFixed(2)
        }%`,
      );
    }
  }

  const summary = ordersWithResults.reduce((sum, curr) => {
    sum.countOrders++;

    const pnlValue = curr.info.pnl ?? 0;
    const pnl = isNaN(pnlValue) ? 0 : pnlValue;

    sum.totalPnl += pnl;
    sum.positivePnl += curr.info.isProfitable ? pnl : 0;
    sum.negativePnl += curr.info.isProfitable ? 0 : pnl;

    sum.countProfitable += curr.info.isProfitable ? 1 : 0;
    sum.countSL += (curr.info.hitSl && !curr.info.isProfitable) ? 1 : 0;
    sum.countSlAfterTp += (curr.info.hitSl && curr.info.isProfitable) ? 1 : 0;
    sum.countCancelled += curr.info.isCancelled ? 1 : 0;
    sum.countCancelledProfitable += (curr.info.isCancelled && curr.info.isProfitable) ? 1 : 0;
    sum.countCancelledInLoss += (curr.info.isCancelled && !curr.info.isProfitable) ? 1 : 0;
    sum.totalReachedTps += curr.info.reachedTps;

    sum.averageReachedTps = sum.totalReachedTps / sum.countOrders;
    sum.averagePnl = sum.totalPnl / sum.countOrders;

    sum.pctSl = sum.countSL / sum.countOrders;

    return sum;
  }, {
    countOrders: 0,
    countProfitable: 0,
    countSL: 0,
    countCancelled: 0,
    countCancelledProfitable: 0,
    countCancelledInLoss: 0,
    countSlAfterTp: 0,
    countFullTp: 0,
    totalPnl: 0,
    averagePnl: 0,
    positivePnl: 0,
    negativePnl: 0,
    totalReachedTps: 0,
    averageReachedTps: 0,
    pctSl: 0,
  });

  console.log("----------- Summary results -----------");
  console.log(`Count orders: ${summary.countOrders}`);
  console.log(`Count Profitable: ${summary.countProfitable}`);
  console.log(`Count SL: ${summary.countSL}`);
  console.log(`Count SL after TP: ${summary.countSlAfterTp}`);
  console.log(`Count Cancelled: ${summary.countCancelled}`);
  console.log(`Count Cancelled profitable: ${summary.countCancelledProfitable}`);
  console.log(`Count Cancelled in loss: ${summary.countCancelledInLoss}`);
  console.log(`Count hit all TPs: ${summary.countFullTp}`);
  console.log(`Total PnL: ${summary.totalPnl.toFixed(2)}%`);
  console.log(`PnL of profitable trades: ${summary.positivePnl.toFixed(2)}`);
  console.log(`PnL of SL trades: ${summary.negativePnl.toFixed(2)}`);
  console.log(
    `Average number of reached TPs: ${summary.averageReachedTps.toFixed(2)}`,
  );
  console.log(`Percentage of SL: ${summary.pctSl.toFixed(2)}`);

  if (args.detailedLog) {
    const fileName = args.outputPath ?? `backtrack-results-${Date.now()}.json`;
    await writeJson(fileName, ordersWithResults, { spaces: 2 });
  } else if (args.outputPath?.indexOf(".csv") !== -1) {
    const fileName = args.outputPath ?? `backtrack-results-${Date.now()}.csv`;
    await exportCsv(ordersWithResults, fileName, args.anonymize, {
      delimiter: args.delimiter,
      locale: args.locale,
    });
  } else if (args.outputPath?.indexOf(".json") !== -1) {
    const fileName = args.outputPath ?? `backtrack-results-${Date.now()}.json`;
    await writeJson(fileName, ordersWithResults, { spaces: 2 });
  }
}

interface BackTrackResult {
  events: any[];
  state: AbstractState;
}

export interface DetailedBackTrackResult {
  order: Order;
  info: TradeResult;
  sortedUniqueCrosses: any[];
  tradeData?: TradeData[];
}

async function backTrackSingleOrder(
  args: BackTrackArgs,
  order: Order,
  cornixConfig: CornixConfiguration,
  tradeData?: TradeData[],
): Promise<BackTrackResult> {
  if (tradeData == null && args.candlesFiles) {
    const binanceRawData = await readInputFilesFromJson<BinanceItemArray>(
      args.candlesFiles!,
    );
    tradeData = binanceRawData.map((x) => transformArrayToObject(x));
  } else if (tradeData == null && (args.downloadBinanceData ?? true)) {
    tradeData = await getTradeDataWithCache(order.coin, "1m", order.date);
  } else if (tradeData == null) {
    throw new Error(
      "Either specify --candlesFiles or use --downloadBinanceData or use --fromDetailedLog",
    );
  }

  const { events, state } = await backtrack(
    cornixConfig,
    order,
    tradeData,
  );

  return { state, events };
}

async function backtrackWithBinanceUntilTradeCloseOrCurrentDate(
  args: BackTrackArgs,
  order: Order,
  cornixConfig: CornixConfiguration,
): Promise<BackTrackResult> {
  // always get full day data
  let currentDate = new Date(
    new Date(order.date.getTime()).setUTCHours(0, 0, 0, 0),
  );
  let { state, events } = getBackTrackEngine(cornixConfig, order, {
    detailedLog: args.detailedLog,
  });

  do {
    const currentTradeData = await getTradeDataWithCache(
      order.coin,
      "1m",
      currentDate,
    );

    if (currentTradeData.length === 0) {
      break;
    }

    for (const tradeEntry of currentTradeData) {
      let previousState = state;

      do {
        previousState = state;
        state = state.updateState(tradeEntry);
      } while (state != previousState);

      if (state.isClosed) {
        break;
      }
    }

    if (state.isClosed) {
      break;
    }

    currentDate = new Date(currentTradeData.at(-1)?.closeTime!);
  } while (true);

  return { state, events };
}
