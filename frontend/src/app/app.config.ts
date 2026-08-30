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
 *
 * US-048: `appConfig` ist bewusst keine statische Konstante mehr, sondern eine Factory-Funktion, die
 * den PrimeNG-Lizenzschlüssel als Parameter entgegennimmt. Der Schlüssel wird serverseitig
 * konfiguriert (`GET /api/v1/config/primeng-license`, siehe `core/config/primeng-license.ts`) und
 * VOR diesem Aufruf per `fetchPrimeNgLicenseKey()` in `main.ts` bezogen — nicht mehr als
 * Klartext-Literal in dieser Datei hinterlegt (siehe ADR-0009 Nachtrag). `primeNgLicenseKey` ist
 * `null`, wenn serverseitig keine `PRIMENG_LICENSE_KEY`-Umgebungsvariable gesetzt ist; `providePrimeNG`
 * zeigt in diesem Fall unverändert den in ADR-0009 dokumentierten unlizenzierten Zustand
 * (Community-Banner, volle Funktionalität erhalten).
 */
export function createAppConfig(primeNgLicenseKey: string | null): ApplicationConfig {
  return {
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
        license: primeNgLicenseKey ?? undefined,
      }),
    ],
  };
}
