import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Trade } from '../../utils/models';
import { formatDate, resultClass, formatDecimal } from '../../utils/helpers';
import { TRADE_RESULT_LABELS, TRADE_DIRECTION_LABELS } from '../../utils/constants';

@Component({
  selector: 'app-trade-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trade-card.component.html',
})
export class TradeCardComponent {
  @Input() trade!: Trade;
  readonly formatDate = formatDate;
  readonly formatDecimal = formatDecimal;
  readonly resultClass = resultClass;
  readonly resultLabels = TRADE_RESULT_LABELS;
  readonly directionLabels = TRADE_DIRECTION_LABELS;
}
