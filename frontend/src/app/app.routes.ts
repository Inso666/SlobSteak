import { Routes } from '@angular/router';
import { adminGuard } from './features/admin/admin.guard';
import { AdminPageComponent } from './features/admin/admin-page/admin-page.component';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { CommunicationTypesAdminComponent } from './features/admin/communication-types-admin/communication-types-admin.component';
import { authGuard } from './features/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { ProjectOverviewComponent } from './features/projects/project-overview/project-overview.component';
import { roleGuard } from './core/guards/role.guard';
import { AccessDeniedComponent } from './features/workspace/access-denied/access-denied.component';
import { ProjectWorkspaceLayoutComponent } from './features/workspace/project-workspace-layout/project-workspace-layout.component';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { StakeholderDetailComponent } from './features/stakeholders/stakeholder-detail/stakeholder-detail.component';

/** Alle vier projektbezogenen Rollen (kein `Admin` — das ist eine instanzweite Systemrolle). */
const ALL_PROJECT_ROLES = ['PL', 'Coreteam', 'Architect', 'User'] as const;

/**
 * Routentabelle (US-009, erweitert um US-016/US-017/US-018/US-019). `/projects` (Projektübersicht,
 * S2) ist geschützt durch `authGuard` (jede gültige Session). `/projects/:id` (Projekt-Workspace,
 * S3) ist zusätzlich durch `roleGuard(ALL_PROJECT_ROLES)` geschützt — nur wer irgendeine der vier
 * Projektrollen im Zielprojekt hat (also Mitglied ist), kommt hinein; ein Systemadmin ohne eigene
 * Zuweisung hat laut PRD Abschnitt 2.3 keinen fachlichen Zugriff. Innerhalb der Workspace-Shell
 * ist „Stakeholder-Liste“ der Standard-Landingtab (Akzeptanzkriterium 2, für alle vier Rollen
 * sichtbar); „Map“ und „Verteiler“ tragen zusätzlich einen enger gefassten `roleGuard“
 * (Akzeptanzkriterium 3/4) — bei fehlender Berechtigung landet die Navigation auf
 * `access-denied` (Akzeptanzkriterium 5). `/admin/users` und `/admin/projects` sind durch
 * `adminGuard` clientseitig geschützt (US-016/US-017 Akzeptanzkriterium 4/5).
 *
 * US-056: `/admin` ist seit dieser Story eine gemeinsame Elternroute mit `AdminPageComponent`
 * (Tab-Host, `adminGuard` einmalig hier statt dupliziert auf beiden Kindern) — analog zum bereits
 * etablierten Muster von `ProjectWorkspaceLayoutComponent`. `/admin/users` und `/admin/projects`
 * bleiben als eigenständige, bookmarkbare Kind-Routen bestehen (siehe Doc-Kommentar an
 * `AdminPageComponent`).
 *
 * US-025: `stakeholders` rendert seit dieser Story `StakeholderListComponent` (löst den
 * bisherigen `CreateStakeholderFormComponent`-Platzhalter aus US-021 ab) — serverseitig geladene
 * Liste mit Suche/Filter, inkl. eingebettetem Anlage-Formular.
 *
 * US-026: `stakeholders/:stakeholderId` (Screen S4) ist für dieselben vier Rollen erreichbar wie
 * die Liste (kein zusätzlicher `roleGuard` — die Detailseite ist für jedes Projektmitglied lesbar,
 * Akzeptanzkriterium 2; Bearbeiten-/Löschen-Sichtbarkeit ist komponenteninterne Rollenlogik,
 * serverseitig ohnehin weiterhin über die bestehenden `PATCH`/`DELETE`-Endpunkte abgesichert).
 *
 * US-032: `map` rendert seit dieser Story `StakeholderMapPageComponent` (löst den bisherigen
 * `MapPlaceholderComponent`-Platzhalter aus US-019 ab) — per `loadComponent` lazy geladen
 * (frontend.md Abschnitt 3), unverändert weiterhin durch `roleGuard(['PL','Coreteam','Architect'])`
 * geschützt.
 *
 * US-042: `distribution` rendert seit dieser Story `DistributionListPageComponent` (löst den
 * bisherigen `DistributionPlaceholderComponent`-Platzhalter aus US-019 ab) — analog zu `map` per
 * `loadComponent` lazy geladen, unverändert weiterhin durch `roleGuard(['PL','Coreteam'])`
 * geschützt.
 */
export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'projects', component: ProjectOverviewComponent, canActivate: [authGuard] },
  {
    path: 'projects/:id',
    component: ProjectWorkspaceLayoutComponent,
    canActivate: [authGuard, roleGuard(ALL_PROJECT_ROLES)],
    children: [
      { path: '', redirectTo: 'stakeholders', pathMatch: 'full' },
      { path: 'stakeholders', component: StakeholderListComponent },
      { path: 'stakeholders/:stakeholderId', component: StakeholderDetailComponent },
      {
        path: 'map',
        loadComponent: () => import('./features/map/stakeholder-map-page/stakeholder-map-page.component').then((m) => m.StakeholderMapPageComponent),
        canActivate: [roleGuard(['PL', 'Coreteam', 'Architect'])],
      },
      {
        path: 'distribution',
        loadComponent: () =>
          import('./features/distribution/distribution-list-page/distribution-list-page.component').then((m) => m.DistributionListPageComponent),
        canActivate: [roleGuard(['PL', 'Coreteam'])],
      },
      { path: 'access-denied', component: AccessDeniedComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: UsersAdminComponent },
      { path: 'projects', component: ProjectsAdminComponent },
      { path: 'communication-types', component: CommunicationTypesAdminComponent },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
