import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './features/auth/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

/**
 * Reihenfolge ist bindend (US-044): `authInterceptor` muss vor `httpErrorInterceptor` laufen, damit
 * ein Request überhaupt mit (ggf. abgelaufenem) Token abgeschickt wird, bevor der Error-Interceptor
 * auf eine `401`-Response reagiert (Story-Datei „Wichtige Invarianten“, CLAUDE.md Abschnitt 3.7).
 * Als eigene Konstante exportiert, damit die Reihenfolge dediziert testbar ist (siehe Story-Test).
 */
export const HTTP_INTERCEPTORS_ORDER = [authInterceptor, httpErrorInterceptor];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors(HTTP_INTERCEPTORS_ORDER)),
    provideRouter(routes),
  ],
};
