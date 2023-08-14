import { fs } from "../../deps.ts";
import { installedExchanges } from "../exchanges/exchanges.ts";

export async function updateCacheStructure(cachePath?: string) {
    cachePath ??= 'cache';

    const isReadableDir = await fs.exists(cachePath, {
        isReadable: true,
        isDirectory: true,
    });

    if (!isReadableDir) {
        console.error('Cache path not readable');
        return -1;
    }

    await updateCacheStructureToV2(cachePath);
    await updateCacheStructureToV3(cachePath);
}

export async function updateCacheStructureToV2(cachePath: string) {
    for await (const dirEntry of Deno.readDir(cachePath)) {
        if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
            const originalPath = `${cachePath}/${dirEntry.name}`;
            const fileNameParts = dirEntry.name.split('_');
            const directoryStructure = [ fileNameParts[1], fileNameParts[0] ].join('/');

            const fullCacheDir = `${cachePath}/${directoryStructure}`;
            const newPath = `${fullCacheDir}/${dirEntry.name}`;

            await fs.ensureDir(fullCacheDir);
            await Deno.rename(originalPath, newPath);
        }
    }
}

export async function updateCacheStructureToV3(cachePath: string) {
    const exchangesDirNames = new Set(installedExchanges.map(x => x.exchange));

    for await (const dirEntry of Deno.readDir(cachePath)) {
        if (dirEntry.isDirectory && !exchangesDirNames.has(dirEntry.name)) {
            console.log(`Migrating directory ${dirEntry.name} to 'binance' subdirectory...`);

            const fullCacheDir = `${cachePath}/binance`;
            const originalPath = `${cachePath}/${dirEntry.name}`;
            const newPath = `${fullCacheDir}/${dirEntry.name}`;

            await fs.ensureDir(fullCacheDir);
            await Deno.rename(originalPath, newPath);
        }
    }
}
