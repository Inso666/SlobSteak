import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PerspectiveRole } from '../map.service';

/** Konkrete Differenz zweier Perspektiven für einen Stakeholder (US-034 Akzeptanzkriterium 5),
 * z. B. „Einfluss: PL 30 vs. Architect 75" — Wortlaut direkt aus der Story-Akzeptanzkriterium
 * übernommen. Rein präsentationsspezifisch (kein 1:1-Wire-Contract wie `MapComparisonEntry` in
 * `map.service.ts`), daher hier statt dort definiert. */
export interface ConnectionDiff {
  stakeholderName: string;
  primaryRole: PerspectiveRole;
  secondaryRole: PerspectiveRole;
  primaryInfluence: number;
  secondaryInfluence: number;
  primaryInterest: number;
  secondaryInterest: number;
}

/**
 * Tooltip/Popover für die Differenzanzeige einer Verbindungslinie im Vergleichsmodus (US-034
 * Akzeptanzkriterium 5). Rein präsentational — `QuadrantChartComponent` entscheidet anhand von
 * Hover **und** Klick auf eine Verbindungslinie, wann `data` gesetzt ist und wo (`leftPercent`/
 * `topPercent`, gleiches 0–100-Koordinatensystem wie `MapPoint.influence`/`.interest`) die
 * Komponente positioniert wird. `role="tooltip"` (WAI-ARIA) statt eines reinen `div`, damit
 * unterstützende Technologien die Differenzanzeige als Tooltip ankündigen (frontend.md Abschnitt 6
 * — ARIA ergänzt, wo semantisches HTML allein nicht ausreicht).
 */
@Component({
  selector: 'app-connection-line-tooltip',
  standalone: true,
  templateUrl: './connection-line-tooltip.component.html',
  styleUrl: './connection-line-tooltip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionLineTooltipComponent {
  @Input() data: ConnectionDiff | null = null;
  /** Positionierung in Prozent des umgebenden `.plot-area`-Containers (gleiches Koordinatensystem
   * wie `left`/`bottom` der Map-Punkte in `QuadrantChartComponent`). */
  @Input() leftPercent = 0;
  @Input() topPercent = 0;
}
