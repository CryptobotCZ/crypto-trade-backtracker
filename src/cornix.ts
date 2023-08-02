import {AbstractState, Order} from "./backtrack-engine.ts";

export type Strategy =
  | "Evenly Divided"
  | "One Target"
  | "Two Targets"
  | "Three Targets"
  | "Fifty On First Target"
  | "Decreasing Exponential"
  | "Increasing Exponential"
  | "Skip First"
  | PriceTarget[];

export interface PriceTarget {
  percentage: number;
}

export interface PriceTargetWithPrice extends PriceTarget {
  id: number;
  price: number;
}

export type TrailingStopType =
  | "without"
  | "moving-target"
  | "moving-2-target"
  | "breakeven"
  | "percent-below-highest"
  | "percent-below-triggers";

export interface AbstractTrailingStop {
  type: TrailingStopType;
}

export interface TrailingStopWithout extends AbstractTrailingStop {
  type: "without";
}

export interface TrailingStopMovingTarget extends AbstractTrailingStop {
  type: "moving-target" | "moving-2-target";
  trigger: number;
}

export interface TrailingStopBreakeven extends AbstractTrailingStop {
  type: "breakeven";
  triggerType: "target"|"percent";
}

export interface TrailingStopBreakevenTarget extends TrailingStopBreakeven {
    triggerType: "target";
    trigger: number;
}

export interface TrailingStopBreakevenPercent extends TrailingStopBreakeven {
    triggerType: "percent";
    percent: "entry-fill" | number;
}

export type TrailingStop = TrailingStopWithout | TrailingStopMovingTarget | TrailingStopBreakevenTarget | TrailingStopBreakevenPercent;

export interface CornixConfiguration {
  amount: number;
  closeTradeOnTpSlBeforeEntry?: boolean;
  firstEntryGracePct?: number;
  entries: Strategy;
  entryZoneTargets?: number;
  entryType?: 'zone' | 'target';
  tps: Strategy;
  trailingStop: TrailingStop;
  trailingTakeProfit: number | "without";
  maxLeverage?: number;
  sl?: {
    defaultStopLossPct?: number;
    automaticLeverageAdjustment?: boolean;
    stopLimitPriceReduction?: number;
    stopTimeoutMinutes?: number;
    stopType?: "Limit" | "Market";
  };
}

export function getEntryZoneTargets(borders: number[], countTargets: number, direction: 'SHORT'|'LONG') {
  if (countTargets === 1) {
    return [ borders[0] ];
  }

  const width = Math.abs(borders[0] - borders[1]);
  const step = width / (countTargets - 1);
  const sign = direction === 'LONG' ? -1 : 1;

  const generatedData = Array.from({ length: countTargets - 2 }).map((_, idx) => {
    return borders[0] + (idx + 1) * sign * step;
  });

  return [ borders[0], ...generatedData, borders[1] ];
}

/**
 * @param orderTargets order price targets
 * @param strategy strategy how to divide price targets
 * @returns
 */
export function mapPriceTargets(
  orderTargets: number[],
  strategy: Strategy,
): PriceTargetWithPrice[] {
  const result: PriceTargetWithPrice[] = [];

  if (strategy === "One Target" || orderTargets.length === 1) {
    return [{ id: 1, percentage: 100, price: orderTargets[0] }];
  } else if (Array.isArray(strategy)) {
    const priceTargets = strategy;

    for (let i = 0; i < orderTargets.length; i++) {
      if (i >= priceTargets.length) {
        break;
      }

      const priceTargetIndex = i + 1;
      const percentage = priceTargets[i].percentage;
      const price = orderTargets[i];

      result.push({ id: priceTargetIndex, percentage, price });
    }

    return result;
  } else if (strategy === "Two Targets") {
    return orderTargets.filter((x, idx) => idx < 2).map((x, idx) => ({
      id: idx + 1,
      percentage: 50,
      price: x,
    }));
  } else if (strategy === "Three Targets") {
    return orderTargets.filter((x, idx) => idx < 3).map((x, idx) => ({
      id: idx + 1,
      percentage: 33.33,
      price: x,
    }));
  } else if (
    strategy === "Decreasing Exponential" ||
    strategy === "Increasing Exponential"
  ) {
    const countTargets = orderTargets.length;
    const max = 100 /
      ((Math.pow(2, countTargets) - 1) / (Math.pow(2, countTargets) / 2));

    const decreasing = orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: max / Math.pow(2, idx),
      price: x,
    }));

    return strategy === "Decreasing Exponential"
      ? decreasing
      : decreasing.toReversed().map((x, idx) => ({
        ...x,
        id: idx + 1,
        price: orderTargets[idx],
      }));
  } else if (strategy === "Evenly Divided") {
    const pct = 100 / orderTargets.length;

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: pct,
      price: x,
    }));
  } else if (strategy === "Fifty On First Target") {
    const pct = 50 / (orderTargets.length - 1);

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: idx === 0 ? 50 : pct,
      price: x,
    }));
  } else if (strategy === "Skip First") {
    const pct = 100 / (orderTargets.length - 1);

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: idx === 0 ? 0 : pct,
      price: x,
    }));
  }

  return [{ id: 1, percentage: 100, price: orderTargets[0] }];
}

export function makeAutomaticLeverageAdjustment(
  pct: number,
  leverage: number,
  isTrailing: boolean,
) {
  const adjustedValue = pct / leverage;

  if (isTrailing) {
    const minTrailing = 0.2 / 100;
    return Math.max(
      minTrailing,
      adjustedValue,
    );
  }

  return adjustedValue;
}

export function calculateWeightedAverage(priceTargets: PriceTargetWithPrice[]) {
  return priceTargets.reduce((weightedAverage, priceTarget) => {
    return weightedAverage + (priceTarget.price * priceTarget.percentage);
  }, 0);
}

export function getNewStopLoss(parentState: AbstractState, currentTp: number) {
    let newSl = parentState.state.currentSl;
    const trailingStop = parentState.state.config.trailingStop;

    if (trailingStop.type === "moving-target" && currentTp >= trailingStop.trigger) {
        if (currentTp === 1) {
            newSl = parentState.averageEntryPrice;
        } else {
            newSl = parentState.state.order.tps[currentTp - 1 - 1]; //activatedTakeProfits[activatedTakeProfits.length - 1 ].price;
        }
    } else if (trailingStop.type === 'moving-2-target' && currentTp >= trailingStop.trigger) {
        if (currentTp === 2) {
            newSl = parentState.averageEntryPrice;
        } else {
            newSl = parentState.state.order.tps[currentTp - 2 - 1]; //activatedTakeProfits[activatedTakeProfits.length - 1 ].price;
        }
    } else if (trailingStop.type === 'breakeven') {
        if (trailingStop.triggerType === 'target' && currentTp >= trailingStop.trigger) {
            newSl = parentState.averageEntryPrice;
        } else if (trailingStop.triggerType === 'percent' && typeof trailingStop.percent === 'number') {

        }
    }

    return newSl;
}

export function validateOrder(order: Order) {
  const isArraySortedAsc = (arr: number[]) => arr.every((v, i, a) => !i || a[i-1] <= v);
  const isArraySortedDesc = (arr: number[]) => arr.every((v, i, a) => !i || a[i-1] >= v);
  const direction = order.direction ?? (order.tps[0] > order.entries[0] ? "LONG" : "SHORT");

  if (direction === 'SHORT') {
    if (!isArraySortedAsc(order.entries)) {
      console.log('For SHORT order, entries should be in ascending order');
      return false;
    }
    
    if (!isArraySortedDesc(order.tps)) {
      console.log('For SHORT order, TPs should be in descending order');
      return false;
    }
    
    if (order.tps[0] > order.entries[0]) {
      console.log('For SHORT trades, first TPs must be lower then entry price');
      return false;
    }
  } else if (direction === 'LONG') {
    if (!isArraySortedDesc(order.entries)) {
      console.log('For LONG order, entries should be in descending order');
      return false;
    }

    if (!isArraySortedAsc(order.tps)) {
      console.log('For LONG order, TPs should be in ascending order');
      return false;
    }

    if (order.tps[0] < order.entries[0]) {
      console.log('For LONG trades, first TPs must be higher then entry price');
      return false;
    }
  }
  
  return true;
}

export function getFlattenedCornixConfig(...config: CornixConfiguration[]) {
  // TODO: Add something like user override flag
  return config.reduce((flattened, current) => ({ ...flattened, ...current }), {} as CornixConfiguration);
}
