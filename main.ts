import yargs from 'https://deno.land/x/yargs/deno.ts'
import { Arguments } from 'https://deno.land/x/yargs/deno-types.ts'
import { backtrackCommand, defaultCornixConfig } from './src/commands/backtrack.ts';

const addInputFilesArg = (yargs: any) => {
  yargs.positional('orderFiles', {
    describe: 'Path to directory with order .json files or to individual order .json files',
    type: 'string[]'
  });
};

const addCornixConfigFile = (yargs: any) => {
  yargs.option('cornixConfigFile', {
    describe: 'Path to directory with order .json files or to individual order .json files',
    type: 'string'
  });
};

const addCandlesFiles = (yargs: any) => {
  yargs.option('candlesFiles', {
    describe: 'Path to directory with candles .json files or to individual candles .json files in Binance format',
    type: 'string[]'
  });
};

const addOutputPathArg = (yargs: any) => {
  yargs.option('outputPath', {
    describe: 'Exported .csv file path',
    type: 'string'
  });
};

const addDownloadBinanceData = (yargs: any) => {
  yargs.option('downloadBinanceData', {
    describe: 'Download trade data from binance',
    type: 'boolean'
  });
};

const addDebugParam = (yargs: any) => {
  yargs.option('debug', {
    describe: 'Debug',
    type: 'boolean',
    default: false,
  });
};

const addDetailedLog = (yargs: any) => {
  yargs.option('detailedLog', {
    describe: 'Detailed log - run backtracing util full TP or SL',
    type: 'boolean',
    default: false,
  });
};

yargs(Deno.args)
  .command('backtrack <orderFiles...>', 'Backtrack trades from input .json files', (yargs: any) => {
    addOutputPathArg(yargs);
    addInputFilesArg(yargs);
    addCornixConfigFile(yargs);
    addCandlesFiles(yargs);
    addDownloadBinanceData(yargs);
    addDebugParam(yargs);
    addDetailedLog(yargs);
  }, async (argv: Arguments) => {
    await backtrackCommand(argv as any);
  })
  .command('defaults', 'Show default cornix config', () => {}, (argv: Arguments) => {
    console.log('Default configuration: ');
    console.log(JSON.stringify(defaultCornixConfig));
  })
  .strictCommands()
  .demandCommand(1)
  .version('version', '0.0.1').alias('version', 'V')
  .argv;
