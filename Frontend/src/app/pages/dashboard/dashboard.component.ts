import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Account } from '../../utils/models';
import { AccountCardComponent } from '../../components/account-card/account-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AccountCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  accounts: Account[] = [];
  loading = true;
  error = '';

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getAll().subscribe({
      next: (data) => {
        this.accounts = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message ?? 'Failed to load accounts';
        this.loading = false;
      },
    });
  }
}
