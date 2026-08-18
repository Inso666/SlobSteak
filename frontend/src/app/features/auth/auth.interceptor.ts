import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from './token-storage.service';

/**
 * Hängt das gespeicherte Session-Token als `Authorization: Bearer`-Header an jeden ausgehenden
 * Request an (US-009) — zentral statt in jeder Komponente/jedem Service einzeln, CLAUDE.md
 * Abschnitt 3.7 (zentrale HttpClient-Behandlung über Interceptor).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getToken();

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
