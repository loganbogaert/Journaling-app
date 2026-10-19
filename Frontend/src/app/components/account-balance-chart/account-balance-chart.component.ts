import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart,
  ChartDataset,
  Plugin,
  ScriptableContext,
  TooltipModel,
  registerables,
} from 'chart.js';
import { BalanceHistoryPoint } from '../../utils/models';
import { formatDate, formatDecimal } from '../../utils/helpers';

Chart.register(...registerables);

// Mirrors the CSS custom properties in styles.scss (canvas can't read them directly)
const COLORS = {
  win: '#00c48c',
  loss: '#ff4d6a',
  be: '#f59e0b',
  muted: '#50576e',
  borderMid: '#2c3148',
};

interface ActiveTooltip {
  x: number;
  y: number;
  data: BalanceHistoryPoint;
}

@Component({
  selector: 'app-account-balance-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-balance-chart.component.html',
})
export class AccountBalanceChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() balanceHistory: BalanceHistoryPoint[] = [];
  @Input() currency = '';

  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLCanvasElement>;

  readonly formatDate = formatDate;
  readonly formatDecimal = formatDecimal;

  isProfit = true;
  activePoint: ActiveTooltip | null = null;
  tooltipAlign: 'start' | 'middle' | 'end' = 'middle';

  private chart?: Chart;
  private viewReady = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['balanceHistory'] && this.viewReady) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  get lastPoint(): BalanceHistoryPoint | null {
    return this.balanceHistory?.length ? this.balanceHistory[this.balanceHistory.length - 1] : null;
  }

  private renderChart(): void {
    const history = this.balanceHistory ?? [];
    this.chart?.destroy();
    if (!this.canvasEl || history.length < 2) return;

    this.isProfit = history[history.length - 1].balance >= history[0].balance;
    const lineColor = this.isProfit ? COLORS.win : COLORS.loss;

    const dataset: ChartDataset<'line'> = {
      data: history.map((p) => p.balance),
      borderColor: lineColor,
      borderWidth: 2.5,
      pointBackgroundColor: history.map((p) => this.dotColor(p.result)),
      pointBorderColor: history.map((p) => this.dotColor(p.result)),
      pointRadius: 3,
      pointHoverRadius: 5,
      pointHoverBorderWidth: 2,
      tension: 0,
      fill: true,
      backgroundColor: (context: ScriptableContext<'line'>) => this.buildGradient(context, lineColor),
    };

    this.chart = new Chart(this.canvasEl.nativeElement, {
      type: 'line',
      data: { labels: history.map((_, i) => i), datasets: [dataset] },
      plugins: [this.crosshairPlugin()],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context) => this.handleTooltip(context.tooltip, history),
          },
        },
      },
    });
  }

  private dotColor(result: 'W' | 'BE' | 'L' | null): string {
    if (result === 'W') return COLORS.win;
    if (result === 'L') return COLORS.loss;
    if (result === 'BE') return COLORS.be;
    return COLORS.muted;
  }

  private buildGradient(context: ScriptableContext<'line'>, color: string): CanvasGradient | string {
    const { chartArea, ctx } = context.chart;
    if (!chartArea) return color;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, this.hexToRgba(color, 0.28));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    return gradient;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const value = parseInt(hex.replace('#', ''), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Renders our own tooltip DOM node (via Angular bindings) instead of Chart.js's default,
  // so it matches the app's design tokens exactly.
  private handleTooltip(tooltip: TooltipModel<'line'>, history: BalanceHistoryPoint[]): void {
    if (tooltip.opacity === 0) {
      if (this.activePoint) this.zone.run(() => (this.activePoint = null));
      return;
    }

    const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
    if (dataIndex == null) return;

    const ratio = dataIndex / (history.length - 1);
    const align = ratio < 0.15 ? 'start' : ratio > 0.85 ? 'end' : 'middle';

    this.zone.run(() => {
      this.activePoint = { x: tooltip.caretX, y: tooltip.caretY, data: history[dataIndex] };
      this.tooltipAlign = align;
    });
  }

  // Draws the dashed vertical crosshair under the hovered point
  private crosshairPlugin(): Plugin<'line'> {
    return {
      id: 'crosshair',
      afterDraw: (chart) => {
        const active = chart.tooltip?.getActiveElements?.() ?? [];
        if (!active.length) return;

        const { ctx, chartArea } = chart;
        const x = active[0].element.x;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = COLORS.borderMid;
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };
  }
}
