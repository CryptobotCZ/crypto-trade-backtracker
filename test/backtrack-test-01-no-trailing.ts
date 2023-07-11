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


Deno.test(testSingleEntrySingleTp);

function testSingleEntrySingleTp() {
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

    events.forEach(x => console.log(x));
    console.log(events);
    console.log(results);
    console.log(state.pnl);
}

testSingleEntrySingleTp();
