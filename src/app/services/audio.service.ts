import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

interface AudioResponse {
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private readonly API_URL = '/api/audio';
  private sessionId: string;
  private chunkCounter: number = 0;

  constructor(private http: HttpClient) {
    this.sessionId = uuidv4();
  }

  resetSession() {
    this.sessionId = uuidv4();
    this.chunkCounter = 0;
  }

  uploadChunk(audioChunk: Blob): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const chunkId = this.chunkCounter++;
        
        this.http.post(`${this.API_URL}/add?sessionId=${this.sessionId}&chunkId=${chunkId}`, {
          audioData: base64Data
        }).subscribe({
          next: (response) => observer.next(response),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      };
      
      reader.onerror = (error) => observer.error(error);
      reader.readAsDataURL(audioChunk);
    });
  }

  mergeAudio(): Observable<any> {
    return this.http.put(`${this.API_URL}/merge?sessionId=${this.sessionId}`, {});
  }

  getAudio(): Observable<string> {
    return this.http.get<AudioResponse>(`${this.API_URL}/retrieve?sessionId=${this.sessionId}`).pipe(
      map(response => response.url)
    );
  }

  deleteAudio(): Observable<any> {
    return this.http.delete(`${this.API_URL}/remove?sessionId=${this.sessionId}`);
  }
}