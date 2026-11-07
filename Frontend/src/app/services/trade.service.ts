import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { Trade, TradeInput, AccountTradesResponse } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class TradeService {
  constructor(private http: HttpClient) {}

  getByAccount(accountId: number): Observable<AccountTradesResponse> {
    return this.http.get<AccountTradesResponse>(`${API_BASE_URL}/accounts/${accountId}/trades`);
  }

  getById(id: number): Observable<Trade> {
    return this.http.get<Trade>(`${API_BASE_URL}/trades/${id}`);
  }

  create(data: TradeInput): Observable<Trade> {
    return this.http.post<Trade>(`${API_BASE_URL}/trades`, data);
  }

  update(id: number, data: Partial<TradeInput>): Observable<Trade> {
    return this.http.put<Trade>(`${API_BASE_URL}/trades/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/trades/${id}`);
  }
}
