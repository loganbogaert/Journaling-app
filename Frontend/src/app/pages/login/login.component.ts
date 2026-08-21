import { Component, OnInit } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `<p class="container">Redirecting to sign in…</p>`,
})
export class LoginComponent implements OnInit {
  constructor(private keycloak: KeycloakService) {}

  ngOnInit(): void {
    // Login now happens entirely on Keycloak's hosted page
    this.keycloak.login();
  }
}
