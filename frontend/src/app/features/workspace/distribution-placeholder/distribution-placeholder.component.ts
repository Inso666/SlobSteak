import { Component } from '@angular/core';

/**
 * Platzhalter für den Tab „Verteiler" (US-019 Akzeptanzkriterium 4 — ausschließlich für
 * `PL`/`Coreteam` sichtbar, per `roleGuard` zusätzlich clientseitig abgesichert). Der eigentliche
 * Inhalt (Verteilerlisten-Erstellung/-Filter) folgt mit US-042.
 */
@Component({
  selector: 'app-distribution-placeholder',
  standalone: true,
  template: `<p class="placeholder">Verteilerlisten folgen (US-042).</p>`,
  styles: [
    `
      .placeholder {
        padding: 1.5rem;
        color: #666;
      }
    `,
  ],
})
export class DistributionPlaceholderComponent {}
