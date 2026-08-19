import { Routes } from '@angular/router';
import { adminGuard } from './features/admin/admin.guard';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { authGuard } from './features/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { ProjectOverviewComponent } from './features/projects/project-overview/project-overview.component';

/**
 * Routentabelle (US-009, erweitert um US-016/US-017/US-018). `/projects` (Projektübersicht, S2)
 * ist ab US-018 ein echtes Ziel, geschützt durch `authGuard` (jede gültige Session, im Unterschied
 * zu `adminGuard`). Klick auf eine Projektkarte navigiert zu `/projects/:id` (Projekt-Workspace,
 * S3) — diese Route entsteht erst mit US-019, aktuell ohne Treffer (analog zum vorherigen
 * Zwischenzustand von `/projects` selbst vor dieser Story). `/admin/users` und `/admin/projects`
 * sind bereits durch `adminGuard` clientseitig geschützt (US-016/US-017 Akzeptanzkriterium 4/5) —
 * die Navigation, aus der dieser Bereich sichtbar erreichbar ist, entsteht mit der Workspace-Shell
 * in US-019.
 */
export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'projects', component: ProjectOverviewComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: UsersAdminComponent, canActivate: [adminGuard] },
  { path: 'admin/projects', component: ProjectsAdminComponent, canActivate: [adminGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
