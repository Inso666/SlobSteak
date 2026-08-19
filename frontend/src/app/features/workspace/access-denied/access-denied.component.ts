import { Component } from '@angular/core';

/**
 * „Kein Zugriff"-Ansicht (US-019 Akzeptanzkriterium 5): Ziel von `roleGuard`-Umleitungen, wenn ein
 * Nutzer eine für seine Projektrolle ausgeblendete Route direkt aufruft.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  template: `<p class="access-denied">Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle in diesem Projekt.</p>`,
  styles: [
    `
      .access-denied {
        padding: 1.5rem;
        color: #b00020;
      }
    `,
  ],
})
export class AccessDeniedComponent {}
