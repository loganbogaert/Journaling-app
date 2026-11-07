import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Account } from '../../utils/models';
import { formatDate } from '../../utils/helpers';

@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './account-card.component.html',
})
export class AccountCardComponent {
  @Input() account!: Account;
  readonly formatDate = formatDate;
}
