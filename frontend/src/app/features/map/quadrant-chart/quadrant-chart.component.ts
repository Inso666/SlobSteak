import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MapPoint, PerspectiveRole } from '../map.service';

/** CSS-Modifier-Klasse je Rolle, referenziert dieselben zentralen Rollenfarb-Tokens
 * (`--app-role-pl/ct/ar`, SPEC-00 §1.2) wie der `.role-badge`-Baustein aus US-047 — keine zweite,
 * abweichende Farbdefinition für Map-Punkte. */
const ROLE_CLASS: Record<PerspectiveRole, string> = {
  PL: 'pl',
  Coreteam: 'coreteam',
  Architect: 'architect',
};

/**
 * Quadranten-Diagramm (US-032, F3.1): X-Achse „Einfluss" (0–100), Y-Achse „Interesse" (0–100),
 * vier bei 50/50 visuell getrennte Standard-Quadranten der klassischen Stakeholder-Matrix
 * (Akzeptanzkriterium 1) — Positionszuordnung nach dem in `docs/PRD-Steakholder.md` F3.1
 * referenzierten, allgemein etablierten Schema: hoher Einfluss + hohes Interesse = „Eng
 * betreuen", hoher Einfluss + niedriges Interesse = „Zufriedenstellen", niedriger Einfluss +
 * hohes Interesse = „Informiert halten", niedriger Einfluss + niedriges Interesse = „Beobachten".
 *
 * Rein präsentational: Jeder Punkt ist ein natives `<button>` (frontend.md Abschnitt 6 —
 * semantisches Element statt `div`/`span` mit Klick-Handler), dadurch automatisch per Tastatur
 * fokussierbar und mit `Enter`/`Space` auslösbar, ohne eigene Tastatur-Logik nachzubauen
 * (Akzeptanzkriterium 3, Basis-Ansicht). Ein Klick emittiert ausschließlich die `stakeholderId` —
 * die Navigation zur Stakeholder-Detailseite (US-026) entscheidet die aufrufende Seite.
 *
 * Bewusst außerhalb des Scopes dieser Komponente (siehe Anmerkungen des Agenten in der
 * Story-Datei): Drag&Drop (F3.3 / US-035, US-036), Vergleichsmodus mit zweitem Perspektiv-Punkt
 * und Verbindungslinien (F3.2 / US-033, US-034) sowie Zoom/Pan. `docs/specs/SPEC-04-Stakeholder-Map.md`
 * beschreibt den vollständigen Endzustand aller vier Map-Stories gemeinsam (`app-stakeholder-map-canvas`);
 * diese Komponente implementiert ausschließlich das eigenständige Akzeptanzkriterium 1/2/3 der
 * bereits abgeschlossenen Story US-032, kein Vorgriff auf die noch offenen Folgestories
 * (CLAUDE.md Abschnitt 3 „kein Vorgriff auf spätere Stories“).
 *
 * ARIA-Abweichung von SPEC-04 (dokumentiert nach CLAUDE.md Abschnitt 6): SPEC-04 schlägt für die
 * dortige, vollständige `app-stakeholder-map-canvas`-Komponente `role="img"` vor. Diese einfachere
 * Basis-Variante enthält jedoch fokussierbare, klickbare `<button>`-Punkte — `role="img"` würde
 * deren Nachkommen für Screenreader aus dem Accessibility-Tree entfernen und die Tastaturbedienung
 * unbrauchbar machen. Stattdessen: `role="group"` mit derselben beschreibenden `aria-label`
 * (WCAG 2.1 AA bleibt gewahrt, Buttons bleiben fokussierbar und benannt).
 */
@Component({
  selector: 'app-quadrant-chart',
  standalone: true,
  templateUrl: './quadrant-chart.component.html',
  styleUrl: './quadrant-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuadrantChartComponent {
  @Input({ required: true }) points: MapPoint[] = [];
  @Input({ required: true }) perspective!: PerspectiveRole;

  @Output() pointSelected = new EventEmitter<string>();

  protected readonly yAxisTicks = [100, 75, 50, 25, 0];
  protected readonly xAxisTicks = [0, 25, 50, 75, 100];

  protected get roleClass(): string {
    return ROLE_CLASS[this.perspective];
  }

  protected get chartAriaLabel(): string {
    return `Quadranten-Diagramm: Einfluss gegen Interesse, Perspektive ${this.perspective}`;
  }

  protected pointAriaLabel(point: MapPoint): string {
    return `${point.name} — Einfluss ${point.influence}, Interesse ${point.interest}. Öffnet die Stakeholder-Detailseite.`;
  }

  protected onSelect(point: MapPoint): void {
    this.pointSelected.emit(point.stakeholderId);
  }
}
