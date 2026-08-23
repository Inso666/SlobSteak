import { Injectable, signal } from '@angular/core';

/**
 * Hält eine einmalige Hinweismeldung für die nächste Anzeige der Login-Seite vor (US-044,
 * Akzeptanzkriterium 2: sichtbarer Hinweistext nach automatischem Redirect bei `401`). Bewusst ein
 * eigener, minimaler State-Container statt Router-Query-Params, damit die Meldung nicht in der URL
 * landet und nach einmaligem Lesen automatisch wieder verschwindet (kein Hinweistext-„Geisterbild“
 * bei einem erneuten Aufruf von `/login`, z. B. per Browser-Reload).
 */
@Injectable({ providedIn: 'root' })
export class SessionNoticeService {
  private readonly message = signal<string | null>(null);

  set(message: string): void {
    this.message.set(message);
  }

  /** Liest die aktuell hinterlegte Meldung aus und setzt sie zurück (einmalige Anzeige). */
  consume(): string | null {
    const current = this.message();
    this.message.set(null);
    return current;
  }
}
