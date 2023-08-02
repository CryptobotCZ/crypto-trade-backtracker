import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";
import { TradeData } from "./../src/binance-api.ts";
import { backtrack, Order, TradeResult } from "../src/backtrack-engine.ts";
import { getTrade } from "./_helpers.ts";
import { CornixConfiguration } from "../src/cornix.ts";
import { assertArrayIncludes } from "https://deno.land/std/testing/asserts.ts";
import {BackTrackArgs, backtrackCommand, runBacktracking} from "../src/commands/backtrack.ts";

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

export async function testBacktrackingWithDownloadingData() {
    const order: Order =   {
        "signalId": "DOTUSDT:LONG:5.045",
        "coin": "DOTUSDT",
        "direction": "LONG",
        "date": new Date("2023-07-31T00:45:05.000Z"),
        "leverage": 20,
        "exchange": "Cross 20x",
        "entries": [
            5.228
        ],
        "tps": [
            5.306,
            5.369,
            5.489
        ],
        "sl": 5.045,
        "events": []
    }

    const args: Partial<BackTrackArgs> = {
        downloadBinanceData: true,
    };
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

    const expectedInfo = {
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
        "unrealizedProfit": 0
    }

    assertEquals(info, expectedInfo);
}
