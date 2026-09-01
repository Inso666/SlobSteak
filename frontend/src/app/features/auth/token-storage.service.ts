import { Injectable } from '@angular/core';

const TOKEN_STORAGE_KEY = 'slobsteak_token';

/** Claims, die der Login-Endpoint (US-006) ins JWT einbettet — bewusst keine
 * projektbezogenen Rollen (siehe US-006 Akzeptanzkriterium 4).
 *
 * `name` (US-074): der angemeldete Anzeigename, seit dieser Story zusätzlich vom Backend
 * eingebettet (siehe `IJwtTokenGenerator`), damit die Sidebar-Nutzerkarte ohne einen weiteren
 * Backend-Request auskommt. Optional, weil ältere, bereits ausgestellte Tokens (vor diesem Release
 * signierte Sessions) dieses Claim noch nicht tragen — `getClaims()` deckt beide Fälle ab. */
export interface TokenClaims {
  sub: string;
  isSystemAdmin: boolean;
  name?: string;
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
      // US-074: `atob` allein liefert eine Latin1-"Binärstring"-Interpretation der Base64-Bytes —
      // das reicht für `sub`/`isSystemAdmin` (reines ASCII), verstümmelt aber `name` bei
      // Mehrbyte-UTF-8-Zeichen (z. B. Umlaute in deutschen Namen wie „Müller"). `TextDecoder`
      // interpretiert dieselben Bytes stattdessen korrekt als UTF-8, bevor `JSON.parse` den
      // Payload liest.
      const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
      const decoded = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      return {
        sub: decoded.sub,
        isSystemAdmin: decoded.isSystemAdmin === true || decoded.isSystemAdmin === 'true',
        name: typeof decoded.name === 'string' && decoded.name.trim().length > 0 ? decoded.name : undefined,
      };
    } catch {
      return null;
    }
  }
}
