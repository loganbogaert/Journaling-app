import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../services/account.service';
import { TradeService } from '../../services/trade.service';
import { Account, Trade, AccountMetrics, BalanceHistoryPoint } from '../../utils/models';
import { formatDate, formatDecimal } from '../../utils/helpers';
import { TradeCardComponent } from '../../components/trade-card/trade-card.component';
import { AccountBalanceChartComponent } from '../../components/account-balance-chart/account-balance-chart.component';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeCardComponent, AccountBalanceChartComponent],
  templateUrl: './account-detail.component.html',
})
export class AccountDetailComponent implements OnInit {
  account: Account | null = null;
  trades: Trade[] = [];
  metrics: AccountMetrics | null = null;
  balanceHistory: BalanceHistoryPoint[] = [];
  loading = true;
  error = '';
  readonly formatDate = formatDate;
  readonly formatDecimal = formatDecimal;

  get currentBalance(): number {
    return this.balanceHistory.length ? this.balanceHistory[this.balanceHistory.length - 1].balance : (this.account?.accountBalance ?? 0);
  }

  get currentBalancePercent(): number {
    return this.balanceHistory.length ? this.balanceHistory[this.balanceHistory.length - 1].percent : 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private tradeService: TradeService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.accountService.getById(id).subscribe({
      next: (account) => {
        this.account = account;
        this.tradeService.getByAccount(id).subscribe({
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
        this.error = err.error?.message ?? 'Failed to load account';
        this.loading = false;
      },
    });
  }

  deleteAccount(): void {
    if (!this.account) return;
    this.accountService.delete(this.account.id).subscribe({
      next: () => this.router.navigate(['/dashboard']),
    });
  }
}
