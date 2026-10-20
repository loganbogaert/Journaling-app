'use strict';

const path = require('node:path');
const { chromium } = require('playwright-core');

const chartBundle = path.join(
  path.dirname(require.resolve('lightweight-charts/package.json')),
  'dist/lightweight-charts.standalone.production.js',
);

function normalizeCandles(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error('At least one candle is required');
  }

  const byTime = new Map();

  for (const candle of candles) {
    const normalized = {
      time: Number(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    };

    if (
      !Object.values(normalized).every(Number.isFinite) ||
      !Number.isInteger(normalized.time) ||
      normalized.time <= 0 ||
      normalized.low > Math.min(normalized.open, normalized.close) ||
      normalized.high < Math.max(normalized.open, normalized.close) ||
      normalized.low <= 0
    ) {
      throw new Error('Invalid OHLC candle data');
    }

    byTime.set(normalized.time, normalized);
  }

  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

function createChartRenderer({ width = 1440, height = 900 } = {}) {
  let browser;
  let queue = Promise.resolve();
  let closed = false;

  async function renderChart(data) {
    const candles = normalizeCandles(data.candles);

    if (!browser) {
      browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: true,
        args: ['--disable-dev-shm-usage'],
      });
    }

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: 'en-GB',
      timezoneId: 'UTC',
    });

    try {
      await context.route('**/*', (route) => route.abort());
      const page = await context.newPage();

      await page.setContent(`<!doctype html>
        <html><head><meta charset="utf-8"><style>
          * { box-sizing: border-box; }
          html, body { margin: 0; width: 100%; height: 100%; background: #131722; color: #b2b5be;
            font-family: 'Liberation Sans', sans-serif; letter-spacing: 0; }
          body { display: grid; grid-template-rows: 42px minmax(0, 1fr) 30px; }
          header { display: flex; align-items: center; gap: 12px; padding: 0 14px;
            border-bottom: 1px solid #2a2e39; font-size: 13px; min-width: 0; }
          #symbol { color: #d1d4dc; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          #timeframe { flex-shrink: 0; }
          #count { margin-left: auto; white-space: nowrap; }
          #chart { min-width: 0; min-height: 0; overflow: hidden; }
          footer { display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 0 12px; border-top: 1px solid #2a2e39; font-size: 11px; }
          footer a { color: #b2b5be; text-decoration: none; }
          footer span { white-space: nowrap; }
        </style></head><body>
          <header><span id="symbol"></span><span id="timeframe"></span><span id="count"></span></header>
          <div id="chart"></div>
          <footer><a href="https://www.tradingview.com/">Charts by TradingView Lightweight Charts</a><span>UTC</span></footer>
        </body></html>`);

      await page.addScriptTag({ path: chartBundle });
      await page.evaluate(
        async ({
          candles,
          symbol,
          timeframe,
          entry,
          exit,
          entryDate,
          exitDate,
          direction,
          sl,
          tp,
        }) => {
          const library = window.LightweightCharts;
          const container = document.getElementById('chart');

          document.getElementById('symbol').textContent = symbol;
          document.getElementById('timeframe').textContent = timeframe;
          document.getElementById('count').textContent = `${candles.length} bars`;

          const chart = library.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
              background: { type: library.ColorType.Solid, color: '#131722' },
              textColor: '#b2b5be',
              fontFamily: 'Liberation Sans, sans-serif',
              fontSize: 12,
              attributionLogo: true,
            },
            grid: { vertLines: { color: '#2a2e39' }, horzLines: { color: '#2a2e39' } },
            rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.12, bottom: 0.12 } },
            leftPriceScale: { visible: false },
            timeScale: {
              borderColor: '#2a2e39',
              timeVisible: true,
              secondsVisible: false,
              rightOffset: 6,
            },
            handleScroll: false,
            handleScale: false,
          });

          const precision = Math.min(
            8,
            Math.max(
              2,
              ...candles.flatMap((candle) =>
                [candle.open, candle.high, candle.low, candle.close].map((value) => {
                  const exponent = value.toString().split('e-')[1];
                  return exponent
                    ? Number(exponent)
                    : (value.toString().split('.')[1] || '').length;
                }),
              ),
            ),
          );

          const series = chart.addSeries(library.CandlestickSeries, {
            upColor: '#089981',
            downColor: '#f23645',
            wickUpColor: '#089981',
            wickDownColor: '#f23645',
            borderVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: { type: 'price', precision, minMove: 10 ** -precision },
          });

          series.setData(candles);

          for (const [value, title, color] of [
            [entry, 'ENTRY', '#56a9ff'],
            [exit, 'EXIT', '#ffd166'],
            [sl, 'SL', '#f23645'],
            [tp, 'TP', '#089981'],
          ]) {
            if (value == null || !Number.isFinite(Number(value))) continue;
            series.createPriceLine({
              price: Number(value),
              color,
              lineWidth: 1,
              lineStyle: library.LineStyle.Dashed,
              axisLabelVisible: true,
              title,
            });
          }

          const markers = [];

          for (const [date, text, color, isEntry] of [
            [entryDate, 'Entry', '#56a9ff', true],
            [exitDate, 'Exit', '#ffd166', false],
          ]) {
            const timestamp = Math.floor(new Date(date).getTime() / 1000);
            if (
              !Number.isFinite(timestamp) ||
              timestamp < candles[0].time ||
              timestamp > candles[candles.length - 1].time + 86400
            )
              continue;
            const candle = [...candles].reverse().find((item) => item.time <= timestamp);
            if (!candle) continue;
            const below = isEntry ? direction !== 'short' : direction === 'short';
            markers.push({
              time: candle.time,
              position: below ? 'belowBar' : 'aboveBar',
              shape: below ? 'arrowUp' : 'arrowDown',
              color,
              text,
            });
          }

          library.createSeriesMarkers(
            series,
            markers.sort((left, right) => left.time - right.time),
          );
          chart.timeScale().fitContent();
          await document.fonts.ready;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        },
        {
          candles,
          symbol: String(data.symbol || ''),
          timeframe: String(data.timeframe || ''),
          entry: data.entry,
          exit: data.exit,
          sl: data.sl,
          tp: data.tp,
          entryDate: data.entryDate,
          exitDate: data.exitDate,
          direction: data.direction,
        },
      );

      return await page.screenshot({ type: 'png', animations: 'disabled', timeout: 30000 });
    } finally {
      await context.close();
    }
  }

  function render(data) {
    if (closed) return Promise.reject(new Error('Chart renderer is closed'));

    const pending = queue.then(() => renderChart(data));
    queue = pending.catch(() => {});
    return pending;
  }

  render.close = async () => {
    closed = true;
    await queue;
    if (browser) await browser.close();
  };

  return render;
}

async function renderCandlestickChart(data) {
  const render = createChartRenderer();

  try {
    return await render(data);
  } finally {
    await render.close();
  }
}

module.exports = { createChartRenderer, renderCandlestickChart, normalizeCandles };
