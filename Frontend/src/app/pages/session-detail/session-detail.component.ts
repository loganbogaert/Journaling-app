import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { TradeService } from '../../services/trade.service';
import { Session, Trade, SessionMetrics, BalanceHistoryPoint } from '../../utils/models';
import { formatDate, formatDecimal } from '../../utils/helpers';
import { TradeCardComponent } from '../../components/trade-card/trade-card.component';
import { SessionBalanceChartComponent } from '../../components/session-balance-chart/session-balance-chart.component';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeCardComponent, SessionBalanceChartComponent],
  templateUrl: './session-detail.component.html',
})
export class SessionDetailComponent implements OnInit {
  session: Session | null = null;
  trades: Trade[] = [];
  metrics: SessionMetrics | null = null;
  balanceHistory: BalanceHistoryPoint[] = [];
  loading = true;
  error = '';
  readonly formatDate = formatDate;
  readonly formatDecimal = formatDecimal;

  get currentBalance(): number {
    return this.balanceHistory.length ? this.balanceHistory[this.balanceHistory.length - 1].balance : (this.session?.accountBalance ?? 0);
  }

  get currentBalancePercent(): number {
    return this.balanceHistory.length ? this.balanceHistory[this.balanceHistory.length - 1].percent : 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private tradeService: TradeService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sessionService.getById(id).subscribe({
      next: (session) => {
        this.session = session;
        this.tradeService.getBySession(id).subscribe({
          next: (data) => {
            this.trades = data.trades;
            this.metrics = data.metrics;
            this.balanceHistory = data.balanceHistory;
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: (err) => {
        this.error = err.error?.message ?? 'Failed to load session';
        this.loading = false;
      },
    });
  }

  deleteSession(): void {
    if (!this.session) return;
    this.sessionService.delete(this.session.id).subscribe({
      next: () => this.router.navigate(['/dashboard']),
    });
  }
}
