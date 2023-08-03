import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";
import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";
import { dirname } from "https://deno.land/std@0.192.0/path/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import { global } from "../globals.ts";
import { BinanceApi } from "./binance-api.ts";
import { ByBitApi } from "./bybit-api.ts";

export interface Exchange {
  /**
   * Name of the exchange
   */
  exchange: string;

  /**
   * Api to get trade data
   * @param pair
   * @param interval
   * @param startTime
   * @param limit
   */
  api: (
      pair: string,
      interval: string,
      startTime?: Date | number,
      limit?: number,
  ) => Promise<TradeData[]>;

  /**
   * Gets coin name used on given exchange
   * @param name
   */
  getCoinName: (name: string) => string;
}

export interface TradeData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
  ignore: string;
}

export enum TimeInterval {
  mins1 = "1m",
  mins3 = "3m",
  mins5 = "5m",
  mins15 = "15m",
  mins30 = "30m",
  hours1 = "1h",
  hours2 = "2h",
  hours4 = "4h",
  hours6 = "6h",
  hours8 = "8h",
  hours12 = "12h",
  days1 = "1d",
  days3 = "3d",
  weeks1 = "1w",
  months1 = "1M",
}

function getCachePath() {
  return global.inputArguments?.cachePath ?? './cache';
}

function getSingleCacheFilePath(pair: string, exchange: string, interval: string, timestamp: number) {
  const cacheDirectory = getCachePath();
  const fileName = `${pair}_${interval}_${timestamp}.json`;
  const nestedPath = `${exchange}/${interval}/${pair}/${fileName}`;
  const fullPath = `${cacheDirectory}/${nestedPath}`;

  return fullPath;
}

export async function loadDataFromCache(
  pair: string,
  exchange: string,
  interval: string,
  startTime: Date,
) {
  const dayStart = new Date(startTime.getTime()).setUTCHours(0, 0, 0, 0);
  const fullPath = getSingleCacheFilePath(pair, exchange, interval, dayStart);

  const isReadableFile = await fs.exists(fullPath, {
    isReadable: true,
    isFile: true,
  });

  if (!isReadableFile) {
    return null;
  }

  const data = await Deno.readTextFile(fullPath);
  return JSON.parse(data) as TradeData[];
}

export async function getTradeDataWithCache(
  pair: string,
  interval: string,
  startTime?: Date,
  exchange = 'binance'
) {
  exchange ??= 'binance';
  const selectedExchange = getExchange(exchange);
  pair = selectedExchange.getCoinName(pair);

  const startDate = startTime ?? new Date();
  const dataFromCache = await loadDataFromCache(pair, exchange, interval, startDate);

  if (dataFromCache != null) {
    return dataFromCache.length < 1441 ? [] : dataFromCache;
  }

  const dayStart = new Date(startDate.getTime()).setUTCHours(0, 0, 0, 0);
  const tradeData = await getTradeData(pair, exchange, interval, startTime);

  if (tradeData.length < 1441) {
    return tradeData;
  }

  const fullPath = path.resolve(getSingleCacheFilePath(pair, exchange, interval, dayStart));
  const cacheDir = dirname(fullPath);
  await fs.ensureDir(cacheDir);

  await writeJson(fullPath, tradeData, { spaces: 2 });

  return tradeData;
}

export async function getTradeData(
  pair: string,
  exchange: string,
  interval: string,
  startTime?: Date | number,
  limit = 1441,
) {
  const selectedExchange = getExchange(exchange);
  const getTradeData = selectedExchange.api;
  return await getTradeData(pair, interval, startTime, limit);
}

function getExchange(exchange: string) {
  const selectedExchange = installedExchanges.find(x => x.exchange === exchange);

  if (selectedExchange == null) {
    throw new Error('Invalid exchange');
  }

  return selectedExchange;
}

export class ApiError extends Error {
  get type() {
    return 'api_error';
  }

  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export const installedExchanges = [
  BinanceApi,
  ByBitApi,
];
