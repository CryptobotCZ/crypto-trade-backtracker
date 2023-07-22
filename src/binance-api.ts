import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";
import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";
import { global } from "./globals.ts";
import { dirname } from "https://deno.land/std@0.192.0/path/mod.ts";

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

export type BinanceItemArray = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export function transformArrayToObject(itemArray: BinanceItemArray): TradeData {
  return {
    openTime: itemArray[0],
    open: parseFloat(itemArray[1]),
    high: parseFloat(itemArray[2]),
    low: parseFloat(itemArray[3]),
    close: parseFloat(itemArray[4]),
    volume: parseFloat(itemArray[5]),
    closeTime: itemArray[6],
    quoteAssetVolume: parseFloat(itemArray[7]),
    numberOfTrades: itemArray[8],
    takerBuyBaseAssetVolume: parseFloat(itemArray[9]),
    takerBuyQuoteAssetVolume: parseFloat(itemArray[10]),
    ignore: itemArray[11],
  };
}

enum TimeInterval {
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
  return global.inputArguments?.cachePath ?? './cache/';
}

function getSingleCacheFilePath(pair: string, interval: string, timestamp: number) {
  const cacheDirectory = getCachePath();
  const fileName = `${pair}_${interval}_${timestamp}.json`;
  const nestedPath = `${interval}/${pair}/${fileName}`;
  const fullPath = `${cacheDirectory}/${nestedPath}`;

  return fullPath;
}

export async function loadDataFromCache(
  pair: string,
  interval: string,
  startTime: Date,
) {
  const dayStart = new Date(startTime.getTime()).setUTCHours(0, 0, 0, 0);
  const fullPath = getSingleCacheFilePath(pair, interval, dayStart);

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
) {
  pair = pair
    .replace("SUSHIUSDT.P", "SUSHIUSDT")
    .replace("SUSHIUSDTPERP", "SUSHIUSDT")
    .replace(".P", "")
    .replace("PERP", "");

  if (pair === "SHIBUSDT") {
    return [];
  }

  pair = pair.replace("/", "");

  const startDate = startTime ?? new Date();
  const dataFromCache = await loadDataFromCache(pair, interval, startDate);

  if (dataFromCache != null) {
    return dataFromCache.length < 1441 ? [] : dataFromCache;
  }

  const dayStart = new Date(startTime.getTime()).setUTCHours(0, 0, 0, 0);
  const tradeData = await getTradeData(pair, interval, startTime);

  if (tradeData.length < 1441) {
    return tradeData;
  }

  const fullPath = getSingleCacheFilePath(pair, interval, dayStart);
  const cacheDir = dirname(fullPath);
  await fs.ensureDir(cacheDir);

  await writeJson(fullPath, tradeData, { spaces: 2 });

  return tradeData;
}

let isFirstRun = true;

export async function getTradeData(
  pair: string,
  interval: string,
  startTime?: Date | number,
  limit = 1441,
) {
  const time = performance.measure("request");

  // default rate limit per IP is 2,400/min
  // costs of 1 file with 1441 records is 10
  // rate limit = 4 requests per second = 1 each 250ms.
  // better be safe then sorry, use 750ms interval between requests. 
  if (!isFirstRun && time?.duration < 750) {
    console.log(`Interval between requests too low (${time?.duration}), sleeping to prevent flooding the binance API`);
    await sleep(1);
  }

  isFirstRun = false;

  const url = "https://fapi.binance.com/fapi/v1/klines";

  const resultStartTime = typeof startTime === "number"
    ? startTime
    : typeof startTime === "object"
    ? (startTime.getTime())
    : null;

  const objWithTime = resultStartTime != null
    ? { startTime: resultStartTime.toString() }
    : {} as any;
  const urlWithParams = url + "?" + new URLSearchParams({
    "symbol": pair,
    "contractType": "PERPETUAL",
    "interval": interval,
    ...(objWithTime),
    "limit": limit,
  });

  const response = await fetch(urlWithParams);

  if (response.status === 429) {
    console.log("Flooding binance, have to sleep for a while");
    sleep(60 * 5);
  }

  if (response.status !== 200) {
    throw new Error(`Invalid status ${response.status} for coin ${pair}`);
  }

  const json = await response.json() as BinanceItemArray[];
  return json.map((x) => transformArrayToObject(x));
}
