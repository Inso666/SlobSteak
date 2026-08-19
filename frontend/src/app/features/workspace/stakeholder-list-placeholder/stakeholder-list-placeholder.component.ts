import { Component } from '@angular/core';

/**
 * Platzhalter für den Tab „Stakeholder-Liste" (US-019 Akzeptanzkriterium 2 — Standard-Landingtab,
 * für alle Projektrollen inkl. `User` sichtbar). Der eigentliche Inhalt (Liste mit Suche/Filter)
 * folgt mit US-025.
 */
@Component({
  selector: 'app-stakeholder-list-placeholder',
  standalone: true,
  template: `<p class="placeholder">Stakeholder-Liste folgt (US-025).</p>`,
  styles: [
    `
      .placeholder {
        padding: 1.5rem;
        color: #666;
      }
    `,
  ],
})
export class StakeholderListPlaceholderComponent {}
