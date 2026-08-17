import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  constructor(private keycloak: KeycloakService, private router: Router) {}

  get isAuthenticated(): boolean {
    return this.keycloak.authenticated;
  }

  logout(): void {
    this.keycloak.logout();
    this.router.navigateByUrl('/login');
  }
}
