import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { Session } from '../../utils/models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions.component.html',
})
export class SessionsComponent implements OnInit {
  isEdit = false;
  sessionId: number | null = null;
  loading = false;
  error = '';

  form = {
    name: '',
    accountBalance: null as number | null,
    currency: 'USD',
    startDate: '',
    endDate: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null;
    this.isEdit = !!this.sessionId;

    if (this.isEdit && this.sessionId) {
      this.sessionService.getById(this.sessionId).subscribe({
        next: (s: Session) => {
          this.form.name = s.name;
          this.form.accountBalance = Number(s.accountBalance);
          this.form.currency = s.currency;
          this.form.startDate = s.startDate ? s.startDate.substring(0, 10) : '';
          this.form.endDate = s.endDate ? s.endDate.substring(0, 10) : '';
        },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    const payload = {
      name: this.form.name,
      accountBalance: this.form.accountBalance!,
      currency: this.form.currency.toUpperCase(),
      startDate: this.form.startDate || null,
      endDate: this.form.endDate || null,
    };

    const request = this.isEdit && this.sessionId
      ? this.sessionService.update(this.sessionId, payload)
      : this.sessionService.create(payload);

    request.subscribe({
      next: (s: Session) => this.router.navigate(['/sessions', s.id]),
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to save session';
        this.loading = false;
      },
    });
  }
}
