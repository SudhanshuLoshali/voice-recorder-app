import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RecorderComponent } from './components/recorder/recorder.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'recorder', component: RecorderComponent },
  { path: '**', redirectTo: '' }
];