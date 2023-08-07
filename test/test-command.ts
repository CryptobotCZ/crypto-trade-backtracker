import {assertEquals} from "https://deno.land/std@0.192.0/testing/asserts.ts";
import * as fs from "https://deno.land/std@0.192.0/fs/mod.ts";

Deno.test(async function runBacktrackCommand() {
  const command = new Deno.Command('deno', {
    args: getDenoCommandArgs([
      'run',
      '--allow-read',
      '--allow-write',
      "--allow-net",
      `main.ts`,
      'analyze',
      "--downloadExchangeData",
      '--locale', 'en_US', '--delimiter', '","',
      '--outputPath', "eth-results.csv",
      "./data/test-order-eth.json",
    ])
  });

  const result = await command.output();
  const isReadableFile = await fs.exists("eth-results.csv", {
    isReadable: true,
    isFile: true,
  });
  const isReadableDir = await fs.exists("cache", {
    isReadable: true,
    isFile: true,
  });

  assertEquals(result.code, 0);
  assertEquals(true, isReadableFile);
  assertEquals(true, isReadableDir);
});

Deno.test(async function runBacktrackJsonOutput() {
  const command = new Deno.Command('deno', {
    args: getDenoCommandArgs([
      'run',
      '--allow-read',
      '--allow-write',
      "--allow-net",
      `main.ts`,
      'analyze',
      "--downloadExchangeData",
      '--locale', 'en_US', '--delimiter', '","',
      '--outputPath', "eth-results.json",
      "./data/test-order-eth.json",
    ])
  });

  const result = await command.output();
  const isReadableFile = await fs.exists("eth-results.json", {
    isReadable: true,
    isFile: true,
  });
  const isReadableDir = await fs.exists("cache", {
    isReadable: true,
    isFile: true,
  });

  assertEquals(result.code, 0);
  assertEquals(true, isReadableFile);
  assertEquals(true, isReadableDir);
});

Deno.test(async function runBacktrackAnonymizedCsv() {
  const command = new Deno.Command('deno', {
    args: getDenoCommandArgs([
      'run',
      '--allow-read',
      '--allow-write',
      "--allow-net",
      `main.ts`,
      'analyze',
      "--downloadExchangeData",
      '--locale', 'en_US', '--delimiter', '","',
      "--anonymize",
      '--outputPath', "eth-results-anon.csv",
      "./data/test-order-eth.json",
    ])
  });

  const result = await command.output();
  const isReadableFile = await fs.exists("eth-results-anon.csv", {
    isReadable: true,
    isFile: true,
  });

  const isReadableDir = await fs.exists("cache", {
    isReadable: true,
    isFile: true,
  });

  assertEquals(result.code, 0);
  assertEquals(true, isReadableFile);
  assertEquals(true, isReadableDir);
});
