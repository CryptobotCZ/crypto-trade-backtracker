import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import {
    backtrackCommand, backtrackInAccountModeCommand,
    defaultCornixConfig,
} from "./src/commands/backtrack.ts";
import { global } from "./src/globals.ts";
import { updateCacheStructure } from "./src/commands/update-cache.ts";
import {installedExchanges} from "./src/exchanges/exchanges.ts";
import { YargsInstance } from "https://deno.land/x/yargs@v17.7.2-deno/build/lib/yargs-factory.js";

const addInputFilesArg = (yargs: YargsInstance) => {
  yargs.positional("orderFiles", {
    describe:
      "Path to directory with order .json files or to individual order .json files",
    type: "string[]",
  });
};

const addCornixConfigFile = (yargs: YargsInstance) => {
  yargs.option("cornixConfigFile", {
    describe:
      "Path to directory with order .json files or to individual order .json files",
    type: "string",
  });
};

const addCandlesFiles = (yargs: YargsInstance) => {
  yargs.option("candlesFiles", {
    describe:
      "Path to directory with candles .json files or to individual candles .json files in Binance format",
    type: "string[]",
  });
};

const addOutputPathArg = (yargs: YargsInstance) => {
  yargs.option("outputPath", {
    describe: "Exported .csv file path",
    type: "string",
  });
};

const addDownloadExchangeData = (yargs: YargsInstance) => {
  yargs.option("downloadBinanceData", {
    describe: "Download trade data from binance",
    type: "boolean",
  });

  yargs.option("downloadExchangeData", {
      describe: "Download trade data from exchange",
      type: "boolean",
      default: false,
  });

  yargs.option("exchange", {
      describe: "Exchange to download data from",
      type: "string",
      default: "binance"
  });
  yargs.choices("exchange", installedExchanges.map(x => x.exchange.toLowerCase()));
};

const addDebugParam = (yargs: YargsInstance) => {
  yargs.option("debug", {
    describe: "Debug",
    type: "boolean",
    default: false,
  });

yargs.option("verbose", {
    describe: "Debug",
    type: "boolean",
    default: false,
});
};

const addDetailedLog = (yargs: YargsInstance) => {
  yargs.option("detailedLog", {
    describe: "Detailed log - run backtracing util full TP or SL",
    type: "boolean",
    default: false,
  });
};

const addFromDetailedLog = (yargs: YargsInstance) => {
  yargs.option("fromDetailedLog", {
    describe: "Backtrack from detailed log file",
    type: "boolean",
    default: false,
  });
};

const addDateRanges = (yargs: YargsInstance) => {
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

const addCachePath = (yargs: YargsInstance) => {
  yargs.option("cachePath", {
    describe: "Path to cached candle data from Binance (or any compatible format)",
    type: "string",
  });
};

const addAccountMode = (yargs: any) => {
  yargs.option("accountMode", {
    describe: "Use account mode for backtracking and simulate the trade",
    type: "bool",
    default: false,
  });

  yargs.option("accountInitialBalance", {
    describe: "Set account initial balance for account mode",
    type: "number",
    default: 1000
  });

  yargs.option("maxActiveOrders", {
      describe: "Set maximal active orders for account mode",
      type: "number",
      default: -1
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

  yargs.option('outputFormat', {
      type: 'string',
      default: 'detailed',
  });
  yargs.choices('outputFormat', ['detailed', 'cornixLog']);
};

const input = yargs(Deno.args)
  .command(
    "backtrack <orderFiles...>",
    "Backtrack trades from input .json files",
    (yargs: YargsInstance) => {
      addOutputPathArg(yargs);
      addInputFilesArg(yargs);
      addCornixConfigFile(yargs);
      addCandlesFiles(yargs);
      addDownloadExchangeData(yargs);
      addDebugParam(yargs);
      addDetailedLog(yargs);
      addFromDetailedLog(yargs);
      addDateRanges(yargs);
      addOutputFormattingArgs(yargs);
      addCachePath(yargs);
      addAccountMode(yargs);
    },
    async (argv: Arguments) => {
      global.inputArguments = argv;

      const backtrack = argv.accountMode
          ? backtrackInAccountModeCommand
          : backtrackCommand;

      await backtrack(argv as any);
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
    .command('update-cache', 'Updates cache structure', (yargs: YargsInstance) => {
        addCachePath(yargs);
    }, async (argv: Arguments) => {
        console.log("Updating cache structure...");
        await updateCacheStructure(argv.cachePath);
    })
  .strictCommands()
  .demandCommand(1)
  .version("version", "0.3.0").alias("version", "V");

if (Deno.execPath().indexOf("deno") === -1) {
    input.scriptName('').parse();
} else {
    input.parse();
}
