import { Component } from '@angular/core';

/**
 * Platzhalter für den Tab „Map" (US-019 Akzeptanzkriterium 3 — für Rolle `User` ausgeblendet, per
 * `roleGuard` zusätzlich serverseitig-äquivalent clientseitig abgesichert). Der eigentliche Inhalt
 * (Quadranten-Visualisierung) folgt mit US-032.
 */
@Component({
  selector: 'app-map-placeholder',
  standalone: true,
  template: `<p class="placeholder">Stakeholder Map folgt (US-032).</p>`,
  styles: [
    `
      .placeholder {
        padding: 1.5rem;
        color: #666;
      }
    `,
  ],
})
export class MapPlaceholderComponent {}
