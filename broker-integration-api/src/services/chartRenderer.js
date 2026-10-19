'use strict';

const { createCanvas } = require('@napi-rs/canvas');

const WIDTH = 1440;
const HEIGHT = 900;
const MARGIN = { left: 96, right: 36, top: 76, bottom: 82 };

function formatPrice(value, digits) {
  return Number(value).toFixed(digits);
}

function renderCandlestickChart({ symbol, timeframe, candles, entry, exit }) {
  if (!Array.isArray(candles) || candles.length === 0) throw new Error('At least one candle is required');

  const normalized = candles.map((candle) => ({
    time: Number(candle.time),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume || 0),
  })).filter((candle) => [candle.time, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
  if (normalized.length === 0) throw new Error('No valid candle data');

  const canvas = createCanvas(WIDTH, HEIGHT);
  const context = canvas.getContext('2d');
  const plot = {
    x: MARGIN.left,
    y: MARGIN.top,
    width: WIDTH - MARGIN.left - MARGIN.right,
    height: HEIGHT - MARGIN.top - MARGIN.bottom,
  };
  const prices = normalized.flatMap((candle) => [candle.high, candle.low, candle.open, candle.close]);
  prices.push(Number(entry), Number(exit));
  let minPrice = Math.min(...prices.filter(Number.isFinite));
  let maxPrice = Math.max(...prices.filter(Number.isFinite));
  if (maxPrice === minPrice) {
    maxPrice += Math.abs(maxPrice * 0.001) || 0.001;
    minPrice -= Math.abs(minPrice * 0.001) || 0.001;
  }
  const padding = (maxPrice - minPrice) * 0.08;
  minPrice -= padding;
  maxPrice += padding;
  const priceY = (price) => plot.y + ((maxPrice - price) / (maxPrice - minPrice)) * plot.height;
  const digits = Math.min(8, Math.max(2, Math.ceil(-Math.log10(Math.abs(maxPrice - minPrice) / 1000))));

  context.fillStyle = '#111820';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = '#f2f5f7';
  context.font = '600 28px sans-serif';
  context.fillText(`${symbol}  ${timeframe}`, MARGIN.left, 42);
  context.fillStyle = '#a8b4bf';
  context.font = '16px sans-serif';
  context.fillText(`${normalized.length} candles`, WIDTH - 150, 42);

  context.font = '14px sans-serif';
  for (let line = 0; line <= 5; line++) {
    const y = plot.y + (plot.height * line) / 5;
    const value = maxPrice - ((maxPrice - minPrice) * line) / 5;
    context.strokeStyle = '#2b3742';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
    context.fillStyle = '#a8b4bf';
    context.fillText(formatPrice(value, digits), 10, y + 5);
  }

  const slotWidth = plot.width / normalized.length;
  const bodyWidth = Math.max(2, Math.min(14, slotWidth * 0.62));
  normalized.forEach((candle, index) => {
    const center = plot.x + (index + 0.5) * slotWidth;
    const rising = candle.close >= candle.open;
    const color = rising ? '#35bf83' : '#ef6663';
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(1, bodyWidth * 0.12);
    context.beginPath();
    context.moveTo(center, priceY(candle.high));
    context.lineTo(center, priceY(candle.low));
    context.stroke();
    const top = priceY(Math.max(candle.open, candle.close));
    const bottom = priceY(Math.min(candle.open, candle.close));
    context.fillRect(center - bodyWidth / 2, top, bodyWidth, Math.max(1, bottom - top));
  });

  const drawTradeLine = (price, color, label) => {
    if (!Number.isFinite(Number(price))) return;
    const y = priceY(Number(price));
    context.strokeStyle = color;
    context.setLineDash([8, 6]);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = color;
    context.font = 'bold 14px sans-serif';
    context.fillText(`${label} ${formatPrice(Number(price), digits)}`, plot.x + 12, y - 7);
  };
  drawTradeLine(entry, '#56a9ff', 'ENTRY');
  drawTradeLine(exit, '#ffd166', 'EXIT');

  const firstTime = new Date(normalized[0].time * 1000).toISOString().replace('T', ' ').slice(0, 16);
  const lastTime = new Date(normalized[normalized.length - 1].time * 1000).toISOString().replace('T', ' ').slice(0, 16);
  context.fillStyle = '#a8b4bf';
  context.font = '14px sans-serif';
  context.fillText(firstTime, plot.x, HEIGHT - 26);
  context.textAlign = 'right';
  context.fillText(lastTime, plot.x + plot.width, HEIGHT - 26);

  return canvas.toBuffer('image/png');
}

module.exports = { renderCandlestickChart };