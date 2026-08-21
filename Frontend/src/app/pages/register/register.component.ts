import { Component, OnInit } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-register',
  standalone: true,
  template: `<p class="container">Redirecting to registration…</p>`,
})
export class RegisterComponent implements OnInit {
  constructor(private keycloak: KeycloakService) {}

  ngOnInit(): void {
    // Registration now happens entirely on Keycloak's hosted page
    this.keycloak.register();
  }
}
