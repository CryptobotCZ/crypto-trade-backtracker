import { TradeData } from './binance-api.ts';

export type Strategy = 'Evenly Divided' | 'One Target' | 'Two Targets' | 'Three Targets' | 'Fifty On First Target' | 'Decreasing Exponential'
  | 'Increasing Exponential' | 'Skip First' | PriceTarget[];

export interface PriceTarget  {
  percentage: number;
}

export interface PriceTargetWithPrice extends PriceTarget {
  id: number;
  price: number;
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
  entries: Strategy;
  tps: Strategy;
  trailingStop: TrailingStop;
  trailingTakeProfit: number | 'without';
}

export interface Order {
  amount?: number;
  coin: string;
  leverage?: number;
  exchange?: string;
  date: Date;
  timestamp: number;
  entries: number[];
  tps: number[];
  sl: number;
  direction?: 'SHORT' | 'LONG';
}

export type LogEvent = any & { type: string };
export type LogFunction = (status: LogEvent) => void;

export interface Logger {
  log: (status: LogEvent) => void;
}

export function backtrack(config: CornixConfiguration, order: Order, data: TradeData[]) {
  const logger = {
    events: [] as LogEvent[],
    log: function(event: LogEvent) {
      this.events.push(event)
    }
  };

  let state: AbstractState = new InitialState(order, config, logger);

  data.forEach(element => {
    let previousState = state;

    do {
      previousState = state;
      state = state.updateState(element);
    } while (state != previousState);
  });

  return { events: logger.events, results: state.info, state };
}

/**
 *
 * @param orderTargets order price targets
 * @param priceTargets price targets configured in cornix configuration
 * @returns
 */
export function mapPriceTargets(orderTargets: number[], strategy: Strategy): PriceTargetWithPrice[] {
  const result: PriceTargetWithPrice[] = [];

  if (strategy === 'One Target' || orderTargets.length === 1) {
    return [ { id: 1, percentage: 100, price: orderTargets[0] } ];
  }
  else if (Array.isArray(strategy)) {
    const priceTargets = strategy;

    for (let i = 0; i < orderTargets.length; i++) {
      if (i >= priceTargets.length)
        break;

      const priceTargetIndex = i + 1;
      const percentage = priceTargets[i].percentage;
      const price = orderTargets[i];

      result.push({ id: priceTargetIndex, percentage, price });
    }

    return result;
  }
  else if (strategy === 'Two Targets') {
    return orderTargets.filter((x, idx) => idx < 2).map((x, idx) => ({
      id: idx + 1,
      percentage: 50,
      price: x
    }));
  }
  else if (strategy === 'Three Targets') {
    return orderTargets.filter((x, idx) => idx < 3).map((x, idx) => ({
      id: idx + 1,
      percentage: 33.33,
      price: x
    }));
  }
  else if (strategy === 'Decreasing Exponential' || strategy === 'Increasing Exponential') {
    const countTargets = orderTargets.length;
    const max = 100 / ((Math.pow(2, countTargets) - 1) / (Math.pow(2, countTargets) / 2));

    const decreasing = orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: max / Math.pow(2, idx),
      price: x
    }));

    return strategy === 'Decreasing Exponential' ? decreasing : decreasing.toReversed();
  }
  else if (strategy === 'Evenly Divided') {
    const pct = 100 / orderTargets.length;

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: pct,
      price: x
    }));
  }
  else if (strategy === 'Fifty On First Target') {
    const pct = 50 / (orderTargets.length - 1);

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: idx === 0 ? 50 : pct,
      price: x
    }));
  }
  else if (strategy === 'Skip First') {
    const pct = 100 / (orderTargets.length - 1);

    return orderTargets.map((x, idx) => ({
      id: idx + 1,
      percentage: idx === 0 ? 0 : pct,
      price: x
    }));
  }

  return [ { id: 1, percentage: 100, price: orderTargets[0] } ];
}

export function sumPct(targets: PriceTargetWithPrice[]): number {
  return targets.reduce((sum, x) => sum + x.percentage, 0);
}

interface DetailedEntry {
  /**
   * id of entry
   */
  entry: number;

  /**
   * price value f entry
   */
  price: number;

  /**
   * number of bought / sold coins
   */
  coins: number;

  /**
   * total amount of used USDT (price * coins)
   */
  total: number;

  /**
   * Date
   */
  date: Date;
}

type InternalState = {
  order: Order;
  config: CornixConfiguration;

  remainingEntries: PriceTargetWithPrice[];
  remainingTps: PriceTargetWithPrice[];

  tradeOpenTime: Date;
  tradeCloseTime: Date | null;

  allocatedAmount: number;

  entries: DetailedEntry[];
  takeProfits: DetailedEntry[];
  sl: DetailedEntry | null;

  closePrices: number[];
  profits: number[];

  currentSl: number;

  logger: Logger;
};

abstract class AbstractState {
  get allocatedAmount() {
    return this.state.allocatedAmount;
  }

  get spentAmount() {
    return this.state.entries.reduce((sum, curr) => sum + curr.total, 0);
  }

  get remainingAmount() {
    return this.allocatedAmount - this.spentAmount;
  }

  get boughtCoins() {
    return this.state.entries.reduce((sum, entry) => entry.coins + sum, 0);
  }

  get remainingCoins() {
    return this.boughtCoins - this.soldCoins;
  }

  get averageEntryPrice() {
    return  this.spentAmount / this.boughtCoins;
  }

  get isOpen() {
    return this.state.entries.length > 0;
  }

  get isFullyOpen() {
    return this.state.remainingEntries.length === 0;
  }

  get soldCoins() {
    return this.state.takeProfits.reduce((sum, tp) => tp.coins + sum, 0) + (this.state.sl?.coins ?? 0);
  }

  get saleValue() {
    return this.state.takeProfits.reduce((sum, tp) => tp.total + sum, 0) + (this.state.sl?.total ?? 0);
  }

  get leverage() {
    return this.state.order.leverage ?? 1;
  }

  get pnl() {
    const gainPct = Math.abs(this.saleValue - this.averageEntryPrice) / this.averageEntryPrice;
    return gainPct * 100 * this.leverage;
  }

  constructor(public readonly state: InternalState) {}

  updateState(tradeData: TradeData): AbstractState {
    if (tradeData.openTime < this.state.tradeOpenTime.getTime()) {
      return this;
    }

    if (this.matchesEntryPrice(tradeData)) {
      return this.hitEntryPoint(tradeData);
    } else if (this.matchesTakeProfitPrice(tradeData)) {
      return this.hitTp(tradeData);
    } else if (this.matchesStopLossPrice(tradeData)) {
      return this.hitSl(tradeData);
    }

    return this;
  }

  hitEntryPoint(tradeData: TradeData): AbstractState {
    const openedEntry = { ...this.state.remainingEntries[0] };

    const price = openedEntry.price;
    const time = tradeData.openTime;

    const spentOnEntry = (this.allocatedAmount * openedEntry.percentage) / 100;
    const boughtCoins = spentOnEntry / price;

    const detailedEntry: DetailedEntry = {
      coins: boughtCoins,
      price: price,
      total: spentOnEntry,
      entry: openedEntry.id,
      date: new Date(time)
    };

    this.state.logger.log({ type: 'buy', price: openedEntry.price, spent: spentOnEntry, bought: boughtCoins, timestamp: time });

    return new EntryPointReachedState({
      ...this.state,
      entries: [ ...this.state.entries, detailedEntry ],
      remainingEntries: this.state.remainingEntries.filter(x => x.id !== openedEntry.id),
    });
  }

  hitTp(_tradeData: TradeData): AbstractState { return this; }
  hitSl(_tradeData: TradeData): AbstractState { return this; }

  matchesEntryPrice(tradeData: TradeData) {
    if (this.state.remainingEntries.length === 0) {
      return false;
    }

    if (this.state.order.direction === 'LONG') {
      return tradeData.low <= this.state.remainingEntries[0].price;
    } else {
      return tradeData.high >= this.state.remainingEntries[0].price;
    }
  }

  matchesTakeProfitPrice(tradeData: TradeData) {
    if (this.state.remainingTps.length === 0) {
      return false;
    }

    if (this.state.order.direction === 'LONG') {
      return tradeData.high >= this.state.remainingTps[0].price;
    } else {
      return tradeData.low <= this.state.remainingTps[0].price;
    }
  }

  matchesStopLossPrice(tradeData: TradeData) {
    if (this.state.order.sl == null) {
      return false;
    }

    if (this.state.order.direction === 'LONG') {
      return tradeData.low <= this.state.order.sl;
    } else {
      return tradeData.high >= this.state.order.sl;
    }
  }

  get info() {
    return {
      countEntries: this.state.entries.length,
      highestTp: this.state.takeProfits.length,
      openTime: this.state.tradeOpenTime,
      closeTime: this.state.tradeCloseTime,
      isClosed: this.state.tradeCloseTime != null,
      isProfitable: false,
      hitSl: this.state.sl != null,
    };
  }
}

class InitialState extends AbstractState {
  get phase() {
    return 'entry';
  }

  constructor(public readonly order: Order, public readonly config: CornixConfiguration, logger?: Logger) {
    const remainingEntries = mapPriceTargets(order.entries, config.entries);
    const remainingTps = mapPriceTargets(order.tps, config.tps);

    if (sumPct(remainingEntries) !== 100) {
      throw new Error('entries percentage must add to 100%');
    }

    if (sumPct(remainingTps) !== 100) {
      throw new Error('TPs percentage must add to 100%');
    }

    const direction = order.direction ??
      remainingTps[0].price > remainingEntries[0].price ? 'LONG' : 'SHORT';

    logger = logger ?? { log: function() {} };

    const state: InternalState = {
      allocatedAmount: order.amount ?? config.amount,
      tradeOpenTime: new Date(order.timestamp),
      remainingEntries,
      remainingTps,
      order: { ...order, direction },
      config: config,
      tradeCloseTime: null,
      entries: [],
      closePrices: [],
      profits: [],
      currentSl: order.sl,
      takeProfits: [],
      sl: null,
      logger,
    };

    super(state);
  }

  hitTp(tradeData: TradeData): AbstractState {
    return new TakeProfitBeforeEntryState({
      ...this.state,
      tradeCloseTime: new Date(tradeData.openTime)
    });
  }
}

class EntryPointReachedState extends AbstractState {
  hitTp(tradeData: TradeData): AbstractState {
    const price = tradeData.low;

    const closedTp = { ...this.state.remainingTps[0] };

    const soldCoins = (this.remainingCoins * closedTp.percentage) / 100;
    const spentOnTp = soldCoins * closedTp.price;
    // (this.remainingAmount * closedTp.percentage) / 100;
    // spentOnTp / closedTp.price;

    const detailedTp: DetailedEntry = {
      coins: soldCoins,
      price: closedTp.price,
      total: spentOnTp,
      entry: closedTp.id,
      date: new Date(tradeData.openTime)
    };

    this.state.logger.log({ type: 'sell', price: closedTp.price, total: spentOnTp, sold: soldCoins, timestamp: tradeData.openTime });

    const remainingTps = this.state.remainingTps.filter(x => x.id !== closedTp.id);

    return remainingTps.length === 0
       ? new AllProfitsDoneState(this, tradeData, detailedTp)
       : new TakeProfitReachedState(this, tradeData, detailedTp);
  }

  hitSl(tradeData: TradeData): AbstractState {
    return new StopLossReachedState(this, tradeData);
  }
}

class TakeProfitReachedState extends EntryPointReachedState {
  currentTrailingReferencePrice = 0;
  currentTrailingStopPrice = 0;

  trailingPercentage = 0;
  trailingActive = false;

  constructor(parentState: AbstractState, tradeData: TradeData, tp: DetailedEntry) {
    const remainingTps = parentState.state.remainingTps.filter(x => x.id !== tp.entry);
    const newState: InternalState = {
      ...parentState.state,
      remainingTps,
      takeProfits: [...parentState.state.takeProfits, tp ],
    };

    super(newState);
  }

  hitEntryPoint(_tradeData: TradeData): AbstractState {
    return this;
  }

  hitSl(TradeData: TradeData): AbstractState {
    return new StopLossAfterTakeProfitState(this, TradeData);
  }
}

class TakeProfitBeforeEntryState extends AbstractState {
  // boring state, do nothing
}

class AllProfitsDoneState extends AbstractState {
  // boring state
  constructor(previousState: AbstractState, tradeData: TradeData, tp: DetailedEntry) {
    const newState: InternalState = {
      ...previousState.state,
      tradeCloseTime: new Date(tradeData.openTime),
      remainingTps: [],
      takeProfits: [ ...previousState.state.takeProfits, tp ],
    };

    super(newState);
  }
}

class StopLossReachedState extends AbstractState {
  // boring state
  constructor(previousState: AbstractState, tradeData: TradeData) {
    const newState: InternalState = {
      ...previousState.state,
      sl: {
        coins: previousState.remainingCoins,
        price: previousState.state.order.sl,
        entry: -1,
        total: previousState.remainingCoins * previousState.state.order.sl,
        date: new Date(tradeData.openTime)
      }
    };
    super(newState);
  }
}

class StopLossAfterTakeProfitState extends StopLossReachedState {
  // boring state
}

/**
 * Idea:
 *
 * State machine
 *
 * States:
 * {} - initial state, waiting for entry points
 * {e1} - after some entry, either faiting for further entries or waiting for TP/SL
 * {e1, t1} -
 */
