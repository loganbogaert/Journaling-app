import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { ScreenshotSettings } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class ScreenshotSettingsService {
  private readonly url = `${API_BASE_URL}/settings/screenshots`;

  constructor(private http: HttpClient) {}

  get(): Observable<ScreenshotSettings> {
    return this.http.get<ScreenshotSettings>(this.url);
  }

  update(settings: ScreenshotSettings): Observable<ScreenshotSettings> {
    return this.http.put<ScreenshotSettings>(this.url, settings);
  }
}