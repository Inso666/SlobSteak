/**
 * Bezieht den serverseitig konfigurierten PrimeNG-Lizenzschlüssel (US-048) über
 * `GET /api/v1/config/primeng-license` — läuft bewusst VOR `bootstrapApplication` (siehe
 * `main.ts`), nicht über einen `provideAppInitializer` innerhalb der `providePrimeNG`-Konfiguration
 * in `app.config.ts`.
 *
 * Grund: `providePrimeNG`s eigener App-Initializer liest den `license`-Wert aus dem ihm übergebenen
 * Konfigurationsobjekt synchron in dem Moment, in dem genau dieser Initializer ausgeführt wird
 * (`node_modules/primeng/fesm2022/primeng-config.mjs`). Angular ruft alle registrierten
 * App-Initializer-Funktionen in einer `for`-Schleife synchron nacheinander AUF
 * (`ApplicationInitStatus.runInitializers()` in `@angular/core`), wartet aber zwischen den Aufrufen
 * NICHT auf den Promise-Abschluss eines vorherigen, asynchronen Initializers — es werden lediglich
 * alle zurückgegebenen Promises am Ende gemeinsam per `Promise.all` abgewartet. Ein eigener,
 * asynchron per HTTP fetchender App-Initializer, der lediglich versucht, das `license`-Feld eines
 * bereits an `providePrimeNG` übergebenen Objekts nachträglich zu mutieren, käme daher strukturell
 * zu spät: `providePrimeNG`s Initializer hat den (dann noch `undefined`) Wert längst gelesen, bevor
 * der Fetch überhaupt abgeschlossen ist. Der Schlüssel muss deshalb bereits VOR dem Aufruf von
 * `providePrimeNG` (also vor `bootstrapApplication`) vorliegen — siehe `createAppConfig` in
 * `app.config.ts` und der Aufruf dieser Funktion in `main.ts`.
 *
 * Verwendet bewusst die native `fetch`-API statt Angulars `HttpClient`: Vor `bootstrapApplication`
 * existiert noch kein Angular-Dependency-Injection-Kontext, in dem `HttpClient` injiziert werden
 * könnte. Der Aufruf ist trotzdem in dieser eigenständigen, exportierten Funktion gekapselt, damit
 * ein automatisierter Test ihn gezielt per Spy nachweisen kann (Story-Test AC 7, „z. B. per
 * HttpTestingController/Spy").
 */
export const PRIMENG_LICENSE_ENDPOINT = '/api/v1/config/primeng-license';

interface FrontendConfigResponse {
  primeNgLicenseKey?: string | null;
}

/**
 * Liefert den vom Backend konfigurierten PrimeNG-Lizenzschlüssel, oder `null`, wenn keiner gesetzt
 * ist bzw. der Endpoint nicht erreichbar ist. Ein fehlender/nicht erreichbarer Schlüssel blockiert
 * den Bootstrap NICHT — der bereits in ADR-0009 dokumentierte unlizenzierte Zustand
 * (Community-Banner sichtbar, volle Funktionalität erhalten) bleibt unverändert gültig.
 */
export async function fetchPrimeNgLicenseKey(): Promise<string | null> {
  try {
    const response = await fetch(PRIMENG_LICENSE_ENDPOINT);
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as FrontendConfigResponse;
    return body.primeNgLicenseKey ?? null;
  } catch {
    return null;
  }
}
