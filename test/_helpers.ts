import { TradeData } from "../src/binance-api.ts";

export function getTrade(data: Partial<TradeData>): TradeData {
    return {
        openTime: new Date(2023, 6-1, 15, 16-1, 50).getTime(),
        open: 100,
        close: 110,
        closeTime: new Date(2023, 6-1, 15, 16, 50).getTime(),
        high: 130,
        low: 90,
        ignore: "",
        numberOfTrades: 1,
        quoteAssetVolume: 1,
        takerBuyBaseAssetVolume: 1,
        takerBuyQuoteAssetVolume: 1,
        volume: 1,
        ...data,
    };
}
