import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";

import { backtrack, getBackTrackEngine, Order } from '../backtrack-engine.ts';
import {  BinanceItemArray, getTradeData, TradeData, transformArrayToObject } from '../binance-api.ts';
import { CornixConfiguration } from '../cornix.ts';

export interface BackTrackArgs {
    orderFiles: string[];
    cornixConfigFile: string;
    candlesFiles?: string[];
    downloadBinanceData?: boolean;
    debug?: boolean;
}

async function getFileContent<T>(path: string): Promise<T> {
    const isReadableFile = await fs.exists(path, {
        isReadable: true,
        isFile: true
      });

    if (!isReadableFile) {
        throw new Error(`Invalid file ${path}`);
    }

    const fileContent = await Deno.readTextFile(path);
    return JSON.parse(fileContent) as T;
}

export async function readInputFilesFromJson<T>(inputPaths: string[]): Promise<T[]> {
    let messages: T[] = [];

    for (const path of inputPaths) {
      const isReadableDir = await fs.exists(path, {
        isReadable: true,
        isDirectory: true
      });

      const isReadableFile = await fs.exists(path, {
        isReadable: true,
        isFile: true
      });

      if (isReadableDir) {
        const directory = path;
        for await (const dirEntry of Deno.readDir(directory)) {
          if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
            const messagesFromFile = await getFileContent<T[]>(`${directory}/${dirEntry.name}`);
            messages = [ ...messages, ...messagesFromFile ];
          }
        }
      }

      if (isReadableFile) {
        const messagesFromFile = await getFileContent<T[]>(path);
        messages = [ ...messages, ...messagesFromFile ];
      }
    }

    return messages;
}

export const defaultCornixConfig: CornixConfiguration = {
    amount: 100,
    entries: 'One Target',
    tps: 'Evenly Divided',
    trailingStop: { type: 'moving-target', trigger: 1 },
    trailingTakeProfit: 0.02
};

export async function backtrackCommand(args: BackTrackArgs) {
  if (args.debug) {
    console.log('Arguments: ');
    console.log(JSON.stringify(args));
  }

    const cornixConfig = args.cornixConfigFile != null
        ? await getFileContent<CornixConfiguration>(args.cornixConfigFile)
        : defaultCornixConfig;

    const orders = (await readInputFilesFromJson<Order>(args.orderFiles)).map(x => {
      return { ...x, date: x.date != null ? new Date(x.date) : new Date(Date.now()) };
    });

    orders.forEach(async order => {
      try {
        if (args.downloadBinanceData) {
          await backtrackWithBinanceUntilTradeCloseOrCurrentDate(args, order, cornixConfig);
        } else {
          await backTrackSingleOrder(args, order, cornixConfig);
        }
      } catch (error) {
        console.error(error);
      }
    });
}

async function backTrackSingleOrder(args: BackTrackArgs, order: Order, cornixConfig: CornixConfiguration) {
  let tradeData: TradeData[] = [];

  if (args.candlesFiles) {
    const binanceRawData = await readInputFilesFromJson<BinanceItemArray>(args.candlesFiles!);
    tradeData = binanceRawData.map(x => transformArrayToObject(x));
  } else if((args.downloadBinanceData ?? true)) {
    tradeData = await getTradeData(order.coin, '1m', order.date);
  } else {
    throw new Error('Either specify --candlesFiles or use --downloadBinanceData');
  }

  if (args.debug) {
    console.log(`Backtracking coin ${order.coin}: `);
    console.log(JSON.stringify(order));
  }

  const { events, results } = await backtrack(cornixConfig, order, tradeData);
  if (args.debug) {
    events.forEach(event => console.log(JSON.stringify(event)));
  }

  console.log(`Results for coin ${order.coin}: `);
  console.log(JSON.stringify(results));
}

async function backtrackWithBinanceUntilTradeCloseOrCurrentDate(args: BackTrackArgs, order: Order, cornixConfig: CornixConfiguration) {
  if (args.debug) {
    console.log(`Backtracking coin ${order.coin}: `);
    console.log(JSON.stringify(order));
  }

  let currentDate = order.date;
  let state = getBackTrackEngine(cornixConfig, order);

  do {
    const currentTradeData = await getTradeData(order.coin, '1m', currentDate);

    if (currentTradeData.length === 0) {
      break;
    }

    currentTradeData.forEach(element => {
      let previousState = state;

      do {
        previousState = state;
        state = state.updateState(element);
      } while (state != previousState);
    });

    if (state.isClosed) {
      break;
    }

    currentDate = new Date(currentTradeData.at(-1)?.closeTime!);
  } while(true);

  const results = state.info;
  console.log(`Results for coin ${order.coin}: `);
  console.log(JSON.stringify(results));
}
