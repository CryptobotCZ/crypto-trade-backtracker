import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";
import {Order} from "./backtrack-engine.ts";
import {PreBacktrackedData} from "./commands/backtrack.ts";
import {BinanceItemArray, transformArrayToObject} from "./exchanges/binance-api.ts";

export async function getFileContent<T>(path: string): Promise<T> {
    const isReadableFile = await fs.exists(path, {
        isReadable: true,
        isFile: true,
    });

    if (!isReadableFile) {
        throw new Error(`Invalid file ${path}`);
    }

    const fileContent = await Deno.readTextFile(path);
    const fixedFileContent = fileContent
        ?.replace(/\n/g, " ")
        ?.replace(/\r/g, " ")
        ?.replace(/\t/g, " ") ?? "";

    return JSON.parse(fixedFileContent) as T;
}


export async function readInputFilesFromJson<T>(inputPaths: string[]): Promise<T[]> {
    let messages: T[] = [];

    for (const path of inputPaths) {
        const isReadableDir = await fs.exists(path, {
            isReadable: true,
            isDirectory: true,
        });

        const isReadableFile = await fs.exists(path, {
            isReadable: true,
            isFile: true,
        });

        if (isReadableDir) {
            const directory = path;
            for await (const dirEntry of Deno.readDir(directory)) {
                if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
                    const messagesFromFile = await getFileContent<T[]>(
                        `${directory}/${dirEntry.name}`,
                    );
                    messages = [...messages, ...messagesFromFile];
                }
            }
        } else if (isReadableFile) {
            const messagesFromFile = await getFileContent<T[]>(path);
            messages = [...messages, ...messagesFromFile];
        } else {
            console.error(`Could not read file ${path}`);
        }
    }

    return messages;
}

export async function readInputCandles(candlesFiles: string[]) {
    const binanceRawData = await readInputFilesFromJson<BinanceItemArray>(candlesFiles);
    const tradeData = binanceRawData.map((x) => transformArrayToObject(x));

    return tradeData;
}

export async function getInput(args: { fromDetailedLog?: boolean, orderFiles: string[] }){
    const rawData = args.fromDetailedLog
        ? await readInputFilesFromJson<PreBacktrackedData>(args.orderFiles)
        : (await readInputFilesFromJson<Order>(args.orderFiles)).map((x) => ({
            order: x,
            tradeData: null,
            info: [],
            sortedUniqueCrosses: [],
        }));

    const result = rawData.map(x => {
        const events = x.order?.events?.map(event => ({
            ...event,
            date: new Date(event.date),
        })) ?? [];

        return {
            ...x,
            order: {
                ...x.order,
                direction: x.order.direction?.toUpperCase(),
                date: x.order.date != null
                    ? new Date(x.order.date)
                    : new Date(Date.now()),
                events,
            } as Order,
        };
    });

    const tradesMap = (result as any[]).reduce(
      (map: Map<Order, PreBacktrackedData>, orderData: PreBacktrackedData) => {
        return map.set(orderData.order, orderData);
      },
      new Map(),
    ) as Map<Order, PreBacktrackedData>;

    const orders = result.map((x) => x.order);

    return {
      tradesMap,
      orders,
    };
}

