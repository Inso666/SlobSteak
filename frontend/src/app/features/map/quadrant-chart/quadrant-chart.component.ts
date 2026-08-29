import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MapComparisonEntry, MapComparisonValue, MapPoint, PerspectiveRole } from '../map.service';
import { ConnectionDiff, ConnectionLineTooltipComponent } from '../connection-line-tooltip/connection-line-tooltip.component';
import { MAP_LEGEND_CONNECTION_LABEL, MAP_LEGEND_NOTE, MAP_LEGEND_TITLE } from '../map-messages';

/** CSS-Modifier-Klasse je Rolle, referenziert dieselben zentralen Rollenfarb-Tokens
 * (`--app-role-pl/ct/ar`, SPEC-00 §1.2) wie der `.role-badge`-Baustein aus US-047 — keine zweite,
 * abweichende Farbdefinition für Map-Punkte. Dieselbe Zuordnung treibt sowohl die Punkte
 * (Kreis/Diamant) als auch die Legende (US-034 Akzeptanzkriterium 4 — „Punktkodierung ist
 * konsistent zwischen Legende und Chart"). */
const ROLE_CLASS: Record<PerspectiveRole, string> = {
  PL: 'pl',
  Coreteam: 'coreteam',
  Architect: 'architect',
};

/** Ein gerenderter Punkt (eigene oder Vergleichssicht), unabhängig von der jeweiligen
 * Wire-Contract-Herkunft (`MapPoint` im Basis-Modus, `MapComparisonEntry.primary`/`.secondary` im
 * Vergleichsmodus). */
interface RenderedPoint {
  stakeholderId: string;
  name: string;
  influence: number;
  interest: number;
}

/** Eine Verbindungslinie (US-034 Akzeptanzkriterium 2): ein Stakeholder mit Assessment in
 * **beiden** gewählten Perspektiven. */
interface RenderedConnection {
  stakeholderId: string;
  name: string;
  own: MapComparisonValue;
  compare: MapComparisonValue;
}

/**
 * Quadranten-Diagramm (US-032, F3.1; erweitert um den Vergleichsmodus in US-034, F3.2): X-Achse
 * „Einfluss" (0–100), Y-Achse „Interesse" (0–100), vier bei 50/50 visuell getrennte Standard-
 * Quadranten der klassischen Stakeholder-Matrix (US-032 Akzeptanzkriterium 1) — Positionszuordnung
 * nach dem in `docs/PRD-SlobSteak.md` F3.1 referenzierten, allgemein etablierten Schema: hoher
 * Einfluss + hohes Interesse = „Eng betreuen", hoher Einfluss + niedriges Interesse =
 * „Zufriedenstellen", niedriger Einfluss + hohes Interesse = „Informiert halten", niedriger
 * Einfluss + niedriges Interesse = „Beobachten".
 *
 * **Vergleichsmodus (US-034):** Ist {@link compareMode} `true`, rendert die Komponente
 * ausschließlich aus {@link comparisonEntries} (US-033-Response-Contract) statt aus
 * {@link points}: eigene Punkte (Kreise) aus `entry.primary`, Vergleichspunkte (Diamanten,
 * reduzierte Deckkraft) aus `entry.secondary`, sowie eine gestrichelte Verbindungslinie zwischen
 * beiden für jeden Stakeholder, der in **beiden** Perspektiven ein Assessment besitzt
 * (Akzeptanzkriterium 2). Stakeholder mit Assessment in nur einer der beiden Perspektiven zeigen
 * genau einen Punkt ohne Linie (Akzeptanzkriterium 3) — das ergibt sich unmittelbar daraus, dass
 * {@link connections} nur Einträge mit sowohl `primary` als auch `secondary` berücksichtigt.
 *
 * Rein präsentational: Jeder Punkt ist ein natives `<button>` (frontend.md Abschnitt 6 —
 * semantisches Element statt `div`/`span` mit Klick-Handler), dadurch automatisch per Tastatur
 * fokussierbar und mit `Enter`/`Space` auslösbar. Eine Verbindungslinie ist als SVG `<g>` mit
 * `tabindex="0"`/`role="button"` umgesetzt (kein natives HTML-Element bildet eine fokussierbare
 * Diagonale ab) und per Maus (Hover/Klick) sowie Tastatur (`Enter`/`Space`) bedienbar; Klick auf
 * einen Punkt emittiert weiterhin ausschließlich die `stakeholderId` — die Navigation zur
 * Stakeholder-Detailseite (US-026) entscheidet die aufrufende Seite.
 *
 * ARIA-Abweichung von SPEC-04 (dokumentiert nach CLAUDE.md Abschnitt 6, bereits seit US-032):
 * SPEC-04 schlägt für die dortige, vollständige `app-stakeholder-map-canvas`-Komponente
 * `role="img"` vor. Da diese Komponente fokussierbare, klickbare `<button>`-Punkte und
 * Verbindungslinien enthält, wird stattdessen `role="group"` mit derselben beschreibenden
 * `aria-label` verwendet — `role="img"` würde deren Nachkommen für Screenreader/Tastatur aus dem
 * Accessibility-Tree entfernen.
 */
@Component({
  selector: 'app-quadrant-chart',
  standalone: true,
  imports: [ConnectionLineTooltipComponent],
  templateUrl: './quadrant-chart.component.html',
  styleUrl: './quadrant-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuadrantChartComponent {
  @Input({ required: true }) points: MapPoint[] = [];
  @Input({ required: true }) perspective!: PerspectiveRole;

  /** US-034 Akzeptanzkriterium 1: Vergleichsmodus aktiv. Ist dieser Flag `true`, rendert die
   * Komponente ausschließlich aus {@link comparisonEntries} — {@link points} bleibt unbeachtet
   * (die aufrufende Seite lädt ohnehin nur eine der beiden Datenquellen je nach Modus, siehe
   * `StakeholderMapPageComponent`). */
  @Input() compareMode = false;
  /** US-034 Akzeptanzkriterium 2/3: Vergleichsdaten aus `GET .../map/compare` (US-033), nur
   * relevant wenn {@link compareMode} `true` ist. */
  @Input() comparisonEntries: MapComparisonEntry[] = [];
  /** Rolle der Vergleichssicht — nur gesetzt, wenn {@link compareMode} `true` ist. */
  @Input() comparePerspective: PerspectiveRole | null = null;

  @Output() pointSelected = new EventEmitter<string>();

  protected readonly yAxisTicks = [100, 75, 50, 25, 0];
  protected readonly xAxisTicks = [0, 25, 50, 75, 100];
  protected readonly legendTitle = MAP_LEGEND_TITLE;
  protected readonly legendConnectionLabel = MAP_LEGEND_CONNECTION_LABEL;
  protected readonly legendNote = MAP_LEGEND_NOTE;

  /** Von Hover **und** Klick gemeinsam genutzter Zustand (US-034 Akzeptanzkriterium 5): Hover
   * gewinnt, solange die Maus über einer Linie steht; ein Klick „pinnt" die Anzeige zusätzlich
   * (auch per Tastatur erreichbar), damit der Tooltip nicht sofort beim Verlassen der Linie
   * verschwindet. */
  protected hoveredConnectionId: string | null = null;
  protected selectedConnectionId: string | null = null;

  protected get roleClass(): string {
    return ROLE_CLASS[this.perspective];
  }

  protected get compareRoleClass(): string | null {
    return this.comparePerspective ? ROLE_CLASS[this.comparePerspective] : null;
  }

  protected get chartAriaLabel(): string {
    return this.compareMode && this.comparePerspective
      ? `Quadranten-Diagramm: Einfluss gegen Interesse, Vergleich ${this.perspective} gegen ${this.comparePerspective}`
      : `Quadranten-Diagramm: Einfluss gegen Interesse, Perspektive ${this.perspective}`;
  }

  /** Eigene Punkte (Kreise): im Vergleichsmodus nur Stakeholder mit `primary`-Wert aus
   * {@link comparisonEntries}, sonst unverändert {@link points} (US-032-Verhalten unberührt). */
  protected get ownPoints(): RenderedPoint[] {
    if (!this.compareMode) {
      return this.points;
    }

    return this.comparisonEntries
      .filter((entry) => entry.primary !== null)
      .map((entry) => ({ stakeholderId: entry.stakeholderId, name: entry.name, ...(entry.primary as MapComparisonValue) }));
  }

  /** Vergleichspunkte (Diamanten, US-034 Akzeptanzkriterium 2/3): nur im Vergleichsmodus, nur
   * Stakeholder mit `secondary`-Wert. */
  protected get comparePoints(): RenderedPoint[] {
    if (!this.compareMode) {
      return [];
    }

    return this.comparisonEntries
      .filter((entry) => entry.secondary !== null)
      .map((entry) => ({ stakeholderId: entry.stakeholderId, name: entry.name, ...(entry.secondary as MapComparisonValue) }));
  }

  /** Verbindungslinien (US-034 Akzeptanzkriterium 2): nur Stakeholder mit Assessment in **beiden**
   * gewählten Perspektiven — Stakeholder mit nur einer Bewertung zeigen laut Akzeptanzkriterium 3
   * bewusst keine Linie. */
  protected get connections(): RenderedConnection[] {
    if (!this.compareMode) {
      return [];
    }

    return this.comparisonEntries
      .filter((entry) => entry.primary !== null && entry.secondary !== null)
      .map((entry) => ({
        stakeholderId: entry.stakeholderId,
        name: entry.name,
        own: entry.primary as MapComparisonValue,
        compare: entry.secondary as MapComparisonValue,
      }));
  }

  /** Aktive Verbindung für Tooltip/Popover (US-034 Akzeptanzkriterium 5): Hover hat Vorrang vor
   * einer gepinnten Klick-Auswahl. */
  protected get activeConnection(): RenderedConnection | null {
    const activeId = this.hoveredConnectionId ?? this.selectedConnectionId;
    return this.connections.find((connection) => connection.stakeholderId === activeId) ?? null;
  }

  protected get activeConnectionDiff(): ConnectionDiff | null {
    const connection = this.activeConnection;
    if (!connection || !this.comparePerspective) {
      return null;
    }

    return {
      stakeholderName: connection.name,
      primaryRole: this.perspective,
      secondaryRole: this.comparePerspective,
      primaryInfluence: connection.own.influence,
      secondaryInfluence: connection.compare.influence,
      primaryInterest: connection.own.interest,
      secondaryInterest: connection.compare.interest,
    };
  }

  protected get activeConnectionTooltipPosition(): { left: number; top: number } {
    const connection = this.activeConnection;
    if (!connection) {
      return { left: 0, top: 0 };
    }

    const influenceMid = (connection.own.influence + connection.compare.influence) / 2;
    const interestMid = (connection.own.interest + connection.compare.interest) / 2;
    return { left: influenceMid, top: 100 - interestMid };
  }

  protected pointAriaLabel(point: RenderedPoint): string {
    return `${point.name} — Einfluss ${point.influence}, Interesse ${point.interest}. Öffnet die Stakeholder-Detailseite.`;
  }

  protected comparePointAriaLabel(point: RenderedPoint): string {
    return `${point.name} — Vergleichssicht ${this.comparePerspective}: Einfluss ${point.influence}, Interesse ${point.interest}. Öffnet die Stakeholder-Detailseite.`;
  }

  protected connectionAriaLabel(connection: RenderedConnection): string {
    return (
      `Verbindungslinie ${connection.name}: Einfluss ${this.perspective} ${connection.own.influence} vs. ` +
      `${this.comparePerspective} ${connection.compare.influence}, Interesse ${this.perspective} ${connection.own.interest} vs. ` +
      `${this.comparePerspective} ${connection.compare.interest}.`
    );
  }

  protected onSelect(point: RenderedPoint): void {
    this.pointSelected.emit(point.stakeholderId);
  }

  protected onConnectionEnter(connection: RenderedConnection): void {
    this.hoveredConnectionId = connection.stakeholderId;
  }

  protected onConnectionLeave(): void {
    this.hoveredConnectionId = null;
  }

  /** Klick/Enter/Space auf eine Verbindungslinie „pinnt" bzw. hebt die Auswahl wieder auf
   * (US-034 Akzeptanzkriterium 5 — auch per Tastatur erreichbar, nicht nur per Hover). */
  protected onConnectionActivate(connection: RenderedConnection): void {
    this.selectedConnectionId = this.selectedConnectionId === connection.stakeholderId ? null : connection.stakeholderId;
  }
}
