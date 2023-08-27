// due to CORS policies in browsers, it is difficult to import local files, so server is needed
import { serve } from "https://deno.land/std@0.194.0/http/mod.ts";
import { lookup } from "https://deno.land/x/media_types@deprecated/mod.ts";
import yargs from "https://deno.land/x/yargs@v17.7.2-deno/deno.ts";
import { Arguments } from "https://deno.land/x/yargs@v17.7.2-deno/deno-types.ts";
import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

async function getFilesFromDirectory(input: string|string[]) {
  const inputPaths = Array.isArray(input) ? input : [input];

  const files = [];

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
          files.push(dirEntry.name);
        }
      }
    } else if (isReadableFile) {
      const fileNameParts = path.split(/[\/\\]/);
      const justFileName = fileNameParts.at(-1);
      files.push(justFileName);
    }
  }

  return files;
}

async function readFile(fileName: string) {
  const path = `${global.inputArguments.orderFiles}/${fileName}`;

  const isReadableFile = await fs.exists(path, {
    isReadable: true,
    isFile: true,
  });

  if (isReadableFile) {
    const fileContent = await Deno.readTextFile(path);
    const fixedFileContent = fileContent
      ?.replace(/\n/g, " ")
      ?.replace(/\r/g, " ")
      ?.replace(/\t/g, " ") ?? "";
    return fixedFileContent;
  }
}

export const reqHandler = async (req: Request) => {
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  const urlPathName = new URL(req.url).pathname;
  let filePath = path.join(__dirname, urlPathName);

  if (urlPathName === "/" || urlPathName === "") {
    filePath = path.join(__dirname, "index.html");
  }

  if (urlPathName.match(/files\/?/)) {
    const fileToRead = urlPathName.substring(1).split("/")?.[1];
    let json = null;

    if (fileToRead != null) {
      json = await readFile(fileToRead);
    } else {
      const directoryContent = await getFilesFromDirectory(
        global.inputArguments.orderFiles,
      );
      json = JSON.stringify(directoryContent);
    }
    const length = (json ?? '').length?.toString();

    return new Response(json, {
      headers: {
        "content-length": length,
        "content-type": "application/json",
      },
    });
  }

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

export const addInputFilesArg = (yargs: any) => {
  yargs.positional("orderFiles", {
    describe:
      "Path to directory with order .json files or to individual order .json files",
    type: "string[]",
  });
};

export const addPort = (yargs: any) => {
  yargs.option("port", {
    describe: "Port server will listen on",
    type: "number",
    default: 8080,
  });
};

export const addServerArgs = (yargs: any) => {
  addPort(yargs);
  addInputFilesArg(yargs);
};

const global = { inputArguments: null } as any;

export async function startServer(argv: Arguments) {
    global.inputArguments = argv;
    await serve(reqHandler, { port: argv.port ?? 8080 });
}
