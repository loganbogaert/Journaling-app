import { Routes } from '@angular/router';
import { authGuard } from './utils/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'sessions/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/sessions/sessions.component').then((m) => m.SessionsComponent),
  },
  {
    path: 'sessions/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/session-detail/session-detail.component').then((m) => m.SessionDetailComponent),
  },
  {
    path: 'sessions/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/sessions/sessions.component').then((m) => m.SessionsComponent),
  },
  {
    path: 'sessions/:sessionId/trades/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/trades/trades.component').then((m) => m.TradesComponent),
  },
  {
    path: 'trades/:tradeId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/trade-detail/trade-detail.component').then((m) => m.TradeDetailComponent),
  },
  {
    path: 'trades/:tradeId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/trades/trades.component').then((m) => m.TradesComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
