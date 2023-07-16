import { TradeData, transformArrayToObject } from "./../src/binance-api.ts";
import { backtrack, Order } from "../src/backtrack-engine.ts";
import { getTrade } from "./_helpers.ts";
import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { CornixConfiguration } from "../src/cornix.ts";

const config: CornixConfiguration = {
  amount: 100,
  entries: [{ percentage: 100 }],
  tps: [
    { percentage: 50 },
    { percentage: 50 },
  ],
  trailingTakeProfit: 0.1,
  trailingStop: { type: "without" },
};

const date = new Date(2023, 6 - 1, 15, 16 - 1, 50);
const order: Order = {
  coin: "INJUSDT",
  leverage: 10,
  exchange: "Binance Futures",
  entries: [100],
  tps: [110, 120, 130],
  sl: 40,
  date,
  timestamp: date.getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
};

Deno.test(function fullyHitLastTp() {
  const tradeData: TradeData[] = [
    // open trade
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 50).getTime(),
      open: 100,
      close: 90,
      closeTime: new Date(2023, 6 - 1, 15, 16, 50).getTime(),
      high: 100,
      low: 90,
    }),
    // reach TP1
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 51).getTime(),
      open: 90,
      close: 110,
      closeTime: new Date(2023, 6 - 1, 15, 16, 51).getTime(),
      high: 110,
      low: 100,
    }),
    // reach tp2, still go
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 52).getTime(),
      open: 110,
      close: 120,
      closeTime: new Date(2023, 6 - 1, 15, 16, 52).getTime(),
      high: 120,
      low: 110,
    }),
    // reach more then tp2
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 53).getTime(),
      open: 120,
      close: 160,
      closeTime: new Date(2023, 6 - 1, 15, 16, 53).getTime(),
      high: 160,
      low: 120,
    }),
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 54).getTime(),
      open: 160,
      close: 160,
      closeTime: new Date(2023, 6 - 1, 15, 16, 54).getTime(),
      high: 160,
      low: 160,
    }),
    // drop
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 55).getTime(),
      open: 160,
      close: 150,
      closeTime: new Date(2023, 6 - 1, 15, 16, 55).getTime(),
      high: 160,
      low: 150,
    }),
  ];

  const { events, results, state } = backtrack(config, order, tradeData);

  assertEquals(state.state.takeProfits[0].coins, 0);
  assertEquals(state.state.takeProfits[1].coins, 10);

  assertEquals(state.info.pnl, 200);
  assertEquals(state.info.profit, 200);
  assertEquals(state.info.isProfitable, true);
  assertEquals(state.info.isClosed, true);
  assertEquals(state.info.hitSl, false);
  assertEquals(state.info.reachedEntries, 1);
  assertEquals(state.info.reachedTps, 2);
});

Deno.test(async function testBtcTrailing() {
  const text = `Client: Binance Futures - Binance Master

    ⚡️⚡️ BTC/USDT ⚡️⚡️
    Exchange: Binance Futures
    Trade Type: Regular (Long)
    Leverage: Cross (125.0X)

    Entry Orders:
    1) 30284.7 (Grace: 1.4%) - 100.0% (1090.2483 USDT) ✅

    Take-Profit Orders:
    1) 30736.9 - 16.666%
    2) 31039.8 - 16.666%
    3) 31342.6 - 16.666%
    4) 31796.8 - 16.666%
    5) 32099.7 - 16.666%
    6) 32553.9 - 16.666%

    Stop-loss Orders:
    1) 28500 - 100.0%

    Trailing Configuration:
    Take-Profit: Percentage (0.2%)
    Stop: Moving Target -
      Trigger: Target (1)`;

  const config: CornixConfiguration = {
    amount: 9.64,
    entries: [{ percentage: 100 }],
    tps: "Evenly Divided",
    trailingTakeProfit: 0.2,
    trailingStop: { type: "moving-target", trigger: 1 },
  };

  const date = new Date(2023, 7 - 1, 9, 19, 25);
  const order: Order = {
    coin: "BTCUSDT",
    leverage: 125,
    exchange: "Binance Futures",
    entries: [30284.7],
    tps: [30736.9, 31039.8, 31342.6, 31796.8, 32099.7, 32553.9],
    sl: 28500,
    date,
    timestamp: date.getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
  };

  const directory = "data";
  let tradeData: any[] = [];

  for await (const dirEntry of Deno.readDir(directory)) {
    if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
      const fileContent = await Deno.readTextFile(
        `${directory}/${dirEntry.name}`,
      );
      const currentFileData = JSON.parse(fileContent);
      tradeData = [...tradeData, ...currentFileData];
    }
  }

  tradeData = tradeData.map((x) => transformArrayToObject(x));
  const { events, results, state } = backtrack(config, order, tradeData);

  console.log(events);
  console.log(state.info);

  assertEquals(state.state.takeProfits[0].coins, 0);
  assertEquals(state.state.takeProfits[1].coins, 10);

  assertEquals(state.info.pnl, 200);
  assertEquals(state.info.profit, 200);
  assertEquals(state.info.isProfitable, true);
  assertEquals(state.info.isClosed, true);
  assertEquals(state.info.hitSl, false);
  assertEquals(state.info.reachedEntries, 1);
  assertEquals(state.info.reachedTps, 2);
});
