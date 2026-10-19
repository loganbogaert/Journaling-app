import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../services/account.service';
import { TradeService } from '../../services/trade.service';
import { Account, Trade, AccountMetrics, BalanceHistoryPoint } from '../../utils/models';
import { formatDate, formatDecimal } from '../../utils/helpers';
import { TradeCardComponent } from '../../components/trade-card/trade-card.component';
import { AccountBalanceChartComponent } from '../../components/account-balance-chart/account-balance-chart.component';
import { Subscription, timer, exhaustMap, takeWhile } from 'rxjs';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TradeCardComponent, AccountBalanceChartComponent],
  templateUrl: './account-detail.component.html',
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  syncing = false;
  syncMessage = '';
  private syncSubscription?: Subscription;
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
        if (account.type === 'connected') this.watchSync();
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

  syncNow(): void {
    if (!this.account || this.syncing) return;
    this.syncing = true;
    this.error = '';
    this.syncMessage = 'Connecting to broker...';
    this.accountService.sync(this.account.id).subscribe({
      next: () => this.watchSync(),
      error: (err) => {
        this.syncing = false;
        this.syncMessage = '';
        this.error = err.error?.message || 'Could not start sync';
      },
    });
  }

  private watchSync(): void {
    if (!this.account) return;
    const accountId = this.account.id;
    this.syncSubscription?.unsubscribe();
    this.syncSubscription = timer(0, 2500).pipe(
      exhaustMap(() => this.accountService.syncStatus(accountId)),
      takeWhile((status) => status.state === 'syncing', true),
    ).subscribe({
      next: (status) => {
        this.syncing = status.state === 'syncing';
        this.syncMessage = this.syncing ? 'Syncing trades and charts...'
          : status.state === 'succeeded' ? `Sync complete: ${status.result?.imported || 0} imported, ${status.result?.skipped || 0} already present.` : '';
        if (status.credentialsRequired) this.error = 'Edit this account to add its investor password.';
        if (status.state === 'failed') this.error = status.error || 'Sync failed';
        if (status.state === 'succeeded') {
          this.tradeService.getByAccount(accountId).subscribe({ next: (data) => {
            this.trades = data.trades; this.metrics = data.metrics; this.balanceHistory = data.balanceHistory;
          } });
          if (this.account) this.account.lastSyncedAt = status.lastSyncedAt;
        }
      },
      error: (err) => { this.syncing = false; this.error = err.error?.message || 'Could not read sync status'; },
    });
  }

  ngOnDestroy(): void { this.syncSubscription?.unsubscribe(); }
}
