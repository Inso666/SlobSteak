import { Injectable } from '@angular/core';

const TOKEN_STORAGE_KEY = 'slobsteak_token';

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
}
