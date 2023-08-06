import {AbstractState, getBackTrackEngine, Logger, Order} from "./backtrack-engine.ts";
import {
    calculateWeightedAverage,
    CornixConfiguration,
    getFlattenedCornixConfig, getOrderAmount,
    getWeightedAverageEntryPrice,
    validateOrder
} from "./cornix.ts";
import {getTradeDataWithCache, loadDataFromCache, TradeData} from "./exchanges/exchanges.ts";
import {mapGetOrCreate} from "./utils.ts";
import {BackTrackArgs, getSortedUniqueCrosses, writeSingleTradeResult} from "./commands/backtrack.ts";

export interface OrderState {
    order: Order;
    state: AbstractState;
    events: any[];
    config: CornixConfiguration;
}

export interface SkippedOrder {
    reason: string;
    order: Order;
}

export interface AccountState {
    startTime: number;
    endTime: number;
    previousTime: number;
    currentTime: number;
    remainingOrders: Order[];
    skippedOrders: SkippedOrder[];
    activeOrders: OrderState[];
    finishedOrders: OrderState[];

    initialBalance: number;
    availableBalance: number;
    balanceInOrders: number;

    openOrdersProfit: number;
    openOrdersUnrealizedProfit: number;
    openOrdersRealizedProfit: number;
    closedOrdersProfit: number;

    largestAccountDrawdown: number;
    largestAccountGain: number;
    largestOrderDrawdown: number;
    largestOrderGain: number;

    config: CornixConfiguration;

    maxActiveOrders: number;
    args: BackTrackArgs;

    logger: Logger;
}

export interface AccountDailyStats {
    accountBalance: number;
    balanceInOrders: number;
    realizedProfitPerDay: number;
    unrealizedProfitPerDay: number;
    realizedPnlPerDay: number;
    unrealizedPnlPerDay: number;
    day: Date;
}

export class AccountSimulation {
    // exchange, coin, date, trade-data
    private tradeData = new Map<string, Map<string, Map<number, TradeData>>>();

    private state: AccountState = {
        startTime: 0,
        previousTime: -Infinity,
        endTime: 0,
        currentTime: 0,

        remainingOrders: [],
        activeOrders: [],
        skippedOrders: [],
        finishedOrders: [],

        initialBalance: 0,
        availableBalance: 0,
        balanceInOrders: 0,
        openOrdersProfit: 0,
        openOrdersUnrealizedProfit: 0,
        openOrdersRealizedProfit: 0,
        closedOrdersProfit: 0,

        largestAccountDrawdown: Infinity,
        largestAccountGain: -Infinity,
        largestOrderDrawdown: Infinity,
        largestOrderGain: -Infinity,

        config: null as any,
        maxActiveOrders: Infinity,
        args: null as any,
        logger: null as any,
    };
    private dailyStats: AccountDailyStats[] = [];

    constructor(args: BackTrackArgs, orders: Order[], cornixConfig: CornixConfiguration, logger?: Logger) {
        this.state.startTime = Math.min(...orders.map(x => x.date.setSeconds(0, 0)));
        this.state.currentTime = this.state.startTime;
        this.state.endTime = new Date().getTime();
        this.state.config = cornixConfig;
        this.state.args = args;

        const maxActiveOrders = args.maxActiveOrders ?? cornixConfig.maxActiveOrders ?? Infinity;
        this.state.maxActiveOrders = maxActiveOrders == -1 ? Infinity : maxActiveOrders;
        this.state.availableBalance = args.accountInitialBalance ?? 1000;

        this.state.remainingOrders = orders.toSorted((x, y) => x.date.getTime() - y.date.getTime());
        this.state.initialBalance = this.state.availableBalance;

        this.state.config.amount = { type: 'percentage', percentage: 2 };

        this.state.logger = logger ?? { log: () => {}, verbose: () => {} };

        this.state.logger.log({
            type: "info",
            initialAccountBalance: this.state.availableBalance,
            time: this.state.currentTime,
        });

        this.dailyStats = [];
    }

    async runBacktrackingInAccountMode() {
        const msInMinute = 60 * 1000;
        const msInDay = msInMinute * 60 * 24;

        const currentDayUtcTimestamp = new Date(this.state.currentTime).setUTCHours(0, 0, 0, 0);
        let currentDay = new Date(currentDayUtcTimestamp).getTime();
        let previousDay = new Date(currentDayUtcTimestamp - msInDay).getTime();

        performance.mark("backtrack_start");

        let currentDayStats: AccountDailyStats = {
            realizedProfitPerDay: 0,
            unrealizedProfitPerDay: 0,
            realizedPnlPerDay: 0,
            accountBalance: this.state.availableBalance,
            balanceInOrders: this.state.balanceInOrders,
            unrealizedPnlPerDay: 0,
            day: new Date(currentDay),
        };

        while (this.state.currentTime < this.state.endTime) {
            try {
                this.updateActiveOrders();

                const remainder = this.state.currentTime % msInDay;
                if (remainder === 0) {
                    // probably new day, write new daily stats
                    previousDay = currentDay;
                    currentDay = this.state.currentTime;

                    this.dailyStats.push(currentDayStats);

                    currentDayStats = {
                        realizedProfitPerDay: 0,
                        unrealizedPnlPerDay: 0,
                        realizedPnlPerDay: 0,
                        accountBalance: this.state.availableBalance,
                        balanceInOrders: this.state.balanceInOrders,
                        unrealizedProfitPerDay: 0,
                        day: new Date(new Date(previousDay).setUTCHours(0, 0, 0, 0)),
                    };

                    if (this.state.args.debug) {
                        console.log(`Day ${this.dailyStats.length} stats: Profit: ${currentDayStats.realizedProfitPerDay}, PnL: ${currentDayStats.realizedPnlPerDay}`);
                    }

                    if (this.state.activeOrders.length === 0 && this.state.remainingOrders.length === 0) {
                        break;
                    }
                }

                // Then process all open orders
                const activeOrdersCopy = [ ...this.state.activeOrders ]; // prevent concurrent modification

                let currentPnl = 0;

                currentDayStats.unrealizedProfitPerDay = 0;

                for (const order of activeOrdersCopy) {
                    const exchange = getExchange(order.order.exchange ?? '') ?? 'binance';
                    const tradeEntry = await this.loadTradeDataForSymbol(order.order.coin, this.state.currentTime, exchange);
                    if (tradeEntry == null) {
                        console.log(`Missing trade data for ${order.order.coin}`);
                        continue;
                    }
//          console.log(`Coin: ${order.order.coin} - date: ${new Date(tradeEntry.openTime)} - open ${tradeEntry.open}`);

                    const initialState = order.state;
                    let previousState = order.state;

                    do {
                        previousState = order.state;
                        order.state = order.state.updateState(tradeEntry);
                    } while (order.state != previousState);

                    if (initialState.saleValue < order.state.saleValue) {
                        const balanceBefore = this.state.availableBalance;

                        if (!initialState.info.reachedAllEntries && order.state.info.reachedTps > 0) {
                            // didn't reach all entries, but hit TP -> free the amount allocated to unrealized entry points
                            this.state.availableBalance +=  order.state.remainingAmount;
                            this.state.logger.log({
                                type: "close_entry",
                                order: order.state.order,
                                amount: order.state.remainingAmount,
                                time: this.state.currentTime,
                            });
                        }

                        // todo: might be missing amount allocated to order
                        // todo: check behavior for SL
                        const currentlyRealizedProfit = order.state.realizedProfit - initialState.realizedProfit;
                        const currentlyRealizedSale = (order.state.saleValue - initialState.saleValue) / order.state.leverage;
                        this.state.openOrdersRealizedProfit += currentlyRealizedProfit;
                        this.state.availableBalance += currentlyRealizedSale;

                        currentDayStats.realizedProfitPerDay += currentlyRealizedProfit;
                        this.state.balanceInOrders -= (currentlyRealizedSale - currentlyRealizedProfit);

                        const balanceAfter = this.state.availableBalance;
                        this.state.logger.log({
                            type: "tp",
                            order: order.state.order,
                            balanceBefore,
                            balanceAfter,
                            difference: balanceAfter - balanceBefore,
                            time: this.state.currentTime,
                        });
                    }

                    currentPnl += order.state.pnl;

                    this.state.largestOrderDrawdown = Math.min(this.state.largestOrderDrawdown, order.state.pnl);
                    this.state.largestOrderGain = Math.max(this.state.largestOrderGain, order.state.pnl);

                    if (order.state.isClosed) {
                        this.state.closedOrdersProfit += order.state.profit;

                        this.state.finishedOrders.push(order);
                        this.state.activeOrders.splice(this.state.activeOrders.indexOf(order), 1);

                        this.state.logger.log({
                            type: "order_closed",
                            order: order.state.order,
                            time: this.state.currentTime,
                        });
                    } else {
                        currentDayStats.unrealizedProfitPerDay += order.state.unrealizedProfit;
                    }
                }

                this.state.largestAccountDrawdown = Math.min(this.state.largestAccountDrawdown, currentPnl);
                this.state.largestAccountGain = Math.max(this.state.largestAccountGain, currentPnl);

                currentDayStats.realizedPnlPerDay = currentPnl;

                // todo: implement limit of running orders

                // TODO: Add largest consecutive drawdown
                // TODO: Add largest gain
                // TODO: Add daily PnL
            } catch (exc) {

            }
            finally {
                this.state.currentTime += msInMinute;
            }

            // if (this.state.args.debug) {
            //   const progressPct = (count / orders.length * 100).toFixed(2);
            //   console.log(`Progress: ${count} / ${orders.length} = ${progressPct}%`);
            // }
        }

        performance.mark("backtrack_end");
        const time = performance.measure(
            "backtracking",
            "backtrack_start",
            "backtrack_end",
        );

        if (this.state.args.debug) {
            console.log(`It took ${time.duration}ms`);
        }

        return this.state;
    }

    getOrdersReport() {
        const ordersWithResults = [];

        const allOrders = [ ...this.state.finishedOrders, ...this.state.activeOrders ];

        for (const result of allOrders) {
            if (this.state.args.debug) {
                const eventsWithoutCross = result.events
                    .filter(x => x.type !== 'cross')
                    .filter(x => x.level !== 'verbose' || this.state.args.verbose)
                    .map(x => ({...x, date: new Date(x.timestamp)}));
                eventsWithoutCross.forEach((event) => console.log(JSON.stringify(event)));
            }

            const results = result?.state?.info;
            writeSingleTradeResult(results);

            let sortedUniqueCrosses: any[] = [];

            if (this.state.args.detailedLog) {
                sortedUniqueCrosses = getSortedUniqueCrosses(result);
            }

            if (result != null) {
                ordersWithResults.push({
                    order: result.state.order,
                    info: result.state.info,
                    sortedUniqueCrosses: sortedUniqueCrosses.map((x) => {
                        const cloneOfX = { ...x };
                        delete cloneOfX.tradeData;

                        return cloneOfX;
                    }),
                    events: result.events.filter(x => x.level !== 'verbose' && x.type !== 'cross'),
                    tradeData: sortedUniqueCrosses.map((x) => x.tradeData),
                });
            }
        }

        return ordersWithResults;
    }

    updateActiveOrders() {
        const minuteInMs = 60 * 1000;

        // First go through remaining orders and open orders which should be opened at currentTime
        for (const order of this.state.remainingOrders) {
            if ((order.date.getTime() - this.state.currentTime) <= minuteInMs) {
                if (this.state.activeOrders.length >= this.state.maxActiveOrders) {
                    this.state.logger.log({
                        type: "info",
                        message: "Max active orders limit reached - skipping order...",
                        time: this.state.currentTime,
                    });
                    this.state.skippedOrders.push({ order, reason: 'max active orders limit reached'} );
                } else {
                    this.activateOrder(order);
                }

                this.state.remainingOrders.splice(this.state.remainingOrders.indexOf(order), 1);
            }
        }
    }

    activateOrder(order: Order) {
        const cornixConfig = this.state.config;
        const balanceBefore = this.state.availableBalance;
        const orderAmount = getOrderAmount(order, cornixConfig, balanceBefore);

        if (orderAmount > this.state.availableBalance) {
            this.state.logger.log({
                type: "info",
                message: "Insufficient balance, skipping order...",
                time: this.state.currentTime,
            });
            return;
        }

        this.state.availableBalance -= orderAmount;
        this.state.balanceInOrders += orderAmount;

        const updatedCornixConfig = getFlattenedCornixConfig(cornixConfig, order.config ?? {} as any, {
            amount: orderAmount,
        } as any);

        const { state, events } = getBackTrackEngine(updatedCornixConfig, order, {
            detailedLog: this.state.args.detailedLog,
        });

        if (this.state.args.debug) {
            console.log(`Backtracking trade ${order.coin} ${order.direction} ${order.date}`);
            console.log(JSON.stringify(order));
        }

        if (!validateOrder(order)) {
            console.log(JSON.stringify(order, undefined, 2));
            console.log('Invalid order, skipping...');
        } else {
            this.state.activeOrders.push({
                order,
                state,
                events,
                config: updatedCornixConfig,
            });
        }

        const balanceAfter = this.state.availableBalance;
        this.state.logger.log({
            type: "open_order",
            order,
            balanceBefore,
            balanceAfter,
            time: this.state.currentTime,
        });
    }

    async loadTradeDataForAllSymbols(symbols: string[], startDate: number, exchange = 'binance', interval = '1m', count = 1440) {
        const promises = symbols.map(async coin => {
            const tradeData = await loadDataFromCache(coin, exchange, interval, new Date(startDate));
            const filteredTradeData = tradeData?.filter(x => x.openTime >= startDate) ?? [];

            return { coin, tradeData: filteredTradeData };
        });

        const data = await Promise.all(promises);

        return data.reduce((map, x) => map.set(x.coin, x.tradeData), new Map<string, TradeData[] | null>());
    }

    async loadTradeDataForSymbol(symbol: string, date: number, exchange: string, interval = '1m'): Promise<TradeData> {
        const data = this.tradeData.get(exchange)?.get(symbol)?.get(date) ?? null;

        if (data != null) {
            return data;
        }

        const dayStart = new Date(date).setUTCHours(0, 0, 0, 0);

        const tradeData = await getTradeDataWithCache(symbol, interval, new Date(dayStart), exchange);
        const filteredTradeData = tradeData?.filter(x => x.openTime >= date) ?? [];

        const exchangeData = mapGetOrCreate(this.tradeData, exchange, () => new Map<string, Map<number, TradeData>>());
        const coinData = mapGetOrCreate(exchangeData, symbol, () => new Map<number, TradeData>());

        filteredTradeData.forEach(x => coinData.set(x.openTime, x));

        return coinData.get(date)!;
    }

    get info() {
        return {
            initialBalance: this.state.initialBalance,
            availableBalance: this.state.availableBalance,
            balanceInOrders: this.state.balanceInOrders,
            countActiveOrders: this.state.activeOrders.length,
            countFinishedOrders: this.state.finishedOrders.length,
            countSkippedOrders: this.state.skippedOrders.length,

            openOrdersProfit: this.state.openOrdersProfit,
            openOrdersUnrealizedProfit: this.state.openOrdersUnrealizedProfit,
            openOrdersRealizedProfit: this.state.openOrdersRealizedProfit,
            closedOrdersProfit: this.state.closedOrdersProfit,

            largestAccountDrawdown: this.state.largestAccountDrawdown,
            largestAccountGain: this.state.largestAccountGain,
            largestOrderDrawdown: this.state.largestOrderDrawdown,
            largestOrderGain: this.state.largestOrderGain,
        };
    }
}

export interface AccountState {
}

function getExchange(exchange: string) {
    if (exchange.match(/bybit/i)) {
        return 'bybit';
    } else if (exchange.match(/binance/i)) {
        return 'binance';
    }

    return null;
}
