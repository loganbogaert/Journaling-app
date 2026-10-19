import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Account, AccountCreationResponse, AccountInput } from '../../utils/models';

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
  eaApiKey = '';
  copiedKey = false;

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
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.accountId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null;
    this.isEdit = !!this.accountId;

    if (this.isEdit && this.accountId) {
      this.accountService.getById(this.accountId).subscribe({
        next: (a: Account) => {
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
    if (payload.type === 'connected') {
      payload.platform = this.form.platform;
      payload.brokerServer = this.form.brokerServer.trim();
      payload.brokerLogin = this.form.brokerLogin.trim();
    }

    const request = this.isEdit && this.accountId
      ? this.accountService.update(this.accountId, payload)
      : this.accountService.create(payload);

    request.subscribe({
      next: (account) => {
        if (!this.isEdit && account.type === 'connected') {
          const eaApiKey = (account as AccountCreationResponse).eaApiKey;
          if (!eaApiKey) {
            this.error = 'The account was created, but no EA key was returned. Contact support before retrying.';
            this.loading = false;
            return;
          }
          this.accountId = account.id;
          this.eaApiKey = eaApiKey;
          this.loading = false;
          return;
        }
        this.router.navigate(['/accounts', account.id]);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to save account';
        this.loading = false;
      },
    });
  }

  async copyEaApiKey(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.eaApiKey);
      this.copiedKey = true;
    } catch {
      this.error = 'Could not copy the key. Select and copy it manually.';
    }
  }

  finishProvisioning(): void {
    if (this.accountId) this.router.navigate(['/accounts', this.accountId]);
  }
}
