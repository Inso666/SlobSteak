import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Status eines Assessment-Rollensegments (US-028 Akzeptanzkriterium 5/6). */
export type AssessmentStatus = 'ASSESSED' | 'NOT_ASSESSED' | 'NO_ROLE_ASSIGNED';

export interface AssessmentRole {
  role: string;
  status: AssessmentStatus;
  influence: number | null;
  interest: number | null;
  notes: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
  version: number | null;
}

export interface UpsertAssessmentPayload {
  influence: number;
  interest: number;
  notes?: string | null;
  /** Optimistisches Locking (US-028 Akzeptanzkriterium 3) — fehlt der Wert, speichert der Server
   * ohne Konfliktprüfung (Akzeptanzkriterium 4, „Trotzdem speichern“). */
  expectedVersion?: number;
}

/**
 * Injizierbarer Service für Stakeholder-Assessments (US-029). Alle HTTP-Zugriffe laufen
 * ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private readonly http = inject(HttpClient);

  getAssessments(stakeholderId: string): Observable<AssessmentRole[]> {
    return this.http.get<AssessmentRole[]>(`/api/v1/stakeholders/${stakeholderId}/assessments`);
  }

  upsertAssessment(stakeholderId: string, role: string, payload: UpsertAssessmentPayload): Observable<AssessmentRole> {
    return this.http.put<AssessmentRole>(`/api/v1/stakeholders/${stakeholderId}/assessments/${role}`, payload);
  }
}
