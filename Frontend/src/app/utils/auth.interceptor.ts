import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { KeycloakService } from '../services/keycloak.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);

  return from(keycloak.ensureFreshToken()).pipe(
    switchMap((token) => {
      const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authReq);
    }),
    catchError((err: HttpErrorResponse) => {
      // Session expired/invalid — send the user back through Keycloak's login page
      if (err.status === 401) {
        keycloak.login();
      }
      return throwError(() => err);
    })
  );
};
