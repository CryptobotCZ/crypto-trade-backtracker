import { sleep } from "https://deno.land/x/sleep/mod.ts";
import { ApiError, Exchange, TradeData } from "./exchanges.ts";

export type ByBitItemArray = [
  string, // startTime
  string, // openPrice
  string, // highPrice
  string, // lowPrice
  string, // closePrice
  string, // volume
  string, // turnover
];

export interface ByBitResponse {
    "retCode": number,
    "retMsg": string,
    "result": {
        "symbol": string,
        "category": string,
        "list": ByBitItemArray[]
    },
    "retExtInfo": any,
    "time": number,
}

export function getMsInInterval(interval: string) {
    const { length, unit } = getByBitIntervalAndUnit(interval);

    const currentLengthInMs = length * 60 * 1000;

    if (unit === 'm') {
        return currentLengthInMs;
    } else if (unit === 'h') {
        return currentLengthInMs * 60;
    }

    return currentLengthInMs;
}

export function transformArrayToObject(itemArray: ByBitItemArray, interval: string): TradeData {
  const msToAdd = getMsInInterval(interval);

  const openTime = parseInt(itemArray[0]);
  const closeTime = openTime + msToAdd;

  // {
    //   "openTime": 1689179880000,
    //   "open": 1880.93,
    //   "high": 1881.48,
    //   "low": 1880.59,
    //   "close": 1881.4,
    //   "volume": 146.05,
    //   "closeTime": 1689183480000
    // }
  return {
    openTime,
    open: parseFloat(itemArray[1]),
    high: parseFloat(itemArray[2]),
    low: parseFloat(itemArray[3]),
    close: parseFloat(itemArray[4]),
    volume: parseFloat(itemArray[5]),
    closeTime,
  } as TradeData;
}

function getByBitIntervalAndUnit(interval: string) {
    const regex = /(?<length>\d+)(?<unit>\w)/;
    const matches = regex.exec(interval);

    const length = parseInt(matches?.groups?.length ?? '1');
    const unit = matches?.groups?.unit ?? 'm';

    return { length, unit };
}

export function getByBitInterval(interval: string) {
    const { length, unit } = getByBitIntervalAndUnit(interval);

    if (unit === 'm') {
        return length;
    } else if (unit === 'h') {
        return length * 60;
    } else {
        return unit.toUpperCase();
    }
}

export function getCoinName(coin: string) {
    return coin;
}

let isFirstRun = true;

export async function getTradeData(
    pair: string,
    interval: string,
    startTime?: Date | number,
    limit = 1440,
) {
    const time = performance.measure("request");
    const startTimestamp = typeof startTime === "number"
        ? startTime
        : typeof startTime === "object"
            ? startTime?.getTime() ?? Date.now()
            : Date.now();

    // IP rate limit = 120 requests per second
    // better be safe then sorry, use 750ms interval between requests. 
    if (!isFirstRun && time?.duration < 750) {
        console.log(`Interval between requests too low (${time?.duration}), sleeping to prevent flooding the binance API`);
        await sleep(1);
    }

    isFirstRun = false;

    if (limit <= 1000) {
      return await getTradeDataInternal(pair, interval, startTimestamp, limit);
    }

    let remaining = limit;
    const data = [];
    let currentTime = startTimestamp;

    // ByBit allows to get maximally 1000 items in one resultset, 2 requests need to be made for 1 day
    while (remaining > 0) {
      const loadItems = remaining > 1000 ? 1000 : remaining;
      const currentData = await getTradeDataInternal(pair, interval, currentTime, loadItems);
      data.push(currentData);
      remaining -= loadItems;
      currentTime = currentData?.at(-1)?.closeTime ?? 0;

      if (currentTime == 0) {
          break;
      }
    }

    return [ ...data.flat() ] as TradeData[];
}

async function getTradeDataInternal(
  pair: string,
  interval: string,
  startTime?: Date | number,
  limit = 1000,
) {
  const url = "https://api.bybit.com/v5/market/kline";

  const resultStartTime = typeof startTime === "number"
    ? startTime
    : typeof startTime === "object"
      ? (startTime.getTime())
      : null;

  const objWithTime = resultStartTime != null
    ? { start: resultStartTime.toString() }
    : {} as any;
    
  const mappedInterval = getByBitInterval(interval);
  const urlWithParams = url + "?" + new URLSearchParams({
    "symbol": pair,
    "category": "linear",
    "interval": mappedInterval,
    ...(objWithTime),
    "limit": limit,
  });

  const response = await fetch(urlWithParams);

  if (response.status === 429) {
    console.log("Flooding ByBit, have to sleep for a while");
    sleep(60 * 5);
  }

  if (response.status === 403) {
      console.error('Bybit is banning IP, terminating now. Wait at least 30min before running again');
      Deno.exit(403);
  }

  if (response.status !== 200) {
    throw new ApiError(`Invalid status ${response.status} for coin ${pair}`, response.status);
  }

  const json = await response.json() as ByBitResponse;
  return json.result.list
      .map(x => transformArrayToObject(x, interval))
      .toSorted((x, y) => x.openTime - y.openTime);
}

export const ByBitApi: Exchange = {
  exchange: 'bybit',
  api: getTradeData,
  getCoinName: getCoinName,
};
