import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Injizierbarer Service für den IdentityAccess-Bereich (US-006/US-008). Alle HTTP-Zugriffe
 * laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md
 * Abschnitt 3.1). Das Auth-Token wird — sobald US-009 die Session-Verwaltung liefert — über einen
 * zentralen HttpInterceptor angehängt, nicht hier manuell gesetzt.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  /** Ändert das Passwort des angemeldeten Nutzers (US-008, `PATCH /api/v1/auth/password`). */
  changePassword(newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/password`, { newPassword });
  }
}
