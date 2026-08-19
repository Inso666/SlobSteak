import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  /** Nur in der Papierkorb-Ansicht gesetzt (US-024 Akzeptanzkriterium 1), sonst `null`. */
  deletedAt: string | null;
  deletedByName: string | null;
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

/** US-023 Akzeptanzkriterium 2: Anzahl betroffener Datensätze für den Lösch-Bestätigungsdialog. */
export interface StakeholderDeletionImpact {
  assessmentCount: number;
  communicationAssignmentCount: number;
}

/** US-025 Akzeptanzkriterium 1/2 (erweitert um US-024 Akzeptanzkriterium 1): optionale Filter für
 * die Stakeholderliste. */
export interface StakeholderListFilters {
  search?: string;
  type?: string;
  communicationTypeId?: string;
  /** US-024: liefert statt der aktiven ausschließlich soft-gelöschte Stakeholder (Papierkorb). */
  deleted?: boolean;
}

/**
 * Injizierbarer Service für Stakeholder-Stammdaten (US-021 Anlegen, US-022 Bearbeiten, US-023
 * Soft-Delete, US-024 Wiederherstellen/Papierkorb, US-025 Liste mit Suche/Filter). Alle
 * HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente
 * (CLAUDE.md Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class StakeholdersService {
  private readonly http = inject(HttpClient);

  listStakeholders(projectId: string, filters: StakeholderListFilters = {}): Observable<Stakeholder[]> {
    let params = new HttpParams();
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.communicationTypeId) {
      params = params.set('communicationTypeId', filters.communicationTypeId);
    }
    if (filters.deleted) {
      params = params.set('deleted', 'true');
    }

    return this.http.get<Stakeholder[]>(`/api/v1/projects/${projectId}/stakeholders`, { params });
  }

  createStakeholder(projectId: string, payload: StakeholderDetailsPayload): Observable<Stakeholder> {
    return this.http.post<Stakeholder>(`/api/v1/projects/${projectId}/stakeholders`, payload);
  }

  updateStakeholder(id: string, payload: StakeholderDetailsPayload): Observable<Stakeholder> {
    return this.http.patch<Stakeholder>(`/api/v1/stakeholders/${id}`, payload);
  }

  getDeletionImpact(id: string): Observable<StakeholderDeletionImpact> {
    return this.http.get<StakeholderDeletionImpact>(`/api/v1/stakeholders/${id}/deletion-impact`);
  }

  deleteStakeholder(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/stakeholders/${id}`);
  }

  /** US-024 Akzeptanzkriterium 2: macht ein Soft-Delete rückgängig. */
  restoreStakeholder(id: string): Observable<void> {
    return this.http.post<void>(`/api/v1/stakeholders/${id}/restore`, null);
  }
}
