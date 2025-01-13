import { Component, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../services/audio.service';

interface AudioState {
  url: string | null;
  isPlaying: boolean;
}

@Component({
  selector: 'app-recorder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recorder.component.html'
})
export class RecorderComponent implements OnDestroy {
  private mediaRecorder: MediaRecorder | null = null;
  private audioPlayer: HTMLAudioElement | null = null;
  
  isRecording = signal(false);
  chunkDuration = signal(10); // seconds
  uploadedChunks = signal<number>(0);
  mergeStatus = signal<'idle' | 'merging' | 'success' | 'error'>('idle');
  audioState = signal<AudioState>({ url: null, isPlaying: false });
  
  canMerge = computed(() => this.uploadedChunks() >= 4 && !this.isRecording());
  
  constructor(private audioService: AudioService) {
    this.audioPlayer = new Audio();
    this.audioPlayer.addEventListener('ended', () => {
      this.audioState.set({ ...this.audioState(), isPlaying: false });
    });
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.isRecording.set(true);

      if (this.uploadedChunks() === 0) {
        this.audioService.resetSession();
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.uploadChunk(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Request final chunk
        this.mediaRecorder?.requestData();
      };

      this.mediaRecorder.start(this.chunkDuration() * 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  private uploadChunk(chunk: Blob) {
    this.audioService.uploadChunk(chunk).subscribe({
      next: () => {
        this.uploadedChunks.update(count => count + 1);
      },
      error: (error) => {
        console.error('Error uploading chunk:', error);
        alert('Failed to upload audio chunk. Please try again.');
      }
    });
  }

  mergeAudio() {
    this.mergeStatus.set('merging');
    this.audioService.mergeAudio().subscribe({
      next: () => {
        this.mergeStatus.set('success');
        this.fetchAudio(); // Automatically fetch the merged audio
      },
      error: (error) => {
        console.error('Error merging audio:', error);
        this.mergeStatus.set('error');
        alert('Failed to merge audio chunks. Please try again.');
      }
    });
  }

  fetchAudio() {
    this.audioService.getAudio().subscribe({
      next: (url) => {
        const currentUrl = this.audioState().url;
        this.audioState.set({ url: url, isPlaying: false });
        if (this.audioPlayer) {
          this.audioPlayer.src = url;
        }
      },
      error: (error) => {
        console.error('Error fetching audio:', error);
        alert('Failed to fetch audio. Please try again.');
      }
    });
  }

  togglePlayback() {
    if (this.audioPlayer && this.audioState().url) {
      if (this.audioState().isPlaying) {
        this.audioPlayer.pause();
        this.audioState.set({ ...this.audioState(), isPlaying: false });
      } else {
        const audioUrl = this.audioState().url;
        if (audioUrl) {
          this.audioPlayer.src = audioUrl;
          this.audioPlayer.play();
          this.audioState.set({ ...this.audioState(), isPlaying: true });
        }
      }
    }
  }

  deleteAudio() {
    if (confirm('Are you sure you want to delete the recorded audio?')) {
      this.audioService.deleteAudio().subscribe({
        next: () => {
          const currentUrl = this.audioState().url;
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          this.audioState.set({ url: null, isPlaying: false });
          this.mergeStatus.set('idle');
          this.uploadedChunks.set(0);
        },
        error: (error) => {
          console.error('Error deleting audio:', error);
          alert('Failed to delete audio. Please try again.');
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.mediaRecorder) {
      this.stopRecording();
    }
    const currentUrl = this.audioState().url;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
  }
}