// due to CORS policies in browsers, it is difficult to import local files, so server is needed
import { serve } from "https://deno.land/std/http/mod.ts";
import { lookup } from "https://deno.land/x/media_types/mod.ts";

const BASE_PATH = ".";

const reqHandler = async (req: Request) => {
    let filePath = BASE_PATH + new URL(req.url).pathname;
    
    if (filePath === '/' || filePath === '' || filePath === './') {
        filePath = 'index.html';
    }
    
    console.log(filePath);
    let fileSize;
    try {
        fileSize = (await Deno.stat(filePath)).size;
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return new Response(null, { status: 404 });
        }
        return new Response(null, { status: 500 });
    }
    const body = (await Deno.open(filePath)).readable;
    return new Response(body, {
        headers: {
            "content-length": fileSize.toString(),
            "content-type": lookup(filePath) || "application/octet-stream",
        },
    });
};

serve(reqHandler, { port: 8080 });
