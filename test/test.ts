import { TradeData, getTradeData, transformArrayToObject } from './../src/binance-api.ts';
import { CornixConfiguration, Order, backtrack } from "../src/backtrack.ts";
import { getTrade } from "./_helpers.ts";

const config: CornixConfiguration = {
    amount: 100,
    entries: [ { percentage: 100 } ],
    tps: [
        { percentage: 5 },
        { percentage: 10 },
        { percentage: 15 },
        { percentage: 5 },

        { percentage: 5 },
        { percentage: 5 },
        { percentage: 5 },
        { percentage: 5 },
    ],
    trailingTakeProfit: 0.4,
    trailingStop: {
        type: 'moving-target',
        trigger: 1
    }
};

async function test01() {
    const trade = `📍SIGNAL ID: #1035📍
    COIN: $INJ/USDT (3-5x)
    Direction: LONG📈
    ➖➖➖➖➖➖➖
    Reasoning: Reached mid term support, showing decent buying action on lower time frames

    ENTRY: 5.12 - 5.72
    OTE: 5.47

    TARGETS
    Short Term: 5.82 - 5.93 - 6.07 - 6.20 - 6.35 - 6.60
    Mid Term: 6.95 - 7.30 - 7.70 - 8.10 - 9.00 - 9.97

    STOP LOSS: 4.78`;

    const order = {
        coin: 'INJUSDT',
        exchange: 'Binance Futures',
        entries: [ 5.72, 5.12 ],
        tps: [ 5.82, 5.93, 6.07, 6.20, 6.35, 6.60, 6.95, 7.30, 7.70, 8.10, 9.00, 9.97 ],
        sl: 4.78,
        timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
    };

    const tradeData: TradeData[] = await getTradeData('INJUSDT', '1h' as any, order.timestamp);

    const { events, results } = backtrack(config, order as any, tradeData);

    events.forEach(x => console.log(x));
    console.log(events);
    console.log(results);

}

function test02() {
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
    console.log(state.info);
}

function test03() {
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
}

function test04() {
    const config: CornixConfiguration = {
        amount: 100,
        entries: [ { percentage: 100 } ],
        tps: [
            { percentage: 50 },
            { percentage: 50 }
        ],
        trailingTakeProfit: 10 / 100,
        trailingStop: { type: 'without' }
    };

    const date = new Date(2023, 6-1, 15, 16-1, 50);
    const order: Order = {
        coin: 'INJUSDT',
        leverage: 10,
        exchange: 'Binance Futures',
        entries: [ 100 ],
        tps: [ 110, 120, 130 ],
        sl: 40,
        date,
        timestamp: date.getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
    };

    const tradeData: TradeData[] = [
        // open trade
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
            open: 100,
            close: 90,
            closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
            high: 100,
            low: 90,
        }),
        // reach TP1
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 51).getTime(),
            open: 90,
            close: 110,
            closeTime: new Date(2023, 6-1, 15, 16, 51).getTime(),
            high: 110,
            low: 100,
        }),
        // reach tp2, still go
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 52).getTime(),
            open: 110,
            close: 120,
            closeTime: new Date(2023, 6-1, 15, 16, 52).getTime(),
            high: 120,
            low: 110,
        }),
        // reach more then tp2
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 53).getTime(),
            open: 120,
            close: 160,
            closeTime: new Date(2023, 6-1, 15, 16, 53).getTime(),
            high: 160,
            low: 120,
        }),
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 54).getTime(),
            open: 160,
            close: 160,
            closeTime: new Date(2023, 6-1, 15, 16, 54).getTime(),
            high: 160,
            low: 160,
        }),
        // drop
        getTrade({
            openTime: new Date(2023, 6-1, 15, 16-1, 54).getTime(),
            open: 160,
            close: 150,
            closeTime: new Date(2023, 6-1, 15, 16, 54).getTime(),
            high: 160,
            low: 150,
        }),
    ];

    const { events, results, state } = backtrack(config, order, tradeData);

    console.log(state.info);
}

async function test05() {
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
        entries: [ { percentage: 100 } ],
        tps: 'Evenly Divided',
        trailingTakeProfit: 0.2,
        trailingStop: { type: 'moving-target', trigger: 1 }
    };

    const date = new Date(2023, 7-1, 9, 19, 25);
    const order: Order = {
        coin: 'BTCUSDT',
        leverage: 125,
        exchange: 'Binance Futures',
        entries: [ 30284.7 ],
        tps: [ 30736.9, 31039.8, 31342.6, 31796.8, 32099.7, 32553.9 ],
        sl: 28500,
        date,
        timestamp: date.getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
    };

    const directory = "data";
    let tradeData: any[] = [];

    for await (const dirEntry of Deno.readDir(directory)) {
      if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
        const fileContent = await Deno.readTextFile(`${directory}/${dirEntry.name}`);
        const currentFileData = JSON.parse(fileContent);
        tradeData = [ ...tradeData, ...currentFileData ];
      }
    }

    tradeData = tradeData.map(x => transformArrayToObject(x));
    const { events, results, state } = backtrack(config, order, tradeData);

    console.log(events);
    console.log(state.info);
}

await test05();
