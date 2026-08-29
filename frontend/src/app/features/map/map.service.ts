import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Perspektiv-tragende Rollen (F3.1) — deckungsgleich mit dem `perspective`-Query-Parameter der
 * Map-Query-API (US-031). Rolle `User` trägt keine Perspektive und ist hier bewusst nicht
 * enthalten (Konsistenz mit `roleGuard(['PL','Coreteam','Architect'])` auf der Map-Route). */
export type PerspectiveRole = 'PL' | 'Coreteam' | 'Architect';

/** Ein Punkt der Quadranten-Map, 1:1 zum Response-Contract von `GET
 * /api/v1/projects/{projectId}/map` (US-031 Akzeptanzkriterium 1) — nur Stakeholder mit einem
 * Assessment in der angefragten Perspektive sind enthalten. */
export interface MapPoint {
  stakeholderId: string;
  name: string;
  influence: number;
  interest: number;
}

/** Einfluss-/Interesse-Wertepaar einer einzelnen Perspektive innerhalb eines
 * {@link MapComparisonEntry} — 1:1 zum `StakeholderMapComparisonValueResponse` (US-033). */
export interface MapComparisonValue {
  influence: number;
  interest: number;
}

/** Ein Vergleichseintrag, 1:1 zum Response-Contract von `GET
 * /api/v1/projects/{projectId}/map/compare` (US-033 Akzeptanzkriterium 1): ein Stakeholder mit
 * Assessment in mindestens einer der beiden gewählten Perspektiven `primary`/`secondary`. Fehlt
 * das Assessment in einer der beiden Perspektiven, ist das jeweilige Feld `null` (US-034
 * Akzeptanzkriterium 3 — genau ein Punkt ohne Verbindungslinie in diesem Fall). */
export interface MapComparisonEntry {
  stakeholderId: string;
  name: string;
  primary: MapComparisonValue | null;
  secondary: MapComparisonValue | null;
}

/**
 * Injizierbarer Service für die Map-Query-API (US-031/US-033). Alle HTTP-Zugriffe laufen
 * ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md Abschnitt 3.1 /
 * frontend.md Abschnitt 2).
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly http = inject(HttpClient);

  /** Lädt alle Map-Punkte eines Projekts für genau eine Perspektive (Akzeptanzkriterium 3). */
  getMapData(projectId: string, perspective: PerspectiveRole): Observable<MapPoint[]> {
    const params = new HttpParams().set('perspective', perspective);
    return this.http.get<MapPoint[]>(`/api/v1/projects/${projectId}/map`, { params });
  }

  /** Lädt die Vergleichsdaten zweier Perspektiven eines Projekts (US-034 Akzeptanzkriterium 1,
   * ruft `GET .../map/compare` aus US-033 auf). */
  getComparisonData(projectId: string, primary: PerspectiveRole, secondary: PerspectiveRole): Observable<MapComparisonEntry[]> {
    const params = new HttpParams().set('primary', primary).set('secondary', secondary);
    return this.http.get<MapComparisonEntry[]>(`/api/v1/projects/${projectId}/map/compare`, { params });
  }
}
