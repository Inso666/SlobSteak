import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from './token-storage.service';

/**
 * Clientseitiger Route-Guard (US-018) für Bereiche, die lediglich eine gültige Session erfordern
 * (im Unterschied zu `adminGuard`, der zusätzlich `isSystemAdmin` verlangt). Ersetzt nicht die
 * serverseitige `[Authorize]`-Absicherung der Endpunkte (CLAUDE.md Abschnitt 3.1).
 */
export const authGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.getToken()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
