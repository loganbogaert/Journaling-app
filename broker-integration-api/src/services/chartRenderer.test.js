'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { createChartRenderer, normalizeCandles } = require('./chartRenderer');

function fixture() {
  const start = 1792404000;
  const candles = Array.from({ length: 150 }, (_, index) => {
    const open = 1.08 + Math.sin(index / 7) * 0.004 + index * 0.00002;
    const close = open + (index % 3 ? 0.0007 : -0.0009);

    return {
      time: start + index * 300,
      open: Number(open.toFixed(5)),
      high: Number((Math.max(open, close) + 0.0004).toFixed(5)),
      low: Number((Math.min(open, close) - 0.0004).toFixed(5)),
      close: Number(close.toFixed(5)),
    };
  });

  return {
    symbol: 'EURUSD',
    timeframe: 'M5',
    direction: 'long',
    candles,
    entry: candles[85].open,
    exit: candles[140].close,
    sl: 1.076,
    tp: 1.09,
    entryDate: new Date(candles[85].time * 1000).toISOString(),
    exitDate: new Date(candles[140].time * 1000).toISOString(),
  };
}

test('candles are sorted and deduplicated, with invalid OHLC rejected', () => {
  const { candles } = fixture();
  const normalized = normalizeCandles([candles[1], candles[0], candles[1]]);
  assert.deepEqual(normalized, [candles[0], candles[1]]);
  assert.throws(() => normalizeCandles([]), /At least one/);
  assert.throws(() => normalizeCandles([{ ...candles[0], high: 0 }]), /Invalid OHLC/);
});

const executable = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';

test(
  'Chromium renders nonblank desktop and narrow PNGs and closes cleanly',
  {
    skip:
      !fs.existsSync(executable) && 'Install Chromium or run npm test inside the broker container',
    timeout: 90000,
  },
  async () => {
    for (const [width, height] of [
      [1440, 900],
      [390, 700],
    ]) {
      const render = createChartRenderer({ width, height });

      try {
        const [buffer, repeat] = await Promise.all([render(fixture()), render(fixture())]);
        const png = PNG.sync.read(buffer);
        assert.equal(png.width, width);
        assert.equal(png.height, height);
        assert.equal(PNG.sync.read(repeat).width, width);

        let bullishPixels = 0;
        let bearishPixels = 0;

        for (let y = 55; y < height - 55; y++) {
          for (let x = 0; x < width - 100; x++) {
            const offset = (y * width + x) * 4;
            const [red, green, blue] = png.data.subarray(offset, offset + 3);
            if (red === 8 && green === 153 && blue === 129) bullishPixels++;
            if (red === 242 && green === 54 && blue === 69) bearishPixels++;
          }
        }

        assert.ok(bullishPixels > 100, `Missing green candle pixels: ${bullishPixels}`);
        assert.ok(bearishPixels > 100, `Missing red candle pixels: ${bearishPixels}`);

        if (process.env.CHART_RENDER_TEST_OUTPUT_DIR) {
          fs.mkdirSync(process.env.CHART_RENDER_TEST_OUTPUT_DIR, { recursive: true });
          fs.writeFileSync(
            path.join(process.env.CHART_RENDER_TEST_OUTPUT_DIR, `chart-${width}.png`),
            buffer,
          );
        }
      } finally {
        await render.close();
      }

      await assert.rejects(render(fixture()), /renderer is closed/);
    }
  },
);
