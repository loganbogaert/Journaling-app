import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { TradePicture } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class TradePictureService {
  constructor(private http: HttpClient) {}

  getAll(tradeId: number): Observable<TradePicture[]> {
    return this.http.get<TradePicture[]>(`${API_BASE_URL}/trades/${tradeId}/pictures`);
  }

  add(tradeId: number, pictureUrl: string): Observable<TradePicture> {
    return this.http.post<TradePicture>(`${API_BASE_URL}/trades/${tradeId}/pictures`, { pictureUrl });
  }

  upload(tradeId: number, file: File): Observable<TradePicture> {
    const formData = new FormData();
    formData.append('picture', file);
    return this.http.post<TradePicture>(`${API_BASE_URL}/trades/${tradeId}/pictures/upload`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/trade-pictures/${id}`);
  }
}
