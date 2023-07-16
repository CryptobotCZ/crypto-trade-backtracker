import { TradeData } from "./binance-api.ts";
import {
  CornixConfiguration,
  mapPriceTargets,
  PriceTargetWithPrice,
} from "./cornix.ts";

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
  direction?: "SHORT" | "LONG";
}

export interface BackTrackingConfig {
  detailedLog?: boolean;
}

export interface TradeResult {
  reachedEntries: number;
  reachedTps: number;
  openTime: Date;
  closeTime: Date | null;
  isClosed: boolean;
  isProfitable: boolean;
  pnl: number;
  profit: number;
  hitSl: boolean;
  averageEntryPrice: number;
}

export type LogEvent = any & { type: string };
export type LogFunction = (status: LogEvent) => void;

export interface Logger {
  log: (status: LogEvent) => void;
  verbose: (status: LogEvent) => void;
}

type UpOrDown = "up" | "down";

export function backtrack(
  config: CornixConfiguration,
  order: Order,
  tradeData: TradeData[],
  backtrackConfig?: BackTrackingConfig,
) {
  let { events, state } = getBackTrackEngine(config, order, backtrackConfig);

  for (const tradeEntry of tradeData) {
    let previousState = state;

    do {
      previousState = state;
      state = state.updateState(tradeEntry);
    } while (state != previousState && !state.isClosed);

    if (state.isClosed) {
      break;
    }
  }

  return { events, results: state.info, state };
}

export function getBackTrackEngine(
  config: CornixConfiguration,
  order: Order,
  backtrackConfig?: BackTrackingConfig,
) {
  const logger = {
    events: [] as LogEvent[],
    log: function (event: LogEvent) {
      this.events.push(event);
    },
    verbose: function (event: LogEvent) {
      this.log(event);
    },
  };

  const state: AbstractState = new InitialState(
    order,
    config,
    logger,
    backtrackConfig,
  );

  return { state, results: state.info, events: logger.events };
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

  /**
   * State
   */
  state?: string;
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

  currentSl: number | null;

  logger: Logger;

  backTrackConfig?: BackTrackingConfig;
};

export abstract class AbstractState {
  currentPrice: TradeData | null = null;
  previousPrice: TradeData | null = null;

  get allocatedAmount() {
    return this.state.allocatedAmount;
  }

  get allocatedAmountWithLev() {
    return this.state.allocatedAmount * this.leverage;
  }

  get spentAmount() {
    return this.spentAmountWithLev / this.leverage;
  }

  get spentAmountWithLev() {
    return this.state.entries.reduce((sum, curr) => sum + curr.total, 0);
  }

  get remainingAmountWithLev() {
    return this.allocatedAmountWithLev - this.spentAmountWithLev;
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
    return this.spentAmountWithLev / this.boughtCoins;
  }

  get isOpen() {
    return this.state.entries.length > 0;
  }

  get isClosed() {
    return this.state.tradeCloseTime != null;
  }

  get isFullyOpen() {
    return this.state.remainingEntries.length === 0;
  }

  get soldCoins() {
    return this.state.takeProfits.reduce((sum, tp) => tp.coins + sum, 0) +
      (this.state.sl?.coins ?? 0);
  }

  get saleValue() {
    return this.state.takeProfits.reduce((sum, tp) => tp.total + sum, 0) +
      (this.state.sl?.total ?? 0);
  }

  get remainingCoinsCurrentValue() {
    return this.remainingCoins * (this.currentPrice?.open ?? 0);
  }

  get leverage() {
    return this.state.order.leverage ?? 1;
  }

  get pnl() {
    const gainPct = this.profit / this.spentAmount;
    return gainPct * 100;
  }

  get profit() {
    const saleValueWithCurrentValue = this.saleValue +
      this.remainingCoinsCurrentValue;

    return this.state.order.direction === "LONG"
      ? saleValueWithCurrentValue - this.spentAmountWithLev
      : this.spentAmountWithLev - saleValueWithCurrentValue;
  }

  constructor(public readonly state: InternalState) {}

  updateState(tradeData: TradeData): AbstractState {
    this.previousPrice = this.currentPrice;
    this.currentPrice = tradeData;

    const tradeOpenTime = this.state.tradeOpenTime.getTime();
    if (tradeData.openTime < tradeOpenTime || this.isClosed) {
      const text = tradeData.openTime < tradeOpenTime
        ? "Time before trade open"
        : "Trade is closed";
      this.state.logger.verbose({
        type: "info",
        text,
        orderTime: tradeOpenTime,
        candleTime: tradeData.openTime,
      });
      return this;
    }

    if (this.state.backTrackConfig?.detailedLog) {
      this.logPriceIfNeeded(tradeData);
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

  crossedPrice(
    tradeData: TradeData,
    referencePrice: number,
    direction: UpOrDown,
  ) {
    if (direction === "down") {
      // price dropped
      return tradeData.low <= referencePrice && tradeData.open > referencePrice;
    } else {
      // price increased
      return tradeData.high >= referencePrice &&
        tradeData.open < referencePrice;
    }
  }

  logPriceIfNeeded(tradeData: TradeData) {
    if (this.isOpen || this.matchesEntryPrice(tradeData)) {
      const entries = this.state.order.entries;
      entries.forEach((entry, index) => {
        (["up", "down"] as UpOrDown[]).forEach((direction) => {
          if (this.crossedPrice(tradeData, entry, direction)) {
            this.state.logger.log({
              type: "cross",
              direction,
              subtype: "entry",
              id: index + 1,
              price: entry,
              timestamp: tradeData.openTime,
              tradeData,
            });
          }
        });
      });

      (["up", "down"] as UpOrDown[]).forEach((direction) => {
        if (this.crossedPrice(tradeData, this.averageEntryPrice, direction)) {
          this.state.logger.log({
            type: "cross",
            direction,
            subtype: "averageEntry",
            price: this.averageEntryPrice,
            timestamp: tradeData.openTime,
            tradeData,
          });
        }
      });

      const tps = this.state.order.tps;
      tps.forEach((tp, index) => {
        (["up", "down"] as UpOrDown[]).forEach((direction) => {
          if (this.crossedPrice(tradeData, tp, direction)) {
            this.state.logger.log({
              type: "cross",
              direction,
              subtype: "tp",
              id: index + 1,
              price: tp,
              timestamp: tradeData.openTime,
              tradeData,
            });
          }
        });
      });

      if (this.state.order.sl) {
        (["up", "down"] as UpOrDown[]).forEach((direction) => {
          if (this.crossedPrice(tradeData, this.state.order.sl, direction)) {
            this.state.logger.log({
              type: "cross",
              direction,
              subtype: "sl",
              price: this.state.order.sl,
              timestamp: tradeData.openTime,
              tradeData,
            });
          }
        });
      }
    }
  }

  hitEntryPoint(tradeData: TradeData): AbstractState {
    const openedEntry = { ...this.state.remainingEntries[0] };

    const price = openedEntry.price;
    const time = tradeData.openTime;

    const spentOnEntry = (this.allocatedAmount * openedEntry.percentage) / 100;
    const spentOnEntryWithLeverage = spentOnEntry * this.leverage;
    const boughtCoins = spentOnEntryWithLeverage / price;

    const detailedEntry: DetailedEntry = {
      coins: boughtCoins,
      price: price,
      total: spentOnEntryWithLeverage,
      entry: openedEntry.id,
      date: new Date(time),
    };

    this.state.logger.log({
      type: "buy",
      price: openedEntry.price,
      spent: spentOnEntry,
      spentWithLeverage: spentOnEntryWithLeverage,
      bought: boughtCoins,
      timestamp: time,
    });

    return new EntryPointReachedState({
      ...this.state,
      entries: [...this.state.entries, detailedEntry],
      remainingEntries: this.state.remainingEntries.filter((x) =>
        x.id !== openedEntry.id
      ),
    });
  }

  hitTp(_tradeData: TradeData): AbstractState {
    return this;
  }
  hitSl(_tradeData: TradeData): AbstractState {
    return this;
  }

  matchesEntryPrice(tradeData: TradeData) {
    if (this.state.remainingEntries.length === 0) {
      return false;
    }

    if (this.state.order.direction === "LONG") {
      return tradeData.low <= this.state.remainingEntries[0].price;
    } else {
      return tradeData.high >= this.state.remainingEntries[0].price;
    }
  }

  matchesTakeProfitPrice(tradeData: TradeData) {
    if (this.state.remainingTps.length === 0) {
      return false;
    }

    if (this.state.order.direction === "LONG") {
      return tradeData.high >= this.state.remainingTps[0].price;
    } else {
      return tradeData.low <= this.state.remainingTps[0].price;
    }
  }

  matchesStopLossPrice(tradeData: TradeData) {
    if (this.state.currentSl == null) {
      return false;
    }

    if (this.state.order.direction === "LONG") {
      return tradeData.low <= this.state.currentSl;
    } else {
      return tradeData.high >= this.state.currentSl;
    }
  }

  get info(): TradeResult {
    return {
      reachedEntries: this.state.entries.length,
      reachedTps: this.state.takeProfits.at(-1)?.entry ?? 0,
      openTime: this.state.tradeOpenTime,
      closeTime: this.state.tradeCloseTime,
      isClosed: this.state.tradeCloseTime != null,
      isProfitable: this.pnl > 0,
      pnl: this.pnl,
      profit: this.profit,
      hitSl: this.state.sl != null,
      averageEntryPrice: this.averageEntryPrice,
    };
  }

  getPriceForSl(tradeData: TradeData) {
    // get the lowest reached price in the candle
    return this.state.order.direction === "LONG"
      ? tradeData.low
      : tradeData.high;
  }

  getPriceForTp(tradeData: TradeData) {
    // get the highest reached price in the candle
    return this.state.order.direction === "LONG"
      ? tradeData.high
      : tradeData.low;
  }

  getPriceForTrailingTp(tradeData: TradeData) {
    // get the lowest reached price in the candle
    return this.getPriceForSl(tradeData);
  }

  getEffectiveTrailingPct() {
    if (this.state.config.trailingTakeProfit !== "without") {
      const minTrailing = 0.2 / 100;
      return Math.max(
        minTrailing,
        this.state.config.trailingTakeProfit / this.leverage,
      );
    }

    return 0;
  }
}

class InitialState extends AbstractState {
  get phase() {
    return "entry";
  }

  constructor(
    public readonly order: Order,
    public readonly config: CornixConfiguration,
    logger?: Logger,
    backTrackConfig?: BackTrackingConfig,
  ) {
    const remainingEntries = mapPriceTargets(order.entries, config.entries);
    const remainingTps = mapPriceTargets(order.tps, config.tps);

    if (sumPct(remainingEntries) !== 100) {
      throw new Error("entries percentage must add to 100%");
    }

    if (Math.abs(sumPct(remainingTps) - 100.0) > 0.1) {
      throw new Error("TPs percentage must add to 100%");
    }

    const direction = order.direction ??
      (remainingTps[0].price > remainingEntries[0].price ? "LONG" : "SHORT");

    logger = logger ?? { log: () => {}, verbose: () => {} };

    const cornixConfig: CornixConfiguration = backTrackConfig?.detailedLog
      ? { ...config, trailingStop: { type: "without" } }
      : config;

    const state: InternalState = {
      allocatedAmount: order.amount ?? config.amount,
      tradeOpenTime: order.date, // new Date(order.timestamp),
      remainingEntries,
      remainingTps,
      order: { ...order, direction },
      config: cornixConfig,
      tradeCloseTime: null,
      entries: [],
      currentSl: order.sl,
      takeProfits: [],
      sl: null,
      logger,
      backTrackConfig,
    };

    super(state);
  }

  hitTp(tradeData: TradeData): AbstractState {
    return new TakeProfitBeforeEntryState({
      ...this.state,
      tradeCloseTime: new Date(tradeData.openTime),
    });
  }
}

class EntryPointReachedState extends AbstractState {
  currentTrailingReferencePrice = 0;
  currentTrailingStopPrice = 0;
  trailingActive = false;
  highestReachedTp: PriceTargetWithPrice | null = null;

  matchesTakeProfitPrice(tradeData: TradeData) {
    if (!this.trailingActive) {
      return super.matchesTakeProfitPrice(tradeData);
    }

    return true;
  }

  hitTp(tradeData: TradeData): AbstractState {
    const price = this.getPriceForTp(tradeData);

    if (this.state.config.trailingTakeProfit === "without") {
      return this.hitTpWithoutTrailing(tradeData);
    } else if (!this.trailingActive) {
      this.trailingActive = true;
      this.currentTrailingReferencePrice = price;
      this.currentTrailingStopPrice = price *
        (1 - this.getEffectiveTrailingPct());
      this.highestReachedTp = this.state.remainingTps[0];

      this.state.logger.log({
        type: "trailing activated",
        price,
        timestamp: tradeData.openTime,
      });

      return this;
    } else if (this.shouldTrailingStop(tradeData)) {
      return this.hitTpWithTrailing(tradeData, this.currentTrailingStopPrice);
    } else if (this.shouldTrailingUpdatePrice(tradeData)) {
      this.currentTrailingReferencePrice = price;
      this.currentTrailingStopPrice = this.getNewTrailingStopPrice(price);
      this.highestReachedTp = this.state.remainingTps.toReversed().find((x) =>
        x.price < price
      ) ?? null;

      this.state.logger.log({
        type: "trailing price updated",
        price,
        trailingStopPrice: this.currentTrailingStopPrice,
        timestamp: tradeData.openTime,
      });
    }

    return this;
  }

  getNewTrailingStopPrice(price: number) {
    const sign = this.state.order.direction === "LONG" ? -1 : -1;
    return price * (1 + sign * this.getEffectiveTrailingPct());
  }

  shouldTrailingStop(tradeData: TradeData) {
    const priceToStopTtp = this.getPriceForTrailingTp(tradeData);

    return this.state.order.direction === "LONG"
      ? priceToStopTtp <= this.currentTrailingStopPrice
      : priceToStopTtp >= this.currentTrailingStopPrice;
  }

  shouldTrailingUpdatePrice(tradeData: TradeData) {
    const price = this.getPriceForTp(tradeData);
    return price > this.currentTrailingReferencePrice;

    return this.state.order.direction === "LONG"
      ? price > this.currentTrailingReferencePrice
      : price < this.currentTrailingReferencePrice;
  }

  hitTpWithTrailing(
    tradeData: TradeData,
    trailingStopPrice: number,
  ): AbstractState {
    const price = trailingStopPrice;

    const highestReachedTp = this.highestReachedTp ??
      this.state.remainingTps.toReversed().find((x) => x.price < price)!;
    const sumpPercentage = this.state.remainingTps.filter((x) =>
      x.id <= highestReachedTp.id
    ).reduce((sum, x) => x.percentage + sum, 0);

    const closedTp = { ...highestReachedTp };

    const soldCoins = (this.boughtCoins * sumpPercentage) / 100;
    const spentOnTp = soldCoins * price;

    const detailedTp: DetailedEntry = {
      coins: soldCoins,
      price: price,
      total: spentOnTp,
      entry: closedTp.id,
      date: new Date(tradeData.openTime),
    };

    this.state.logger.log({
      type: "sell with trailing",
      price: price,
      total: spentOnTp,
      sold: soldCoins,
      timestamp: tradeData.openTime,
    });

    const remainingTps = this.state.remainingTps.filter((x) =>
      x.id > closedTp.id
    );

    return remainingTps.length === 0
      ? new AllProfitsDoneState(this, tradeData, detailedTp)
      : new TakeProfitReachedState(this, tradeData, detailedTp);
  }

  hitTpWithoutTrailing(tradeData: TradeData): AbstractState {
    const closedTp = { ...this.state.remainingTps[0] };

    const soldCoins = (this.boughtCoins * closedTp.percentage) / 100;
    const spentOnTp = soldCoins * closedTp.price;

    const detailedTp: DetailedEntry = {
      coins: soldCoins,
      price: closedTp.price,
      total: spentOnTp,
      entry: closedTp.id,
      date: new Date(tradeData.openTime),
      state: "merged",
    };

    this.state.logger.log({
      type: "sell",
      price: closedTp.price,
      total: spentOnTp,
      sold: soldCoins,
      timestamp: tradeData.openTime,
    });

    const remainingTps = this.state.remainingTps.filter((x) =>
      x.id !== closedTp.id
    );

    return remainingTps.length === 0
      ? new AllProfitsDoneState(this, tradeData, detailedTp)
      : new TakeProfitReachedState(this, tradeData, detailedTp);
  }

  hitSl(tradeData: TradeData): AbstractState {
    return new StopLossReachedState(this, tradeData);
  }
}

class TakeProfitReachedState extends EntryPointReachedState {
  constructor(
    parentState: AbstractState,
    tradeData: TradeData,
    tp: DetailedEntry,
  ) {
    const mergedTps: DetailedEntry[] = parentState.state.remainingTps.filter(
      (x) => x.id < tp.entry,
    ).map((x) => ({
      entry: x.id,
      price: x.price,
      coins: 0,
      total: 0,
      date: new Date(tradeData.openTime),
    }));
    const activatedTakeProfits = [
      ...parentState.state.takeProfits,
      ...mergedTps,
      tp,
    ];
    const remainingTps = parentState.state.remainingTps.filter((x) =>
      x.id > tp.entry
    );

    let newSl = parentState.state.currentSl;
    if (
      parentState.state.config.trailingStop.type == "moving-target" &&
      parentState.state.config.trailingStop.trigger == 1
    ) {
      if (tp.entry === 1) {
        newSl = parentState.averageEntryPrice;
      } else {
        newSl = parentState.state.order.tps[tp.entry - 1 - 1]; //activatedTakeProfits[activatedTakeProfits.length - 1 ].price;
      }
    }

    const newState: InternalState = {
      ...parentState.state,
      remainingTps,
      takeProfits: activatedTakeProfits,
      currentSl: newSl,
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
  constructor(
    previousState: AbstractState,
    tradeData: TradeData,
    tp: DetailedEntry,
  ) {
    const newState: InternalState = {
      ...previousState.state,
      tradeCloseTime: new Date(tradeData.openTime),
      remainingTps: [],
      takeProfits: [...previousState.state.takeProfits, tp],
    };

    super(newState);
  }
}

class StopLossReachedState extends AbstractState {
  // boring state
  constructor(previousState: AbstractState, tradeData: TradeData) {
    const closeTime = new Date(tradeData.openTime);
    const slPrice = previousState.state.currentSl!;
    const soldCoins = previousState.remainingCoins;
    const total = soldCoins * slPrice;

    previousState.state.logger.log({
      type: "sl",
      price: slPrice,
      total: total,
      sold: soldCoins,
      timestamp: tradeData.openTime,
    });

    const newState: InternalState = {
      ...previousState.state,
      sl: {
        coins: soldCoins,
        price: slPrice,
        entry: -1,
        total: total,
        date: closeTime,
      },
      tradeCloseTime: closeTime,
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
