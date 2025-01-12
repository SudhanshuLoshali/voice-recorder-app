import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private readonly API_URL = 'http://localhost:3000/audio';

  constructor(private http: HttpClient) {}

  uploadChunk(audioChunk: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioChunk);
    return this.http.post(`${this.API_URL}/add`, formData);
  }

  mergeAudio(): Observable<any> {
    return this.http.post(`${this.API_URL}/merge`, {});
  }

  getAudio(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/retrieve`, { responseType: 'blob' });
  }

  deleteAudio(): Observable<any> {
    return this.http.delete(`${this.API_URL}/remove`);
  }
}