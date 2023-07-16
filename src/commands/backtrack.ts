import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";

import { backtrack, getBackTrackEngine, Order } from "../backtrack-engine.ts";
import {
  BinanceItemArray,
  getTradeDataWithCache,
  TradeData,
  transformArrayToObject,
} from "../binance-api.ts";
import { CornixConfiguration } from "../cornix.ts";
import { writeJson } from "https://deno.land/x/jsonfile@1.0.0/write_json.ts";

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
  detailedLog?: boolean;
  fromDetailedLog?: boolean;
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
  return JSON.parse(fileContent) as T;
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
    }

    if (isReadableFile) {
      const messagesFromFile = await getFileContent<T[]>(path);
      messages = [...messages, ...messagesFromFile];
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

  let rawData = args.fromDetailedLog
    ? await readInputFilesFromJson<PreBacktrackedData>(args.orderFiles)
    : (await readInputFilesFromJson<Order>(args.orderFiles)).map((x) => ({
      order: x,
      tradeData: null,
    }));

  const orders = rawData.map((x) => {
    const order = x.order;
    return {
      ...order,
      date: order.date != null ? new Date(order.date) : new Date(Date.now()),
    };
  });

  const tradeData = rawData.flatMap((x) => x.tradeData);

  let count = 0;
  const ordersWithResults = [];

  for (const order of orders) {
    try {
      let result = null;

      if (args.downloadBinanceData) {
        result = await backtrackWithBinanceUntilTradeCloseOrCurrentDate(
          args,
          order,
          cornixConfig,
        );
      } else {
        result = await backTrackSingleOrder(
          args,
          order,
          cornixConfig,
          tradeData,
        );
      }

      if (result != null) {
        ordersWithResults.push({
          order,
          info: result.state.info,
          sortedUniqueCrosses: result.sortedUniqueCrosses.map((x) => {
            const cloneOfX = { ...x };
            delete cloneOfX.tradeData;

            return cloneOfX;
          }),
          tradeData: result.sortedUniqueCrosses.map((x) => x.tradeData),
        });
      }
    } catch (error) {
      console.error(error);
    }

    count++;
    console.trace(
      `Progress: ${count} / ${orders.length} = ${
        (count / orders.length * 100).toFixed(2)
      }%`,
    );
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
    sum.totalReachedTps += curr.info.reachedTps;

    sum.averageReachedTps = sum.totalReachedTps / sum.countOrders;
    sum.averagePnl = sum.totalPnl / sum.countOrders;

    sum.pctSl = sum.countSL / sum.countOrders;

    return sum;
  }, {
    countOrders: 0,
    countProfitable: 0,
    countSL: 0,
    countFullTp: 0,
    totalPnl: 0,
    averagePnl: 0,
    positivePnl: 0,
    negativePnl: 0,
    totalReachedTps: 0,
    averageReachedTps: 0,
    pctSl: 0,
  });

  console.log(JSON.stringify(summary));

  if (args.detailedLog) {
    await writeJson(`complex-analysis.json`, ordersWithResults, { spaces: 2 });
  }
}

async function backTrackSingleOrder(
  args: BackTrackArgs,
  order: Order,
  cornixConfig: CornixConfiguration,
  tradeData?: TradeData[],
) {
  if (args.candlesFiles) {
    const binanceRawData = await readInputFilesFromJson<BinanceItemArray>(
      args.candlesFiles!,
    );
    tradeData = binanceRawData.map((x) => transformArrayToObject(x));
  } else if ((args.downloadBinanceData ?? true)) {
    tradeData = await getTradeDataWithCache(order.coin, "1m", order.date);
  } else if (tradeData == null) {
    throw new Error(
      "Either specify --candlesFiles or use --downloadBinanceData or use --fromDetailedLog",
    );
  }

  if (args.debug) {
    console.log(`Backtracking coin ${order.coin}: `);
    console.log(JSON.stringify(order));
  }

  const { events, results, state } = await backtrack(
    cornixConfig,
    order,
    tradeData,
  );
  if (args.debug) {
    events.forEach((event) => console.log(JSON.stringify(event)));
  }

  console.log(`Results for coin ${order.coin}: `);
  console.log(JSON.stringify(results));

  const crosses = events.filter((x) => x.type === "cross");
  const uniqueCrosses = {};

  crosses.forEach((cross) => {
    const key = `${cross.subtype}-${cross.id ?? 0}-${cross.direction}`;
    if (!Object.hasOwn(uniqueCrosses, key)) {
      uniqueCrosses[key] = cross;
    }
  });

  const sortedUniqueCrosses = Object.keys(uniqueCrosses).map((x) =>
    uniqueCrosses[x]
  ).toSorted((a, b) => a.timestamp - b.timestamp);

  return { state, events, sortedUniqueCrosses };
}

async function backtrackWithBinanceUntilTradeCloseOrCurrentDate(
  args: BackTrackArgs,
  order: Order,
  cornixConfig: CornixConfiguration,
) {
  if (args.debug) {
    console.log(`Backtracking coin ${order.coin}: `);
    console.log(JSON.stringify(order));
  }

  // always get full day data
  let currentDate = new Date(order.date.setUTCHours(0, 0, 0, 0));
  let { state, events } = getBackTrackEngine(cornixConfig, order, {
    detailedLog: args.detailedLog,
  });

  performance.mark("backtrack_start");

  do {
    const currentTradeData = await getTradeDataWithCache(
      order.coin,
      "1m",
      currentDate,
    );

    if (currentTradeData.length === 0) {
      break;
    }

    for (let tradeEntry of currentTradeData) {
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

  performance.mark("backtrack_end");
  const time = performance.measure(
    "backtracking",
    "backtrack_start",
    "backtrack_end",
  );
  console.trace(`It took ${time.duration}ms`);

  const results = state.info;
  console.log(`Results for coin ${order.coin}: `);
  console.log(JSON.stringify(results));

  if (args.detailedLog) {
    const crosses = events.filter((x) => x.type === "cross");
    const uniqueCrosses = {};

    crosses.forEach((cross) => {
      const key = `${cross.subtype}-${cross.id ?? 0}-${cross.direction}`;
      if (!Object.hasOwn(uniqueCrosses, key)) {
        uniqueCrosses[key] = cross;
      }
    });

    const sortedUniqueCrosses = Object.keys(uniqueCrosses).map((x) =>
      uniqueCrosses[x]
    ).toSorted((a, b) => a.timestamp - b.timestamp);

    return { state, events, sortedUniqueCrosses };
  }

  return { state, events, sortedUniqueCrosses: [] };
}
