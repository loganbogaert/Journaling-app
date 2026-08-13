import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { Session } from '../../utils/models';
import { SessionCardComponent } from '../../components/session-card/session-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SessionCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  sessions: Session[] = [];
  loading = true;
  error = '';

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.sessionService.getAll().subscribe({
      next: (data) => {
        this.sessions = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message ?? 'Failed to load sessions';
        this.loading = false;
      },
    });
  }
}
