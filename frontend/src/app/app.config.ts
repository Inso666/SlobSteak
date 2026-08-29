import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { authInterceptor } from './features/auth/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { SlobSteakPreset } from './core/theme/slobsteak-preset';

/**
 * Reihenfolge ist bindend (US-044): `authInterceptor` muss vor `httpErrorInterceptor` laufen, damit
 * ein Request überhaupt mit (ggf. abgelaufenem) Token abgeschickt wird, bevor der Error-Interceptor
 * auf eine `401`-Response reagiert (Story-Datei „Wichtige Invarianten“, CLAUDE.md Abschnitt 3.7).
 * Als eigene Konstante exportiert, damit die Reihenfolge dediziert testbar ist (siehe Story-Test).
 */
export const HTTP_INTERCEPTORS_ORDER = [authInterceptor, httpErrorInterceptor];

/**
 * US-047: `providePrimeNG` bindet das zentrale SlobSteak-Preset (SPEC-00 §1.1)
 * einmalig an der Composition Root — kein Feature-Modul importiert oder
 * überschreibt Theme-Variablen lokal (SPEC-00 §4). `provideAnimationsAsync`
 * wird von PrimeNG-Overlay-Komponenten (p-dialog, p-toast, p-select, …) für
 * Ein-/Ausblend-Übergänge benötigt.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors(HTTP_INTERCEPTORS_ORDER)),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: SlobSteakPreset,
        options: {
          darkModeSelector: false,
          cssLayer: false,
        },
      },
      license: 'eyJpZCI6ImQxNjhkZTc5LTlmY2YtNDcyYy1hYzQwLWI5YTBkNmZhNjc3MyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODc1OTczNjMsImV4cCI6MTgxOTEzMzM2M30.LbIuWWD6GGouJqWrma5Bd_N7HWpHpClq78DyElifXmoOI7rK5yscLsfb2YXImAkQfRoz8InKZvsglruLGosOBA'
    }),
  ],
};
