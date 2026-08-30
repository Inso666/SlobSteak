**ID:** US-048
**Titel:** PrimeNG-Lizenzschlüssel serverseitig verwalten statt im Frontend-Bundle auszuliefern
**Bounded Context / Domain:** Frontend-Shell (quer, Backend-Infrastructure + Frontend-Core betroffen)
**Abhängigkeiten:** US-047

---

### 1. User Story

Als **Sicherheitsverantwortlicher für SlobSteak** möchte ich, **dass der PrimeNG-Lizenzschlüssel nicht als Klartext-Literal im Frontend-Quellcode committet und an jeden Browser-Client ausgeliefert wird, sondern ausschließlich serverseitig konfiguriert und dem Frontend erst zur Laufzeit bereitgestellt wird**, damit **der Schlüssel nicht dauerhaft im Git-Verlauf und im JS-Bundle jedes Besuchers offenliegt und zentral (ohne Frontend-Rebuild) rotiert werden kann**.

### 2. Fachlicher & Technischer Kontext

- **Ausgangslage:** Im Zuge von US-047 wurde `providePrimeNG` an der Composition Root (`frontend/src/app/app.config.ts`) verdrahtet und dabei ein PrimeNG-Lizenzschlüssel direkt als String-Literal im `license`-Feld hinterlegt (siehe ADR-0009). Dieses Vorgehen ist unabhängig vom konkreten Berechtigungsumfang des Schlüssels ein Secret-Management-Antipattern:
  - Der Wert steht dauerhaft und unveränderlich im Git-Verlauf, auch nach nachträglichem Entfernen aus dem aktuellen Stand.
  - Der Wert wird unverändert Teil des ausgelieferten JS-Bundles und ist damit für jeden Besucher über Browser-Devtools/Quelltext einsehbar.
  - Eine Rotation (z. B. bei Ablauf, Anbieterwechsel oder Verdacht auf Kompromittierung) erfordert einen Frontend-Rebuild und -Redeploy statt einer reinen Konfigurationsänderung.
  - Dies widerspricht dem im Backend bereits etablierten Muster für vergleichbare Secrets (`JWT_SIGNING_KEY`, `SEED_ADMIN_PASSWORD` in `docker-compose.yml`, US-005/US-006): dort liegt der Wert ausschließlich als Umgebungsvariable mit unkritischem Dev-Default vor, nie als Literal im Quellcode.
- **Zuordnung im PRD/TRD:** Kein explizites Feature-Kapitel — Querschnittsanliegen der technischen Infrastruktur (analog CLAUDE.md Abschnitt 0 „Technologie-Stack“ und dem bereits etablierten Secret-Handling aus US-006).
- **Relevant für DDD:** Kein Domänen-/Application-Service nötig — reiner Infrastructure-Konzern (Konfigurationswert durchreichen), analog zur bisherigen Behandlung von `JWT_SIGNING_KEY`. Es wird bewusst **kein** neues Aggregate/kein Bounded Context dafür eingeführt.
- **Wichtige Randbedingung:** PrimeNG-Komponenten werden bereits auf dem nicht-authentifizierten Login-Screen (US-009: `Card`, `InputText`, `Password`, `Message`) verwendet. Der Bezug des Lizenzschlüssels muss daher auch **vor** einer Anmeldung funktionieren.
- **Kein Werksstoff dieser Story:** Die eigentliche Lizenzregistrierung bei primeui.dev (Community- vs. Commercial-License, Konto-Anlage) bleibt weiterhin beim Projektverantwortlichen (ADR-0009, Punkt 2) — diese Story ändert nur, **wie** ein bereits vorhandener Schlüssel technisch bereitgestellt wird, nicht **ob**/**welcher** Schlüssel registriert wird.

### 3. Akzeptanzkriterien

- [ ] Der PrimeNG-Lizenzschlüssel ist in keiner versionierten Frontend-Datei (insbesondere nicht in `frontend/src/app/app.config.ts`) mehr als Klartext-Literal hinterlegt.
- [ ] Das Backend stellt einen unauthentifizierten Konfigurations-Endpoint bereit (z. B. `GET /api/v1/config/primeng-license`), der den aktuell konfigurierten Schlüssel aus einer serverseitigen Umgebungsvariable (`PRIMENG_LICENSE_KEY`) zurückliefert. Unauthentifiziert bewusst deshalb, weil PrimeNG-Komponenten bereits vor dem Login (US-009) benötigt werden und der Endpoint keinerlei fachliche Daten oder Berechtigungen preisgibt.
- [ ] Ist `PRIMENG_LICENSE_KEY` serverseitig nicht gesetzt, liefert der Endpoint einen definierten Leerwert (kein Schlüsselfeld bzw. `null`) statt eines Fehlers — der bereits in ADR-0009 dokumentierte unlizenzierte Zustand (Community-Banner sichtbar, volle Funktionalität erhalten) bleibt für diesen Fall unverändert gültig.
- [ ] Das Frontend fragt den Endpoint beim App-Start ab und registriert einen gelieferten Schlüssel bei `providePrimeNG`, ohne dass der Wert zu irgendeinem Zeitpunkt im Frontend-Quellcode oder in einer Build-/Umgebungsdatei des Frontends steht.
- [ ] Eine Änderung des Schlüssels (Rotation) ist ausschließlich über eine Änderung der serverseitigen Umgebungsvariable möglich — ohne Frontend-Rebuild oder -Redeploy (manuell verifiziert: Wert in `docker-compose.yml`-Umgebung ändern, Container neu starten, Frontend ohne eigenen Rebuild neu laden → neuer Wert wirksam).
- [ ] `docker-compose.yml` definiert `PRIMENG_LICENSE_KEY` nach demselben Muster wie `JWT_SIGNING_KEY` (Umgebungsvariable mit Passthrough `${PRIMENG_LICENSE_KEY:-}`, leerer Dev-Default, Kommentar mit Verweis auf diese Story). Es wird kein produktiver oder realer Lizenzschlüssel committet.
- [ ] Integrationstest belegt für den neuen Endpoint sowohl den Fall „Umgebungsvariable gesetzt“ (Wert wird zurückgeliefert) als auch „nicht gesetzt“ (definierter Leerwert, kein 500er).
- [ ] Automatisierter Frontend-Test belegt, dass die Bootstrap-Kette (`app.config.ts` bzw. der neue Konfigurationsdienst) keinen hartcodierten Lizenzschlüssel mehr enthält, sondern den Wert über einen HTTP-Request vom neuen Endpoint bezieht (z. B. per `HttpTestingController`/Spy).
- [ ] ADR-0009 erhält einen kurzen Nachtrag, der auf diese Story als Umsetzung des dort dokumentierten technischen Follow-ups verweist; die dort offene Grundsatzfrage der Lizenzregistrierung selbst (Punkt 2 der ADR) bleibt ausdrücklich unverändert beim Projektverantwortlichen.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Api/Controllers/Config/FrontendConfigController.cs` (neu) — liest `PRIMENG_LICENSE_KEY` z. B. via `IConfiguration`, keine Domain-/Application-Schicht nötig.
- `docker-compose.yml` — neue Umgebungsvariable `PRIMENG_LICENSE_KEY` im `api`-Service, Kommentar analog zu `JWT_SIGNING_KEY` (Zeile ~35–38).
- `frontend/src/app/core/config/` (neu, z. B. `primeng-license.service.ts` oder Resolver/Initializer) — ruft den Endpoint vor bzw. während des Bootstraps ab.
- `frontend/src/app/app.config.ts` — Entfernen des Literal-Werts im `license`-Feld; `providePrimeNG` wird stattdessen mit dem asynchron bezogenen Wert versorgt (z. B. über `APP_INITIALIZER`/`provideAppInitializer` oder eine Factory-basierte Provider-Konfiguration — konkrete Angular-Bootstrap-Mechanik liegt beim Frontend-Agenten).
- `docs/adr/0009-primeui-lizenzpflicht-community-license-ausstehend.md` — Nachtrag/Ergänzung „Konsequenzen“ bzw. neuer Abschnitt mit Verweis auf US-048.
- Integrationstest z. B. `tests/SlobSteak.Api.Tests/Config/FrontendConfigController_Tests.cs`.
- Story-Test gemäß CLAUDE.md Kernregel 3, z. B. `frontend/src/app/us-048-primeng-license-serverseitig.spec.ts` bzw. äquivalenter Backend-Story-Test — je nach Aufteilung der Akzeptanzkriterien auf Backend/Frontend.

**Wichtige Invarianten & Validierungsregeln:**

- Kein Lizenzschlüssel — weder der aktuelle noch ein künftiger — wird jemals als Literal in einer versionierten Frontend- oder Backend-Konfigurationsdatei committet; ausschließlich über Umgebungsvariable mit leerem/unkritischem Dev-Default (etabliertes Muster aus US-006/US-005).
- Der neue Konfigurations-Endpoint liefert ausschließlich den Lizenzschlüssel-Wert (oder dessen Fehlen) — keine sonstigen Server-/Umgebungsinformationen, um die Angriffsfläche nicht unnötig zu vergrößern.
- Der bisher im Quellcode sichtbare Schlüssel-Wert gilt ab Merge dieser Story als potenziell exponiert und sollte bei nächster Gelegenheit vom Projektverantwortlichen bei primeui.dev rotiert werden, sobald dort ein Konto besteht (ADR-0009, Punkt 2) — kein Akzeptanzkriterium dieser Story, da eine Rotation eine Kontoaktion beim Lizenzanbieter voraussetzt, die kein Agent autonom ausführen darf.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- Diese Story wurde als Ergebnis eines Security-Reviews formuliert (Fund: hartcodierter PrimeNG-Lizenzschlüssel in `frontend/src/app/app.config.ts`, eingeführt mit US-047). Der Umsetzungs-Agent trägt hier ein, welchen konkreten Bootstrap-Mechanismus (APP_INITIALIZER vs. Route-Resolver vs. sonstiges) er gewählt hat und warum.

**Status:** fertig am 30.08.2026, PR siehe Branch `feature/US-048-primeng-lizenzschluessel-serverseitig`.

**Gewählter Bootstrap-Mechanismus:** Weder `APP_INITIALIZER`/`provideAppInitializer` noch ein
Route-Resolver, sondern ein Fetch **vor** `bootstrapApplication` in `main.ts`
(`fetchPrimeNgLicenseKey()` aus `frontend/src/app/core/config/primeng-license.ts`), dessen Ergebnis
an eine neue Factory-Funktion `createAppConfig(primeNgLicenseKey: string | null)` in `app.config.ts`
übergeben wird (ersetzt die bisherige statische `appConfig`-Konstante).

Begründung — ein `provideAppInitializer`-basierter Ansatz (naheliegendster erster Versuch) wurde
verworfen, nachdem Prüfung von `node_modules/primeng/fesm2022/primeng-config.mjs` zeigte, dass
`providePrimeNG` selbst intern einen `provideAppInitializer` registriert, dessen Callback den
`license`-Wert **synchron in dem Moment liest, in dem genau dieser Initializer ausgeführt wird**
(`registerLicense({ primeui: license })`, vor dem asynchronen `verifyLicense(...).then(...)`). Ein
Blick in `@angular/core/fesm2022/_debug_node-chunk.mjs`
(`ApplicationInitStatus.runInitializers()`) bestätigt: Angular ruft alle registrierten
App-Initializer-Funktionen in einer `for`-Schleife synchron nacheinander **auf**, wartet aber
zwischen den Aufrufen **nicht** auf den Promise-Abschluss eines vorherigen, asynchronen
Initializers — erst am Ende werden alle zurückgegebenen Promises gemeinsam per `Promise.all`
abgewartet. Ein eigener, asynchron per HTTP fetchender App-Initializer, der lediglich versucht, das
`license`-Feld eines bereits an `providePrimeNG` übergebenen Konfigurationsobjekts nachträglich zu
mutieren, kommt daher strukturell zu spät: `providePrimeNG`s eigener Initializer hat den (dann noch
`undefined`) Wert längst gelesen, bevor der Fetch überhaupt abgeschlossen ist — unabhängig von der
Registrierungsreihenfolge der beiden `provideAppInitializer`-Aufrufe. Der Schlüssel muss deshalb
bereits **vor** dem Aufruf von `providePrimeNG` (also vor `bootstrapApplication`) vorliegen. Ein
Route-Resolver scheidet aus demselben Grund aus: Er läuft ebenfalls erst nach `providePrimeNG`s
eigenem Initializer.

`fetchPrimeNgLicenseKey()` verwendet bewusst die native `fetch`-API statt Angulars `HttpClient`, da
vor `bootstrapApplication` noch kein Angular-Dependency-Injection-Kontext existiert, in dem
`HttpClient` injiziert werden könnte. Der Aufruf ist in einer eigenständigen, exportierten Funktion
gekapselt, damit er im Story-Test per Spy auf `window.fetch` nachweisbar ist (Akzeptanzkriterium 7).
Ein fehlgeschlagener/nicht erreichbarer Abruf liefert `null` statt zu werfen — blockiert den
Bootstrap nicht, der in ADR-0009 dokumentierte unlizenzierte Zustand bleibt gültig.

Manuell verifiziert (Akzeptanzkriterium 4, Rotation ohne Frontend-Rebuild): vollständiger
`docker-compose up --build`-Stack lokal gestartet; `GET /api/v1/config/primeng-license` lieferte
zunächst `{"primeNgLicenseKey":null}` (keine Variable gesetzt). Anschließend `api`-Container mit
gesetztem `PRIMENG_LICENSE_KEY` neu gestartet (`docker compose up -d --no-deps api`), `frontend`-
Container dabei **nicht** angefasst (Erstellungszeitstempel unverändert) — der Endpoint lieferte
danach sofort den neuen Wert. Ein Browser-Reload des unveränderten `frontend`-Containers würde den
neuen Wert beim nächsten Bootstrap-Fetch übernehmen, ohne Frontend-Rebuild/-Redeploy.
