import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { KeycloakService } from '../services/keycloak.service';

export const authGuard: CanActivateFn = async (): Promise<boolean> => {
  const keycloak = inject(KeycloakService);

  if (keycloak.authenticated) {
    return true;
  }

  // Not authenticated — redirect to Keycloak's hosted login page
  await keycloak.login();
  return false;
};
