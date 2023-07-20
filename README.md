# Crypto Trade Backtracker

Example how to run:

`deno run --allow-all main.ts` - this will show available commands
`deno run --allow-all main.ts backtrack --downloadBinanceData --debug data/test-orders-02.json`

Optimally use it with [crypto-signals-analysis](../crypto-signals-analysis)

## Running charts server

`deno run --allow-read --allow-net charts/server.ts --port 8080 /absolute/path/to/results/dir`

## Example workflow

1. Open the signal group telegram channel (if it has separate cornix channel like Binance Killers have, prefer the cornix channel)
2. Export chat history
3. Run crypto-signals-analysis
 (example: `deno run --allow-read --allow-write main.ts export-from-source --signals generic --outputPath exported-orders.json --format order-json messages.html`)
4. First run to get the interesting points
 `deno run --allow-all main.ts backtrack --downloadBinanceData --debug --detailedLog --fromDate 1685577600000 --toDate 1688169600000 --outputPath backtrack-intermediate-result.json exported-orders.json`
5. Second run to get the final report
 `deno run --allow-all main.ts backtrack --debug --fromDetailedLog --fromDate 1688169600000 --outputPath final-report.csv --delimiter ";" backtrack-intermediate-result.json`
 (final report can be obtained also from the first run, but workflow with 2 runs is better for finding the right strategy)

## Sample files

- Just show the values: `deno run --allow-all main.ts backtrack --downloadBinanceData data/test-order-eth.json`
- Show the values and collect detailed log data: `deno run --allow-all main.ts backtrack --detailedLog --downloadBinanceData --outputPath backtrack-intermediate-result-eth.json data/test-order-eth.json`
- Get the csv report:  `deno run --allow-all main.ts backtrack --fromDetailedLog  --outputPath final-report-eth.csv --delimiter ";" backtrack-intermediate-result-eth.json`
