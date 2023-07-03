import { TradeData } from './binance-api.ts';

export interface PriceTarget  {
  // price: number;
  percentage: number;
}

export type TrailingStopType = 'without' | 'moving-target' | 'moving-2-target' | 'breakeven' | 'percent-below-highest' | 'percent-below-triggers';

export interface AbstractTrailingStop {
  type: TrailingStopType;
}

export interface TrailingStopWithout extends AbstractTrailingStop {
  type: 'without';
}

export interface TrailingStopMovingTarget extends AbstractTrailingStop {
  type: 'moving-target' | 'moving-2-target';
  trigger: number;
}

export type TrailingStop = TrailingStopWithout | TrailingStopMovingTarget;

export interface CornixConfiguration {
  amount: number;
  entries: PriceTarget[];
  tps: PriceTarget[];
  trailingStop: TrailingStop;
  trailingTakeProfit: number | 'without';
}

export interface Order {
  coin: string;
  leverage?: number;
  exchange?: string;
  timestamp: number;
  entries: number[];
  tps: number[];
  sl: number;
}

export function backtrack(config: CornixConfiguration, order: Order, data: TradeData[]) {

  const events = [] as any[];

  const remainingEntries = mapPriceTargets(order.entries, config.entries);
  const remainingTps = mapPriceTargets(order.tps, config.tps);

  const results = {
    coins: 0,
    soldCoins: 0,
    price: 0,
    totalProfit: 0,
    isFullyOpen: false,
    isFullyClosed: false,
    entries: [] as number[],
    closePrices: [] as number[],
    profits: [] as number[],
    currentSl: order.sl,
    averageEntry: 0,
  };

  data.forEach(element => {
    if (element.openTime < order.timestamp || results.isFullyClosed) {
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
      results.averageEntry = results.entries.reduce((sum, curr) => sum + curr, 0) / results.entries.length;

      if (remainingEntries.length === 0) {
        results.isFullyOpen = true;
      } else if (remainingEntries[0].percentage == 0) {
        results.isFullyOpen = true;
      }

      events.push({ type: 'buy', price: openedEntry.price, spent: spentOnEntry, bought: boughtCoins, timestamp: element.openTime });

      return;
    }

    if (results.entries.length === 0) {
      return;
    }

    if (element.high >= remainingTps[0].price) {
      const tpHit = remainingTps[0];
      remainingTps.splice(0, 1);
      results.closePrices.push(tpHit.price);

      const soldCoins = results.coins * tpHit.percentage;
      const spentOnTp = soldCoins * tpHit.price;

      results.soldCoins += soldCoins;
      results.totalProfit += spentOnTp;

      if (remainingTps.length === 0) {
        results.isFullyClosed = true;
      } else if (remainingTps[0].percentage == 0) {
        results.isFullyClosed = true;
      }

      events.push({ type: 'sell', price: tpHit.price, spent: spentOnTp, sold: soldCoins, timestamp: element.openTime });

      if (config.trailingStop.type === 'moving-target' && config.trailingStop.trigger == 1) {
        if (tpHit.priceTarget == 1) {
          results.currentSl = order.entries[0];
        }
      }

      return;
    }

    if (element.low <= results.currentSl) {
      results.isFullyClosed = true;
      events.push({ type: 'sl', price: results.currentSl, timestamp: element.openTime });
    }
  });

  return { events, results };
}


export function mapPriceTargets(orderTargets: number[], priceTargets: PriceTarget[]): { priceTarget: number, percentage: number, price: number }[] {
  const result: { priceTarget: number, percentage: number, price: number }[] = [];

  for (let i = 0; i < orderTargets.length; i++) {
    if (i >= priceTargets.length)
      break;

    const priceTargetIndex = i + 1;
    const percentage = priceTargets[i].percentage;
    const price = orderTargets[i];

    result.push({ priceTarget: priceTargetIndex, percentage, price });
  }

  return result;
}
