import { TradeData } from './../src/binance-api.ts';
import { CornixConfiguration, backtrack, Order } from "../src/backtrack.ts";
import { getTrade } from "./_helpers.ts";

const config: CornixConfiguration = {
    amount: 100,
    entries: [ { percentage: 100 } ],
    tps: [
        { percentage: 5 },
        { percentage: 10 }
    ],
    trailingTakeProfit: 1, // 1%
    trailingStop: { type: 'without' }
};

const order: Order = {
    coin: 'INJUSDT',
    leverage: 10,
    exchange: 'Binance Futures',
    entries: [ 100 ],
    tps: [ 110, 120, 130 ],
    sl: 40,
    timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
};

Deno.test(function fullyHitLastTp() {
    const tradeData: TradeData[] = [
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
            open: 100,
            close: 90,
            closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
            high: 100,
            low: 90,
        }),
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 51).getTime(),
            open: 90,
            close: 110,
            closeTime: new Date(2023, 6-1, 15, 16, 51).getTime(),
            high: 110,
            low: 90,
        }),
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 52).getTime(),
            open: 110,
            close: 120,
            closeTime: new Date(2023, 6-1, 15, 16, 52).getTime(),
            high: 120,
            low: 110,
        }),
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 53).getTime(),
            open: 120,
            close: 130,
            closeTime: new Date(2023, 6-1, 15, 16, 53).getTime(),
            high: 130,
            low: 120,
        }),
    ];

    const { events, results } = backtrack(config, order, tradeData);

    events.forEach(x => console.log(x));
    console.log(events);
    console.log(results);

});
