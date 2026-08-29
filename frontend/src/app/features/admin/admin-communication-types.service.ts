import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Wire-Contract 1:1 zu `CommunicationTypeResponse` (US-037,
 * `src/SlobSteak.Api/Controllers/Admin/AdminCommunicationTypeController.cs`). */
export interface AdminCommunicationType {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Injizierbarer Service für den Admin-Bereich „Kommunikationsarten-Katalog“ (US-038). Alle
 * HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente
 * (CLAUDE.md Abschnitt 3.1, frontend.md Abschnitt 2).
 */
@Injectable({ providedIn: 'root' })
export class AdminCommunicationTypesService {
  private readonly http = inject(HttpClient);
  /** Lesender Endpunkt (US-037 Akzeptanzkriterium 4): für alle authentifizierten Nutzer erreichbar,
   * bewusst ohne `/admin`-Präfix — deckungsgleich mit der Backend-Route `CommunicationTypeController`. */
  private readonly listUrl = '/api/v1/communication-types';
  /** Schreibende Endpunkte (US-037 Akzeptanzkriterium 5): ausschließlich für Systemadmins. */
  private readonly adminBaseUrl = '/api/v1/admin/communication-types';

  /** Lädt **alle** Katalogeinträge inkl. deaktivierter (kein `activeOnly`-Parameter) — der
   * Admin-Bereich zeigt deaktivierte Einträge weiterhin an (Story „Wichtige Invarianten“), im
   * Unterschied zur Auswahlliste bei neuen Zuordnungen (dort `activeOnly=true`, außerhalb dieser
   * Story). */
  listCommunicationTypes(): Observable<AdminCommunicationType[]> {
    return this.http.get<AdminCommunicationType[]>(this.listUrl);
  }

  /** US-040 Akzeptanzkriterium 5: Katalog-Dropdown beim Zuordnen einer Kommunikationsart am
   * Stakeholder zeigt ausschließlich aktive Einträge zur Auswahl. */
  listActiveCommunicationTypes(): Observable<AdminCommunicationType[]> {
    return this.http.get<AdminCommunicationType[]>(this.listUrl, { params: new HttpParams().set('activeOnly', 'true') });
  }

  createCommunicationType(name: string): Observable<AdminCommunicationType> {
    return this.http.post<AdminCommunicationType>(this.adminBaseUrl, { name });
  }

  renameCommunicationType(id: string, name: string): Observable<AdminCommunicationType> {
    return this.http.patch<AdminCommunicationType>(`${this.adminBaseUrl}/${id}`, { name });
  }

  setActive(id: string, isActive: boolean): Observable<AdminCommunicationType> {
    return this.http.patch<AdminCommunicationType>(`${this.adminBaseUrl}/${id}`, { isActive });
  }
}
