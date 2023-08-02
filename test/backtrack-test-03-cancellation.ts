import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { TradeData } from "./../src/binance-api.ts";
import {backtrack, Order, OrderEvent, TradeResult} from "../src/backtrack-engine.ts";
import { getTrade } from "./_helpers.ts";
import { CornixConfiguration } from "../src/cornix.ts";
import { assertArrayIncludes } from "https://deno.land/std/testing/asserts.ts";

const config: CornixConfiguration = {
  amount: 100,
  entries: [{ percentage: 100 }],
  tps: [
    { percentage: 50 },
    { percentage: 50 },
  ],
  trailingTakeProfit: "without",
  trailingStop: { type: "without" },
};

function getOrder(events: OrderEvent[]) {
  return {
    coin: "INJUSDT",
    leverage: 10,
    exchange: "Binance Futures",
    entries: [100, 50],
    tps: [110, 150],
    sl: 40,
    date: new Date("2023-01-01T13:04:30.000Z"),
    events,
  };
}

export function testOrderCancelledInLoss() {
  testOrderCancelledByEventType('cancelled');
}

export function testOrderCancelledInProfit() {
  const order: Order = getOrder([
    {
      type: 'cancelled',
      date: new Date("2023-01-01T13:06:30.000Z")
    }
  ]);

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date("2023-01-01T13:05:00.000Z").getTime(),
      open: 100,
      close: 100,
      closeTime: new Date("2023-01-01T13:06:00.000Z").getTime(),
      high: 100,
      low: 100,
    }),
    getTrade({
      openTime: new Date("2023-01-01T13:06:00.000Z").getTime(),
      open: 101,
      close: 101,
      closeTime: new Date("2023-01-01T13:07:00.000Z").getTime(),
      high: 101,
      low: 101,
    }),
    // this should be last price used
    getTrade({
      openTime: new Date("2023-01-01T13:07:00.000Z").getTime(),
      open: 105,
      close: 105,
      closeTime: new Date("2023-01-01T13:08:00.000Z").getTime(),
      high: 105,
      low: 105,
    }),
    // this should be ignored
    getTrade({
      openTime: new Date("2023-01-01T13:08:00.000Z").getTime(),
      open: 2000,
      close: 2000,
      closeTime: new Date("2023-01-01T13:09:00.000Z").getTime(),
      high: 2000,
      low: 2000,
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
    timestamp: new Date("2023-01-01T13:05:00.000Z").getTime()
  }]);

  assertArrayIncludes(events, [{
    type: "cancelled",
    price: 105,
    total: 1050,
    sold: 10,
    timestamp: new Date("2023-01-01T13:07:00.000Z").getTime()
  }]);

  const expectedInfo = {
    reachedEntries: 1,
    reachedTps: 0,
    openTime: new Date("2023-01-01T13:04:30.000Z"),
    closeTime: new Date("2023-01-01T13:07:00.000Z"),
    isClosed: true,
    isCancelled: true,
    isProfitable: true,
    pnl: 50,
    profit: 50,
    hitSl: false,
    averageEntryPrice: 100,
    allocatedAmount: 100,
    spentAmount: 100,
    realizedProfit: 50,
    unrealizedProfit: 0,
    reachedAllEntries: true,
    reachedAllTps: false,
  };

  assertEquals(state.info, expectedInfo);

  console.log(events);
  console.log(results);
}

Deno.test('Order Cancelled - In loss', testOrderCancelledInLoss);
Deno.test('Order Cancelled - In Profit', testOrderCancelledInProfit);

export function testOrderCancelledByEventType(type: string) {
  const order: Order = getOrder([
    {
      type,
      date: new Date("2023-01-01T13:06:30.000Z")
    }
  ]);

  const tradeData: TradeData[] = [
    getTrade({
      openTime: new Date("2023-01-01T13:05:00.000Z").getTime(),
      open: 100,
      close: 100,
      closeTime: new Date("2023-01-01T13:06:00.000Z").getTime(),
      high: 100,
      low: 100,
    }),
    getTrade({
      openTime: new Date("2023-01-01T13:06:00.000Z").getTime(),
      open: 88,
      close: 88,
      closeTime: new Date("2023-01-01T13:07:00.000Z").getTime(),
      high: 88,
      low: 88,
    }),
    // this should be last one used
    getTrade({
      openTime: new Date("2023-01-01T13:07:00.000Z").getTime(),
      open: 70,
      close: 70,
      closeTime: new Date("2023-01-01T13:08:00.000Z").getTime(),
      high: 70,
      low: 70,
    }),
    // this should be ignored
    getTrade({
      openTime: new Date("2023-01-01T13:08:00.000Z").getTime(),
      open: 700,
      close: 700,
      closeTime: new Date("2023-01-01T13:09:00.000Z").getTime(),
      high: 700,
      low: 700,
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
    timestamp: new Date("2023-01-01T13:05:00.000Z").getTime()
  }]);

  assertArrayIncludes(events, [{
    type: "cancelled",
    price: 70,
    total: 700,
    sold: 10,
    timestamp: new Date("2023-01-01T13:07:00.000Z").getTime()
  }]);

  const expectedInfo = {
    reachedEntries: 1,
    reachedTps: 0,
    openTime: new Date('2023-01-01T13:04:30.000Z'),
    closeTime: new Date("2023-01-01T13:07:00.000Z"),
    isClosed: true,
    isCancelled: true,
    isProfitable: false,
    pnl: -300,
    profit: -300,
    hitSl: false,
    averageEntryPrice: 100,
    allocatedAmount: 100,
    spentAmount: 100,
    realizedProfit: -300,
    unrealizedProfit: 0,
    reachedAllEntries: true,
    reachedAllTps: false,
  };

  assertEquals(state.info, expectedInfo);

  console.log(events);
  console.log(results);
}

Deno.test('Test Order Cancelled by Cancelled event', () => testOrderCancelledByEventType('cancelled'));
Deno.test('Test Order Cancelled by Closed event', () => testOrderCancelledByEventType('close'));
Deno.test('Test Order Cancelled by Opposite signal event', () => testOrderCancelledByEventType('opposite'));
