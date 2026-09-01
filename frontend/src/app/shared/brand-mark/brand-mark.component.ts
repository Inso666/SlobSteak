import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * US-053/US-073: wiederverwendbares SlobSteak-Markenzeichen (SVG, dekorativ) — die alleinige
 * Quelle dieses Markups im Frontend (keine Duplizierung an weiteren Stellen im Angular-Code).
 * Dieselbe Grafik wie `frontend/public/icon.svg`/`favicon.ico` (dort zwangsläufig als eigene
 * Kopie geführt, da statische Assets kein Angular-Markup einbinden können).
 *
 * US-073 (Issue #98, QA-Design-Abgleich vom 30.08.2026) ersetzt das ursprüngliche, aus SPEC-00
 * abgeleitete Drei-Kreise-Icon durch die stilisierte, gegrillte Steak-Form (Farbverlauf
 * `#c96a45` → `#a8502f` → `#6f2f1c`, Grillstreifen), die in allen 12 Artboards von
 * `docs/design/S2-Projektuebersicht-Wireframe.html` übereinstimmend als Markenzeichen verwendet
 * wird — aus dem Design übernommen statt neu erfunden (CLAUDE.md Abschnitt 6). Die
 * Farbverlaufswerte sind reine Marken-/Illustrationsfarben, kein SPEC-00-Token nötig (Story-Datei
 * „Wichtige Invarianten“).
 *
 * Erster Verwendungsort (US-053 Akzeptanzkriterium 3): Markenblock auf der Login-Seite
 * (`docs/specs/SPEC-01-Login.md` §1.2). Seit US-073 zusätzlich in der Sidebar-Brand-Zeile
 * (`AppNavigationComponent`) neben dem Text „SlobSteak“.
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.css',
})
export class BrandMarkComponent {}
