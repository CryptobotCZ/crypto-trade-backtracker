import { assertArrayIncludes } from "https://deno.land/std/testing/asserts.ts";
import {assertEquals} from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {BackTrackArgs, runBacktrackingInAccountMode} from "../src/commands/backtrack.ts";
import {Order, TradeResult} from "../src/backtrack-engine.ts";
import {CornixConfiguration, getOrderAmount} from "../src/cornix.ts";
import {getInput} from "../src/import.ts";
import {AccountInfo, OrderWithResult} from "../src/backtrack-account.ts";

const globalConfig: CornixConfiguration = {
    amount: 100,
    entries: [
        { percentage: 50 },
        { percentage: 25 },
        { percentage: 25 },
        { percentage: 0 },
    ],
    tps: [
        { percentage: 35 },
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 5 },
    ],
    trailingTakeProfit: 0.2,
    trailingStop: { type: "moving-target", trigger: 1 },
};
const args: BackTrackArgs = {
    accountMode: true,
    accountInitialBalance: 2500,
    downloadExchangeData: true,
    exchange: 'bybit',
} as BackTrackArgs as any;

export async function testOrdersInAccountMode() {
    const orders: Order[] = [
        {
            coin: "BNBUSDT",
            leverage: 5,
            direction: "LONG",
            exchange: "ByBit",
            entries: [
                246.5,
                244.33,
                242.17,
                240
            ],
            tps: [
                248,
                250,
                252,
                255,
                260,
                264,
                268,
                270,
            ],
            sl: 230,
            date: new Date("2023-08-01T19:17:00.000Z")
        },
        {
            coin: "BTCUSDT",
            leverage: 35,
            direction: 'SHORT',
            exchange: "ByBit",
            entries: [
                29200,
                29300,
                29400,
                29500
            ],
            tps: [
                29000,
                28800,
                28600,
                28400,
                28200,
                28000,
                27800,
                27500,
            ],
            sl: 30180,
            date: new Date("2023-08-03T01:17:00.000Z")
        },
    ];

    const { account, result, info, ordersWithResults, events }
        = await runBacktrackingInAccountMode(args, orders, globalConfig);

    const bnbTrade = ordersWithResults[0];
    const btcTrade = ordersWithResults[1];

    bnbTrade.events.forEach((x) => console.log(x));
    btcTrade.events.forEach((x) => console.log(x));

    assertArrayIncludes(bnbTrade.events, [{
        type: "buy",
        price: 246.5,
        spent: 50,
        spentWithLeverage: 250,
        bought: 1.0141987829614605,
        timestamp: 1690917420000
    }]);

    assertArrayIncludes(bnbTrade.events, [{
        type: "sell",
        price: 248,
        total: 88.03245436105476,
        sold: 0.35496957403651114,
        timestamp: 1690934520000
    }]);

    assertArrayIncludes(bnbTrade.events, [{
        type: "sl",
        price: 246.5,
        total: 162.50000000000003,
        sold: 0.6592292089249494,
        timestamp: 1690945260000
    }]);

    assertArrayIncludes(btcTrade.events, [{
        type: "buy",
        price: 29200,
        spent: 50,
        spentWithLeverage: 1750,
        bought: 0.059931506849315065,
        timestamp: 1691026500000
    }]);

    assertArrayIncludes(btcTrade.events, [{
        type: "sell",
        price: 29000,
        total: 608.304794520548,
        sold: 0.020976027397260275,
        timestamp: 1691051040000
    }]);

    assertArrayIncludes(btcTrade.events, [{
        type: "sl",
        price: 29200,
        total: 1137.4999999999998,
        sold: 0.03895547945205479,
        timestamp: 1691069940000
    }]);

    const expectedInfo: AccountInfo = {
        "initialBalance": 2500,
        "availableBalance": 2399.9866278585123,
        "balanceInOrders": 104.74103198199485,
        "countActiveOrders": 0,
        "countFinishedOrders": 2,
        "countSkippedOrders": 0,
        "openOrdersProfit": 0,
        "openOrdersUnrealizedProfit": 0,
        "openOrdersRealizedProfit": 4.727659840507187,
        "closedOrdersProfit": 4.727659840507187,
        "largestAccountDrawdownPct": -7.299657534246762,
        "largestAccountGainPct": 25.84246575342513,
        "largestOrderGainPct": 25.84246575342513,
        "largestOrderDrawdownPct": 0,
    };

    assertEquals(info, expectedInfo);
}

Deno.test('Test orders in account mode', testOrdersInAccountMode);

function getOrdersSummary(order: OrderWithResult[]) {
    return order.reduce((summary, x) => {
        summary.pnl += x.info.pnl,
        summary.profit += x.info.profit;
        return summary;
    }, {
        pnl: 0,
        profit: 0,
    });
}

export async function testRealWorldOrdersInAccountMode() {
    const { orders } = await getInput({ orderFiles: [ "../data/account-test-orders.json" ] });
    const config: CornixConfiguration = {
        amount: 25,
        entries: 'Evenly Divided',
        tps: [
            { percentage: 15 },
            { percentage: 30 },
            { percentage: 55 },
        ],
        trailingTakeProfit: 0.2,
        trailingStop: {
            type: 'moving-target',
            trigger: 1,
        }
    } as Partial<CornixConfiguration> as any;

    const { account, result, info, ordersWithResults, events }
        = await runBacktrackingInAccountMode(args, orders, config);

    const ordersSummary = getOrdersSummary(ordersWithResults);
    const dailyStatsSummary = account.dailyStats.reduce((sum, x) => {
        sum.profit += x.realizedProfitPerDay;
        sum.pnl += x.realizedPnlPerDay;

        return sum;
    }, {
        profit: 0,
        pnl: 0,
    });

    const expectedInfo = {
        "initialBalance": 2500,
        "availableBalance": 2585.3790422499105,
        "balanceInOrders": 0,
        "countActiveOrders": 0,
        "countFinishedOrders": 37,
        "countSkippedOrders": 0,
        "openOrdersProfit": 0,
        "openOrdersUnrealizedProfit": 0,
        "openOrdersRealizedProfit": 85.26662087624561,
        "closedOrdersProfit": 85.3790422499105,
        "largestAccountDrawdownPct": -69.95802518488904,
        "largestAccountGainPct": 118.74352331606201,
        "largestOrderDrawdownPct": -69.95802518488904,
        "largestOrderGainPct": 118.74352331606201
    };

    assertEquals(info.closedOrdersProfit, dailyStatsSummary.profit);
    assertEquals(info.closedOrdersProfit, ordersSummary.profit);
    assertEquals(info, expectedInfo);
}

Deno.test('Test real world orders in account mode', testRealWorldOrdersInAccountMode);
