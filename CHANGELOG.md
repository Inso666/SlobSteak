# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier je User Story dokumentiert.

## [Unreleased]

### US-058 — Zoneless-Reaktivität systematisch nachziehen

- Fünf verbleibende, per Code-Review bestätigte Fundstellen mit fehlendem
  `changeDetectorRef.markForCheck()` behoben (dieselbe Root Cause wie US-050/US-051/US-057):
  `users-admin.component.ts` (`onCreateUser`), `projects-admin.component.ts`
  (`onCreateProject`), `project-membership-manager.component.ts` (`onAssignMember`/
  `onChangeRole`/`onRemoveMember`), `stakeholder-list.component.ts` (`getProject`,
  `restoreStakeholder`, `listStakeholders` an beiden Aufrufstellen — `ChangeDetectorRef` hier
  neu injiziert), `password-change-modal.component.ts` (`onSubmit` — `ChangeDetectorRef`
  ebenfalls neu injiziert).
- `project-workspace-layout.component.ts` war bereits im Rahmen von US-052 behoben, kein
  weiterer Umsetzungsbedarf.
- Neuer Story-Test `us-058-zoneless-reaktivitaet-systematisch-nachziehen.spec.ts` (15
  Testfälle, Erfolgs- und Fehlerfall je Komponente über `HttpTestingController`/`flush()`,
  kein simulierter Klick) — jeder der fünf Fixes einzeln per Mutationstest verifiziert.
- Methodischer Befund beim Testschreiben festgehalten (siehe Story-Datei „Anmerkungen des
  Agenten"): ein `setValue()` auf einem Reactive-Form-Control direkt vor dem Methodenaufruf
  kann den fehlenden `markForCheck()`-Fix in Tests verdecken, ebenso ein gemeinsamer
  `detectChanges()` nach mehreren parallelen Flushes.
- Nach US-056-Merge auf `main` rebased (drei Admin-Story-Tests an die dort eingeführten
  Dialoge angepasst — Formular lebt seit US-056 in einem per Button geöffneten `p-dialog`).
- `ng test` (255/255, dreifach wiederholt zur Stabilitätsprüfung), `ng lint`, `ng build`
  grün; `dotnet test` unverändert grün (kein Backend-Anteil).

### US-056 — Admin-Bereich gemäß SPEC-07 angleichen (Tab-Host mit Dialog-Formularen)

- Neuer Tab-Host `AdminPageComponent` unter gemeinsamer Elternroute `/admin` (`adminGuard`
  einmalig hier statt dupliziert): `admin/users`/`admin/projects` bleiben als bookmarkbare
  Kind-Routen erhalten (analog `ProjectWorkspaceLayoutComponent`-Muster) statt SPEC-07s Vorschlag
  einer einzigen Route mit clientseitigem Tab-State — begründete Routing-Entscheidung, siehe
  Story-Datei „Anmerkungen des Agenten“.
- `AdminSubNavComponent` entfernt — Sub-Navigation lebt jetzt einmalig im Tab-Host statt
  dupliziert in beiden Admin-Unterseiten. Bewusst weiterhin das bestehende `.tab-pills`-Muster
  (SPEC-00 §1.3) statt PrimeNGs `<p-tabs>` — Konsistenz mit jeder anderen Tab-Navigation dieser
  Anwendung (US-019, US-046), begründete Abweichung von SPEC-07 §1.2.
- „Nutzer anlegen“, „Projekt anlegen“ und „Mitglied zuweisen“ öffnen jetzt als `p-dialog` über
  einen Button statt dauerhaft sichtbar unterhalb der jeweiligen Liste — Formularfelder,
  Validierung und Verhalten aus US-012/US-014/US-015/US-016/US-017 unverändert.
- Bestehende Tests (`us-046-admin-navigation.spec.ts`,
  `us-050-verlaesslicher-lade-zustand-listen.spec.ts`,
  `project-membership-manager.component.spec.ts`) an die neue Struktur angepasst, nicht entfernt.
  Ausnahme: `admin-sub-nav.component.spec.ts` wurde gelöscht, da die getestete Komponente selbst
  entfernt wurde — Verhaltensabdeckung in `us-046-admin-navigation.spec.ts` konsolidiert
  (begründete Abweichung, siehe Story-Datei).
- Neuer Story-Test `us-056-admin-bereich-spec07-angleichen.spec.ts` (9 Testfälle: Tab-Host-Routing
  inkl. `adminGuard`-Regression, alle drei Dialoge geschlossen/öffnen/Formularverhalten/Schließen
  nach Erfolg).
- `ng test` (243/243), `ng lint`, `ng build` grün; `dotnet test` unverändert grün (kein
  Backend-Anteil). Zusätzlich end-to-end in einem isolierten `docker-compose`-Stack verifiziert.

### US-055 — Globale Navigation als vertikale Sidebar statt horizontaler Kopfleiste

- `AppNavigationComponent`: von horizontaler Kopfleiste (US-045) zu fester, vertikaler
  `<aside>`-Sidebar am linken Rand umgebaut — alle bisherigen Sechs Feature-Spec-Dateien
  (SPEC-02–SPEC-07) gehen übereinstimmend von genau dieser Sidebar-Struktur als App-Shell aus.
  Bestehende Navigationspunkte (Projektübersicht, Admin, Abmelden) unverändert funktional
  erhalten.
- Unterhalb 960px (Angular CDK `BreakpointObserver`, exakte Custom-Query gemäß SPEC-02 §1.4
  „Variante A", keine PrimeFlex-Default-Breakpoints) klappt die Sidebar zu einem `p-drawer` mit
  Hamburger-Trigger zusammen — identischer Navigationsinhalt wie die Desktop-Sidebar, per
  `ngTemplateOutlet` wiederverwendet statt dupliziert (kein Screen-lokales Overriding).
- `app.html`/`.css`: Gesamtlayout auf Flex-Shell (Sidebar + Main-Content) umgestellt.
- Bestehende Tests (`app-navigation.component.spec.ts`, `us-045-*.spec.ts`,
  `us-046-*.spec.ts`) um einen `BreakpointObserver`-Stub ergänzt — Chrome Headless startet in
  dieser Umgebung standardmäßig mit einem 800×600px-Fenster, unterhalb des neuen 960px-Breakpoints,
  ohne den Stub hätten alle drei Dateien plötzlich den (initial geschlossenen) mobilen Drawer statt
  der Desktop-Sidebar getroffen.
- Neuer Story-Test `us-055-vertikale-navigation-sidebar.spec.ts` (5 Testfälle, kontrolliertes
  `Subject` statt echter Fenstergröße für deterministisches Desktop-/Mobile-Testen).
- `ng test` (237/237), `ng lint`, `ng build` grün; `dotnet test` unverändert grün (kein
  Backend-Anteil). Bundle-Budget-Warnung durch zwei neue Abhängigkeiten (`@angular/cdk/layout`,
  `primeng/drawer`) von ca. 277 kB auf 300 kB über Budget gewachsen (weiterhin nur Warnung, kein
  Build-Fehler).

### US-054 — Login- und Passwort-Änderungs-Masken gemäß SPEC-01 angleichen

- Login-Seite: Markenblock um Tagline „Stakeholder-Management für Projektteams“ ergänzt, Footnote
  „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.“ ergänzt, Bootstrapping-
  Skeleton-Zustand (SPEC-00 §3 `<p-skeleton>`-Baustein) ergänzt.
- Passwort-Änderungs-Dialog: amberfarbener Icon-Badge (Schloss-Icon, SPEC-00-Tokens
  `color.attention`/`color.attention-bg`), Titel/Kontext-Text/Hinweistext gemäß SPEC-01
  übernommen, durchgängig informelle Anrede („du“ statt „Sie“).
- **Funktionale Ergänzung, nicht nur optisch:** neues Pflichtfeld „Passwort bestätigen“
  (`confirmPassword`) mit neuem, wiederverwendbarem `passwordsMatchValidator`
  (`frontend/src/app/shared/validators/`) — ein Formular-Submit ist bei ungleichen Werten nicht
  mehr möglich, verständliche Fehlermeldung direkt am Feld.
- Mindestlänge bewusst bei 8 Zeichen belassen (nicht auf die in SPEC-01 vorgegebenen 10 geändert)
  — spiegelt die tatsächlich serverseitig durchgesetzte `PasswordTooShortError.MinimumLength`-Regel;
  dokumentierte, bewusste Abweichung statt stiller Übernahme des Wireframe-Werts.
- Umfang bewusst auf die in der Story konkret benannten SPEC-01-Deltas begrenzt — bereits durch
  neuere Stories etablierte Bausteine (`app-processing-button` aus US-043, SPEC-00-Tokens aus
  US-047) bleiben unverändert, statt auf SPEC-01s älteres Component-Tree-Beispiel zurückgebaut zu
  werden.
- Story-Test `us-054-login-passwortaendern-spec01-angleichen.spec.ts` (9 Testfälle, deckt beide
  Komponenten ab); bestehende `password-change-modal.component.spec.ts` und
  `us-043-formular-feedback-doppelsubmit-schutz.spec.ts` um den neuen Pflichtfall ergänzt statt
  ersetzt.
- `ng test` (232/232), `ng lint`, `ng build` grün; `dotnet test` unverändert grün (kein
  Backend-Anteil). Manueller Smoke-Test (Browser-Automatisierung gegen echten
  `docker-compose`-Stack) bestätigt Markenblock, Dialog-Icon, Live-Validierung des
  Bestätigungsfelds und den kompletten Passwort-Änderungs-Fluss End-to-End.

### US-053 — App-Identität im Browser (Tab-Titel, Favicon, Marken-Icon)

- `frontend/src/index.html`: `<title>` von „Frontend“ (Angular-CLI-Scaffold) auf „SlobSteak“
  geändert; SVG-Favicon (`icon.svg`, von modernen Browsern bevorzugt) vor dem klassischen
  `favicon.ico`-Fallback verlinkt.
- `frontend/public/icon.svg` + `favicon.ico` (16/32/48 px): neues, aus dem Produktnamen und den
  bereits in SPEC-00 definierten Rollenfarben abgeleitetes Markenzeichen (drei überlappende Kreise
  in `color.role-pl/ct/ar`, dieselbe Farbsprache wie das Perspektiven-Radar) ersetzt das
  Angular-CLI-Standardicon. `.ico` per einmaligem, nicht eingechecktem Node-Skript direkt aus der
  SVG-Geometrie rasterisiert (kein Bildkonvertierungswerkzeug in dieser Umgebung verfügbar).
- Neue, wiederverwendbare `BrandMarkComponent` (`frontend/src/app/shared/brand-mark/`) — dieselbe
  Grafik als Angular-Bauteil; auf der Login-Seite eingesetzt (Markenblock analog
  `SPEC-01-Login.md` §1.2, ohne die dort zusätzlich gezeigte Tagline/den Bootstrapping-Zustand,
  die strukturelle Vollangleichung bleibt US-054 vorbehalten).
- Story-Test `us-053-app-identitaet-browser.spec.ts` + `brand-mark.component.spec.ts`; `<title>`/
  Favicon direkt am Build-Artefakt statt per Karma-Test verifiziert (außerhalb des von
  Karma/TestBed geladenen Komponentenbaums).
- `ng test` (221/221), `ng lint`, `ng build` grün; Build-Output enthält
  `favicon.ico`/`icon.svg`/aktualisierten `<title>` korrekt. Manueller Smoke-Test (Produktions-Build
  über lokalen Server, Browser-Automatisierung) bestätigt Tab-Titel und Markenblock visuell.

### US-052 — Stakeholderverwaltung nach Projektauswahl zuverlässig anzeigen

- **Ursache war größer als ursprünglich diagnostiziert:** Die PO-Vermutung (redundanter, mit dem
  Guard doppelter `getProject()`-Aufruf blockiert `router-outlet` via `@if(project)`) traf zu,
  war aber nicht die dominante Ursache. Live-Verifikation gegen einen echten `docker-compose`-Stack
  deckte eine **Endlosschleife aus Redirects** auf: `roleGuard` hängt auf der Elternroute
  `projects/:id`, deren eigenes Kind `access-denied` sein Umleitungsziel bei fehlender
  Berechtigung ist — der Guard re-evaluierte sich dadurch für jede Navigation zu seinem eigenen
  Umleitungsziel erneut. Real reproduziert: über 1000 identische
  `GET /api/v1/projects/{id}`-Requests binnen weniger Sekunden, Seite blieb dauerhaft leer.
- `frontend/src/app/core/guards/role.guard.ts`: Guard erlaubt Aktivierung jetzt sofort (ohne
  eigenen `getProject()`-Aufruf), wenn die Ziel-URL bereits `/access-denied` ist — behebt die
  Endlosschleife an der Wurzel.
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts`
  / `.html`: `<router-outlet>` liegt jetzt außerhalb von `@if (project)` (Kind-Routen rendern
  unabhängig vom eigenen, redundanten Ladevorgang); generische Lade-Fehlermeldung wird gezielt
  unterdrückt, wenn bereits auf `/access-denied` navigiert wurde. Zusätzlich `markForCheck()` im
  `getProject()`-`subscribe()` ergänzt (bei Live-Verifikation entdeckt: Header/Tabs blieben für
  berechtigte Nutzer gegen echte Async-Latenz unsichtbar, gleiches Muster wie US-050/US-057/US-051)
  — entsprechend aus der Fundstellen-Liste von US-058 entfernt.
- Story-Test `frontend/.../us-052-stakeholderverwaltung-nach-projektklick.spec.ts` (4 Testfälle,
  `RouterTestingHarness` für echte verschachtelte Outlet-Komposition) + neuer Testfall in
  `role.guard.spec.ts`; bestehende `role.guard.spec.ts`/`app.routes.spec.ts`-Fakes auf ein
  realistisches `RouterStateSnapshot` präzisiert.
- `ng test` (218/218), `ng lint`, `ng build` grün; `dotnet test` (169/169) unverändert grün (kein
  Backend-Anteil). Manueller Smoke-Test gegen isolierten `docker-compose`-Stack (Backend-Netzwerklog
  + UI per Browser-Automatisierung) bestätigt sowohl den Erfolgs- als auch den Access-Denied-Pfad
  End-to-End, inkl. bestätigter Endlosschleifen-Behebung (2 statt >1000 Requests).

### US-051 — „Passwort zurücksetzen“ in der Nutzerverwaltung schließt zuverlässig ab

- Ursache ermittelt: Backend unauffällig (PBKDF2-Hashing + EF-Core-Save, real gemessen ~33 ms,
  kein Hängen) — der PO-Verdacht eines serverseitigen Problems hat sich nicht bestätigt.
  Tatsächliche Ursache clientseitig, exakt dasselbe in US-050/US-057 dokumentierte Muster: fehlendes
  `ChangeDetectorRef.markForCheck()` in `UsersAdminComponent.onResetPassword` (zoneless Frontend),
  der Button blieb optisch dauerhaft im Verarbeitungs-Zustand hängen, obwohl `resettingUserIds`
  intern bereits korrekt geleert war.
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts`: `markForCheck()` in
  beiden `subscribe()`-Zweigen von `onResetPassword` ergänzt, analog zum bereits etablierten Muster
  in `loadUsers()`.
- Story-Tests: `tests/SlobSteak.Api.Tests/UserStories/US051_PasswortResetAbschliessenTests.cs`
  (Backend, 3 Facts) und `frontend/.../us-051-passwort-reset-abschliessen.spec.ts` (Frontend, 3
  Testfälle) — per Mutationstest (Fix testweise entfernt) verifiziert, dass sie den Bug tatsächlich
  reproduzieren.
- `dotnet test` (169/169), `ng test` (213/213), `ng lint`, `dotnet format --verify-no-changes` alle
  grün. Manueller Smoke-Test gegen isolierten `docker-compose`-Stack (Backend-`curl` + UI per
  Browser-Automatisierung) bestätigt den Fix End-to-End.
- Neue Folge-Story `US-058` angelegt (`docs/usecases/US-058-zoneless-reaktivitaet-systematisch-nachziehen.md`)
  für dasselbe, während der Ursachenanalyse an mehreren weiteren Stellen bestätigte Muster
  (`onCreateUser`, `onCreateProject`, `onAssignMember`/`onChangeRole`/`onRemoveMember`,
  `project-workspace-layout.component.ts`, `stakeholder-list.component.ts`,
  `password-change-modal.component.ts`) — bewusst nicht in dieser Story mitgefixt (Scope-Grenze).

### US-049 — Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart (Backend-Anteil)

- Reale Zeitmessung (isolierter `docker-compose`-Stack, eigener Projektname, umgemappte Ports,
  frisches Volume) statt reinem Code-Review: Migration+Seed-Admin summieren sich konsistent auf
  unter 1 Sekunde, .NET-Kaltstart auf ~1,2–1,4 s gesamt — beide vom PO vermuteten Hypothesen damit
  als dominante Ursache widerlegt. Tatsächlich dominanter, bisher nicht identifizierter Faktor:
  Postgres-Erstinitialisierung auf leerem Volume (5,7–7,0 s). Details siehe Story-Datei
  „Anmerkungen des Agenten“.
- `docker-compose.yml`: `healthcheck` für `api` gegen `/api/v1/health` ergänzt, `frontend` wartet
  jetzt auf `condition: service_healthy` statt auf den bloßen Containerstart von `api` — das vorher
  gemessene ~1,2–1,4 s-Fenster, in dem Login-Requests gegen ein noch nicht bereites Backend liefen,
  ist damit auf 0 reduziert (siehe ADR-0010 für die `start_period`-Erkenntnis). `db`-Healthcheck-
  Intervall von 5s auf 2s verkürzt.
- `src/SlobSteak.Api/Program.cs` und `Bootstrap/SeedAdminHostedService.cs`: Start-/Ende-
  Zeitstempel-Logging um Migration, Seed-Admin-Bootstrap und „Anwendung bereit für Requests“ ergänzt
  — rein diagnostisch, keine Verhaltensänderung, macht künftige Regressionen sofort im Log sichtbar.
- `src/SlobSteak.Api/Dockerfile`: `curl` im Runtime-Image ergänzt (für den neuen Healthcheck).
- Story-Test `tests/SlobSteak.Api.Tests/UserStories/US049_KaltstartPerformanceErsterRequestTests.cs`
  (AC 1–4; AC 5 ist Frontend-Scope, AC 6 wird durch den grünen Gesamtlauf nachgewiesen).
- `dotnet test` (327/327) grün, `dotnet format --verify-no-changes` fehlerfrei.
- **Übergabe an Frontend-Agent (AC 5, gleicher Branch):** `LoginPageComponent`/
  `ProcessingButtonComponent` kennen aktuell nur den binären Zustand `isSubmitting` — kein Zustand
  für „Request läuft bereits > 3s“. Kein globaler `HttpClient`-Timeout konfiguriert. Details und ein
  konkreter Umsetzungsvorschlag in der Story-Datei „Anmerkungen des Agenten“.

### US-049 — Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart (Frontend-Anteil)

- `LoginPageComponent` (`frontend/src/app/features/auth/login-page/`): neuer technischer Zustand
  `isTakingLonger` (Akzeptanzkriterium 5) — startet in `onSubmit()` einen `setTimeout(..., 3000)`,
  der bei einem noch laufenden Request nach 3s greift und im Template einen zusätzlichen,
  sichtbaren Hinweis (`p-message severity="info"`, `data-testid="login-taking-longer-notice"`)
  einblendet; Timer wird in beiden `subscribe`-Callbacks sowie in einem neuen `ngOnDestroy()`
  aufgeräumt. Reines textbasiertes Feedback, kein neues Design — das visuelle Redesign dieses
  Zustands bleibt US-054 vorbehalten.
- Zusätzlich mit übernommen (Befund des Backend-Agenten, direkt zu AC 5 gehörig): `onSubmit()`
  zeigte bislang bei jedem Fehler pauschal „E-Mail oder Passwort ist falsch.“ — jetzt Unterscheidung
  nach Statuscode (`HttpErrorResponse.status === 401`); jeder andere Fehler (Netzwerkfehler, `5xx`,
  `0`, z. B. ein noch nicht bereites Backend) zeigt die in `SPEC-01-Login.md` §3.1 vorgesehene
  Meldung „Anmeldung derzeit nicht möglich. Bitte später erneut versuchen.“
- Tests in `login-page.component.spec.ts` ergänzt/angepasst (jetzt 15 Tests): realistischer
  `HttpErrorResponse` statt generischem `Error` im bestehenden 401-Test, neuer Test für den
  technischen 502-Fall, zwei neue `HttpTestingController`-Tests für `isTakingLonger` (inkl. Beleg,
  dass der Timer bei rechtzeitigem Request-Ende tatsächlich per `clearTimeout()` aufgeräumt wird).
  `fakeAsync()`/`tick()` sind in diesem zonelosen Projekt nicht nutzbar — `jasmine.clock()`
  verwendet.
- `ng test` (gesamter Workspace, 210/210) und `ng lint` grün.

### US-049 — Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart (QA-Anteil)

- Unabhängig verifiziert: `dotnet test` 327/327 grün, `dotnet format --verify-no-changes` fehlerfrei,
  `ng test` 210/210 grün, `ng lint` fehlerfrei — deckt sich mit den Backend-/Frontend-Berichten.
- Story-Test-Konventionslücke geschlossen: Akzeptanzkriterium 5 (Frontend) war nur als zwei
  zusätzliche Tests in der generischen `login-page.component.spec.ts` abgedeckt, kein dedizierter
  Story-Test. Neue Datei `frontend/src/app/features/auth/login-page/us-049-kaltstart-performance-erster-request.spec.ts`
  angelegt (analog zu `us-057-login-haengt-nach-erfolgreicher-anmeldung.spec.ts`), die beiden Tests
  dorthin verschoben. Jetzt je ein dedizierter Story-Test pro Seite (Backend: AC 1–4, Frontend: AC 5).
- End-to-End-Smoke-Test gegen einen echten, isoliert hochgefahrenen `docker-compose`-Stack (eigener
  Projektname/Ports, kein Konflikt mit dem `steakholder-*`-Stack des Nutzers): `db`/`api`/`frontend`
  starten sauber in der erwarteten Healthcheck-Reihenfolge, Login über den nginx-Proxy erfolgreich.
  Zusätzlich per Browser-Automatisierung verifiziert: `api`-Container während eines laufenden
  Login-Requests pausiert — nach > 3 s erscheint sichtbar „Die Anmeldung dauert ungewöhnlich lange.
  …“, nach Fortsetzen löst der Request normal auf (kein hängender Zustand).
- Alle 6 Akzeptanzkriterien geprüft und erfüllt, keine Blocker/Critical-Findings. Details siehe
  Story-Datei „Anmerkungen des QA-Agenten“.

### US-057 — Login-Flow bleibt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen

- Bugfix in `LoginPageComponent.onSubmit()` (`frontend/src/app/features/auth/login-page/login-page.component.ts`):
  `ChangeDetectorRef` injiziert, `markForCheck()` im `next`- **und** im `error`-Handler des
  `authService.login(...).subscribe(...)`-Aufrufs ergänzt. Exakt dasselbe zoneless-Muster, das in
  US-050 an fünf anderen Stellen behoben wurde (kein `zone.js` im Projekt, eine reine
  Feldzuweisung in einem außerhalb eines Nutzer-Events eintreffenden `subscribe()`-Callback
  markiert die Komponente nicht automatisch für die nächste Change-Detection-Runde) — vom
  QA-Agenten während der US-050-Verifikation als Major-Finding entdeckt und in dieser eigenen
  Story behoben. Betraf **jeden** Login-Vorgang, insbesondere jeden neu angelegten Nutzer mit
  `mustChangePassword: true`, der dadurch nie über den Login-Screen hinauskam.
- Kein neues Ladezustands-Muster — `isSubmitting`/`app-processing-button` (US-043) unverändert.
- Story-Test `frontend/src/app/features/auth/login-page/us-057-login-haengt-nach-erfolgreicher-anmeldung.spec.ts`
  (ein Testfall je Akzeptanzkriterium, gleiche Reihenfolge wie im Story-Dokument), zusätzlich
  `HttpTestingController`-basierte Erfolgs-/Fehlerfall-Tests in `login-page.component.spec.ts`
  ergänzt. Testwirksamkeit verifiziert: ohne die beiden `markForCheck()`-Aufrufe schlagen die
  DOM-Endzustand-Tests zuverlässig fehl.
- `ng test` (207/207) grün, `ng lint` ohne Befund. Manueller Smoke-Test gegen eigenständigen
  `docker-compose`-Stack: Login mit Seed-Admin (`mustChangePassword: true`) zeigt sofort das
  Passwort-ändern-Modal, Login mit falschem Passwort zeigt sofort die Fehlermeldung — kein
  Hängenbleiben mehr.
- **Fund außerhalb des Scopes (dokumentiert, nicht behoben):** `PasswordChangeModalComponent`
  hat denselben strukturellen Makel im `subscribe()`-Callback von `authService.changePassword(...)`
  — siehe „Anmerkungen des Dev-Agenten“ in der Story-Datei, Empfehlung für die bereits in US-050
  vorgeschlagene Folge-Story „Zoneless-Reaktivität systematisch nachziehen“.

### US-050 — Verlässlicher Lade-Zustand statt fälschlicher Leer-/Stale-Darstellung auf Listen-/Übersichtsseiten

- Neue, wiederverwendbare Komponente `AppViewStateComponent` (`frontend/src/app/shared/view-state/`)
  kapselt einen diskreten `ViewState` (`'loading' | 'content' | 'empty' | 'error'`, SPEC-00 §3
  Event-Handling-Grundsatz) samt `<p-skeleton>`-Platzhalter statt kombinierbarer
  `isLoading && !hasData`-Flags — an fünf Stellen eingebunden: `/projects` „Meine Projekte“ +
  „Alle Projekte“ (`ProjectOverviewComponent`), `/admin/users` Nutzerliste (`UsersAdminComponent`),
  `/admin/projects` Projektliste (`ProjectsAdminComponent`), sowie in `ProjectMembershipManagerComponent`
  die Liste potenzieller Nutzer und die Mitgliederliste (inkl. Reload nach „Hinzufügen“).
- PrimeNG-Preset (`slobsteak-preset.ts`) um `components.skeleton.root.background` (`color.surface-hover`,
  `#1D2536`) ergänzt, damit `<p-skeleton>` dieselben Design-Tokens nutzt wie der Rest des Frontends.
- **Zusätzlich behobene, tiefer liegende Ursache:** Das Frontend läuft ohne `zone.js` faktisch
  zoneless (Angular `^22.1.0`, kein `zone.js`-Polyfill in `angular.json`) — eine reine
  Feldzuweisung in einem `HttpClient`-`subscribe()`-Callback außerhalb eines beobachteten
  Nutzer-Events markiert die Komponente nicht automatisch für die nächste Change-Detection-Runde.
  Das erklärt das eigentliche Symptom „Daten sind da, werden aber erst nach zufälliger
  Interaktion sichtbar“ unabhängig vom Lade-Zustand. Alle vier betroffenen Komponenten rufen daher
  zusätzlich `ChangeDetectorRef.markForCheck()` in den relevanten Lade-Callbacks auf — siehe
  ausführliche Anmerkung des Dev-Agenten in
  `docs/usecases/US-050-verlaesslicher-lade-zustand-listen.md`.
- Story-Test `frontend/src/app/shared/view-state/us-050-verlaesslicher-lade-zustand-listen.spec.ts`
  (ein Testfall je Akzeptanzkriterium, gleiche Reihenfolge wie im Story-Dokument), zusätzliche
  Komponententests je betroffener Komponente (`*.component.spec.ts`) sowie
  `view-state.component.spec.ts` für den neuen Baustein selbst. Bestehender US-044-Test
  (`us-044-http-error-handling.spec.ts`) unverändert grün — `loadError` bleibt bestehen und
  koexistiert mit dem neuen `ViewState`.
- `ng test` (199/199) grün, `ng lint` ohne Befund.
- **QA-Verifikation (25.08.2026):** alle neun Akzeptanzkriterien einzeln gegen Code/Tests/laufendes
  System geprüft, manueller Smoke-Test gegen eigenständigen `docker-compose`-Stack durchgeführt.
  Dabei Major-Finding außerhalb des Story-Scopes entdeckt und dokumentiert: `LoginComponent`
  bleibt nach erfolgreichem `POST /api/v1/auth/login` (`200 OK`) dauerhaft im Zustand „Wird
  angemeldet…“ hängen (gleiches zoneless-`markForCheck()`-Muster wie in dieser Story behoben, aber
  `LoginComponent` gehört nicht zu den fünf benannten Fundstellen) — siehe „Anmerkungen des
  QA-Agenten“ in der Story-Datei, Empfehlung für eigene Bugfix-Folge-Story.

### US-030 — Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten)

- `GET /api/v1/stakeholders/{id}/assessments` liefert für Nutzer mit `project_membership.role =
  User` jetzt `403 Forbidden` (`{"error":"FORBIDDEN"}`, keinerlei Assessment-Felder im Body) statt
  einer leeren oder maskierten Liste — Umsetzung über die bestehende deklarative
  `[RequireProjectRole(...)]`-Infrastruktur (US-007/US-022, ADR-0007), `ProjectRole.User` wurde aus
  der Liste der für `GetAssessments` erlaubten Rollen entfernt.
- Auf der Stakeholder-Detailseite ist der gesamte Assessment-Bereich (Überschrift + Tabs) für Rolle
  `User` vollständig aus dem DOM entfernt (`@if` auf Basis der vom Backend gelieferten Projektrolle,
  keine reine CSS-Klasse) — neuer `data-testid="assessment-tabs"`-Testhook auf dem Tabs-Container.
- Story-Tests: Backend `tests/SlobSteak.Api.Tests/UserStories/US030_AssessmentSichtbarkeitUserTests.cs`
  (Akzeptanzkriterium 1/2), Frontend
  `frontend/src/app/features/stakeholders/us-030-assessment-sichtbarkeit-user.spec.ts`
  (Akzeptanzkriterium 3). Zusätzlicher Regressionstest `frontend/src/app/app.routes.spec.ts` sichert
  die bereits bestehende Map-Route-Sperre (`roleGuard(['PL','Coreteam','Architect'])`, seit
  US-019/US-026) gegen versehentliches Entfernen ab.
- `dotnet test SlobSteak.sln` (323/323) und `ng test` (177/177) laufen grün, `dotnet format` und
  `ng lint` ohne Befund. `SlobSteak.Domain`-Testabdeckung: 84,95 % (Richtwert 80 % erfüllt).
- **Bekannter offener Punkt (dokumentierte Abweichung, kein Blocker):** Akzeptanzkriterium 4 fordert
  zusätzlich eine serverseitige Sperre des Map-Query-Endpoints (US-031) für Rolle `User`. Dieser
  Endpoint existiert laut Backlog noch nicht — die Sperre wird als Nachtrag direkt in US-031
  mitgebaut (Präzedenzfall US-023). Die Map-**Navigation** (Frontend-Route) ist bereits gesperrt und
  jetzt zusätzlich regressionsgetestet.

### US-047 — Bestehendes Frontend auf das Design-System migrieren

- Zentrale Design-Tokens (Farben inkl. Rollen-/Attention-Palette, Radien, Abstände, Typografie)
  als CSS Custom Properties auf `:root` in `frontend/src/styles.css`; PrimeNG-Custom-Preset
  `SlobSteakPreset` (`core/theme/slobsteak-preset.ts`, auf Basis des dunklen Aura-Presets) bildet
  dieselben Werte auf PrimeNG-interne Semantik-Tokens ab und wird einmalig über `providePrimeNG`
  in `app.config.ts` verdrahtet. Web-Fonts (Space Grotesk, IBM Plex Sans, IBM Plex Mono) zentral in
  `index.html` eingebunden.
- Alle 15 in der Story gelisteten Feature-`.css`-Dateien sowie `app.css`, `admin-sub-nav.component.css`
  und `app-navigation.component.css` (letztere zwei nicht in der ursprünglichen Dateiliste, aber
  Bestandteil der app-weiten Navigations-Shell aus US-043–046) referenzieren ausschließlich diese
  zentralen Tokens statt hartcodierter Hex-/px-Werte.
- Kartenlayout statt roher `<table>`-Strukturen in Stakeholder-Liste, Nutzerverwaltung,
  Projektverwaltung und Projekt-Mitgliederverwaltung — Spalteninhalte und Aktionen (Bearbeiten,
  Löschen, Wiederherstellen, Passwort zurücksetzen, Mitglieder verwalten/entfernen) bleiben
  vollständig erhalten.
- Neue wiederverwendbare `AppAttentionBadgeComponent` (`shared/attention-badge/`, SPEC-00 §1.3),
  angewendet auf den "ähnlicher Stakeholder"-Hinweis im Anlage-Formular — die Attention-Farbe wird
  ausschließlich dafür und für den produktweiten Fokus-Ring verwendet.
- Geteilte Utility-Klassen `.tab-pills`/`.tab-pill` (gefülltes Pill-Muster), `.role-badge`,
  `.status-tag` in `styles.css` statt lokal duplizierter Tab-/Badge-Styles je Screen; Rollen-Badge
  im Projekt-Workspace-Header zeigt PL/Coreteam/Architect farbcodiert, Rolle „User" erhält bewusst
  keinen Badge (SPEC-00 §4).
- Formularfehler folgen einheitlich dem SPEC-00-§2-Muster (verknüpftes `<label>`, `p-message`
  mit Icon, `aria-invalid`/`aria-describedby`) — u. a. in Login und Passwort-Änderungs-Dialog
  ergänzt, wo bislang keine sichtbare Fehlerdarstellung vorhanden war.
- Neuer Story-Test `us-047-frontend-design-migration.spec.ts` (ein Testfall je geprüftem
  Akzeptanzkriterium); `ng test` (172/172) und `ng lint` laufen grün, kein bestehender Test musste
  angepasst werden. `angular.json`-Bundle-Budget auf 900 kB/1,5 MB angehoben (PrimeNG/PrimeFlex
  vergrößern das Initial-Bundle erwartungsgemäß).
- **Bekannter offener Punkt (kein Code-Mangel, sondern Lizenzfrage):** Die installierte
  `primeng@22.1.0` verlangt eine PrimeUI-Lizenz und zeigt ohne gültigen Key ein "Invalid PrimeUI
  License"-Banner; SlobSteak dürfte für die kostenlose Community License qualifizieren, die
  Registrierung eines Keys erfordert aber eine Konto-Anlage, die außerhalb der Handlungsbefugnis
  dieses Agenten liegt. Siehe „Anmerkungen des Dev-Agenten" in der Story-Datei für Details und den
  konkreten Einhängepunkt (`providePrimeNG({ …, license: '<KEY>' })`).

### US-046 — Admin-Bereich über globale Navigation erreichbar machen

- Die globale Navigation (`AppNavigationComponent`, US-045) zeigt zusätzlich einen Eintrag „Admin“
  (Ziel `/admin/users`), ausschließlich für Nutzer mit `isSystemAdmin = true`
  (`TokenStorageService.getClaims()`). Analog zu `isVisible` steuert ein eigenes Signal `isAdmin`
  die Sichtbarkeit und wird bei jedem `NavigationEnd` neu berechnet; der Eintrag steht hinter einem
  `@if` im Template, ist bei fehlender Berechtigung also vollständig aus dem DOM entfernt statt nur
  per CSS versteckt. Reine clientseitige UX-Schicht über dem bereits bestehenden `adminGuard` und
  der serverseitigen `SystemAdmin`-Policy — beide bleiben unverändert.
- Neue, wiederverwendbare `AdminSubNavComponent` (`features/admin/admin-sub-nav/`), gespeist aus
  `admin-nav-items.ts` (`ADMIN_SUB_NAV_LINKS`: „Nutzer“ → `/admin/users`, „Projekte“ →
  `/admin/projects`) — als Liste statt hartkodiertem Zwei-Elemente-Markup, damit der PRD-seitig
  vorgesehene dritte Sub-Bereich „Kommunikationsarten-Katalog“ (folgt mit US-038) später ergänzt
  werden kann. Eingebunden in `UsersAdminComponent` und `ProjectsAdminComponent`, damit ein
  Systemadmin zwischen beiden wechselt, ohne zur globalen Navigation zurückzukehren; der aktive
  Sub-Bereich wird per `routerLinkActive="active"` hervorgehoben.
- Tests: dedizierter Story-Test `us-046-admin-navigation.spec.ts` (ein Testfall je
  Akzeptanzkriterium in Story-Reihenfolge, inkl. Regressionstest für `adminGuard`), generischer
  `admin-sub-nav.component.spec.ts`; bestehende `app-navigation.component.spec.ts`,
  `users-admin.component.spec.ts` und `projects-admin.component.spec.ts` um `provideRouter([])`
  ergänzt (neu benötigt durch `RouterLink`/`RouterLinkActive` in den eingebundenen Komponenten).
- Smoke-Test: isolierter `docker compose up` (alternative Host-Ports, temporär) — Login als
  Seed-Admin, Klick „Admin“ führt zu `/admin/users`, Wechsel „Nutzer“ ↔ „Projekte“ mit aktiver
  Hervorhebung, kein „Admin“-Eintrag für einen Nicht-Admin-Claim, direkter Aufruf von
  `/admin/users` als Nicht-Admin bleibt per `adminGuard` auf `/login` umgeleitet.

### US-044 — Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung

- Neuer `httpErrorInterceptor` (`frontend/src/app/core/interceptors/http-error.interceptor.ts`),
  registriert in `app.config.ts` nach `authInterceptor` (Reihenfolge über die neue Konstante
  `HTTP_INTERCEPTORS_ORDER` dediziert testbar).
- Bei `401 Unauthorized`: Token wird über `TokenStorageService.clearToken()` gelöscht und der
  Nutzer (sofern nicht bereits auf `/login`) automatisch dorthin weitergeleitet, inkl. sichtbarem
  Hinweistext „Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.“ — transportiert über den
  neuen `SessionNoticeService` (Begründung: `docs/adr/0008-session-notice-service-statt-query-param.md`).
- Bei `403 Forbidden`: kein automatischer Redirect (fachlich gültiger, dauerhafter Zustand), aber
  zentrales `console.error`-Logging mit Request-URL und Status als Ansatzpunkt für künftiges
  Client-seitiges Logging. Alle anderen Fehler (inkl. generischer `5xx`) werden unverändert
  durchgereicht.
- Bislang fehlende `error`-Handler bei lesenden (`GET`) Requests ergänzt in
  `stakeholder-list.component.ts`, `project-overview.component.ts`,
  `project-workspace-layout.component.ts`, `users-admin.component.ts`,
  `projects-admin.component.ts` — jeweils mit der konsistenten Fehlermeldung „Daten konnten nicht
  geladen werden. Bitte versuche es erneut.“ statt einer stumm leeren/eingefrorenen Ansicht. Beide
  Wortlaute zentral in `core/messages/http-error-messages.ts`, gemeinsame Anzeige-Klasse
  `.load-error` in `src/styles.css`.
- Tests: `http-error.interceptor.spec.ts` (401/403/5xx isoliert über `HttpTestingController`),
  Story-Test `us-044-http-error-handling.spec.ts` (alle fünf Akzeptanzkriterien in Reihenfolge,
  inkl. End-to-End-Test Interceptor+`ProjectWorkspaceLayoutComponent`), sowie ergänzte
  Fehlerfall-Tests in den fünf betroffenen `*.component.spec.ts`-Dateien und
  `login-page.component.spec.ts`. Gesamter Workspace (`ng test`) grün, `ng lint` fehlerfrei.
- Reiner Frontend-Anteil, kein Backend-Code — `dotnet test` unverändert.

### US-043 — Einheitliches Verarbeitungs-Feedback & Doppel-Submit-Schutz auf allen Formularen/Aktions-Buttons

- Neue, projektweit wiederverwendbare `ProcessingButtonComponent` (`frontend/src/app/shared/processing-button/`):
  rendert einen `<button>`, der während `isSubmitting === true` über `[disabled]` gesperrt ist **und**
  gleichzeitig einen Textwechsel (`submittingLabel`) plus Inline-Spinner zeigt — ein reines `[disabled]`
  ohne visuellen Unterschied gilt laut Story nicht als erfüllt. Ersetzt die bisherige, in jeder
  Formular-/Aktions-Komponente unterschiedliche `<button [disabled]="...">`-Kopie.
- `isSubmitting`-Flag (bzw. `Set<string>` für zeilenweise Aktionen in Tabellen) inkl. Guard gegen einen
  zweiten Trigger während eines laufenden Requests ergänzt in: `CreateStakeholderFormComponent`,
  `EditStakeholderFormComponent`, `DeleteStakeholderDialogComponent`, `StakeholderListComponent`
  (Wiederherstellen-Button), `AssessmentTabsComponent` (Speichern, inkl. „Trotzdem speichern“ aus dem
  Konfliktdialog), `UsersAdminComponent` (Nutzer anlegen + Passwort zurücksetzen je Zeile),
  `ProjectsAdminComponent` (Projekt anlegen), `ProjectMembershipManagerComponent` (Hinzufügen, Rolle
  ändern, Entfernen je Zeile). `isSubmitting` wird in jedem Fall sowohl im `next`- als auch im
  `error`-Callback zurückgesetzt, sodass ein fehlgeschlagener Request ohne Seiten-Reload erneut versucht
  werden kann.
- `login-page.component.html` und `password-change-modal.component.html` auf dasselbe sichtbare Muster
  (`ProcessingButtonComponent` statt reinem `[disabled]`) angeglichen — das bereits vorhandene
  `isSubmitting`-Flag dieser beiden Komponenten wird dafür jetzt auch visuell konsistent dargestellt.
- Story-Test `frontend/src/app/shared/us-043-formular-feedback-doppelsubmit-schutz.spec.ts`: ein
  Testblock je Akzeptanzkriterium; AC3 (Doppel-Trigger löst keinen zweiten HTTP-Request aus) wird für
  `create-stakeholder-form` und `assessment-tabs` über `HttpTestingController` nachgewiesen.
- Reiner Frontend-Anteil, keine Domain-/API-Änderung — `dotnet test` unverändert grün, `ng test`
  (gesamter Workspace, 119 Tests) grün, `ng lint` fehlerfrei.

### US-045 — Globale Navigation (Shell) inkl. Abmelden-Funktion

- Neue standalone `AppNavigationComponent` (`frontend/src/app/core/navigation/app-navigation/`)
  ersetzt den bisherigen statischen `<h1>SlobSteak</h1>`-Titel in `app.html` (PRD Abschnitt 6.3).
  Sichtbarkeit folgt zwei Bedingungen: ein gültiges Session-Token liegt in `localStorage` vor UND
  die aktuelle Route ist nicht `/login` — Letzteres verhindert, dass ein noch nicht gelöschtes
  Token die Navigation auf der Login-Seite einblendet, falls ein bereits angemeldeter Nutzer
  `/login` manuell erneut aufruft (kein Guard verhindert das); reagiert auf `NavigationEnd`, damit
  Login/Logout ohne Seiten-Reload sofort berücksichtigt werden.
- Enthält „Projektübersicht“ (Link zu `/projects`) und „Abmelden“ (nativer `<button>`, kein Link).
  Klick auf „Abmelden“ ruft `TokenStorageService.clearToken()` auf und navigiert zu `/login`; ein
  anschließender Aufruf einer geschützten Route greift danach wieder über `authGuard`. Bewusst kein
  neuer Backend-Logout-Endpunkt — rein clientseitige Aktion (siehe Story-Datei „Wichtige
  Invarianten“, kein serverseitiger Token-Widerruf vorhanden).
- Navigationseinträge als Konfigurationsliste (`nav-items.ts`, `APP_NAV_LINKS`) statt
  hartkodiertem Markup modelliert, damit US-046 („Admin“-Eintrag) das Template nicht anfassen muss.
- Tests: dedizierter Story-Test `us-045-app-navigation.spec.ts` (ein Testfall je Akzeptanzkriterium
  in Story-Reihenfolge, inkl. Guard-Verifikation nach Logout über `authGuard`), generische
  `app-navigation.component.spec.ts`; `app.spec.ts` angepasst (prüft `<app-navigation>` statt des
  entfernten `<h1>`).
- Smoke-Test: isolierter `docker compose up --build` — Login (Token über direkten API-Aufruf
  gesetzt), Navigation auf `/projects` sichtbar, Klick „Abmelden“ leert Token + Redirect zu
  `/login`, erneuter Aufruf von `/projects` wird per `authGuard` wieder auf `/login`
  zurückgeleitet. Dabei den oben beschriebenen Sichtbarkeits-Randfall auf `/login` mit
  vorhandenem Alt-Token entdeckt und vor Abschluss der Story behoben (siehe Commit-Historie).

### US-029 — Assessment-Tabs UI auf Stakeholder-Detailseite inkl. „zuletzt geändert von/am“

- Neue `AssessmentTabsComponent` (Frontend) — drei Tabs „PL-Sicht“/„Coreteam-Sicht“/
  „Architect-Sicht“ auf der Stakeholder-Detailseite (US-026), gespeist aus `GET .../assessments`
  (US-028). Jeder Tab zeigt Einfluss-/Interesse-Slider, Notizfeld und „zuletzt geändert von/am“.
  Nur der Tab der eigenen Projekt-Rolle ist editierbar (`form.enable()`/`disable()`), übrige Tabs
  bleiben sichtbar, aber read-only.
- `status: "NOT_ASSESSED"` zeigt „Noch nicht bewertet“ mit „Jetzt bewerten“-CTA (nur für die
  eigene Rolle klickbar); `status: "NO_ROLE_ASSIGNED"` zeigt „Keine Rolle zugewiesen“ ganz ohne
  Eingabemöglichkeit.
- Neue `AssessmentConflictDialogComponent`: erscheint bei `409 ASSESSMENT_MODIFIED` beim
  Speichern, mit „Trotzdem speichern“ (erneuter Request ohne `expectedVersion`) und „Abbrechen“
  (Neuladen der aktuellen Werte).
- Neuer `AssessmentsService` (Frontend); `StakeholderDetailComponent` (US-026) reicht
  `currentUserRole` durch und befüllt den bisherigen Assessment-Platzhalter-Slot.
- Tests: `assessment-tabs.component.spec.ts` (7 Fälle, deckt alle 6 Akzeptanzkriterien),
  `assessment-conflict-dialog.component.spec.ts`, erweiterte `stakeholder-detail.component.spec.ts`.
- Reiner Frontend-Anteil, kein Backend-Code — `dotnet test` unverändert grün.
- **Anmerkung zum Smoke-Test**: API-seitig End-to-End über curl verifiziert (Erstanlage,
  Konflikt-Response, `NO_ROLE_ASSIGNED`). Ein visueller Browser-Smoke-Test über die
  `claude-in-chrome`-Erweiterung zeigte für *jede* Angular-`HttpClient`-gespeiste Ansicht (auch
  bereits bestehende, unveränderte Seiten wie `/admin/users`) leere Listen, obwohl Netzwerk-Log
  und ein manueller `fetch()` im selben Seitenkontext mit demselben Token korrekte Daten lieferten
  — reproduziert identisch auf dem unveränderten, bereits gemergten US-028-Stand. Das deutet auf
  eine Interaktion der Browser-Erweiterung mit Angulars zone.js-gepatchten `HttpClient`-Requests
  hin, nicht auf einen echten Anwendungsfehler; siehe „Anmerkungen des Dev-Agenten“ in der
  Story-Datei.

### US-028 — Assessment erstellen/aktualisieren API inkl. Optimistic-Locking-Konfliktregel

- `PUT /api/v1/stakeholders/{id}/assessments/{role}` (neu): legt ein Assessment an oder
  aktualisiert es; `201 Created` bzw. `200 OK` mit `influence`/`interest`/`notes`/
  `updatedByName`/`updatedAt`/`version`. Ausschließlich für den Nutzer mit exakt dieser Rolle im
  Projekt erreichbar (`403 FORBIDDEN` bei fremder Rolle) — die Prüfung erfolgt manuell über die
  bestehende `ProjectRolePolicy`, da das deklarative `RequireProjectRole`-Attribut eine vom
  URL-Segment abhängige Rolle nicht ausdrücken kann.
- Optionales `expectedVersion` im Request: weicht es von der aktuellen Version ab, liefert die API
  `409 Conflict` mit `{"error":"ASSESSMENT_MODIFIED","modifiedBy":"...","modifiedAt":"..."}` statt
  zu überschreiben; fehlt `expectedVersion`, wird ohne Konfliktprüfung gespeichert (Last-Write-Wins).
- `GET /api/v1/stakeholders/{id}/assessments` (neu): liefert je perspektiv-tragender Rolle
  (`PL`/`Coreteam`/`Architect`) einen Eintrag — `status: "ASSESSED"` inkl. Werten, `"NOT_ASSESSED"`
  bei zugewiesener aber noch nicht bewertender Rolle, `"NO_ROLE_ASSIGNED"` bei aktuell keinem
  zugewiesenen Nutzer dieser Rolle im Projekt. Rolle `User` erhält (noch) keine eingeschränkte
  Sicht — das folgt erst mit US-030.
- Neue Application Services `UpsertStakeholderAssessmentService`, `GetStakeholderAssessmentsQuery`.
- Tests: dedizierter Story-Test `US028_AssessmentApiTests` (7 Facts, Testcontainers-PostgreSQL),
  `UpsertStakeholderAssessmentServiceTests`/`GetStakeholderAssessmentsQueryTests` (Application).
- Smoke-Test: isolierter `docker compose up --build` — Erstanlage, fremde Rolle (`403`), veraltete
  Version (`409`), `GET` mit `NO_ROLE_ASSIGNED` — End-to-End über die REST-API verifiziert.

### US-027 — StakeholderAssessment-Aggregate (Domain Model, Invarianten)

- `StakeholderAssessment.Create(stakeholderId, role, influence, interest, notes, updatedBy)` neu:
  akzeptiert für `role` ausschließlich `PL`/`Coreteam`/`Architect` (`InvalidAssessmentRoleError`
  bei `User`); `influence`/`interest` werden intern als `Score`-Value-Objects (0–100,
  Wiederverwendung US-002) validiert (`InvalidScoreRangeError`).
- `StakeholderAssessment.Update(influence, interest, notes, updatedBy, expectedVersion)` neu:
  aktualisiert Werte + `updated_by`/`updated_at`, erhöht `Version` (optimistisches Locking) —
  wirft `StaleAssessmentError`, wenn `expectedVersion` nicht der aktuellen `Version` entspricht
  (Grundlage für die Konfliktwarnung in US-028).
- Neues Repository-Interface `IStakeholderAssessmentRepository`
  (`FindByStakeholderAndRoleAsync`/`FindAllByStakeholderAsync`/`SaveAsync`) + EF-Core-
  Implementierung; der Unique-Index (`stakeholder_id`, `role`) aus US-003 wird von einem
  Integrationstest gegen eine echte Testcontainers-PostgreSQL-Instanz verifiziert.
- Domain-only Story (kein API-/UI-Anteil) — `Version` als EF-Core-`IsConcurrencyToken()` (seit
  US-003/ADR-0002) bleibt als zusätzliche DB-seitige Absicherung neben der domain-eigenen
  `expectedVersion`-Prüfung bestehen.
- Tests: dedizierter Story-Test `US027_AssessmentAggregateTests`, erweiterte
  `StakeholderAssessmentTests` (Domain).
- Smoke-Test: `dotnet test` (gesamte Solution) grün; isolierter `docker compose up` verifiziert,
  dass die neue DI-Registrierung den API-Start nicht bricht.

### US-026 — Stakeholder-Detailseite Shell (S4)

- `GET /api/v1/stakeholders/{id}` (neu) liefert einen einzelnen Stakeholder für alle vier
  Projektrollen (Lesezugriff, Bearbeiten bleibt unverändert über den seit US-022 rollen-
  beschränkten `PATCH`-Endpoint) — `404`, wenn nicht vorhanden oder soft-gelöscht (konsistent mit
  US-022/US-023).
- Neuer Application Service `GetStakeholderService`.
- **Frontend**: neue Route `/projects/:id/stakeholders/:stakeholderId` mit
  `StakeholderDetailComponent` — Kopfbereich (Name, Typ, Organisation, „zuletzt geändert von/am“),
  Stammdaten-Bereich mit allen F1.1-Feldern (editierbar nur für `PL`/`Coreteam`/`Architect` über
  die bestehende `EditStakeholderFormComponent` aus US-022, sonst read-only), CTA „Löschen“ nur
  für `PL` über die bestehende `DeleteStakeholderDialogComponent` aus US-023 (navigiert nach
  Erfolg zurück zur Liste), sowie Platzhalter-Slots für „Kommunikationszuordnungen“ (US-040) und
  „Assessment“ (US-029). Ein `404` zeigt eine „Nicht gefunden“-Ansicht. `StakeholderListComponent`
  verlinkt den Namen jedes aktiven Eintrags auf die Detailseite.
- Tests: dedizierter Story-Test `US026_StakeholderDetailShellTests` (Testcontainers-PostgreSQL),
  `GetStakeholderServiceTests` (Application), neue `stakeholder-detail.component.spec.ts`.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Detailseite laden,
  soft-löschen, erneuter Aufruf liefert `404` — End-to-End über die REST-API verifiziert.

### US-024 — Stakeholder Wiederherstellen & Papierkorb-Ansicht: API + UI (S3.x)

- `GET /api/v1/projects/{projectId}/stakeholders?deleted=true` liefert ausschließlich
  soft-gelöschte Stakeholder inkl. `deletedAt`/`deletedByName` — derselbe Endpoint wie die
  Standardliste (US-025), zusätzlich ausschließlich für Rolle `PL` erreichbar (sonst `403`); eine
  query-parameterabhängige Rolleneinschränkung kann das deklarative `RequireProjectRole`-Attribut
  nicht ausdrücken, daher eine zusätzliche manuelle Prüfung über die framework-freie
  `ProjectRolePolicy` direkt im Controller.
- `POST /api/v1/stakeholders/{id}/restore` (nur Rolle `PL`, idempotent) setzt `deleted_at`/
  `deleted_by` zurück auf `null` — nutzt die bereits seit US-020 vorhandene
  `Stakeholder.Restore()`-Domainmethode.
- Neue Application Services `RestoreStakeholderService` und `DeletedStakeholdersQuery` (letzterer
  nutzt bewusst direkt `IStakeholderRepository.FindDeletedByProjectAsync` statt eines eigenen
  Domain-/Infrastructure-Read-Modell-Ports — die Abfrage ist ein einfacher Filter, den das
  bestehende Repository-Interface bereits abdeckt).
- `StakeholderResponse` um `deletedAt`/`deletedByName` erweitert (bei aktiven Stakeholdern stets
  `null`) — derselbe einheitliche Response-Contract wie Anlegen/Bearbeiten/Liste (US-025).
- **Frontend**: `StakeholderListComponent` erhält einen Umschalter „Gelöschte anzeigen“
  (ausschließlich für Rolle `PL` sichtbar), der bei Aktivierung die Papierkorb-Ansicht lädt —
  Zeilen ausgegraut mit Badge „Gelöscht am [Datum] von [Name]“ und „Wiederherstellen“-Button statt
  Bearbeiten/Löschen; Anlage-Formular ist in diesem Modus ausgeblendet. Restore aktualisiert die
  Liste ohne vollständigen Reload.
- Tests: dedizierter Story-Test `US024_StakeholderWiederherstellenTests` (Testcontainers-
  PostgreSQL), `RestoreStakeholderServiceTests`/`DeletedStakeholdersQueryTests` (Application),
  erweiterte `stakeholder-list.component.spec.ts` (Toggle-Sichtbarkeit, Restore-Aufruf).
- **Anmerkung**: Akzeptanzkriterium 5 (Wiederauftauchen in einer gespeicherten
  Verteilerlisten-Filterkombination) referenziert US-041, das noch nicht existiert (weit spätere
  Phase) — analog zur bereits in US-023 dokumentierten Abweichung nur die Standardliste geprüft;
  der US-041-Teil wird erneut verifiziert, sobald diese Story entsteht.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, löschen, Papierkorb-
  Ansicht (nur PL, `403` für Rolle `User`), Wiederherstellen, erneutes Erscheinen in der
  Standardliste — alle end-to-end über die REST-API verifiziert.

### US-025 — Stakeholder-Liste mit Suche/Filter: API + UI inkl. Rollen-Sichtbarkeitsregel

- `GET /api/v1/projects/{projectId}/stakeholders` (bereits seit US-023 vorhanden) um
  `search`/`type`/`communicationTypeId`-Query-Parameter erweitert. `search` filtert
  case-insensitiv über Name und Organisation; `type` schränkt auf `Person`/`Organization` ein
  (ungültiger Wert wird ignoriert statt `400`); `communicationTypeId` joint gegen
  `stakeholder_communication_assignments` (Backend bereits vollständig, UI-Optionsliste folgt
  erst mit US-037, siehe Anmerkungen).
- Neues Read-Modell `IStakeholderListQuery` (`SlobSteak.Domain.Stakeholders`, EF-Core-
  Implementierung in `SlobSteak.Infrastructure`).
- Response-Contract der Liste vereinheitlicht: liefert jetzt denselben `StakeholderResponse` wie
  Anlegen/Bearbeiten (inkl. aufgelöstem `updatedByName`) statt eines eigenen schlankeren DTOs.
- **Frontend-Refactor**: `CreateStakeholderFormComponent` (US-021) ist jetzt ein reines
  Anlage-Formular (`@Output() created`, kein eigener session-lokaler Listenzustand mehr). Neue
  `StakeholderListComponent` — Standard-Landingtab-Inhalt der Workspace-Shell (US-019, löst
  `CreateStakeholderFormComponent` als direkten Tab-Inhalt ab) — lädt die Liste serverseitig mit
  Such-/Typ-Filter, bettet das Anlage-Formular sowie `EditStakeholderFormComponent`/
  `DeleteStakeholderDialogComponent` (US-022/US-023) ein und lädt nach jeder Änderung neu.
- Tests: dedizierter Story-Test `US025_StakeholderListeTests` (4 Facts über echte
  Testcontainers-PostgreSQL), erweiterte `ListStakeholdersServiceTests` (3 Fälle),
  `stakeholder-list.component.spec.ts` (8 Fälle), `create-stakeholder-form.component.spec.ts`
  neu geschrieben für das vereinfachte Formular (9 Fälle).
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Suche nach
  Teilstring, Typ-Filter, leeres Suchergebnis — alle end-to-end verifiziert; `/projects/:id/
  stakeholders` liefert die neue Listenansicht über den nginx-Proxy.

### US-023 — Stakeholder Soft-Delete: API + UI

- Neue Endpunkte `DELETE /api/v1/stakeholders/{id}` (nur Rolle `PL`, idempotent — erneutes
  `DELETE` auf einen bereits gelöschten Stakeholder liefert weiterhin `200 OK` ohne
  `deleted_at` zu ändern) und `GET /api/v1/stakeholders/{id}/deletion-impact` (Anzahl betroffener
  Assessments/Kommunikationszuordnungen für den Bestätigungsdialog).
- Neue Endpoint `GET /api/v1/projects/{projectId}/stakeholders` (Standardliste, alle vier
  Projektrollen) — bisher fehlte diese Liste; notwendige Infrastruktur, damit AC4 (gelöschte
  Stakeholder verschwinden aus Standardansichten) prüfbar ist. Map-Query (US-031) und
  Verteilerlisten-Filter (US-041) existieren noch nicht und werden dort nachgezogen (siehe
  Anmerkungen der Story-Datei).
- Neue `SoftDeleteStakeholderService`/`ListStakeholdersService`; `IStakeholderRepository` um
  `GetDeletionImpactAsync` ergänzt (zählt `stakeholder_assessments`/
  `stakeholder_communication_assignments`, reines Read-Modell wie bei früheren
  Skeleton-Tabellen-Zugriffen).
- `DELETE`/`deletion-impact` nutzen denselben `StakeholderProjectRoleAuthorizationHandler` aus
  US-022 — keine neue Authorization-Infrastruktur nötig.
- Neue Angular-Komponente `DeleteStakeholderDialogComponent` — „Löschen“-Aktion je Zeile der
  session-lokalen Liste, lädt beim Öffnen die Impact-Zahlen und zeigt sie im
  Bestätigungsdialog an.
- Tests: `SoftDeleteStakeholderServiceTests`/`ListStakeholdersServiceTests` (Application.Tests,
  9 Fälle), dedizierter Story-Test `US023_StakeholderSoftDeleteTests` (8 Facts/Theories über
  echte Testcontainers-PostgreSQL, inkl. physischer Integritätsprüfung der Assessment-/
  Kommunikationszuordnungs-Zeilen), ergänzend `StakeholderController_DeleteTests` (4 Fälle),
  `delete-stakeholder-dialog.component.spec.ts` (6 Fälle), 3 ergänzende Fälle in
  `create-stakeholder-form.component.spec.ts`.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Impact-Check (`200`,
  Zählwerte), Löschen (`200`), Standardliste zeigt ihn danach nicht mehr, erneutes Löschen
  bleibt idempotent (`200`).

### US-022 — Stakeholder-Stammdaten bearbeiten: API + UI inkl. Änderungsverlauf

- Neuer Endpoint `PATCH /api/v1/stakeholders/{id}` — nur für `PL`/`Coreteam`/`Architect`, `403`
  für `User`, `404` für nicht existierende oder bereits soft-gelöschte Stakeholder. Änderungen
  sind ohne Freigabeprozess sofort persistiert (kein Draft-/Approval-Zustand).
- Neuer `UpdateStakeholderDetailsService`; `StakeholderResponse` um `updatedByName`/`updatedAt`
  erweitert (auch `CreateStakeholderService` aus US-021 löst den anlegenden Nutzer jetzt für
  einen konsistenten Response-Contract auf).
- Neuer `StakeholderProjectRoleAuthorizationHandler` — zweiter Handler für dieselbe
  `ProjectRoleRequirement` aus US-007, löst das Projekt über die Stakeholder-Id statt eines
  `projectId`-Routensegments auf (siehe ADR-0007). `IStakeholderRepository`-Zugriff bewusst mit
  `includeDeleted: true`, damit autorisierte Nutzer für gelöschte Stakeholder den korrekten `404`
  aus der Application-Schicht erhalten statt eines irreführenden `403`.
- Neue Angular-Komponente `EditStakeholderFormComponent` — „Bearbeiten“-Aktion je Zeile der
  session-lokalen Liste aus US-021, zeigt „Zuletzt geändert von [Name] am [Datum]“ im Kopfbereich
  (Stakeholder-Detailseite mit derselben Anzeige folgt erst mit US-026).
- Tests: `UpdateStakeholderDetailsServiceTests` (Application.Tests, 4 Fälle), dedizierter
  Story-Test `US022_StakeholderBearbeitenTests` (8 Facts/Theories über echte
  Testcontainers-PostgreSQL), `edit-stakeholder-form.component.spec.ts` (7 Fälle), 3 ergänzende
  Fälle in `create-stakeholder-form.component.spec.ts` für die Bearbeiten-Integration.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, per `PATCH`
  aktualisieren (`200`, `updatedByName`/`updatedAt` korrekt), Rolle `User` erhält `403`.

### US-021 — Stakeholder anlegen: API + Formular-UI

- Neuer Endpoint `POST /api/v1/projects/{projectId}/stakeholders` — nur für Rollen `PL`,
  `Coreteam`, `Architect` erreichbar (`RequireProjectRoleAttribute`, erster echter Einsatz seit
  US-007), `403` für Rolle `User`. `400` mit `{"error":"NAME_REQUIRED"}`/
  `{"error":"INVALID_EMAIL_FORMAT"}`/`{"error":"INVALID_TYPE"}` bei ungültigen Eingaben.
  Namensduplikat im Projekt blockiert nicht, liefert aber zusätzlich
  `similarStakeholderWarning` mit Name/ID des Treffers (F1.1 Edge Case).
- Neuer `CreateStakeholderService` (Application) sowie `IStakeholderRepository.
  FindSimilarNameInProjectAsync` (ergänzt US-020; `ExistsSimilarNameInProjectAsync` delegiert
  jetzt intern daran).
- Neue Angular-Seite `CreateStakeholderFormComponent` — ersetzt den bisherigen Platzhalter im
  Standard-Landingtab „Stakeholder-Liste“ der Projekt-Workspace-Shell (US-019). Formular mit allen
  Stammdatenfeldern, Speichern-Button bei ungültigem E-Mail-Format deaktiviert, `position`
  ausgeblendet bei `type = Organization`; neu angelegte Stakeholder erscheinen sofort in einer
  session-lokalen Liste unterhalb des Formulars (eine serverseitig geladene Liste mit
  Suche/Filter folgt erst mit US-025).
- Tests: `CreateStakeholderServiceTests` (Application.Tests, 4 Fälle), dedizierter Story-Test
  `US021_StakeholderAnlegenTests` (8 Facts/Theories über echte Testcontainers-PostgreSQL),
  ergänzend `StakeholderController_CreateTests` (5 Fälle, Response-Contract/Randfälle),
  `create-stakeholder-form.component.spec.ts` (7 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Stakeholder als PL
  anlegen (201), Namensduplikat liefert Warnung, Rolle `User` erhält 403;
  `/projects/:id/stakeholders` wird von der SPA ausgeliefert.

### US-020 — Stakeholder-Aggregate (Domain Model, Invarianten)

- `Stakeholder` (Domain-Skeleton seit US-003) um die volle Aggregate-Logik erweitert: `Create`
  (wirft `StakeholderNameRequiredError` bei leerem Namen, `InvalidEmailFormatError` bei
  ungültigem, aber gesetztem `email`), `UpdateDetails`, `SoftDelete` (idempotent — mehrfacher
  Aufruf ändert `deleted_at` nicht erneut), `Restore`, `IsDeleted`. Neue Exception
  `StakeholderNameRequiredError`.
- Neues Repository-Interface `IStakeholderRepository`
  (`FindByIdAsync`/`FindActiveByProjectAsync`/`FindDeletedByProjectAsync`/`SaveAsync`/
  `ExistsSimilarNameInProjectAsync`) mit EF-Core-Implementierung gegen die seit US-003 migrierte
  `stakeholders`-Tabelle — keine neue Migration nötig.
  `ExistsSimilarNameInProjectAsync` vergleicht case-insensitiv und bezieht bewusst
  soft-gelöschte Datensätze mit ein (PRD Abschnitt 4.3: Hinweis auf bereits gelöschten, ähnlich
  benannten Stakeholder beim Anlegen).
- Tests: `StakeholderTests` (Domain.Tests, 13 Fälle), dedizierter Story-Test
  `US020_StakeholderAggregateTests` (8 Facts, davon AC8 als Integrationstest gegen echte
  Testcontainers-PostgreSQL).
- Reine Domain-/Infrastructure-Story ohne neuen API-Endpoint oder UI — Smoke-Test beschränkt sich
  auf die Regressionsprüfung, dass `docker-compose up` weiterhin fehlerfrei startet.

### US-019 — Projekt-Workspace-Shell mit Tab-Navigation (S3)

- Neuer Endpoint `GET /api/v1/projects/{projectId}` (im bestehenden `ProjectController` aus
  US-018) liefert Projektname und eigene Rolle für Header/Rollen-Badge; `404` ohne eigene
  Mitgliedschaft (auch für Systemadmins ohne eigene Zuweisung, PRD Abschnitt 2.3).
- Neue Angular-Seite `ProjectWorkspaceLayoutComponent` (`/projects/:id`): Header mit Projektname
  und Rollen-Badge, Tab-Navigation Stakeholder-Liste (Standard-Landingtab, alle Rollen) / Map
  (ausgeblendet für `User`) / Verteiler (nur `PL`/`Coreteam`) — mit Platzhalter-Inhalten, bis die
  jeweiligen Feature-Stories (US-025/US-032/US-042) landen.
- Neue Guard-Fabrik `roleGuard(allowedRoles)` (`frontend/src/app/core/guards/role.guard.ts`):
  sperrt sowohl die Mitgliedschaftsprüfung auf `/projects/:id` selbst als auch die engeren
  Tab-Routen; leitet bei fehlender Berechtigung oder fehlender Mitgliedschaft auf eine neue
  „Kein Zugriff“-Ansicht um (`AccessDeniedComponent`).
- Tests: dedizierter Story-Test `US019_ProjektWorkspaceShellTests` (2 Fälle, echte
  Testcontainers-PostgreSQL, deckt das neue Backend-Fundament ab), `role.guard.spec.ts`
  (5 Fälle), `project-workspace-layout.component.spec.ts` (6 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Projekt anlegen,
  sich selbst mit Rolle `User` zuweisen, `GET /api/v1/projects/{id}` liefert Name/Rolle korrekt;
  `/projects/:id` wird von der SPA ausgeliefert.

### US-018 — Projektübersicht-Screen (S2)

- Neuer Endpoint `GET /api/v1/projects` (jeder angemeldete Nutzer, nicht nur Systemadmins)
  liefert ausschließlich Projekte mit eigener `ProjectMembership`, jeweils mit `role` und
  `stakeholderCount`. Implementiert als reines Read-Modell (`IProjectOverviewQuery` in
  `SlobSteak.Domain.Projects`, EF-Core-Query-Implementierung in `SlobSteak.Infrastructure`) statt
  über `IProjectRepository` — die Stakeholder-Zählung liest direkt (und ohne eigenes Repository)
  aus dem seit US-003 migrierten `Stakeholders`-DbSet (`DeletedAt == null`).
- Neue Angular-Seite `ProjectOverviewComponent` (`/projects`, geschützt durch neuen `authGuard`
  statt `adminGuard` — jede gültige Session reicht): Kartenübersicht der eigenen Projekte mit
  Rolle und Stakeholder-Anzahl; für Systemadmins zusätzlich Tab „Alle Projekte“ (fragt das
  bestehende `GET /api/v1/admin/projects` aus US-017 ab) und CTA „Neues Projekt“ (navigiert zur
  bestehenden Projektanlage `/admin/projects`); Leerzustand-Meldung ohne Projektzuweisung.
- Tests: dedizierter Story-Test `US018_ProjektuebersichtUiTests` (3 Fälle, echte
  Testcontainers-PostgreSQL), `auth.guard.spec.ts` (2 Fälle),
  `project-overview.component.spec.ts` (6 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Login,
  Passwortänderung, Projekt anlegen, sich selbst zuweisen, `GET /api/v1/projects` liefert Name,
  Rolle und Stakeholder-Anzahl; `/projects` wird korrekt von der SPA ausgeliefert.

### US-017 — Admin-Bereich UI: Projektverwaltung & Mitgliederzuweisung

- Neuer Endpoint `GET /api/v1/admin/projects` (nur `SystemAdmin`-Policy) liefert Name, Status und
  Mitgliederzahl je Projekt — ergänzt `ListProjectsService`; `IProjectRepository.FindAllAsync`
  lädt jetzt zusätzlich `Include(p => p.Memberships)`, sonst wäre `memberCount` immer `0` gewesen.
- Neuer Endpoint `GET /api/v1/admin/projects/{projectId}/memberships` liefert die Mitgliedschaften
  eines Projekts inklusive aufgelöstem Nutzernamen/E-Mail — ergänzt `ListProjectMembershipsService`
  (führt `Project.Memberships` und `IUserRepository` ausschließlich in der Application-Schicht
  zusammen, kein Cross-Aggregate-EF-Join).
- Neue Angular-Seite `ProjectsAdminComponent` (`/admin/projects`, geschützt durch `adminGuard`):
  Projektliste mit Name/Status/Mitgliederzahl, Formular „Projekt anlegen“. Ausgelagerte
  `ProjectMembershipManagerComponent` je ausgewähltem Projekt: Dropdown zur Auswahl eines noch
  nicht zugewiesenen Nutzers + Rollen-Select zum Hinzufügen, Rollen-Select je Zeile zur Änderung,
  „Entfernen“-Aktion mit Bestätigungsdialog.
- Tests: `ListProjectsServiceTests`/`ListProjectMembershipsServiceTests` (Application.Tests,
  gemockt), dedizierter Story-Test `US017_AdminUiProjektverwaltungTests` (5 Fälle, echte
  Testcontainers-PostgreSQL), `projects-admin.component.spec.ts` (4 Fälle),
  `project-membership-manager.component.spec.ts` (7 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports (5433/5001/4201, um
  die parallel laufende lokale Entwicklungsumgebung nicht zu stören) → Login, Passwortänderung,
  Projekt anlegen, Nutzer anlegen, Mitgliedschaft zuweisen/ändern/entfernen — alle Akzeptanz-
  kriterien end-to-end gegen die echten Endpunkte verifiziert; `/admin/projects` wird korrekt von
  der SPA ausgeliefert.

### Chore — Fix: `docker-compose.ghcr.yml` fehlten SEED_ADMIN_*/JWT_SIGNING_KEY

- `docker-compose.ghcr.yml` (GHCR-Image-Variante, siehe US-003-Changelog-Eintrag) erhielt nie die
  in US-005 (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) und US-006 (`JWT_SIGNING_KEY`) zu
  `docker-compose.yml` hinzugefügten Umgebungsvariablen — dadurch stürzte der `api`-Container beim
  allerersten Start (leere `users`-Tabelle) mit einer unbehandelten
  `SeedAdminConfigurationMissingException` ab. Beide Compose-Dateien sind jetzt wieder identisch
  konfiguriert (gleiche Dev-Defaults).
- Gefunden durch manuellen Nutzertest von US-016 gegen `docker-compose.ghcr.yml`.

### US-016 — Admin-Bereich UI: Nutzerverwaltung

- Neuer Endpoint `GET /api/v1/admin/users` (nur `SystemAdmin`-Policy) — Voraussetzung für die
  Nutzerliste, ergänzt `IUserRepository.FindAllAsync` und `ListUsersService`.
- Neue Angular-Seite `UsersAdminComponent` (`/admin/users`, geschützt durch neuen `adminGuard`):
  Nutzerliste, Formular „Nutzer anlegen“ (Inline-Fehler bei `409 EMAIL_ALREADY_IN_USE`),
  „Passwort zurücksetzen“-Aktion je Zeile mit Erfolgsbestätigung.
- `TokenStorageService.getClaims()` liest `isSystemAdmin` aus dem gespeicherten JWT für die
  clientseitige Sichtbarkeitssteuerung (rein UX, serverseitige `SystemAdmin`-Policy bleibt
  maßgeblich).
- Tests: `users-admin.component.spec.ts` (5 Fälle), `admin.guard.spec.ts` (3 Fälle), Backend-Tests
  für den neuen `GET`-Endpoint.
- Smoke-Test: `docker compose up --build db api frontend` → Login über den nginx-Proxy →
  `GET /api/v1/admin/users` liefert die Nutzerliste; `/admin/users` wird von der SPA ausgeliefert.

### US-015 — Admin-API: Nutzer-Projekt-Zuweisung mit Rolle

- Neue Endpunkte am `AdminProjectMembershipController`
  (`api/v1/admin/projects/{projectId}/memberships`): `POST` (Zuweisung, `201`, `409` bei
  Duplikat mit `{"error":"MEMBERSHIP_ALREADY_EXISTS"}`), `PATCH .../{userId}` (Rollenwechsel,
  `200`), `DELETE .../{userId}` (Entzug, `204`) — alle nur für Systemadmins.
- Neuer `AssignProjectMembershipService` orchestriert `Project.AssignMember`/`ChangeMemberRole`/
  `RemoveMember` (US-011).
- Tests: `AssignProjectMembershipServiceTests` (Application.Tests, gemockt), dedizierter
  Story-Test `US015_AdminNutzerZuweisungTests` (inkl. Nachweis, dass `stakeholder_assessments`
  beim Entzug einer Mitgliedschaft unverändert bleiben).
- Smoke-Test: `docker compose up --build db api` → Projekt + Nutzer anlegen → Zuweisen (`201`) →
  Rolle ändern (`200`) → Entziehen (`204`).

### US-014 — Admin-API: Projekt anlegen

- Neuer Endpoint `POST /api/v1/admin/projects` (`AdminProjectController`, nur `SystemAdmin`-Policy):
  legt über den neuen `CreateProjectService` ein Projekt mit Status `active` an.
- `400 Bad Request` bei leerem/nur-Leerzeichen-Namen (DTO-Validierung + Domain-Fallback via
  `ProjectNameRequiredError`).
- Tests: `CreateProjectServiceTests` (Application.Tests, gemockt), dedizierter Story-Test
  `US014_AdminProjektAnlegenTests`.
- Smoke-Test: `docker compose up --build db api` → Projekt anlegen (`201`, `status: "Active"`) →
  leerer Name liefert `400`.

### US-013 — Admin-API: Passwort-Reset für Nutzer

- Neuer Endpoint `POST /api/v1/admin/users/{userId}/reset-password` (`AdminUserController`, nur
  `SystemAdmin`-Policy): setzt über den neuen `ResetPasswordService` ein temporäres Passwort und
  `must_change_password = true`. `404` bei unbekannter `userId`.
- Neue Domain-Methode `User.ResetPassword(...)` — im Unterschied zu `ChangePassword` (US-004)
  erzwingt sie einen Passwortwechsel beim nächsten Login, statt ihn aufzuheben.
- Tests: `UserResetPasswordTests` (Domain.Tests), `ResetPasswordServiceTests` (Application.Tests,
  gemockt), dedizierter Story-Test `US013_AdminPasswortResetTests` (inkl. Nachweis, dass der
  betroffene Nutzer beim nächsten Login `mustChangePassword: true` erhält).
- Smoke-Test: `docker compose up --build db api` → Nutzer anlegen → Passwort zurücksetzen (`200`)
  → Login mit temporärem Passwort liefert `mustChangePassword: true` → Reset für unbekannte
  `userId` liefert `404`.

### US-012 — Admin-API: Nutzer anlegen

- Neuer Endpoint `POST /api/v1/admin/users` (`AdminUserController`, nur `SystemAdmin`-Policy):
  legt über den neuen `CreateUserService` ein Nutzerkonto an (`must_change_password = true`),
  liefert `201 Created` ohne Passwort-Hash im Response-Body.
- `409 Conflict` mit `{"error":"EMAIL_ALREADY_IN_USE"}` bei bereits vergebener E-Mail — sowohl
  proaktiv (`ExistsByEmailAsync`) als auch bei parallelem Zugriff über eine neue
  Unique-Constraint-Übersetzung in `UserRepository.SaveAsync` (analog zu `ProjectRepository`,
  ADR-0006).
- Tests: `CreateUserServiceTests` (Application.Tests, gemockt), `AdminUserControllerTests`
  (Response-Contract/Validierung) sowie dedizierter Story-Test `US012_AdminNutzerAnlegenTests`.
- Smoke-Test: `docker compose up --build db api` → Login, Passwort ändern, Nutzer anlegen (`201`),
  Duplikat-E-Mail (`409`) — alle wie erwartet.

### US-009 — Login-Screen UI (S1)

- Neuer Login-Screen (`LoginPageComponent`, standalone, reaktives Formular): E-Mail/Passwort,
  Submit deaktiviert solange eines der Felder leer ist, nicht-blockierende Fehlermeldung „E-Mail
  oder Passwort ist falsch.“ bei `401` (Passwortfeld wird geleert).
- Bei erfolgreichem Login mit `mustChangePassword` navigiert die Seite zunächst zum in US-008
  gebauten `PasswordChangeModalComponent`; danach bzw. sonst direkt zu `/projects` (Zielscreen
  folgt mit US-018).
- Neue Infrastruktur: `app.routes.ts` + `provideRouter`, `TokenStorageService` (Session-Token in
  `localStorage`), `authInterceptor` (hängt das Token an jeden Request an). `AuthService.login(...)`
  ergänzt.
- `frontend/nginx.conf`: Reverse-Proxy `/api/` → `api`-Container ergänzt, damit die relativen
  `/api/v1/...`-Aufrufe des Frontends in docker-compose tatsächlich das Backend erreichen (nicht
  von der SPA-Fallback-Route verschluckt werden).
- Tests: `login-page.component.spec.ts` (6 Fälle inkl. Erfolg, Fehlerfall, Modal-Übergabe),
  `app.spec.ts` angepasst (Router-Provider für `<router-outlet>`).
- Smoke-Test: `docker compose up --build db api frontend` → Login über
  `http://localhost:4200/api/v1/auth/login` liefert `200` (Proxy funktioniert).

### US-008 — Erzwungene Passwortänderung nach Erst-Login

- Neuer Endpoint `PATCH /api/v1/auth/password` (`AuthController`, authentifiziert): ändert das
  Passwort über den neuen Application Service `ChangePasswordService` und setzt
  `must_change_password` auf `false`.
- Neue globale `PasswordChangeRequiredMiddleware`: liefert `403` mit
  `{"error":"PASSWORD_CHANGE_REQUIRED"}` für jeden authentifizierten Request außerhalb
  `/api/v1/auth/*`, solange `must_change_password = true` — läuft nach Authentication, vor
  Authorization, unabhängig von der jeweiligen Endpoint-Policy.
- Frontend: `AuthService.changePassword(...)` und standalone `PasswordChangeModalComponent`
  (`frontend/src/app/features/auth/`), reaktives Formular mit Mindestlänge 8; `provideHttpClient()`
  in `app.config.ts` ergänzt. Vollständige Einbettung folgt mit US-009 (siehe Anmerkungen in der
  Story-Datei).
- Tests: `ChangePasswordServiceTests` (Application.Tests, gemockt), dedizierter Story-Test
  `US008_PasswortAenderungErzwingenTests` (Api.Tests, gegen echte Testcontainers-PostgreSQL-
  Instanz) sowie `password-change-modal.component.spec.ts` (Karma/Jasmine).
- Smoke-Test: `docker compose up --build db api` → Login (`mustChangePassword:true`) → `GET
  /api/v1/health` mit Token liefert `403 PASSWORD_CHANGE_REQUIRED` → `PATCH .../password` liefert
  `200` → derselbe Health-Request liefert danach wieder `200`.

### US-007 — Rollenbasierte Authorization-Middleware

- JWT-Bearer-Authentication registriert (`AddAuthentication().AddJwtBearer(...)`, `MapInboundClaims
  = false`); Requests ohne gültiges Token liefern jetzt `401 Unauthorized`, bevor Authorization
  greift.
- Zwei Policies: `AuthorizationPolicies.SystemAdmin` (`SystemAdminRequirement`/
  `SystemAdminAuthorizationHandler`, prüft Claim `isSystemAdmin`) und die pro Action
  parametrisierte `ProjectRole`-Policy (`ProjectRoleRequirement`/`ProjectRoleAuthorizationHandler`,
  prüft `ProjectMembership.Role` — frisch aus der DB geladen, nicht aus dem Token, daher wirkt ein
  Rollenwechsel ohne Re-Login sofort). Deklaratives Binden über das neue
  `[RequireProjectRole(params ProjectRole[])]`-Attribut (`IAuthorizationRequirementData`, .NET 8).
- Neue framework-freie Regel-Engine `ProjectRolePolicy` (Application-Schicht).
- `JsonAuthorizationMiddlewareResultHandler`: formt 403-Antworten auf `{"error":"FORBIDDEN"}` um.
- Tests: `ProjectRolePolicyTests` (Application.Tests), `ProjectRoleAuthorizationHandlerTests`,
  `SystemAdminAuthorizationHandlerTests`, `RequireProjectRoleAttributeTests` (Api.Tests/
  Authorization) sowie dedizierter Story-Test `US007_AuthorizationMiddlewareTests` (eigenständiger
  `TestServer` mit zwei Test-Endpunkten, verifiziert 401/403 inkl. Body end-to-end über HTTP).
- `JwtSettings` (Api/Auth) fasst Issuer/Audience/Claim-Namen/Signierschlüssel-Konfigurationsschlüssel
  zusammen — von Token-Ausstellung (US-006) und -Validierung gemeinsam genutzt.

### US-011 — ProjectMembership-Entity mit Rollen-Invariante

- `Project` um Mitgliederverwaltung erweitert: `AssignMember(userId, role)`,
  `ChangeMemberRole(userId, newRole)`, `RemoveMember(userId)` sowie die neue Navigation
  `Project.Memberships` (Intra-Aggregate-EF-Navigation, siehe Anmerkungen in der Story-Datei).
- Neue domänenspezifische Exceptions `MembershipAlreadyExistsError`, `MembershipNotFoundError`.
- `ProjectMembershipConfiguration`: `OnDelete(DeleteBehavior.ClientCascade)` für die
  Project-Beziehung (statt `Restrict`) — Details und Begründung in `docs/adr/0006-*.md`.
- `ProjectRepository`: `FindByIdAsync` lädt jetzt inkl. `Memberships`; `SaveAsync` reconciled neue/
  entfernte Mitgliedschaften explizit (EF-Core-Workaround für client-generierte Guid-Schlüssel,
  siehe ADR-0006) und übersetzt eine Unique-Constraint-Verletzung bei parallelem Zugriff in
  `MembershipAlreadyExistsError`.
- Tests: `ProjectMembershipTests` (Domain.Tests) sowie dedizierter Story-Test
  `US011_ProjectMembershipTests` (Api.Tests, inkl. Integrationstests für Rollenwechsel,
  Unberührtheit von `stakeholder_assessments` bei Removal, und Unique-Constraint-Konflikt bei
  parallelem Insert über zwei unabhängige `DbContext`-Instanzen).
- Keine neue Migration nötig — die Navigation ist eine reine EF-seitige Mapping-Änderung, das
  Datenbankschema (inkl. `ON DELETE`-Klausel) bleibt unverändert.

### US-010 — Project-Aggregate (Domain Model)

- `Project`-Aggregate (`SlobSteak.Domain.Projects`) um DDD-Reichhaltigkeit erweitert:
  `Create(name, description)` (Status `Active`), `Archive()`, `Reactivate()`.
- Neue domänenspezifische Exception `ProjectNameRequiredError`.
- Repository-Interface `IProjectRepository` (`FindByIdAsync`, `SaveAsync`, `FindAllAsync`,
  `FindByMemberUserIdAsync`) in der Domain definiert; EF-Core-Implementierung `ProjectRepository`
  in `SlobSteak.Infrastructure/Persistence/Projects/`, per DI registriert.
- Tests: `ProjectTests` (Domain.Tests) sowie dedizierter Story-Test
  `US010_ProjectAggregateTests` (Api.Tests, inkl. Integrationstest gegen echte
  Testcontainers-PostgreSQL-Instanz für das Repository).
- Reihenfolge-Anmerkung: vorgezogen gegenüber der Phase-1-Story US-007, die transitiv von
  US-010/US-011 abhängt — Details in der Story-Datei unter „Anmerkungen des Dev-Agenten“.
- Keine Schemaänderung/neue Migration nötig — `projects`-Tabelle existiert bereits seit US-003.

### US-006 — Login-API mit Session/Token-Ausstellung

- Neuer Endpoint `POST /api/v1/auth/login` (`AuthController`): prüft E-Mail/Passwort über den
  neuen Application Service `LoginService` und stellt bei Erfolg ein JWT (HMAC-SHA256, Claims
  `sub`/`isSystemAdmin`, 8 Stunden gültig) aus. Wire-Contract camelCase: `{"token": "...",
  "mustChangePassword": true}`.
- Falsches Passwort oder unbekannte E-Mail liefern identisch `401 Unauthorized` mit
  `{"error":"INVALID_CREDENTIALS"}` (kein Hinweis, ob die E-Mail existiert); fehlende Pflichtfelder
  liefern `400 Bad Request` (Validierung über `LoginRequest`-DTO mit Data Annotations).
- Neuer Port `IJwtTokenGenerator` (`SlobSteak.Application.Identity`), Implementierung
  `JwtTokenGenerator` in der Composition Root `SlobSteak.Api` (`System.IdentityModel.Tokens.Jwt`) —
  Begründung für JWT statt serverseitiger Session in `docs/adr/0005-*.md`.
- `docker-compose.yml`: `JWT_SIGNING_KEY` mit Dev-Default ergänzt; Login-Endpoint per manuellem
  Smoke-Test verifiziert (`curl` gegen `docker compose up --build db api`).
- Tests: `LoginServiceTests` (Application.Tests, gemockt), `AuthControllerTests` (Api.Tests,
  Token-Claims/JSON-Casing) sowie dedizierter Story-Test `US006_LoginApiTests`.
- `src/SlobSteak.Api/SlobSteak.Api.http` von der `dotnet new webapi`-Platzhalterdatei auf reale
  Health-Check-/Login-Beispiele aktualisiert.

### US-005 — Seed-Admin-Bootstrap beim Erststart

- Neuer Application Service `SeedAdminService` (`SlobSteak.Application.Identity`): legt beim
  Hoststart ein initiales System-Administrator-Konto aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
  an, sofern die `users`-Tabelle noch leer ist; überspringt den Vorgang fehlerfrei, sobald
  mindestens ein Nutzer existiert; bricht mit `SeedAdminConfigurationMissingException` (klar
  geloggt) ab, wenn beide Variablen bei leerer Tabelle fehlen.
- Startup-Hook `SeedAdminHostedService` (`SlobSteak.Api.Bootstrap`, `IHostedService`) ruft den
  Service beim echten Hoststart auf — registriert für Development/Production, bewusst nicht in der
  Testing-Hosting-Umgebung (siehe Anmerkungen in der Story-Datei).
- `User`-Aggregate um `CreateSystemAdmin(...)` erweitert (setzt `IsSystemAdmin = true`, analog zu
  `Create`); `IUserRepository` um `AnyAsync()` erweitert.
- `docker-compose.yml`: `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` mit Dev-Defaults ergänzt; per
  manuellem Smoke-Test verifiziert (Erststart erzeugt Admin, Neustart überspringt fehlerfrei).
- Tests: `SeedAdminServiceTests` (Application.Tests, gemocktes Repository) sowie dedizierter
  Story-Test `US005_SeedAdminTests` (Api.Tests, je Akzeptanzkriterium eine eigene, isolierte
  Testcontainers-PostgreSQL-Instanz).

### US-004 — User-Aggregate (Domain Model)

- `User`-Aggregate (`SlobSteak.Domain.Identity`) um DDD-Reichhaltigkeit erweitert: statische
  Factory-Methode `Create(name, email, plainPassword)` (gehashtes Passwort, `MustChangePassword =
  true`, `IsSystemAdmin = false`), `ChangePassword(newPlainPassword)`, `VerifyPassword(plainPassword)`.
- Neue domänenspezifische Exception `PasswordTooShortError` (Mindestlänge 8 Zeichen), Wiederverwendung
  von `InvalidEmailFormatError` aus US-002 für die E-Mail-Validierung in `Create`.
- Passwort-Hashing über PBKDF2-HMACSHA256 (.NET-BCL, keine neue NuGet-Abhängigkeit) in der intern
  gekapselten Hilfsklasse `PasswordHasher` — siehe `docs/adr/0004-passwort-hashing-pbkdf2.md` für die
  Begründung der Algorithmuswahl.
- Repository-Interface `IUserRepository` (`FindByIdAsync`, `FindByEmailAsync`, `SaveAsync`,
  `ExistsByEmailAsync`) in der Domain definiert; EF-Core-Implementierung `UserRepository` in
  `SlobSteak.Infrastructure/Persistence/Identity/` gegen die `users`-Tabelle, per DI registriert.
- Unit-Tests (`tests/SlobSteak.Domain.Tests/Identity/UserTests.cs`) sowie dedizierter Story-Test
  (`tests/SlobSteak.Api.Tests/UserStories/US004_UserAggregateTests.cs`, ein Fact je Akzeptanzkriterium,
  inkl. Integrationstest des Repositorys gegen eine echte Testcontainers-PostgreSQL-Instanz) ergänzt.
- Keine Schemaänderung/neue Migration nötig — `users`-Tabelle und `password_hash`-Spalte existieren
  bereits seit US-003.

### Chore — CI/CD: GitHub Auto-Merge für Story-PRs (ADR-0003)

- `main` erhält eine Branch-Protection-Regel mit den sechs `pr-checks.yml`-Jobs als Required
  Status Checks (strict) sowie `enforce_admins`, `allow_force_pushes: false`,
  `allow_deletions: false` — Voraussetzung dafür, dass Auto-Merge tatsächlich auf grüne CI wartet.
- CLAUDE.md Abschnitt 3.5 ergänzt eine verbindliche Auto-Merge-Regel: Story-PRs werden mit
  aktiviertem GitHub-Auto-Merge (Squash) erstellt und mergen automatisch, sobald alle sechs
  Required Status Checks grün sind — die bisherige „Merge erfolgt nicht automatisch“-Klausel
  entfällt; die DoD-Checkliste (Abschnitt 3.3) markiert die Story bereits mit PR-Eröffnung als
  abgeschlossen.
- README.md „PR-Checks / Required Status Checks“ aktualisiert: Branch-Protection ist jetzt
  tatsächlich konfiguriert, nicht mehr nur empfohlen.
- Siehe `docs/adr/0003-github-auto-merge-fuer-story-prs.md` für Kontext, Entscheidung und
  bewusst in Kauf genommenen Trade-off (kein menschliches Review mehr als Merge-Voraussetzung).

### Chore — CI: automatische Pull-Request-Prüfpipeline

- Neuer GitHub-Actions-Workflow `.github/workflows/pr-checks.yml`: läuft bei jedem Pull Request
  auf `main`/`master` und bildet den aktuellen Technologiestack als sechs eigenständige,
  klar benannte Jobs ab — `Backend: Build (Release)`, `Backend: Tests (dotnet test)`,
  `Backend: Code-Format (dotnet format)`, `Frontend: Build`, `Frontend: Lint (ng lint)`,
  `Frontend: Tests (ng test)` — geeignet als „Required Status Checks“ in den Branch-Protection-
  Regeln.
- Backend-Jobs: .NET 8 SDK, `dotnet restore`/`build --configuration Release`, `dotnet test`
  gegen die gesamte Solution (inkl. Testcontainers-PostgreSQL-Integrationstests) mit
  TRX-Testreport (`dorny/test-reporter`) und Artefakt-Upload, `dotnet format --verify-no-changes`.
- Frontend-Jobs: Node 22, `npm ci`, `ng build`, `ng lint` (ESLint/angular-eslint),
  `ng test --watch=false --browsers=ChromeHeadlessCI` (Karma/Jasmine) mit Coverage-Artefakt.
- Erweiterungsregel in `CLAUDE.md` (Abschnitt 3.3, Definition of Done) verankert: Neue
  Testarten/Komponenten (weitere Testprojekte, E2E/Playwright/Selenium, Migrationen) müssen im
  selben PR, der sie einführt, in `pr-checks.yml` mitberücksichtigt werden.

### US-003 — Datenbankschema & Migrationen für alle Aggregate

- Minimale Domain-Entity-Skeletons für alle sieben Aggregate/Entities angelegt (`User`, `Project`
  + `ProjectStatus`, `ProjectMembership`, `Stakeholder`, `StakeholderCommunicationAssignment`,
  `StakeholderAssessment`, `CommunicationType`), an den Pfaden, die die späteren Aggregate-Stories
  (US-004/010/011/020/027/037/039) erweitern werden — Details siehe `docs/adr/0001-*.md`.
- `SlobSteakDbContext` (EF Core, PostgreSQL via Npgsql) mit `DbSet`s für alle sieben Aggregate
  sowie sieben `IEntityTypeConfiguration<T>`-Klassen (Fluent API, keine Data Annotations) unter
  `src/SlobSteak.Infrastructure/Persistence/Configurations/`.
- Snake-case-Tabellen-/Spaltennamen über `EFCore.NamingConventions`
  (`UseSnakeCaseNamingConvention()`), Wiederverwendung der Value Objects `Email`/`Score` aus
  US-002 via `HasConversion`.
- Drei zentrale Unique-Indizes gemäß PRD Abschnitt 4.3: `project_memberships`
  (`project_id`,`user_id`), `stakeholder_assessments` (`stakeholder_id`,`role`),
  `stakeholder_communication_assignments` (`stakeholder_id`,`communication_type_id`) — plus
  `users.email` und `communication_types.name`.
- `StakeholderAssessment.Version` als explizites Optimistic-Concurrency-Feld (siehe
  `docs/adr/0002-*.md`), als EF-Concurrency-Token konfiguriert.
- Initiale Migration `InitialCreate` erzeugt; manuell gegen echte PostgreSQL verifiziert
  (`dotnet ef database update` und vollständiger Rollback `dotnet ef database update 0`).
- `Program.cs` wendet ausstehende Migrationen im Development-Environment beim Start automatisch an
  (`dbContext.Database.Migrate()`); per `docker compose up --build db api` + Health-Check-Smoke-Test
  verifiziert.
- Integrationstests gegen eine echte Testcontainers-PostgreSQL-Instanz: `SchemaConstraintsTests`
  (3 Unique-Constraint-Verletzungen → `DbUpdateException`) und dedizierter Story-Test
  `tests/SlobSteak.Api.Tests/UserStories/US003_DatenbankschemaTests.cs` (ein Fact je
  Akzeptanzkriterium). Gemeinsame Test-Factory `SlobSteakApiFactory` (Hosting-Umgebung
  `"Testing"`) eingeführt, um den neuen automatischen Migrations-Aufruf nicht ungewollt in
  DB-losen Tests (z. B. dem bestehenden Health-Check-Test aus US-001) auszulösen.

### Chore — Docker-Compose-Variante für GHCR-Images

- Neue `docker-compose.ghcr.yml` ergänzt: startet `api`/`frontend` aus den zuletzt bei einem
  gemergten Pull Request auf `main` veröffentlichten `ghcr.io`-Images (`:latest`) statt aus
  lokalem Quellcode zu bauen, damit der aktuelle `main`-Stand jederzeit ohne Build getestet werden
  kann (`docker compose -f docker-compose.ghcr.yml up --pull always`). Das bestehende
  `docker-compose.yml` (lokaler Build) bleibt unverändert Grundlage der aktiven Storyentwicklung.

### US-002 — Zentrale Value Objects (Email, Rolle, Score, Enums)

- Value Object `Email` (`SlobSteak.Domain.Shared.ValueObjects`) mit Formatvalidierung; ungültige
  Werte werfen die neue domänenspezifische Exception `InvalidEmailFormatError`.
- Value Object `Score` (`readonly record struct`, Bereich 0–100 inklusive); Werte außerhalb des
  Bereichs werfen die neue domänenspezifische Exception `InvalidScoreRangeError`.
- Gemeinsame abstrakte Basisklasse `DomainException` für alle fachlichen Domain-Exceptions
  (`SlobSteak.Domain.Shared.Exceptions`) als Grundlage für eine spätere zentrale
  Exception-Middleware.
- Enums `ProjectRole` (PL, Coreteam, Architect, User — bewusst ohne `Admin`), `StakeholderType`,
  `CommunicationFrequency`, `CommunicationChannel` unter `SlobSteak.Domain.Shared.Enums`.
- Unit-Tests (`EmailTests`, `ScoreTests`, `EnumsTests`) und dedizierter Story-Test
  (`tests/SlobSteak.Domain.Tests/UserStories/US002_ValueObjectsTests.cs`, ein Fact/Theory je
  Akzeptanzkriterium) ergänzt.

### US-001 — Projekt-Grundgerüst & Architektur-Setup

- .NET-Solution `SlobSteak.sln` mit DDD-Schichtenarchitektur angelegt: `SlobSteak.Domain`,
  `SlobSteak.Application`, `SlobSteak.Infrastructure`, `SlobSteak.Api` sowie die zugehörigen
  xUnit-Testprojekte `SlobSteak.Domain.Tests`, `SlobSteak.Application.Tests`,
  `SlobSteak.Api.Tests`, mit Projektreferenzen gemäß Dependency Rule (Domain → nichts,
  Application → Domain, Infrastructure → Domain, Api → Application + Infrastructure).
- Health-Check-Endpoint `GET /api/v1/health` (ASP.NET Core Health Checks Middleware, JSON-Antwort
  `{"status":"ok"}`) implementiert und per Integrationstest (`HealthCheckTests`) abgesichert.
- Angular-Standalone-Workspace `frontend/` erzeugt, inkl. Platzhalterseite, Jasmine/Karma-Testsetup
  (`@angular/build:karma`) und `angular-eslint`.
- `docker-compose.yml` mit Services `api`, `frontend`, `db` (PostgreSQL 16) sowie Multi-Stage-
  `Dockerfile`s für `api` (.NET SDK/ASP.NET-Runtime) und `frontend` (Node-Build + nginx) ergänzt.
- GitHub-Actions-Workflow `.github/workflows/docker-publish.yml` für den Build und Publish beider
  Images nach GitHub Container Registry bei gemergten Pull Requests auf `main` angelegt.
- `README.md` mit lokaler Setup-/Start-Anleitung für Backend, Frontend und Docker Compose ergänzt.
