import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';
import { Pair } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class PairService {
  private readonly base = `${API_BASE_URL}/pairs`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Pair[]> {
    return this.http.get<Pair[]>(this.base);
  }

  create(pair: string): Observable<Pair> {
    return this.http.post<Pair>(this.base, { pair });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
