import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { clamp } from '../utils/clamp';

/** Kurzcode einer perspektiv-tragenden Rolle, bestimmt die Ringfarbe (SPEC-00 §1.2:
 * `--app-role-pl`/`--app-role-ct`/`--app-role-ar`). */
export type ProgressRingRoleCode = 'pl' | 'ct' | 'ar';

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * US-076 / SPEC-02 §1.1: Rollen-Fortschritts-Ring („PL/CT/AR" mit Prozentwert unter jeder
 * Projektkarte) — hat keine 1:1-PrimeNG-Entsprechung (`p-knob` ist ein interaktives
 * Input-Control mit Slider-Semantik, für eine rein lesende Anzeige ungeeignet), daher als
 * eigenständige, wiederverwendbare SVG-Komponente umgesetzt statt pro Screen neu gebaut
 * (`.claude/agents/frontend.md` Abschnitt 1). Rein dekoratives SVG (`aria-hidden`) — die
 * eigentliche, für Screenreader zugängliche Information steht als echter Text (Rollen-Kürzel +
 * Prozentwert) daneben, siehe Template.
 */
@Component({
  selector: 'app-role-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-progress-ring.component.html',
  styleUrl: './role-progress-ring.component.css',
})
export class RoleProgressRingComponent {
  @Input({ required: true }) roleCode!: ProgressRingRoleCode;
  @Input({ required: true }) roleLabel!: string;
  @Input({ required: true }) percent!: number;

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected get dashOffset(): number {
    const safePercent = clamp(this.percent, 0, 100);
    return CIRCUMFERENCE - (safePercent / 100) * CIRCUMFERENCE;
  }
}
