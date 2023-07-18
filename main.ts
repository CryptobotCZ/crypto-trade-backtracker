import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import {
  backtrackCommand,
  defaultCornixConfig,
} from "./src/commands/backtrack.ts";
import {  global } from "./src/globals.ts";

const addInputFilesArg = (yargs: any) => {
  yargs.positional("orderFiles", {
    describe:
      "Path to directory with order .json files or to individual order .json files",
    type: "string[]",
  });
};

const addCornixConfigFile = (yargs: any) => {
  yargs.option("cornixConfigFile", {
    describe:
      "Path to directory with order .json files or to individual order .json files",
    type: "string",
  });
};

const addCandlesFiles = (yargs: any) => {
  yargs.option("candlesFiles", {
    describe:
      "Path to directory with candles .json files or to individual candles .json files in Binance format",
    type: "string[]",
  });
};

const addOutputPathArg = (yargs: any) => {
  yargs.option("outputPath", {
    describe: "Exported .csv file path",
    type: "string",
  });
};

const addDownloadBinanceData = (yargs: any) => {
  yargs.option("downloadBinanceData", {
    describe: "Download trade data from binance",
    type: "boolean",
  });
};

const addDebugParam = (yargs: any) => {
  yargs.option("debug", {
    describe: "Debug",
    type: "boolean",
    default: false,
  });
};

const addDetailedLog = (yargs: any) => {
  yargs.option("detailedLog", {
    describe: "Detailed log - run backtracing util full TP or SL",
    type: "boolean",
    default: false,
  });
};

const addFromDetailedLog = (yargs: any) => {
  yargs.option("fromDetailedLog", {
    describe: "Backtrack from detailed log file",
    type: "boolean",
    default: false,
  });
};

const addDateRanges = (yargs: any) => {
    yargs.option("fromDate", {
        describe: "Backtrack orders opened after fromDate. Unix timestamp format in ms.", // 'yyyy-MM-dd hh:mm:ss' format o
        type: "string"
    });

    yargs.option("toDate", {
        describe: "Backtrack orders opened until toDate. Unix timestamp format in ms.",
        type: "string"
    });

    yargs.option("finishRunning", {
        describe: "Let trades opened until toDate finish.",
        type: "boolean",
        default: false,
    });
};

const addCachePath = (yargs: any) => {
  yargs.option("cachePath", {
    describe: "Path to cached candle data from Binance (or any compatible format)",
    type: "string",
  });
};

const addOutputFormattingArgs = (yargs: any) => {
  yargs.option('anonymize');
  yargs.option('locale', {
    type: 'string'
  });
  yargs.option('delimiter', {
    type: 'string'
  });
};

yargs(Deno.args)
  .command(
    "backtrack <orderFiles...>",
    "Backtrack trades from input .json files",
    (yargs: any) => {
      addOutputPathArg(yargs);
      addInputFilesArg(yargs);
      addCornixConfigFile(yargs);
      addCandlesFiles(yargs);
      addDownloadBinanceData(yargs);
      addDebugParam(yargs);
      addDetailedLog(yargs);
      addFromDetailedLog(yargs);
      addDateRanges(yargs);
      addOutputFormattingArgs(yargs);
      addCachePath(yargs);
    },
    async (argv: Arguments) => {
      global.inputArguments = argv;
      await backtrackCommand(argv as any);
    },
  )
  .command(
    "defaults",
    "Show default cornix config",
    () => {},
    (argv: Arguments) => {
      console.log("Default configuration: ");
      console.log(JSON.stringify(defaultCornixConfig));
    },
  )
  .strictCommands()
  .demandCommand(1)
  .version("version", "0.0.1").alias("version", "V")
  .argv;
