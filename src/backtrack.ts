export interface PriceTarget  {
  // price: number;
  percentage: number;
}

export interface TrailingStop {
  type: 'without' | 'moving-target' | 'moving-2-target' | 'breakeven' | 'percent-below-highest' | 'percent-below-triggers';
}

export interface TrailingStopMovingTarget extends TrailingStop {
  type: 'moving-target';
  trigger: number;
}

export interface TralingStop2MovingTarget extends TrailingStop {
  type: 'moving-2-target';
  trigger: number;
}


export interface CornixConfiguration {
  amount: number;
  entries: PriceTarget[];
  tps: PriceTarget[];
  sl: number;
  trailingStop: TrailingStop;
  trailingTakeProfit: number | 'without';
}

export interface Order {
  timestamp: number;
  entries: number[];
}

export interface HistoricalData {
  open_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: number;
  quote_volume: number;
  count: number;
  taker_buy_volume: number;
  taker_buy_quote_volume: number;
  ignore: number;
};

export function backtrack(config: CornixConfiguration, order: Order, data: HistoricalData[]) {

  const events = [] as any[];

  const remainingEntries = mapPriceTargets(order, config.entries);
  const remainingTps = mapPriceTargets(order, config.tps);

  const results = {
    coins: 0,
    price: 0,
    isFullyOpen: false,
    entries: [] as number[],
    closePrices: [] as number[],
    profits: [] as number[],
  };

  data.forEach(element => {
    if (element.open_time < order.timestamp) {
      return;
    }

    if (!results.isFullyOpen && (element.low <= remainingEntries[0].price)) {
      const openedEntry = remainingEntries[0];
      remainingEntries.splice(0, 1);
      results.entries.push(openedEntry.price);

      const spentOnEntry = config.amount * openedEntry.percentage;
      const boughtCoins = spentOnEntry / openedEntry.price;

      results.coins += boughtCoins;
      results.price += spentOnEntry;

      if (remainingEntries.length === 0) {
        results.isFullyOpen = true;
      } else if (remainingEntries[0].percentage == 0) {
        results.isFullyOpen = true;
      }

      events.push({ type: 'buy', price: openedEntry.price, spent: spentOnEntry, bought: boughtCoins, timestamp: element.open_time });

      return;
    }

    if (results.entries.length === 0) {
      return;
    }



  });

}


export function mapPriceTargets(order: Order, priceTargets: PriceTarget[]): { priceTarget: number, percentage: number, price: number }[] {
  const result: { priceTarget: number, percentage: number, price: number }[] = [];

  for (let i = 0; i < order.entries.length; i++) {
    const priceTargetIndex = i + 1;
    const percentage = priceTargets[i].percentage;
    const price = order.entries[i];

    result.push({ priceTarget: priceTargetIndex, percentage, price });
  }

  return result;
}
