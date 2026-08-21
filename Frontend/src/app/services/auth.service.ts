import { Injectable } from '@angular/core';
import { KeycloakService } from './keycloak.service';

/** Thin facade kept for existing call sites (e.g. the navbar); delegates to Keycloak. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private keycloak: KeycloakService) {}

  logout(): void {
    this.keycloak.logout();
  }
}
