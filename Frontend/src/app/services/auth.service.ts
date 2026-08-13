import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { saveToken, removeToken } from '../utils/helpers';
import { AuthResponse, User } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${API_BASE_URL}/auth`;

  constructor(private http: HttpClient) {}

  register(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.base}/register`, { email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }, { withCredentials: true }).pipe(
      tap((res) => saveToken(res.accessToken))
    );
  }

  refresh(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(`${this.base}/refresh`, {}, { withCredentials: true }).pipe(
      tap((res) => saveToken(res.accessToken))
    );
  }

  logout(): void {
    removeToken();
  }
}
