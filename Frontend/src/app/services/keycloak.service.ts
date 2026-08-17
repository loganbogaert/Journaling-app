import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID } from '../utils/constants';

/**
 * Thin wrapper around the keycloak-js adapter. Login/registration happen entirely on
 * Keycloak's hosted pages (reached through Kong); this service only tracks session state
 * and exposes the access token for the HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class KeycloakService {
  readonly keycloak = new Keycloak({
    url: KEYCLOAK_URL,
    realm: KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT_ID,
  });

  private initialized = false;

  /** Boots the adapter; must resolve before any guarded route renders. */
  async init(): Promise<boolean> {
    if (this.initialized) return this.authenticated;

    const authenticated = await this.keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });
    this.initialized = true;
    return authenticated;
  }

  login(redirectUri?: string): Promise<void> {
    return this.keycloak.login({ redirectUri: redirectUri ?? window.location.href });
  }

  register(redirectUri?: string): Promise<void> {
    return this.keycloak.register({ redirectUri: redirectUri ?? window.location.origin });
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: window.location.origin });
  }

  get authenticated(): boolean {
    return !!this.keycloak.authenticated;
  }

  get token(): string | undefined {
    return this.keycloak.token;
  }

  get userId(): string | undefined {
    return this.keycloak.tokenParsed?.['sub'];
  }

  get roles(): string[] {
    return this.keycloak.tokenParsed?.['realm_access']?.['roles'] ?? [];
  }

  /** Refreshes the token if it's about to expire; logs in again if the refresh fails. */
  async ensureFreshToken(): Promise<string | undefined> {
    if (!this.authenticated) return undefined;
    try {
      await this.keycloak.updateToken(30);
    } catch {
      await this.login();
    }
    return this.keycloak.token;
  }
}
