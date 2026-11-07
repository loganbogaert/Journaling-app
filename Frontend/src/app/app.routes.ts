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
    path: 'settings/screenshots',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/screenshot-settings/screenshot-settings.component').then((m) => m.ScreenshotSettingsComponent),
  },
  {
    path: 'accounts/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'accounts/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account-detail/account-detail.component').then((m) => m.AccountDetailComponent),
  },
  {
    path: 'accounts/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'accounts/:accountId/trades/new',
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
