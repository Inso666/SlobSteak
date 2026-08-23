import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../../features/auth/token-storage.service';
import { SESSION_EXPIRED_MESSAGE } from '../messages/http-error-messages';
import { SessionNoticeService } from '../services/session-notice.service';

/**
 * Zentrales HTTP-Error-Handling (US-044, CLAUDE.md Abschnitt 3.7 / frontend.md Abschnitt 1) — löst
 * die bislang fehlende globale Behandlung von `HttpClient`-Fehlern ab, die zuvor stumm leere/
 * eingefrorene Ansichten hinterließ (UX-Review vom 23.08.2026, Befund „P0 #2“).
 *
 * Registrierungsreihenfolge ist bindend (siehe `app.config.ts`): `authInterceptor` muss vor diesem
 * Interceptor laufen, damit ein Request mit dem (ggf. abgelaufenen) Token abgeschickt wird, bevor
 * dieser Interceptor auf die Response reagiert.
 *
 * - `401 Unauthorized`: Token gilt als ungültig/abgelaufen — Token wird gelöscht und der Nutzer
 *   (sofern nicht bereits auf `/login`, z. B. bei einem fehlgeschlagenen Login-Versuch selbst) zu
 *   `/login` weitergeleitet, inklusive sichtbarem Hinweistext (Akzeptanzkriterium 2).
 * - `403 Forbidden`: kein automatischer Redirect, da `403` auch fachlich gültige, dauerhafte
 *   Zustände abbildet (z. B. fehlende Projektrolle) — der Fehler wird unverändert an die
 *   aufrufende Komponente durchgereicht, aber zusätzlich zentral protokolliert als Ansatzpunkt für
 *   künftiges Client-seitiges Logging (Akzeptanzkriterium 3).
 * - Alle anderen Fehler (inkl. generischer `5xx`): unverändert durchgereicht, keine Sonderbehandlung.
 *
 * Reine Client-UX-Schicht — ersetzt nicht die serverseitige Autorisierung (CLAUDE.md Abschnitt 3.1);
 * `[Authorize]`/Policy-Checks im Backend bleiben die eigentliche Sicherheitsgrenze.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const sessionNotice = inject(SessionNoticeService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          tokenStorage.clearToken();

          if (!router.url.startsWith('/login')) {
            sessionNotice.set(SESSION_EXPIRED_MESSAGE);
            void router.navigate(['/login']);
          }
        } else if (error.status === 403) {
          // Ansatzpunkt für künftiges Client-seitiges Logging (Akzeptanzkriterium 3) — noch kein
          // dediziertes Logging-Backend, daher bewusst `console.error` als Minimalimplementierung.
          console.error(`Zugriff verweigert (403 Forbidden): ${req.method} ${req.urlWithParams}`);
        }
      }

      return throwError(() => error);
    }),
  );
};
