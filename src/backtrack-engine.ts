import { TradeData } from "./exchanges/exchanges.ts";
import {
  calculateWeightedAverage,
  CornixConfiguration, getEntryZoneTargets,
  getNewStopLoss,
  makeAutomaticLeverageAdjustment,
  mapPriceTargets,
  PriceTargetWithPrice,
} from "./cornix.ts";

export interface OrderEvent {
  type: string;
  date: Date;
}

export interface Order {
  signalId?: string;
  amount?: number;
  coin: string;
  leverage?: number;
  exchange?: string;
  date: Date;
  entries: number[];
  entryZone?: number[];
  entryType?: 'target' | 'zone';
  tps: number[];
  sl: number | null;
  direction?: "SHORT" | "LONG";
  events?: OrderEvent[];
  config?: CornixConfiguration;
}

export interface BackTrackingConfig {
  detailedLog?: boolean;
}

export interface TradeResult {
  reachedEntries: number;
  reachedAllEntries: boolean;
  reachedTps: number;
  reachedAllTps: boolean;
  openTime: Date;
  closeTime: Date | null;
  isClosed: boolean;
  isCancelled: boolean;
  isProfitable: boolean;
  pnl: number;
  profit: number;
  hitSl: boolean;
  averageEntryPrice: number;
  allocatedAmount: number;
  spentAmount: number;
  realizedProfit: number;
  unrealizedProfit: number;
  boughtCoins: number;
  averageSalePrice: number;
  soldAmount: number;
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
  const logger = createLogger();
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
  cancelled?: boolean;

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
    if (this.boughtCoins === 0) {
      return 0;
    }

    return this.spentAmountWithLev / this.boughtCoins;
  }

  get averageSalePrice() {
    if (this.soldCoins === 0) {
      return 0;
    }
    
    return this.saleValue / this.soldCoins;
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

  get saleValueWithLev() {
    const tpSum = this.state.takeProfits.reduce((sum, tp) => tp.total + sum, 0);
    return tpSum + (this.state.sl?.total ?? 0);
  }

  get saleValue() {
    return this.saleValueWithLev / this.leverage;
  }

  get remainingCoinsCurrentValue() {
    return this.remainingCoins * (this.currentPrice?.open ?? 0);
  }

  get leverage() {
    return this.state.order.leverage ?? 1;
  }

  get pnl() {
    if (this.spentAmount === 0) {
      return 0;
    }

    const gainPct = this.profit / this.spentAmount;
    return gainPct * 100;
  }

  get soldPct() {
    return this.soldCoins / this.boughtCoins;
  }

  get remainingPct() {
    return this.remainingCoins / this.boughtCoins;
  }

  get realizedProfit() {
    if (this.boughtCoins === 0) {
      return 0;
    }

    const calculatedProfit = this.calculateProfit(this.saleValueWithLev, this.soldPct);
    return calculatedProfit;
  }

  get unrealizedProfit() {
    if (this.remainingCoinsCurrentValue === 0) {
      return 0;
    }

    return this.calculateProfit(this.remainingCoinsCurrentValue, this.remainingPct);
  }

  calculateProfit(saleValue: number, soldPercentage = 1) {
    return this.state.order.direction === "LONG"
      ? saleValue - (this.spentAmountWithLev * soldPercentage)
      : (this.spentAmountWithLev * soldPercentage) - saleValue;
  }

  get profit() {
    if (this.spentAmount === 0) {
      return 0;
    }

    return this.realizedProfit + this.unrealizedProfit;
  }

  get profitBasedOnSoldCoins() {
    const saleValueWithCurrentValue = this.saleValueWithLev + this.remainingCoinsCurrentValue;

    return this.state.order.direction === "LONG"
      ? saleValueWithCurrentValue - this.spentAmountWithLev
      : this.spentAmountWithLev - saleValueWithCurrentValue;
  }

  get order() {
    return this.state.order;
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
        level: 'verbose',
        orderTime: tradeOpenTime,
        candleTime: tradeData.openTime,
      });
      return this;
    }

    if (this.state.backTrackConfig?.detailedLog) {
      this.logPriceIfNeeded(tradeData);
    }

    if (this.matchesStopEvent(tradeData)) {
      return this.hitCloseEvent(tradeData);
    } else if (this.matchesEntryPrice(tradeData)) {
      return this.hitEntryPoint(tradeData);
    } else if (this.matchesTakeProfitPrice(tradeData)) {
      return this.hitTp(tradeData);
    } else if (this.matchesStopLossPrice(tradeData)) {
      return this.hitSl(tradeData);
    }

    return this;
  }

  hitCloseEvent(tradeData: TradeData) {
    return new CancelledState(this, tradeData);
  }

  matchesStopEvent(tradeData: TradeData) {
    const events = this.state.order.events ?? [];
    const matchingEvents = events.filter(x => x.date.getTime() < tradeData.openTime);

    return (matchingEvents.some(event => event.type === 'cancelled' || event.type === 'close' || event.type === 'opposite'));
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

  logIfMatchesImportantPrice(
    tradeData: TradeData,
    importantPrice: number,
    logProperties: any,
  ) {
    (["up", "down"] as UpOrDown[]).forEach((direction) => {
      if (this.crossedPrice(tradeData, importantPrice, direction)) {
        this.state.logger.log({
          type: "cross",
          direction,
          ...logProperties,
          price: importantPrice,
          timestamp: tradeData.openTime,
          tradeData,
        });
      }
    });
  }

  logPriceIfNeeded(tradeData: TradeData) {
    if (this.isOpen || this.matchesEntryPrice(tradeData) || this.matchesTakeProfitPrice(tradeData)) {
      const entries = this.state.order.entries;
      entries.forEach((entry, index) => {
        this.logIfMatchesImportantPrice(tradeData, entry, {
          subtype: "entry",
          id: index + 1,
        });
      });

      this.logIfMatchesImportantPrice(tradeData, this.averageEntryPrice, {
        subtype: "averageEntry",
      });

      const tps = this.state.order.tps;
      tps.forEach((tp, index) => {
        this.logIfMatchesImportantPrice(tradeData, tp, {
          subtype: "tp",
          id: index + 1,
        });
      });

      if (this.state.order.sl) {
        this.logIfMatchesImportantPrice(tradeData, this.state.order.sl, {
          subtype: "sl",
        });
      }

      if (this.matchesStopEvent(tradeData)) {
        this.state.logger.log({
          type: "cross",
          subtype: "cancel",
          price: tradeData.open,
          timestamp: tradeData.openTime,
          tradeData,
        });
      }

      if (!this.isOpen && this.matchesTakeProfitPrice(tradeData)) {
        this.state.logger.log({
          type: "cross",
          subtype: "tpBeforeEntry",
          price: tradeData.open,
          timestamp: tradeData.openTime,
          tradeData
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
      entry: openedEntry.id,
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
      reachedAllEntries: this.state.remainingEntries.length === 0,
      reachedTps: this.state.takeProfits.at(-1)?.entry ?? 0,
      reachedAllTps: this.state.remainingTps.length === 0,
      openTime: this.state.tradeOpenTime,
      closeTime: this.state.tradeCloseTime,
      isClosed: this.state.tradeCloseTime != null,
      isCancelled: this.state.cancelled == true,
      isProfitable: this.pnl > 0,
      pnl: this.pnl,
      profit: this.profit,
      hitSl: this.state.sl != null && !this.state.cancelled,
      boughtCoins: this.boughtCoins,
      averageEntryPrice: this.averageEntryPrice,
      averageSalePrice: this.averageSalePrice,
      allocatedAmount: this.allocatedAmount,
      spentAmount: this.spentAmount,
      soldAmount: this.saleValue,
      realizedProfit: this.realizedProfit,
      unrealizedProfit: this.unrealizedProfit,
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
      return makeAutomaticLeverageAdjustment(
        this.state.config.trailingTakeProfit,
        this.leverage,
        true,
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
    order: Order,
    public readonly config: CornixConfiguration,
    logger?: Logger,
    backTrackConfig?: BackTrackingConfig,
  ) {
    order = { ...order };
    const entryType = order.entryType ?? config.entryType ?? 'target';

    const direction = order.direction ?? (order.tps[0] > order.entries[0] ? "LONG" : "SHORT");
    const entries = entryType === 'target'
      ? order.entries
      : getEntryZoneTargets(order.entries, config.entryZoneTargets ?? 4, direction);

    if (entryType === 'zone') {
      order.entryZone = order.entries;
      order.entries = entries;
    }

    const remainingEntries = mapPriceTargets(entries, config.entries);
    const remainingTps = mapPriceTargets(order.tps, config.tps);

    if (Math.abs(sumPct(remainingEntries) - 100.0) > 0.1) {
      throw new Error("entries percentage must add to 100%");
    }

    if (Math.abs(sumPct(remainingTps) - 100.0) > 0.1) {
      throw new Error("TPs percentage must add to 100%");
    }

    logger = logger ?? { log: () => {}, verbose: () => {} };

    if (config?.maxLeverage != null && order.leverage != config?.maxLeverage) {
      order.leverage = config?.maxLeverage;
    }

    const cornixDefaultSl = config?.sl?.defaultStopLossPct ?? 0;
    const leverage = order.leverage ?? 1;

    if (order.sl == null && cornixDefaultSl > 0) {
      const slPct = (config?.sl?.automaticLeverageAdjustment ?? true)
        ? makeAutomaticLeverageAdjustment(cornixDefaultSl, leverage, false)
        : cornixDefaultSl;

      const averageEntryPrice = calculateWeightedAverage(remainingEntries);
      order.sl = (1 - slPct) * averageEntryPrice;
    }

    logger.verbose({ type: "info", subType: "config", values: config });

    const openTime = typeof order.date === 'number' ? new Date(order.date) : order.date;

    const cornixConfigAmount = typeof config.amount === 'number' 
        ? config.amount
        : 100;

    const state: InternalState = {
      allocatedAmount: order.amount ?? cornixConfigAmount,
      tradeOpenTime: openTime,
      remainingEntries,
      remainingTps,
      order: { ...order, direction },
      config: config,
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
    return new TakeProfitBeforeEntryState(this, tradeData);
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
    const trailing = this.state.config.trailingTakeProfit ?? 'without';

    if (trailing === "without") {
      return this.hitTpWithoutTrailing(tradeData);
    } else if (!this.trailingActive) {
      this.trailingActive = true;
      this.currentTrailingReferencePrice = price;
      this.currentTrailingStopPrice = price *
        (1 - this.getEffectiveTrailingPct());
      this.highestReachedTp = this.state.remainingTps[0];

      this.state.logger.log({
        type: "trailing activated",
        tp: this.highestReachedTp.id,
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
        tp: this.highestReachedTp?.id,
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
      tp: highestReachedTp.id,
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

  logPriceIfNeeded(tradeData: TradeData) {
    super.logPriceIfNeeded(tradeData);

    if (!this.trailingActive) {
      return;
    }

    if (this.shouldTrailingUpdatePrice(tradeData)) {
      this.logIfMatchesImportantPrice(
        tradeData,
        this.currentTrailingReferencePrice,
        {
          subtype: "trailingUpdate",
        },
      );
    } else if (this.shouldTrailingStop(tradeData)) {
      this.logIfMatchesImportantPrice(
        tradeData,
        this.currentTrailingStopPrice,
        {
          subtype: "trailingStop",
        },
      );
    }
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

    const newSl = getNewStopLoss(parentState, tp.entry);
    if (parentState.state.currentSl != newSl) {
      parentState.state.logger.log({ type: 'sl moved', sl: newSl });
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
  constructor(parentState: AbstractState, tradeData: TradeData) {
    const tradeCloseTime = new Date(tradeData.openTime);
    super({
      ...parentState.state,
      tradeCloseTime: tradeCloseTime,
      cancelled: true,
      takeProfits: [
        {
          entry: 1,
          price: tradeData.open,
          coins: 0,
          total: 0,
          date: tradeCloseTime,
          state: 'Reached TP before entry',
        }
      ]
    });

    this.state.logger.log({
      type: "close",
      subtype: "TP before entry",
      timestamp: tradeData.openTime,
    });
  }
}

class AllProfitsDoneState extends AbstractState {
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

    this.state.logger.log({
      type: "close",
      subtype: "all TPs reached",
      tp: tp.entry,
      timestamp: tradeData.openTime,
    });
  }
}

class StopLossReachedState extends AbstractState {
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

class CancelledState extends AbstractState {
  constructor(previousState: AbstractState, tradeData: TradeData) {
    const closeTime = new Date(tradeData.openTime);
    const price = tradeData.open;
    const soldCoins = previousState.remainingCoins;
    const total = soldCoins * price;

    previousState.state.logger.log({
      type: "cancelled",
      price: price,
      total: total,
      sold: soldCoins,
      timestamp: tradeData.openTime,
    });

    const newState: InternalState = {
      ...previousState.state,
      tradeCloseTime: closeTime,
      sl: {
        coins: soldCoins,
        price: price,
        entry: -1,
        total: total,
        date: closeTime,
      },
      cancelled: true,
    };
    super(newState);
  }
}

export function createLogger(): Logger & { events: LogEvent[] } {
  return {
    events: [] as LogEvent[],
    log: function (event: LogEvent) {
      this.events.push(event);
    },
    verbose: function (event: LogEvent) {
      this.log(event);
    },
  };
}
