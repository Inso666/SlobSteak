import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { StakeholdersService } from '../stakeholders/stakeholders.service';

/**
 * Wire-Contract 1:1 zu `DistributionListEntryResponse` (US-041,
 * `src/SlobSteak.Api/Controllers/DistributionListController.cs`). Bewusst **ohne** `organization` —
 * dieses Feld existiert im US-041-Response-Contract nicht (siehe {@link DistributionListRow} sowie
 * Anmerkungen des Agenten in der Story-Datei US-042).
 */
export interface DistributionListWireEntry {
  stakeholderId: string;
  name: string;
  stakeholderType: string;
  hasEmail: boolean;
  email: string | null;
  communicationTypeId: string;
  communicationTypeName: string;
  frequency: string;
  channel: string;
}

/** Optionale, beliebig kombinierbare Filter der Verteilerlisten-Query (US-041 Akzeptanzkriterium
 * 1), 1:1 zu den Query-Parametern von `GET .../distribution-list`. */
export interface DistributionListFilters {
  communicationTypeId?: string;
  frequency?: string;
  channel?: string;
  stakeholderType?: string;
}

/**
 * Anzeige-/Export-taugliche Zeile der Verteilerliste: reichert den Wire-Contract um die
 * Organisation an. `DistributionListEntryResponse` (US-041) enthält keine Organisation — die
 * Story-Anforderung (US-042 Akzeptanzkriterium 1/3: Tabellenspalte/CSV-Spalte "Organisation") wird
 * daher über einen zusätzlichen, client-seitigen Abgleich gegen `GET
 * /api/v1/projects/{projectId}/stakeholders` (bereits für alle vier Projektrollen erreichbar,
 * `StakeholdersService.listStakeholders`) erfüllt, statt das Akzeptanzkriterium stillschweigend
 * wegzulassen (CLAUDE.md Abschnitt 6). Siehe Anmerkungen des Agenten in der Story-Datei für die
 * ausführliche Begründung dieser Entscheidung und den empfohlenen Follow-up (Organisation direkt
 * in `DistributionListEntryResponse` aufnehmen, um den zusätzlichen Request künftig zu sparen).
 */
export interface DistributionListRow {
  stakeholderId: string;
  name: string;
  organization: string | null;
  hasEmail: boolean;
  email: string | null;
  communicationTypeId: string;
  communicationTypeName: string;
  frequency: string;
  channel: string;
}

/**
 * Injizierbarer Service für die Verteilerlisten-Query (US-041/US-042, Bounded Context
 * DistributionList). Alle HTTP-Zugriffe laufen ausschließlich über diese Klasse, nie direkt aus
 * einer Komponente (CLAUDE.md Abschnitt 3.1, frontend.md Abschnitt 2).
 */
@Injectable({ providedIn: 'root' })
export class DistributionListService {
  private readonly http = inject(HttpClient);
  private readonly stakeholdersService = inject(StakeholdersService);

  /**
   * Lädt die gefilterte Verteilerliste eines Projekts (US-041 Akzeptanzkriterium 1) und reichert
   * jeden Eintrag um die Organisation des zugehörigen Stakeholders an (siehe
   * {@link DistributionListRow}). Beide Requests laufen parallel (`forkJoin`); schlägt einer der
   * beiden fehl, schlägt die gesamte Anfrage fehl — die aufrufende Komponente zeigt in diesem Fall
   * den bestehenden Fehler-Baustein (SPEC-00 §3) statt einer teilweise befüllten Tabelle.
   */
  getDistributionList(
    projectId: string,
    filters: DistributionListFilters = {},
  ): Observable<DistributionListRow[]> {
    let params = new HttpParams();
    if (filters.communicationTypeId) {
      params = params.set('communicationTypeId', filters.communicationTypeId);
    }
    if (filters.frequency) {
      params = params.set('frequency', filters.frequency);
    }
    if (filters.channel) {
      params = params.set('channel', filters.channel);
    }
    if (filters.stakeholderType) {
      params = params.set('stakeholderType', filters.stakeholderType);
    }

    return forkJoin([
      this.http.get<DistributionListWireEntry[]>(
        `/api/v1/projects/${projectId}/distribution-list`,
        { params },
      ),
      // Unfiltered geladen: die Organisation eines Stakeholders ist unabhängig vom aktiven
      // Verteiler-Filter, ein serverseitig gleich gefilterter Aufruf brächte keinen Vorteil.
      this.stakeholdersService.listStakeholders(projectId),
    ]).pipe(
      map(([entries, stakeholders]) => {
        const organizationByStakeholderId = new Map(
          stakeholders.map((stakeholder) => [stakeholder.id, stakeholder.organization]),
        );
        return entries.map((entry): DistributionListRow => ({
          stakeholderId: entry.stakeholderId,
          name: entry.name,
          organization: organizationByStakeholderId.get(entry.stakeholderId) ?? null,
          hasEmail: entry.hasEmail,
          email: entry.email,
          communicationTypeId: entry.communicationTypeId,
          communicationTypeName: entry.communicationTypeName,
          frequency: entry.frequency,
          channel: entry.channel,
        }));
      }),
    );
  }
}
