import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { API_BASE_URL } from '../utils/constants';

export interface ImageEntry {
  objectName: string;
  viewUrl: string;
}

export interface PresignedUploadEntry {
  uploadUrl: string;
  objectName: string;
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  constructor(private http: HttpClient) {}

  getUploadUrls(tradeId: number, count: number): Observable<{ urls: PresignedUploadEntry[] }> {
    return this.http.post<{ urls: PresignedUploadEntry[] }>(
      `${API_BASE_URL}/trades/${tradeId}/pictures/presigned-urls`,
      { count },
    );
  }

  getViewUrls(tradeId: number): Observable<{ urls: ImageEntry[] }> {
    return this.http.get<{ urls: ImageEntry[] }>(
      `${API_BASE_URL}/trades/${tradeId}/pictures/presigned-urls`,
    );
  }

  // Uses fetch to bypass Angular auth interceptor — presigned URL carries auth in query string
  uploadFile(presignedUrl: string, file: File): Observable<void> {
    return from(
      fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      }).then((res) => {
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      }),
    );
  }

  deleteImage(tradeId: number, objectName: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/trades/${tradeId}/pictures`, {
      body: { objectName },
    });
  }
}
