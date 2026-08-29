import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * US-053: wiederverwendbares SlobSteak-Markenzeichen (SVG, dekorativ). Dieselbe Grafik wie
 * `frontend/public/icon.svg`/`favicon.ico` — bewusst aus dem Produktnamen und den bereits in
 * SPEC-00 §1.2 definierten Rollenfarben abgeleitet statt neu erfunden (CLAUDE.md Abschnitt 6):
 * drei überlappende Kreise in den Rollenfarben (`--app-role-pl/ct/ar`), dieselbe Farbsprache wie
 * das Perspektiven-Radar (SPEC-00 §1.3), das die drei Stakeholder-Perspektiven des Produkts
 * visualisiert.
 *
 * Erster Verwendungsort (Akzeptanzkriterium 3 dieser Story): Markenblock auf der Login-Seite
 * (`docs/specs/SPEC-01-Login.md` §1.2). Die dortige strukturelle/visuelle Vollangleichung
 * (Tagline, Bootstrapping-Zustand) bleibt bewusst US-054 vorbehalten — diese Komponente liefert
 * ausschließlich das wiederverwendbare Icon-Bauteil selbst.
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.css',
})
export class BrandMarkComponent {}
