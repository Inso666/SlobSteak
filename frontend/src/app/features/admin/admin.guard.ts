import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../auth/token-storage.service';

/**
 * Clientseitiger Route-Guard (US-016 Akzeptanzkriterium 4): der Admin-Bereich ist nur für Nutzer
 * mit `isSystemAdmin = true` erreichbar. Ersetzt nicht die serverseitige Absicherung (US-012/
 * US-013, `SystemAdmin`-Policy) — beide Ebenen sind erforderlich (CLAUDE.md Abschnitt 3.1).
 */
export const adminGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (tokenStorage.getClaims()?.isSystemAdmin) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
