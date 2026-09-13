import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from './token-storage.service';

/**
 * US-089 (Issue #131, Nebenbefund): `/login` blieb bislang auch für bereits angemeldete
 * Nutzer:innen erreichbar und rendert dann einen leeren Inhaltsbereich innerhalb der
 * angemeldeten App-Shell (die Login-Seite selbst zeigt keine Sidebar, sitzt aber technisch
 * "unter" der zuvor schon aktiven Session). Dieser Guard ist das Gegenstück zu {@link authGuard}
 * (US-018): dort erzwingt eine FEHLENDE Session einen Redirect nach `/login`, hier erzwingt eine
 * VORHANDENE Session einen Redirect nach `/projects`. `/` (leere Route) landet laut `app.routes.ts`
 * ohnehin über `redirectTo: 'login'` auf derselben Route und durchläuft damit automatisch denselben
 * Guard — kein zweiter, separat zu pflegender Guard auf `''` nötig.
 *
 * Rein clientseitige UX-Weiche (kein Ersatz für die serverseitige `[Authorize]`-Absicherung der
 * `/projects`-Endpunkte, siehe CLAUDE.md Abschnitt 3.1 der Frontend-Rollendatei): Ein manipulierter
 * oder abgelaufener Token führt bestenfalls zu einem client-seitig unnötigen Redirect auf
 * `/projects`, das dortige `authGuard`/der `httpErrorInterceptor` fangen einen tatsächlich
 * ungültigen Token beim ersten Request ohnehin ab.
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.getToken()) {
    return router.createUrlTree(['/projects']);
  }

  return true;
};
