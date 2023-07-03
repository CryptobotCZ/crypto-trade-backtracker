export interface TradeData {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
    quoteAssetVolume: number;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: number;
    takerBuyQuoteAssetVolume: number;
    ignore: string;
}

type ItemArray = [number, string, string, string, string, string, number, string, number, string, string, string];

function transformArrayToObject(itemArray: ItemArray): TradeData {
    return {
        openTime: itemArray[0],
        open: parseFloat(itemArray[1]),
        high: parseFloat(itemArray[2]),
        low: parseFloat(itemArray[3]),
        close: parseFloat(itemArray[4]),
        volume: parseFloat(itemArray[5]),
        closeTime: itemArray[6],
        quoteAssetVolume: parseFloat(itemArray[7]),
        numberOfTrades: itemArray[8],
        takerBuyBaseAssetVolume: parseFloat(itemArray[9]),
        takerBuyQuoteAssetVolume: parseFloat(itemArray[10]),
        ignore: itemArray[11]
    }
}

enum TimeInterval {
    mins1 = "1m",
    mins3 = "3m",
    mins5 = "5m",
    mins15 = "15m",
    mins30 = "30m",
    hours1 = "1h",
    hours2 = "2h",
    hours4 = "4h",
    hours6 = "6h",
    hours8 = "8h",
    hours12 = "12h",
    days1 = "1d",
    days3 = "3d",
    weeks1 = "1w",
    months1 = "1M"
}

export async function getTradeData(pair: string, interval: TimeInterval, startTime?: Date|number) {
    const url = 'https://fapi.binance.com/fapi/v1/klines';

    const resultStartTime = typeof startTime === 'number'
        ? startTime
        : typeof startTime === 'object'
            ? (startTime.getTime())
            : null;

    const objWithTime = resultStartTime != null ? { startTime: resultStartTime.toString() } : {} as any;
    const urlWithParams = url + '?' + new URLSearchParams({
        'symbol': pair,
        'contractType': 'PERPETUAL',
        'interval': interval,
        ...(objWithTime)
    });

    const response = await fetch(urlWithParams);

    const json = await response.json() as ItemArray[];
    return json.map(x => transformArrayToObject(x));
}
