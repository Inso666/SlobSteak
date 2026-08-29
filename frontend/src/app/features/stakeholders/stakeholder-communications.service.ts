import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Wire-Contract 1:1 zu `CommunicationAssignmentResponse` (US-040,
 * `src/SlobSteak.Api/Controllers/StakeholderCommunicationController.cs`). `frequency`/`channel`
 * sind der bestehende String-Wire-Contract für Enums (z. B. `Weekly`/`Email`), analog zu
 * `Stakeholder.type`. */
export interface CommunicationAssignment {
  communicationTypeId: string;
  communicationTypeName: string;
  /** Ein deaktivierter Katalogeintrag bleibt an bereits zugeordneten Stakeholdern sichtbar
   * (PRD Abschnitt F5.3). */
  communicationTypeIsActive: boolean;
  frequency: string;
  channel: string;
}

export interface CommunicationAssignmentPayload {
  frequency: string;
  channel: string;
}

/**
 * Injizierbarer Service für Kommunikationszuordnungen an einem Stakeholder (US-040). Alle
 * HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente
 * (CLAUDE.md Abschnitt 3.1, frontend.md Abschnitt 2).
 */
@Injectable({ providedIn: 'root' })
export class StakeholderCommunicationsService {
  private readonly http = inject(HttpClient);

  getAssignments(stakeholderId: string): Observable<CommunicationAssignment[]> {
    return this.http.get<CommunicationAssignment[]>(`/api/v1/stakeholders/${stakeholderId}/communications`);
  }

  /** Akzeptanzkriterium 1: Duplikat (bereits zugeordnete Kommunikationsart) liefert `409`. */
  assignCommunication(
    stakeholderId: string,
    communicationTypeId: string,
    payload: CommunicationAssignmentPayload,
  ): Observable<CommunicationAssignment> {
    return this.http.post<CommunicationAssignment>(`/api/v1/stakeholders/${stakeholderId}/communications`, {
      communicationTypeId,
      ...payload,
    });
  }

  /** Akzeptanzkriterium 2. */
  updateAssignment(
    stakeholderId: string,
    communicationTypeId: string,
    payload: CommunicationAssignmentPayload,
  ): Observable<CommunicationAssignment> {
    return this.http.patch<CommunicationAssignment>(`/api/v1/stakeholders/${stakeholderId}/communications/${communicationTypeId}`, payload);
  }

  /** Akzeptanzkriterium 3. */
  removeAssignment(stakeholderId: string, communicationTypeId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/stakeholders/${stakeholderId}/communications/${communicationTypeId}`);
  }
}
