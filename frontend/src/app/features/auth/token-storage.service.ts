import { Injectable } from '@angular/core';

const TOKEN_STORAGE_KEY = 'slobsteak_token';

/** Claims, die der Login-Endpoint (US-006) ins JWT einbettet — bewusst keine
 * projektbezogenen Rollen (siehe US-006 Akzeptanzkriterium 4). */
export interface TokenClaims {
  sub: string;
  isSystemAdmin: boolean;
}

/**
 * Kapselt den Zugriff auf das im Browser gespeicherte Session-Token (US-009). Eigene Klasse statt
 * direktem `localStorage`-Zugriff in Komponenten/Interceptors, damit der Speicherort zentral
 * austauschbar bleibt.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Liest die Claims aus dem gespeicherten JWT (US-016: clientseitige Sichtbarkeit des
   * Admin-Bereichs). Rein für UX-Zwecke — keine Signaturprüfung, da die serverseitige
   * Autorisierung (US-007) die eigentliche Absicherung ist (CLAUDE.md Abschnitt 3.1).
   */
  getClaims(): TokenClaims | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      return {
        sub: decoded.sub,
        isSystemAdmin: decoded.isSystemAdmin === true || decoded.isSystemAdmin === 'true',
      };
    } catch {
      return null;
    }
  }
}
