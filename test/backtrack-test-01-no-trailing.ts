import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { TradeData } from "../src/exchanges/exchanges.ts";
import { backtrack, Order, TradeResult } from "../src/backtrack-engine.ts";
import { getTrade } from "./_helpers.ts";
import { CornixConfiguration } from "../src/cornix.ts";
import { assertArrayIncludes } from "https://deno.land/std/testing/asserts.ts";

const config: CornixConfiguration = {
  amount: 100,
  entries: [{ percentage: 100 }],
  tps: [
    { percentage: 5 },
    { percentage: 95 },
  ],
  trailingTakeProfit: "without",
  trailingStop: { type: "without" },
};

export function testSingleEntryPointKeepOpenUnrealizedProfit0() {
  const order: Order = {
    coin: "INJUSDT",
    leverage: 10,
    exchange: "Binance Futures",
    entries: [100, 50],
    tps: [110, 150],
    sl: 40,
    date: new Date(2023, 6 - 1, 15, 16 - 1, 50)
  };

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 50).getTime(),
      open: 100,
      close: 110,
      closeTime: new Date(2023, 6 - 1, 15, 16, 50).getTime(),
      high: 130,
      low: 100,
    }),
  ];


  const { events, results, state } = backtrack(config, order, tradeData);
  events.forEach((x) => console.log(x));

  assertArrayIncludes(events, [{
    type: "buy",
    price: 100,
    spent: 100,
    spentWithLeverage: 1000,
    bought: 10,
    timestamp: 1686837000000
  }]);

  assertArrayIncludes(events, [{
    type: "sell",
    price: 110,
    total: 55,
    sold: 0.5,
    timestamp: 1686837000000
  }]);

  const expectedInfo = {
    reachedEntries: 1,
    reachedTps: 1,
    openTime: new Date('2023-06-15T13:50:00.000Z'),
    closeTime: null,
    isClosed: false,
    isCancelled: false,
    isProfitable: true,
    pnl: 5,
    profit: 5,
    hitSl: false,
    averageEntryPrice: 100,
    allocatedAmount: 100,
    spentAmount: 100,
    realizedProfit: 5,
    unrealizedProfit: 0,
    reachedAllEntries: true,
    reachedAllTps: false,
    boughtCoins: 0,
    averageSalePrice: 0,
    soldAmount: 0,
  };

  assertEquals(state.info, expectedInfo);

  console.log(events);
  console.log(results);
}

export function testSingleEntryPointKeepOpenWithUnrealizedProfit() {
  const order: Order = {
    coin: "INJUSDT",
    leverage: 10,
    exchange: "Binance Futures",
    entries: [100, 50],
    tps: [110, 150],
    sl: 40,
    date: new Date('2023-06-15T13:50:00.000Z')
  };

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 50).getTime(),
      open: 100,
      close: 110,
      closeTime: new Date(2023, 6 - 1, 15, 16, 50).getTime(),
      high: 130,
      low: 100,
    }),
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 55).getTime(),
      open: 110,
      close: 115,
      closeTime: new Date(2023, 6 - 1, 15, 16, 55).getTime(),
      high: 115,
      low: 115,
    }),
  ];


  const { events, results, state } = backtrack(config, order, tradeData);
  events.forEach((x) => console.log(x));

  assertArrayIncludes(events, [{
    type: "buy",
    price: 100,
    spent: 100,
    spentWithLeverage: 1000,
    bought: 10,
    timestamp: 1686837000000
  }]);

  assertArrayIncludes(events, [{
    type: "sell",
    price: 110,
    total: 55,
    sold: 0.5,
    timestamp: 1686837000000
  }]);

  const expectedInfo: TradeResult = {
    reachedEntries: 1,
    reachedTps: 1,
    openTime: new Date('2023-06-15T13:50:00.000Z'),
    closeTime: null,
    isClosed: false,
    isCancelled: false,
    isProfitable: true,
    pnl: 100,
    profit: 100,
    hitSl: false,
    averageEntryPrice: 100,
    allocatedAmount: 100,
    spentAmount: 100,
    realizedProfit: 5,
    unrealizedProfit: 95,
    reachedAllEntries: true,
    reachedAllTps: false,
    boughtCoins: 0,
    averageSalePrice: 0,
    soldAmount: 0,
  };

  assertEquals(state.info, expectedInfo);
  assertEquals(state.profitBasedOnSoldCoins, state.profit);

  console.log(events);
  console.log(results);
}


Deno.test('Test Single Entry - Trade still open - Unrealized profit 0', testSingleEntryPointKeepOpenUnrealizedProfit0);
Deno.test('Test Single Entry - Trade still open - With unrealized profit', testSingleEntryPointKeepOpenWithUnrealizedProfit);

export function testSingleEntrySingleTp() {
  const order: Order = {
    coin: "INJUSDT",
    leverage: 10,
    exchange: "Binance Futures",
    entries: [100, 50],
    tps: [120],
    sl: 40,
    date: new Date(2023, 6 - 1, 15, 16 - 1, 50)
  };

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 50).getTime(),
      open: 100,
      close: 110,
      closeTime: new Date(2023, 6 - 1, 15, 16, 50).getTime(),
      high: 130,
      low: 90,
    }),
  ];

  const { events, results, state } = backtrack(config, order, tradeData);

  const expectedInfo: TradeResult = {
    pnl: 200,
    profit: 200,
    realizedProfit: 200,
    unrealizedProfit: 0,
    isProfitable: true,
    isClosed: true,
    isCancelled: false,
    hitSl: false,
    reachedEntries: 1,
    reachedTps: 1,
    allocatedAmount: 100,
    spentAmount: 100,
    averageEntryPrice: 100,
    openTime: new Date('2023-06-15T13:50:00.000Z'),
    closeTime: new Date('2023-06-15T13:50:00.000Z'),
    reachedAllEntries: true,
    reachedAllTps: false,
    boughtCoins: 0,
    averageSalePrice: 0,
    soldAmount: 0,
  };

  assertEquals(state.info, expectedInfo);
}

Deno.test('Test Single Entry Single TP', testSingleEntrySingleTp);

Deno.test(function testSingleEntrySingleTpWithoutLeverage() {
  const order: Order = {
    leverage: 1,
    coin: "INJUSDT",
    exchange: "Binance Futures",
    entries: [100, 50],
    tps: [120],
    sl: 40,
    date: new Date(2023, 6 - 1, 15, 16 - 1, 50)
  };

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date(2023, 6 - 1, 15, 16 - 1, 50).getTime(),
      open: 100,
      close: 110,
      closeTime: new Date(2023, 6 - 1, 15, 16, 50).getTime(),
      high: 130,
      low: 90,
    }),
  ];

  const { events, results, state } = backtrack(config, order, tradeData);

  assertEquals(state.info.pnl, 20);
  assertEquals(state.info.profit, 20);
  assertEquals(state.info.isProfitable, true);
  assertEquals(state.info.isClosed, true);
  assertEquals(state.info.hitSl, false);
  assertEquals(state.info.reachedEntries, 1);
  assertEquals(state.info.reachedTps, 1);
});

Deno.test(function testSingleEntryMultipleTps() {
  const config: CornixConfiguration = {
    amount: 25,
    entries: [{ percentage: 100 }],
    tps: [
      { percentage: 14.27 },
      { percentage: 28.54 },
      { percentage: 57.19 },
    ],
    trailingTakeProfit: 0.4,
    trailingStop: {
      type: "moving-target",
      trigger: 1,
    },
  };

  const tradeOpenTime = new Date(2023, 7 - 1, 11, 17 - 1, 15);
  const order: Order = {
    coin: "DOTUSDT",
    exchange: "Binance Futures",
    entries: [5.161],
    leverage: 20,
    tps: [5.235, 5.295, 5.419],
    sl: 4.980,
    date: tradeOpenTime
  };

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date(2023, 7 - 1, 11, 17 - 1, 16).getTime(),
      open: 5.161,
      close: 5.161,
      closeTime: new Date(2023, 7 - 1, 11, 17 - 1, 16).getTime(),
      high: 5.161,
      low: 5.161,
    }),
    getTrade({
      openTime: new Date(2023, 7 - 1, 12, 2 - 1, 24).getTime(),
      open: 5.238,
      close: 5.235,
      closeTime: new Date(2023, 7 - 1, 12, 2 - 1, 24).getTime(),
      high: 5.238,
      low: 5.235,
    }),
    getTrade({
      openTime: new Date(2023, 7 - 1, 12, 5 - 1, 3).getTime(),
      open: 5.295,
      close: 5.295,
      closeTime: new Date(2023, 7 - 1, 12, 5 - 1, 3).getTime(),
      high: 5.295,
      low: 5.295,
    }),
    getTrade({
      openTime: new Date(2023, 7 - 1, 12, 6 - 1, 8).getTime(),
      open: 5.233,
      close: 5.233,
      closeTime: new Date(2023, 7 - 1, 12, 6 - 1, 8).getTime(),
      high: 5.233,
      low: 5.233,
    }),
  ];

  const { events, results, state } = backtrack(config, order, tradeData);

  assertEquals(state.info.pnl, 35.312536330168996);
  assertEquals(state.info.profit, 8.828134082542249);
  assertEquals(state.info.isProfitable, true);
  assertEquals(state.info.isClosed, true);
  assertEquals(state.info.hitSl, true);
  assertEquals(state.info.reachedEntries, 1);
  assertEquals(state.info.reachedTps, 2);
});
