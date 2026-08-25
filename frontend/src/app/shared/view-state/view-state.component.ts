import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';
import { ViewState } from './view-state';

/**
 * Gemeinsamer Lade-/Leer-Zustands-Baustein für Listen-/Übersichtsseiten (US-050, SPEC-00 §3):
 * kapselt das Skeleton-Loading-Muster (`<p-skeleton>` in `color.surface-hover` auf
 * `color.surface`-Hintergrund, `radius.md` — Farbe/Radius zentral im PrimeNG-Preset
 * `slobsteak-preset.ts` gesetzt, keine lokalen Hex-/px-Werte hier) an einer Stelle, damit die
 * fünf betroffenen Verwendungsstellen (Projektübersicht ×2, Nutzerverwaltung, Projektverwaltung,
 * Mitgliederverwaltung ×2) keine eigene Lösung erfinden (Story „Technische Hinweise“).
 *
 * Reiner Präsentations-Wrapper um projizierten Inhalt: im Zustand `content` wird `<ng-content>`
 * gerendert, in `loading`/`empty` je ein eigener, zentral gepflegter Platzhalter. Im Zustand
 * `error` wird bewusst nichts gerendert — die Fehlerdarstellung bleibt der bestehende,
 * komponentenweite Fehler-Baustein aus US-044 (siehe `view-state.ts`).
 */
@Component({
  selector: 'app-view-state',
  standalone: true,
  imports: [Skeleton],
  templateUrl: './view-state.component.html',
  styleUrl: './view-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewStateComponent {
  @Input({ required: true }) state!: ViewState;
  @Input({ required: true }) emptyMessage!: string;
  /** Anzahl der Skeleton-Platzhalterzeilen im Zustand `loading` (Default: passend für die
   * typische Kartenanzahl „above the fold“ der bisherigen Listen-Screens). */
  @Input() skeletonCount = 3;

  /** Höhe je Platzhalterzeile ausschließlich aus der Abstands-Token-Skala (SPEC-00 §1.2)
   * abgeleitet (`2 × space.xl`) statt eines frei erfundenen px-/rem-Werts. */
  protected readonly skeletonRowHeight = 'calc(var(--app-space-xl) * 2)';

  protected get skeletonRows(): number[] {
    return Array.from({ length: this.skeletonCount }, (_, index) => index);
  }
}
