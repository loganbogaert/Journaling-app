import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Account, AccountInput } from '../../utils/models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  isEdit = false;
  accountId: number | null = null;
  loading = false;
  error = '';

  form = {
    type: 'manual' as 'manual' | 'connected',
    name: '',
    accountBalance: null as number | null,
    currency: 'USD',
    startDate: '',
    endDate: '',
    platform: 'mt5' as 'mt4' | 'mt5',
    brokerServer: '',
    brokerLogin: '',
    investorPassword: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
  ) {}

  ngOnInit(): void {
    this.accountId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null;
    this.isEdit = !!this.accountId;

    if (this.isEdit && this.accountId) {
      this.accountService.getById(this.accountId).subscribe({
        next: (a: Account) => {
          this.form.type = a.type;
          this.form.platform = a.platform || 'mt5';
          this.form.brokerLogin = a.brokerLogin || '';
          this.form.brokerServer = a.brokerServer || '';
          this.form.name = a.name;
          this.form.accountBalance = Number(a.accountBalance);
          this.form.currency = a.currency;
          this.form.startDate = a.startDate ? a.startDate.substring(0, 10) : '';
          this.form.endDate = a.endDate ? a.endDate.substring(0, 10) : '';
        },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    const payload: AccountInput = {
      type: this.form.type,
      name: this.form.name,
      accountBalance: this.form.accountBalance!,
      currency: this.form.currency.toUpperCase(),
      startDate: this.form.startDate || null,
      endDate: this.form.endDate || null,
    };
    if (payload.type === 'connected' && !this.isEdit) {
      payload.platform = this.form.platform;
      payload.brokerServer = this.form.brokerServer.trim();
      payload.brokerLogin = this.form.brokerLogin.trim();
    }
    if (this.form.type === 'connected' && this.form.investorPassword) {
      payload.investorPassword = this.form.investorPassword;
    }

    const request =
      this.isEdit && this.accountId
        ? this.accountService.update(this.accountId, payload)
        : this.accountService.create(payload);

    request.subscribe({
      next: (account) => {
        this.form.investorPassword = '';
        this.router.navigate(['/accounts', account.id]);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to save account';
        this.loading = false;
      },
    });
  }
}
