import { assertEquals } from 'https://deno.land/std@0.188.0/testing/asserts.ts';
import { TradeData } from './../src/binance-api.ts';
import { CornixConfiguration, backtrack, Order } from "../src/backtrack.ts";
import { getTrade } from "./_helpers.ts";

const config: CornixConfiguration = {
    amount: 100,
    entries: [ { percentage: 100 } ],
    tps: [
        { percentage: 5 },
        { percentage: 95 }
    ],
    trailingTakeProfit: 'without',
    trailingStop: { type: 'without' }
};

Deno.test(function testSingleEntryPointKeepOpen() {
    const order: Order = {
        coin: 'INJUSDT',
        leverage: 10,
        exchange: 'Binance Futures',
        entries: [ 100, 50 ],
        tps: [ 110, 120, 130 ],
        sl: 40,
        date: new Date(2023, 6-1, 15, 16-1, 50),
        timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
    };

    const tradeData: TradeData[] = [
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
            open: 100,
            close: 110,
            closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
            high: 130,
            low: 90,
        }),
    ];

    const { events, results, state } = backtrack(config, order, tradeData);

    events.forEach(x => console.log(x));
    console.log(events);
    console.log(results);
});


Deno.test(function testSingleEntrySingleTp() {
    const order: Order = {
        coin: 'INJUSDT',
        leverage: 10,
        exchange: 'Binance Futures',
        entries: [ 100, 50 ],
        tps: [ 120 ],
        sl: 40,
        date: new Date(2023, 6-1, 15, 16-1, 50),
        timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
    };

    const tradeData: TradeData[] = [
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
            open: 100,
            close: 110,
            closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
            high: 130,
            low: 90,
        }),
    ];

    const { events, results, state } = backtrack(config, order, tradeData);

    assertEquals(state.info.pnl, 200, );
    assertEquals(state.info.profit, 200);
    assertEquals(state.info.isProfitable, true);
    assertEquals(state.info.isClosed, true);
    assertEquals(state.info.hitSl, false);
    assertEquals(state.info.reachedEntries, 1);
    assertEquals(state.info.reachedTps, 1);
});

Deno.test(function testSingleEntrySingleTpWithoutLeverage() {
    const order: Order = {
        coin: 'INJUSDT',
        exchange: 'Binance Futures',
        entries: [ 100, 50 ],
        tps: [ 120 ],
        sl: 40,
        date: new Date(2023, 6-1, 15, 16-1, 50),
        timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
    };

    const tradeData: TradeData[] = [
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
            open: 100,
            close: 110,
            closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
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
        entries: [ { percentage: 100 } ],
        tps: [
            { percentage: 14.27 },
            { percentage: 28.54 },
            { percentage: 57.19 }
        ],
        trailingTakeProfit: 0.4,
        trailingStop: {
            type: 'moving-target',
            trigger: 1
        }
    };

    const tradeOpenTime = new Date(2023, 7-1, 11, 17-1, 15);
    const order: Order = {
        coin: 'DOTUSDT',
        exchange: 'Binance Futures',
        entries: [ 5.161 ],
        leverage: 20,
        tps: [ 5.235, 5.295, 5.419 ],
        sl: 4.980,
        date: tradeOpenTime,
        timestamp: tradeOpenTime.getTime(),
    };

    const tradeData: TradeData[] = [
        getTrade({
            openTime: new Date(2023, 7-1, 11, 17-1, 16).getTime(),
            open: 5.161,
            close: 5.161,
            closeTime: new Date(2023, 7-1, 11, 17-1, 16).getTime(),
            high: 5.161,
            low: 5.161,
        }),
        getTrade({
            openTime: new Date(2023, 7-1, 12, 2-1, 24).getTime(),
            open: 5.238,
            close: 5.235,
            closeTime: new Date(2023, 7-1, 12, 2-1, 24).getTime(),
            high: 5.238,
            low: 5.235,
        }),
        getTrade({
            openTime: new Date(2023, 7-1, 12, 5-1, 3).getTime(),
            open: 5.295,
            close: 5.295,
            closeTime: new Date(2023, 7-1, 12, 5-1, 3).getTime(),
            high: 5.295,
            low: 5.295,
        }),
        getTrade({
            openTime: new Date(2023, 7-1, 12, 6-1, 8).getTime(),
            open: 5.233,
            close: 5.233,
            closeTime: new Date(2023, 7-1, 12, 6-1, 8).getTime(),
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
