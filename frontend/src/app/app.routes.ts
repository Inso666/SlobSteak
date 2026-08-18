import { Routes } from '@angular/router';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';

/**
 * Routentabelle (US-009). `/projects` (Projektübersicht, S2) folgt inhaltlich erst mit US-018 —
 * die Navigation nach erfolgreichem Login dorthin ist bereits verdrahtet (siehe
 * `LoginPageComponent`), der Zielscreen selbst wird dort ergänzt.
 */
export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
