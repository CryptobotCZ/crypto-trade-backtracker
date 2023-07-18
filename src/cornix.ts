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

export type TrailingStop = TrailingStopWithout | TrailingStopMovingTarget;

export interface CornixConfiguration {
  amount: number;
  closeTradeOnTpSlBeforeEntry?: boolean;
  firstEntryGracePct?: number;
  entries: Strategy;
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

/**
 * @param orderTargets order price targets
 * @param priceTargets price targets configured in cornix configuration
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
      : decreasing.toReversed();
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
