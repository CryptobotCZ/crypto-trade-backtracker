import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";

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
