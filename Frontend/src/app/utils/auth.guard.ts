import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { getToken } from './helpers';

export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const router = inject(Router);

  // Token already present — no need to hit the refresh endpoint
  if (getToken()) {
    return true;
  }

  // No token — attempt silent refresh via httpOnly cookie
  return inject(AuthService).refresh().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
