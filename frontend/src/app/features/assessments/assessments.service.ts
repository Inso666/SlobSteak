import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';

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

  /**
   * Persistiert eine per Drag&Drop geänderte Position (US-036 Akzeptanzkriterium 3, SPEC-04 §2.2)
   * über denselben `PUT .../assessments/{role}`-Endpoint wie das Formular (US-028/US-029), inkl.
   * dessen Konfliktregel (409, US-035).
   *
   * **Dokumentierte Ergänzung zu SPEC-04 §2.2 (CLAUDE.md Abschnitt 6):** Der aggregierte
   * Map-Response-Contract (`GET .../map` bzw. `.../map/compare`, US-031/US-033) transportiert
   * bewusst nur Koordinaten, keine Assessment-Version — anders als `GET .../assessments` (US-028),
   * das `version` je Rolle liefert. Damit der Drag&Drop-Endpoint dennoch mit einer „aktuellen"
   * `expectedVersion` aufgerufen werden kann (Story-Akzeptanzkriterium 3), ohne den bereits
   * abgenommenen Map-Response-Contract rückwirkend zu erweitern, holt diese Methode die Version
   * unmittelbar vor dem Schreiben frisch über den bestehenden Assessments-Endpoint — das verkürzt
   * das Konflikt-Zeitfenster sogar gegenüber einer beim Map-Laden zwischengespeicherten Version.
   */
  updatePosition(stakeholderId: string, role: string, position: { influence: number; interest: number }): Observable<AssessmentRole> {
    return this.getAssessments(stakeholderId).pipe(
      switchMap((roles) => {
        const current = roles.find((r) => r.role === role);
        const expectedVersion = current?.status === 'ASSESSED' ? (current.version ?? undefined) : undefined;
        return this.upsertAssessment(stakeholderId, role, {
          influence: position.influence,
          interest: position.interest,
          expectedVersion,
        });
      }),
    );
  }
}
