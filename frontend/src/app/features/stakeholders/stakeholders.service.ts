import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SimilarStakeholderWarning {
  id: string;
  name: string;
}

export interface Stakeholder {
  id: string;
  projectId: string;
  type: string;
  name: string;
  organization: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  locationDepartment: string | null;
  description: string | null;
  /** Aufgelöster Name des Nutzers, der zuletzt geändert hat (US-022 Akzeptanzkriterium 4). */
  updatedByName: string;
  updatedAt: string;
  similarStakeholderWarning: SimilarStakeholderWarning | null;
}

export interface StakeholderDetailsPayload {
  name: string;
  type: string;
  organization?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  locationDepartment?: string | null;
  description?: string | null;
}

/**
 * Injizierbarer Service für Stakeholder-Stammdaten (US-021 Anlegen, US-022 Bearbeiten). Alle
 * HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente
 * (CLAUDE.md Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class StakeholdersService {
  private readonly http = inject(HttpClient);

  createStakeholder(projectId: string, payload: StakeholderDetailsPayload): Observable<Stakeholder> {
    return this.http.post<Stakeholder>(`/api/v1/projects/${projectId}/stakeholders`, payload);
  }

  updateStakeholder(id: string, payload: StakeholderDetailsPayload): Observable<Stakeholder> {
    return this.http.patch<Stakeholder>(`/api/v1/stakeholders/${id}`, payload);
  }
}
