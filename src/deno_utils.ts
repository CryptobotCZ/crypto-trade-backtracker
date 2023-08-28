import { path } from '../deps.ts';

export function isStandalone() {
    return Deno.execPath().indexOf("deno") === -1;
}

export function getProgramDirectory() {
    if (isStandalone()) {
        return path.dirname(Deno.execPath());
    } else {
        return path.dirname(path.fromFileUrl(Deno.mainModule));
    }
}
