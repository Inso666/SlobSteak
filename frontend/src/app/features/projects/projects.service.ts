import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjectOverviewItem {
  id: string;
  name: string;
  role: string;
  stakeholderCount: number;
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
}
