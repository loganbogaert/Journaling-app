import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { Account, AccountCreationResponse, AccountInput } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly base = `${API_BASE_URL}/accounts`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Account[]> {
    return this.http.get<Account[]>(this.base);
  }

  getById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.base}/${id}`);
  }

  create(data: AccountInput): Observable<AccountCreationResponse> {
    return this.http.post<AccountCreationResponse>(this.base, data);
  }

  update(id: number, data: Partial<AccountInput>): Observable<Account> {
    return this.http.put<Account>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
