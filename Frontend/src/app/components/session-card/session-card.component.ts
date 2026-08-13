import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Session } from '../../utils/models';
import { formatDate } from '../../utils/helpers';

@Component({
  selector: 'app-session-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './session-card.component.html',
})
export class SessionCardComponent {
  @Input() session!: Session;
  readonly formatDate = formatDate;
}
