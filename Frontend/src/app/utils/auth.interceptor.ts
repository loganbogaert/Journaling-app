import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { getToken, removeToken } from '../utils/helpers';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getToken();
  const router = inject(Router);

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Redirect to login on 401 from protected endpoints; skip auth routes to preserve their own error handling
      if (err.status === 401 && !req.url.includes('/auth/')) {
        removeToken();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
