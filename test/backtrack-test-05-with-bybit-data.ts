import { assertEquals, assertArrayIncludes } from "../dev_deps.ts";
import { TradeData } from "../src/exchanges/exchanges.ts";
import { backtrack, Order, TradeResult } from "../src/backtrack-engine.ts";
import { getTrade } from "./_helpers.ts";
import { CornixConfiguration } from "../src/cornix.ts";
import {BackTrackArgs, backtrackCommand, runBacktracking} from "../src/commands/backtrack.ts";

const config: CornixConfiguration = {
  amount: 100,
  "entryType": "zone",
  "entryZoneTargets": 11,
  "entries": "Fifty On First Target",
  tps: [
    { percentage: 5 },
    { percentage: 95 },
  ],
  trailingTakeProfit: "without",
  trailingStop: { type: "without" },
};

export async function testBacktrackingWithDownloadingBybitData() {
  const order: Order =   {
    "signalId": "BLZ/USDT:SHORT:0.136",
    "coin": "BLZ/USDT",
    "direction": "SHORT",
    "date": new Date("2023-08-24T18:53:00.000Z"),
    "leverage": 10,
    "exchange": "5-10",
    "entries": [
      0.126,
      0.132
    ],
    "tps": [
      0.124,
      0.121,
      0.118,
      0.115,
      0.111,
      0.106,
      0.1,
      0.095,
      0.09
    ],
    "sl": 0.136,
    "events": []
  }

  const args = {
    downloadExchangeData: true,
    exchange: 'bybit'
  } as Partial<BackTrackArgs> as any as BackTrackArgs;
  const orders = [ order ];
  const tradesMap = new Map();

  const ordersWithResults = await runBacktracking(args, orders, tradesMap, config);

  const outputOrder = ordersWithResults[0].order;
  const info = ordersWithResults[0].info;
  const events = ordersWithResults[0].events;

  //const { order, info, events } = ordersWithResults[0];
  assertArrayIncludes(events, [{
    type: "buy",
    price: 5.228,
    spent: 100,
    spentWithLeverage: 2000,
    bought: 382.5554705432288,
    timestamp: 1690764360000,
  }]);

  assertArrayIncludes(events, [{
    "type": "sl",
    "price": 5.045,
    "total": 1929.9923488905893,
    "sold": 382.5554705432288,
    "timestamp": 1690833540000
  }]);

  const expectedInfo: TradeResult = {
    "reachedEntries": 1,
    "reachedTps": 0,
    "openTime": new Date("2023-07-31T00:45:05.000Z"),
    "closeTime": new Date("2023-07-31T19:59:00.000Z"),
    "isClosed": true,
    "isCancelled": false,
    "isProfitable": false,
    "pnl": -70.00765110941074,
    "profit": -70.00765110941074,
    "hitSl": true,
    "averageEntryPrice": 5.228,
    "allocatedAmount": 100,
    "spentAmount": 100,
    "realizedProfit": -70.00765110941074,
    "unrealizedProfit": 0,
    "reachedAllEntries": true,
    "reachedAllTps": false,
    boughtCoins: 0,
    averageSalePrice: 0,
    soldAmount: 0,
  }

  assertEquals(info, expectedInfo);
}

Deno.test('Test backtracking with downloading ByBit data', testBacktrackingWithDownloadingBybitData);
