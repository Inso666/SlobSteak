import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** US-076: Bewertungsfortschritt einer perspektiv-tragenden Rolle — spiegelt
 * `RoleAssessmentProgressResponse` im Backend 1:1. */
export interface RoleAssessmentProgress {
  percent: number;
  unassessedCount: number;
}

/** US-074: `status`/`createdAt` additiv ergänzt — spiegeln `ProjectOverviewResponse` im Backend
 * 1:1 (CLAUDE.md/`.claude/agents/frontend.md` Abschnitt 3: DTO-Typen bilden den Response-Contract
 * ab). `status` steuert die „Archiviert"-Kennzeichnung der Projektkarten, `createdAt` das
 * clientseitige Sortierkriterium „Neu zuerst" — beide ausschließlich auf der Projektübersicht
 * ausgewertet (`ProjectOverviewComponent`). Bewusst optional statt Pflichtfeld: `ProjectOverviewItem`
 * wird auch von `ProjectsService.getProject()` für den Projekt-Workspace (US-019) sowie von
 * Rollen-Guards/zahlreichen bestehenden Story-Tests außerhalb dieser Story verwendet, die beide
 * Felder nicht kennen — ein Pflichtfeld hätte deren Test-Fixtures ohne fachlichen Mehrwert für die
 * jeweilige Story angefasst (CLAUDE.md Abschnitt 3: „nur an aktueller Story arbeiten"). Die reale
 * Backend-Response liefert beide Felder immer; nur Test-Stubs außerhalb dieser Story dürfen sie
 * auslassen.
 *
 * US-076: `updatedAt` sowie der Bewertungsfortschritt je perspektiv-tragender Rolle (`pl`/
 * `coreteam`/`architect`) ebenso additiv/optional ergänzt — Grundlage der Fortschritts-Ringe, des
 * „unbewertet · deine Sicht"-Hinweises und der Kartenfußzeile „Aktualisiert vor …" auf der
 * Projektübersicht. */
export interface ProjectOverviewItem {
  id: string;
  name: string;
  role: string;
  stakeholderCount: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  pl?: RoleAssessmentProgress;
  coreteam?: RoleAssessmentProgress;
  architect?: RoleAssessmentProgress;
}

/**
 * Injizierbarer Service für die Projektübersicht (US-018, Screen S2). Alle HTTP-Zugriffe laufen
 * ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  /** Liefert ausschließlich die Projekte, in denen der angemeldete Nutzer eine Mitgliedschaft
   * hat, mit eigener Rolle und Stakeholder-Anzahl (Akzeptanzkriterium 1). */
  listMyProjects(): Observable<ProjectOverviewItem[]> {
    return this.http.get<ProjectOverviewItem[]>('/api/v1/projects');
  }

  /** Liefert ein einzelnes Projekt inklusive eigener Rolle (US-019: Header/Rollen-Badge der
   * Projekt-Workspace-Shell, sowie `roleGuard` für die Tab-Sichtbarkeit). 404, wenn der Nutzer in
   * diesem Projekt keine Mitgliedschaft hat. */
  getProject(id: string): Observable<ProjectOverviewItem> {
    return this.http.get<ProjectOverviewItem>(`/api/v1/projects/${id}`);
  }
}
