import { LitElement, html } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class TradeInfo extends LitElement {
    static get properties() {
        return { 
            trade: { type: Object }
        };
    }

    render() {
        const trade = this.trade;

        return html`
            <div>
                <strong>Coin ${trade?.order?.coin}</strong>
                <p>Entries: ${trade?.order?.entries?.join(', ')}</p>
                <p>TPs: ${trade?.order?.tps?.join(', ')}</p>
                <p>SL: ${trade?.order?.sl}</p>
            </div>
        `;
    }
}
customElements.define('trade-info', TradeInfo);
const tradeInfo = document.createElement('trade-info');

export class TradeList extends LitElement {
    static get properties() {
        return {
            trades: { type: Array }
        };
    }

    render() {
        const getListItem = (trade, index) => ({ label: `${trade.order.coin} - ${trade.order.date.toLocaleString()}`, value: trade });
        const items = this.trades.map(getListItem);

        return html`
            <goat-select @goat:change="${this.selectTradeFromEvent}" .items="${items}" id="search-selected" placeholder="Search" search="contains" style="width: 20rem"></goat-select>
        `;
    }

    async selectTradeFromEvent(event) {
        const trade = event.detail.newItem.value;
        await this.selectTrade(trade);
    }

    async selectTrade(trade) {
        await drawTrade(trade);
        tradeInfo.trade = trade;
    }
}
customElements.define('trade-list', TradeList);

const tradeSelector = document.createElement('trade-list');
tradeSelector.trades = [];

export class FilesList extends LitElement {
    static get properties() {
        return {
            files: { type: Array }
        };
    }

    render() {
        const getListItem = (file, index) => ({ label: file, value: file });
        const items = this.files.map(getListItem);

        return html`
            <goat-select @goat:change="${this.selectFile}" .items="${items}" placeholder="Search" search="contains" style="width: 20rem"></goat-select>
        `;
    }

    async selectFile(event) {
        const file = event.detail.newItem.value;
        const tradesResponse = await fetch(`/files/${file}`);
        const trades = await tradesResponse.json();
        tradeSelector.trades = trades;
    }
}

customElements.define('file-list', FilesList);

const fileList = document.createElement('file-list');
const filesResponse = await fetch('/files');
const files = await filesResponse.json();
fileList.files = files;

document.body.append(tradeInfo);
document.body.append(fileList);
document.body.append(tradeSelector);

const graph = document.createElement('div');
graph.setAttribute('id', 'graph');
document.body.appendChild(graph);

const chart = LightweightCharts.createChart(graph, {
    width: 800,
    height: 600,
    timeScale: {
        timeVisible: true,
        borderColor: '#D1D4DC',
        secondsVisible: true
    },
    rightPriceScale: {
        visible: true,
        borderColor: '#D1D4DC',
        mode: LightweightCharts.PriceScaleMode.Normal,
        
    },
    leftPriceScale: {
        visible: true,
        borderColor: '#D1D4DC',
    },
    layout: {
        backgroundColor: '#ffffff',
        textColor: '#000',
    },
    grid: {
        horzLines: {
            color: '#F0F3FA',
        },
        vertLines: {
            color: '#F0F3FA',
        },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    },
});

var globalScaler = null;

var series = chart.addCandlestickSeries({
    upColor: 'rgb(38,166,154)',
    downColor: 'rgb(255,82,82)',
    wickUpColor: 'rgb(38,166,154)',
    wickDownColor: 'rgb(255,82,82)',
    borderVisible: false,
    autoscaleInfoProvider: original => {
        const res = original();
        globalScaler = res;
        return res;
    },
    priceFormat: {
        type: 'price',
        precision: 6,
        minMove: 0.000001,
    },
});

series.applyOptions({
    priceFormat: {
        type: 'price',
        precision: 6,
        minMove: 0.000001,
    },
});

function formatChartData(data) {
    return data.map(elem => ({
        time: elem[0] / 1000,
        open: elem[1],
        high: elem[2],
        low: elem[3],
        close: elem[4]
    }));
}

function createChartMarker(time, type, text) {
    if (type === 'buy' || type === 'open') {
        return { time: time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text };
    } else if (type === 'sell') {
        return { time: time, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text };
    } else {
        return { time: time, position: 'aboveBar', color: '#c500ff', shape: 'circle', text };
    }
}

function calculateSMA(data, count) {
    var avg = function(data) {
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += +data[i].open;
        }
        return sum / data.length;
    };
    var result = [];
    for (var i=count - 1, len=data.length; i < len; i++){
        var val = avg(data.slice(i - count + 1, i));
        result.push({ time: data[i].time, value: val});
    }
    return result;
}

async function getTradeData(startTime, pair, interval, limit = 1440) {
    pair = pair.replace('/', '');
    
    const url = "https://fapi.binance.com/fapi/v1/klines";

    const resultStartTime = typeof startTime === "number"
        ? startTime
        : typeof startTime === "object"
            ? (startTime.getTime())
            : null;

    const objWithTime = resultStartTime != null
        ? { startTime: resultStartTime.toString() }
        : {};

    const urlWithParams = url + "?" + new URLSearchParams({
        "symbol": pair,
        "contractType": "PERPETUAL",
        "interval": interval,
        ...(objWithTime),
        "limit": limit,
    });

    const response = await fetch(urlWithParams);
    return await response.json();
}

async function getChartData(startTime, pair, interval, limit = 1440) {
    const klines = await getTradeData(startTime, pair, interval, limit);
    return formatChartData(klines);
}

function addSmaLines(fromattedData) {
    var smaData = calculateSMA(fromattedData, 10);

    const smaLine = chart.addLineSeries({
        priceScaleId: '',
        color: 'rgba(4, 111, 232, 1)',
        lineWidth: 2,
        autoscaleInfoProvider: () => (globalScaler),
    });
    smaLine.setData(smaData);

    var smaData25 = calculateSMA(fromattedData, 25);
    var smaLine25 = chart.addLineSeries({
        priceScaleId: '',
        color: 'rgba(123, 111, 232, 1)',
        lineWidth: 2,
        autoscaleInfoProvider: () => (globalScaler),
    });
    smaLine25.setData(smaData25);

    var smaData99 = calculateSMA(fromattedData, 99);
    var smaLine99 = chart.addLineSeries({
        priceScaleId: '',
        color: 'rgba(23, 189, 232, 1)',
        lineWidth: 2,
        autoscaleInfoProvider: () => (globalScaler),
    });
    smaLine99.setData(smaData99);
}

const priceLines = [];

function addPriceLine(priceLineData) {
    const priceLine = series.createPriceLine(priceLineData);
    priceLines.push(priceLine);
}

function clearPriceLines() {
    priceLines.forEach(priceLine => series.removePriceLine(priceLine));
}

async function drawTrade(trade) {
    clearPriceLines();

    const openTime = new Date(trade.info.openTime);
    const closeTime = new Date(trade.info.closeTime ?? undefined);

    // adjust interval based on difference between open and close time
    const openTimeUTC = openTime.getTime(); // .getUTCDate();

    const data = await getChartData(openTimeUTC, trade.order.coin, '1h');
    series.setData(data);

    trade.order.entries.forEach((entry, idx) => {
        const entryPriceLine = {
            price: entry,
            color: '#31f54b',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: `Entry ${idx + 1}`,
            autoscaleInfoProvider: () => (globalScaler),
        };

        addPriceLine(entryPriceLine);
    });

    const buyPriceLine = {
        price: trade.info.averageEntryPrice,
        color: '#31f54b',
        lineWidth: 2,
        lineStyle: 2, // LineStyle.Dashed
        axisLabelVisible: true,
        title: 'Average entry price',
        autoscaleInfoProvider: () => (globalScaler),
    };

    addPriceLine(buyPriceLine);

    trade.order.tps.forEach((tp, idx) => {
        const tpPriceLine = {
            price: tp,
            color: '#f53131',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: `TP ${idx + 1}`,
            autoscaleInfoProvider: () => (globalScaler),
        };

        addPriceLine(tpPriceLine);
    });

    if (trade.order.sl) {
        const slPriceLine = {
            price: trade.order.sl,
            color: 'rgba(231,193,7,0.93)',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: 'SL',
            autoscaleInfoProvider: () => (globalScaler),
        };

        addPriceLine(slPriceLine);
    }

    const crossMarkers = trade.sortedUniqueCrosses.map(cross => {
        return createChartMarker(
            cross.timestamp / 1000, 
            'cross', 
            `Cross ${cross.subtype}`
        );
    });

    const eventMarkers = (crossMarkers.length === 0) 
        ? trade.events.filter(x => x.type?.match(/sell|sl|trailing activated|buy|cancelled/))
            .map(x => {
                const type = x.type?.match(/buy/) ? 'buy' : 'sell';
                return createChartMarker(x.timestamp / 1000, type, x.type);
            })
        : [];

    const tradeOpenMarker = createChartMarker(new Date(trade.order.date) / 1000, 'open', 'open');

    series.setMarkers([ tradeOpenMarker, ...eventMarkers, ...crossMarkers ]);
}
