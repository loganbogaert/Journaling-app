import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ScreenshotSettingsService } from '../../services/screenshot-settings.service';
import { ScreenshotSettings, ScreenshotTimeframe } from '../../utils/models';

@Component({
  selector: 'app-screenshot-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './screenshot-settings.component.html',
})
export class ScreenshotSettingsComponent implements OnInit {
  readonly availableTimeframes: ScreenshotTimeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
  settings: ScreenshotSettings = { timeframes: ['M5', 'H4', 'D1'], candleCount: 300 };
  loading = true;
  saving = false;
  error = '';
  saved = false;

  constructor(private settingsService: ScreenshotSettingsService) {}

  ngOnInit(): void {
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to load screenshot settings';
        this.loading = false;
      },
    });
  }

  toggleTimeframe(timeframe: ScreenshotTimeframe, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = new Set(this.settings.timeframes);
    if (checked) selected.add(timeframe);
    else selected.delete(timeframe);
    this.settings.timeframes = this.availableTimeframes.filter((item) => selected.has(item));
    this.saved = false;
  }

  save(): void {
    this.error = '';
    this.saved = false;
    if (this.settings.timeframes.length === 0) {
      this.error = 'Select at least one timeframe.';
      return;
    }
    this.saving = true;
    this.settingsService.update(this.settings).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.saving = false;
        this.saved = true;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to save screenshot settings';
        this.saving = false;
      },
    });
  }
}