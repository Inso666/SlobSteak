import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
}

export interface AdminProjectMembership {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
}

/** Projektbezogene Rollen — bewusst ohne `Admin` (das ist eine instanzweite Systemrolle, siehe
 * `ProjectRole`-Enum im Backend). */
export const PROJECT_ROLES = ['PL', 'Coreteam', 'Architect', 'User'] as const;

/**
 * Injizierbarer Service für den Admin-Bereich „Projektverwaltung & Mitgliederzuweisung“ (US-017).
 * Alle HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente
 * (CLAUDE.md Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class AdminProjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/projects';

  listProjects(): Observable<AdminProject[]> {
    return this.http.get<AdminProject[]>(this.baseUrl);
  }

  createProject(name: string, description: string | null): Observable<AdminProject> {
    return this.http.post<AdminProject>(this.baseUrl, { name, description });
  }

  listMemberships(projectId: string): Observable<AdminProjectMembership[]> {
    return this.http.get<AdminProjectMembership[]>(`${this.baseUrl}/${projectId}/memberships`);
  }

  assignMember(projectId: string, userId: string, role: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${projectId}/memberships`, { userId, role });
  }

  changeMemberRole(projectId: string, userId: string, role: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${projectId}/memberships/${userId}`, { role });
  }

  removeMember(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/memberships/${userId}`);
  }
}
