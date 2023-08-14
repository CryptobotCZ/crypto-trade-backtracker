import { sleep } from "../../deps.ts";

import { Exchange } from "./exchanges.ts";

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

export function getCoinName(coin: string) {
  coin = coin
      .replace("SUSHIUSDT.P", "SUSHIUSDT")
      .replace("SUSHIUSDTPERP", "SUSHIUSDT")
      .replace(".P", "")
      .replace("PERP", "");

  coin = coin.replace("/", "");

  return coin;
}

let isFirstRun = true;

export async function getTradeData(
  pair: string,
  interval: string,
  startTime?: Date | number,
  limit = 1440,
) {
  if (pair === "SHIBUSDT") {
    return [];
  }

  const time = performance.measure("request");

  // default rate limit per IP is 2,400/min
  // costs of 1 file with 1440 records is 10
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
    throw new BinanceApiError(`Invalid status ${response.status} for coin ${pair}`, response.status);
  }

  const json = await response.json() as BinanceItemArray[];
  return json.map((x) => transformArrayToObject(x));
}

export class BinanceApiError extends Error {
  get type() {
    return 'binance_error';
  }

  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export const BinanceApi: Exchange = {
  exchange: 'binance',
  api: getTradeData,
  getCoinName,
};
