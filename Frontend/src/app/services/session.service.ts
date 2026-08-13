import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { Session } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly base = `${API_BASE_URL}/sessions`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Session[]> {
    return this.http.get<Session[]>(this.base);
  }

  getById(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.base}/${id}`);
  }

  create(data: Omit<Session, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Observable<Session> {
    return this.http.post<Session>(this.base, data);
  }

  update(id: number, data: Partial<Session>): Observable<Session> {
    return this.http.put<Session>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
