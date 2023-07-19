import data from './input-data.json' assert { type: 'json' };

console.log(data);

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

var setChartData = (data) => {
    series.setData(data);
}

function formatChartData(data) {
    return data.map(elem => ({
        time: elem[0] / 1000,
        open: elem[1],
        high: elem[2],
        low: elem[3],
        close: elem[4]
    }));
}

function createChartMarker(time, type) {
    if (type === 'buy') {
        return { time: time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'Buy' };
    } else {
        return { time: time, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text: 'Sell' };
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

async function getTradeData(startTime, pair, interval, limit = 1441) {
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

async function getChartData(startTime, pair, interval, limit = 1441) {
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

async function drawTrade(trade) {
    const openTime = new Date(trade.info.openTime);
    const closeTime = new Date(trade.info.closeTime ?? undefined);

    // adjust interval based on difference between open and close time
    
    const data = await getChartData(openTime, trade.order.coin, '1d');
    setChartData(data);
    // setChartTradeMarkers(strategy.getHistory());

    trade.order.entries.forEach((entry, idx) => {
        const entryPriceLine = {
            price: entry,
            color: '#31f54b',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: `Entry ${idx + 1}`,
        };

        series.createPriceLine(entryPriceLine);
    });

    const buyPriceLine = {
        price: trade.info.averageEntryPrice,
        color: '#31f54b',
        lineWidth: 2,
        lineStyle: 2, // LineStyle.Dashed
        axisLabelVisible: true,
        title: 'Average entry price',
    };

    series.createPriceLine(buyPriceLine);

    trade.order.tps.forEach((tp, idx) => {
        const tpPriceLine = {
            price: tp,
            color: '#f53131',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: `TP ${idx + 1}`,
        };

        series.createPriceLine(tpPriceLine);
    });
    
    if (trade.order.sl) {
        const slPriceLine = {
            price: trade.order.sl,
            color: 'rgba(231,193,7,0.93)',
            lineWidth: 2,
            lineStyle: 2, // LineStyle.Dashed
            axisLabelVisible: true,
            title: 'SL',
        };

        series.createPriceLine(slPriceLine);
    }

    const markers = trade.sortedUniqueCrosses.map(cross => {
        return createChartMarker(cross.timestamp / 1000, cross.subtype === 'averageEntry' || cross.subtype === 'entry' ? 'buy' : 'sell');
    });
    series.setMarkers(markers);
}

if (data?.length > 0){
    await drawTrade(data[4]);
}
