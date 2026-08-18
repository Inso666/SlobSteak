import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

export interface LoginResult {
  mustChangePassword: boolean;
}

interface LoginResponse {
  token: string;
  mustChangePassword: boolean;
}

/**
 * Injizierbarer Service für den IdentityAccess-Bereich (US-006/US-008/US-009). Alle HTTP-Zugriffe
 * laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md
 * Abschnitt 3.1). Das Auth-Token wird bei Login über {@link TokenStorageService} gespeichert und
 * von `authInterceptor` an nachfolgende Requests angehängt.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly baseUrl = '/api/v1/auth';

  /** Meldet den Nutzer an (US-009, `POST /api/v1/auth/login`) und speichert das erhaltene
   * Session-Token für nachfolgende Requests. */
  login(email: string, password: string): Observable<LoginResult> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((response) => this.tokenStorage.setToken(response.token)),
      map((response) => ({ mustChangePassword: response.mustChangePassword })),
    );
  }

  /** Ändert das Passwort des angemeldeten Nutzers (US-008, `PATCH /api/v1/auth/password`). */
  changePassword(newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/password`, { newPassword });
  }
}
