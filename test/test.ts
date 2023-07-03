import { TradeData, getTradeData } from './../src/binance-api.ts';
import { CornixConfiguration, backtrack } from "../src/backtrack.ts";

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

const order = {
    coin: 'INJUSDT',
    exchange: 'Binance Futures',
    entries: [ 5.72, 5.12 ],
    tps: [ 5.82, 5.93, 6.07, 6.20, 6.35, 6.60, 6.95, 7.30, 7.70, 8.10, 9.00, 9.97 ],
    sl: 4.78,
    timestamp: new Date(2023, 6-1, 15, 16-1, 50).getTime(), // new Date(2023, 6, 15, 16, 50).getTime()
};

const tradeData: TradeData[] = await getTradeData('INJUSDT', '1h' as any, order.timestamp);

const { events, results } = backtrack(config, order, tradeData);

events.forEach(x => console.log(x));
console.log(events);
console.log(results);
