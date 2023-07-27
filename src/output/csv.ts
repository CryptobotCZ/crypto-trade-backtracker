import { Order } from "../backtrack-engine.ts";
import { DetailedBackTrackResult } from "../commands/backtrack.ts";
import {CornixConfiguration} from "../cornix.ts";

export interface ExportConfig {
  locale?: string;
  delimiter?: string;
  decimalSeparator?: string;
}

const defaultConfig: ExportConfig = {
  locale: "en-UK",
  delimiter: ",",
};

function getDecimalSeparator(locale: string) {
  const numberWithDecimalSeparator = 1.1;
  const intl = new Intl.NumberFormat(locale);

  return intl.formatToParts(numberWithDecimalSeparator)
    .find((part) => part.type === "decimal")
    ?.value;
}

function fillMissingValuesWithDefault(
  array: number[],
  expectedLength: number,
  defaultValue = 0,
) {
  return array.concat([
    ...Array(expectedLength - array.length).map((_) => defaultValue),
  ]);
}

function getTPPotentialProfit(order: Order): number[] {
  return order.tps.map((tpTarget: number) => {
    const entryPrice = order.entries[0];
    const lev = order.leverage ?? 1;

    return Math.abs(tpTarget - entryPrice) / entryPrice * lev * 100;
  });
}

function getPotentialLoss(order: Order): number {
  const entryPrice = order.entries[0];
  const lev = order.leverage ?? 1;
  const sl = order.sl ?? 0;

  return Math.abs(entryPrice - sl) / entryPrice * lev * 100 * -1;
}

function getMaxPotentialProfit(order: Order): number {
  return getTPPotentialProfit(order)[order.tps.length];
}

export async function exportCsv(
  backTrackResults: DetailedBackTrackResult[],
  cornixConfig: CornixConfiguration,
  path: string,
  anonymize: boolean = false,
  config: ExportConfig = defaultConfig,
) {
  const usedConfig = {
    ...defaultConfig,
    ...config,
  };

  const intl = new Intl.NumberFormat(usedConfig.locale, {
    useGrouping: false,
  });
  const decimalSeparator = usedConfig.decimalSeparator ??
    getDecimalSeparator(usedConfig.locale!);

  const maxStats = backTrackResults.reduce((stats: any, x) => {
    return {
      maxCountTP: Math.max(stats.maxCountTP, x.order.tps.length),
      maxCountEntry: Math.max(stats.maxCountEntry, x.order.entries.length),
    };
  }, {
    maxCountTP: 0,
    maxCountEntry: 0,
  });

  const sensitiveDataHeader = [
    ...[...Array(maxStats.maxCountEntry).keys()].map((x, idx) =>
      `EP${idx + 1}`
    ),
    ...[...Array(maxStats.maxCountTP).keys()].map((x, idx) => `TP${idx + 1}`),
    "stopLoss",
  ];

  const csvHeader = [
    "signalId",
    "date open",
    "date closed",
    "coin",
    "exchange",
    "direction",
    "leverage",
    "avgEntryPrice",
    "avgTpValue",
    "maxReachedEntry",
    "maxReachedTp",
    "pnl",
    "allocatedAmount",
    "spentAmount",
    "realizedProfit",
    "unrealizedProfit",
    "totalProfit",
    "status",
    ...(anonymize ? [] : sensitiveDataHeader),
    ...[...Array(maxStats.maxCountTP).keys()].map((x, idx) =>
      `TP Pot. Profit ${idx + 1}`
    ),
    "potentialLoss",
  ];

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const csvRows = backTrackResults.map((x) => {
    const order = x.order;

    const sensitiveData = [
      ...fillMissingValuesWithDefault(order.entries, maxStats.maxCountEntry),
      ...fillMissingValuesWithDefault(order.tps, maxStats.maxCountTP),
      order.sl,
    ];

    const potentialProfitValues = fillMissingValuesWithDefault(
      getTPPotentialProfit(x.order),
      maxStats.maxCountTP,
    );

    return [
      (order as any).signalId,
      order.date.toLocaleDateString(usedConfig.locale, options as any),
      x.info.closeTime?.toLocaleDateString(usedConfig.locale, options as any) ??
        "",
      order.coin,
      order.exchange,
      order.direction,
      order.leverage,
      x.info.averageEntryPrice,
      0, // x.info.avgTpValue,
      x.info.reachedEntries,
      x.info.reachedTps,
      x.info.pnl,
      x.info.allocatedAmount,
      x.info.spentAmount,
      x.info.realizedProfit,
      x.info.unrealizedProfit,
      x.info.profit,
      x.info.isClosed ? "closed" : "open",
      ...(anonymize ? [] : sensitiveData),
      ...potentialProfitValues,
      getPotentialLoss(x.order),
    ].map((x, idx) => {
      const val = idx > 0 && typeof x === "number" ? intl.format(x) : x;

      if (val?.toString()?.includes(usedConfig.delimiter)) {
        return `"${val}"`;
      }

      return val;
    });
  });

  const emptyRows = Array.from({ length: 3 }).map(_ => []);
  const cornixConfigStr = JSON.stringify(cornixConfig, undefined, 2);

  const separator = usedConfig.delimiter;
  const data = [ csvHeader, ...csvRows, ...emptyRows, [ cornixConfigStr ], ]
      .map((row) => row.join(separator))
      .join("\n",);

  await Deno.writeTextFileSync(path, data);
}
