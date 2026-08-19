import { Routes } from '@angular/router';
import { adminGuard } from './features/admin/admin.guard';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';

/**
 * Routentabelle (US-009, erweitert um US-016/US-017). `/projects` (Projektübersicht, S2) folgt
 * inhaltlich erst mit US-018 — die Navigation nach erfolgreichem Login dorthin ist bereits
 * verdrahtet (siehe `LoginPageComponent`), der Zielscreen selbst wird dort ergänzt. `/admin/users`
 * und `/admin/projects` sind bereits durch `adminGuard` clientseitig geschützt (US-016/US-017
 * Akzeptanzkriterium 4/5) — die Navigation, aus der dieser Bereich sichtbar erreichbar ist,
 * entsteht mit der Workspace-Shell in US-019.
 */
export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'admin/users', component: UsersAdminComponent, canActivate: [adminGuard] },
  { path: 'admin/projects', component: ProjectsAdminComponent, canActivate: [adminGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
