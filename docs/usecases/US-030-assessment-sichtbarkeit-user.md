**ID:** US-030
**Titel:** Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten)
**Bounded Context / Domain:** StakeholderAssessment
**Abhängigkeiten:** US-028, US-029

---

### 1. User Story

Als **Nutzer mit Rolle User** möchte ich **Stakeholder-Stammdaten einsehen können, aber keinerlei Zugriff auf Assessment-Daten haben — weder sichtbar noch über die API abrufbar**, damit **sensible Bewertungsdaten nicht an Rollen ausgeliefert werden, für die sie nicht bestimmt sind**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F2.3
- **Relevant für DDD:** Application-Schicht Policy-Erweiterung auf `AssessmentController` (StakeholderAssessment Context)

### 3. Akzeptanzkriterien

- [x] `GET /api/v1/stakeholders/{id}/assessments` liefert für Nutzer mit `project_membership.role = User` `403 Forbidden`, nicht etwa eine leere oder maskierte Liste.
- [x] Integrationstest ruft den Endpoint direkt (unter Umgehung der UI) mit einem User-Rolle-Token auf und verifiziert `403` sowie das Fehlen jeglicher Assessment-Felder im Response-Body.
- [x] Auf der Stakeholder-Detailseite sind für Rolle `User` die Assessment-Tabs vollständig aus dem DOM entfernt (nicht nur per CSS versteckt) — Komponententest (Angular `TestBed`) prüft, dass `fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))` `null` liefert, z. B. über ein `*ngIf` auf Basis der vom Backend gelieferten Rolle, nicht über eine reine CSS-Klasse.
- [ ] Die Map-Navigation (US-032) und der Map-Query-Endpoint (US-031) sind für Rolle `User` ebenfalls serverseitig gesperrt (Cross-Check-Test, da Map auf denselben Assessment-Daten basiert). **Teilweise erfüllt:** die Frontend-Navigationssperre existiert bereits (`roleGuard(['PL','Coreteam','Architect'])` auf der Map-Route, seit US-019/US-026) und ist seit diesem QA-Durchgang zusätzlich durch einen dedizierten Regressionstest abgesichert (`frontend/src/app/app.routes.spec.ts`). Die serverseitige Sperre des Map-**Query-Endpoints** kann nicht getestet oder gebaut werden, weil dieser Endpoint (US-031) noch nicht existiert — siehe „Anmerkungen des Dev-Agenten (Backend)" unten für Begründung und Nachtrags-Plan. Dieser Teilaspekt bleibt bis zum Abschluss von US-031 offen und blockiert den Abschluss dieser Story nicht (Präzedenzfall US-023, CLAUDE.md Abschnitt 6).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Api/Controllers/AssessmentController.cs` (Policy-Erweiterung)
- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts` (bedingtes Rendering)
- Integrationstest `tests/SlobSteak.Api.Tests/Assessments/AssessmentController_UserRoleTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nutzer mit `project_memberships.role = User` dürfen `stakeholder_assessments` über die API nicht lesen — dies ist eine Feldsichtbarkeits-Regel, keine UI-Deaktivierung (Abschnitt 4.3 Punkt 4, F2.3).

### Anmerkungen des Dev-Agenten (Backend)

- Akzeptanzkriterium 4 fordert zusätzlich einen Cross-Check, dass die Map-Navigation (US-032) und
  der Map-Query-Endpoint (US-031) für Rolle `User` ebenfalls serverseitig gesperrt sind. Beide
  Stories sind laut `docs/usecases/BACKLOG.md` noch nicht umgesetzt — es existiert schlicht noch
  kein Map-Query-Endpoint, den man testen oder sperren könnte. Ihn jetzt vorwegzunehmen wäre ein
  Vorgriff auf eine noch nicht begonnene Story (CLAUDE.md Abschnitt 3, „Doing"). Präzedenzfall:
  US-023 hat den analogen Fall (Verweis auf US-031/US-041) identisch gehandhabt. Empfehlung: die
  serverseitige Sperre für Rolle `User` wird als Nachtrag direkt in US-031 mitgebaut (dort entsteht
  der Endpoint erstmals), inkl. eigenem Story-Test-Fall für diesen Cross-Check — nicht rückwirkend
  in US-030 nachgezogen.
- Backend-Umsetzung: `GET /api/v1/stakeholders/{id}/assessments` nutzt weiterhin die bestehende
  deklarative `[RequireProjectRole(...)]`-Infrastruktur aus US-007/US-022 (ADR-0007) — `ProjectRole.User`
  wurde schlicht aus der Liste der für diese Action erlaubten Rollen entfernt. Keine neue
  Authorization-Infrastruktur nötig; das ist die am wenigsten überraschende, mit dem bestehenden
  Code konsistenteste Lösung (der `StakeholderProjectRoleAuthorizationHandler` löst das Projekt
  weiterhin über die Stakeholder-Id auf und liefert bei fehlender erlaubter Rolle automatisch
  `403 {"error":"FORBIDDEN"}` ohne jegliche Assessment-Felder im Body, siehe
  `JsonAuthorizationMiddlewareResultHandler`).
- Akzeptanzkriterium 3 (Angular-Komponententest, Assessment-Tabs vollständig aus dem DOM entfernt)
  ist Frontend-Scope und liegt nicht im Backend-Story-Test.

### Anmerkungen des Dev-Agenten (Frontend)

- Akzeptanzkriterium 4, Frontend-Anteil (Map-**Navigation**, nicht der Map-Query-Endpoint): bereits
  seit US-019/US-026 über `roleGuard(['PL', 'Coreteam', 'Architect'])` auf der Map-Route in
  `frontend/src/app/app.routes.ts` gesperrt — Rolle `User` wird bei einem direkten Navigationsversuch
  auf `access-denied` umgeleitet. Hier bewusst nicht erneut geändert, da bereits korrekt umgesetzt.

### Anmerkungen des QA-Agenten

- Beide Story-Tests entsprechen der Konvention aus `.claude/agents/qa.md` Abschnitt 1 unverändert:
  Backend unter `tests/SlobSteak.Api.Tests/UserStories/US030_AssessmentSichtbarkeitUserTests.cs`
  (Integrationstest über `WebApplicationFactory<Program>`, je Akzeptanzkriterium ein `[Fact]`, in
  Dokumentreihenfolge), Frontend unter
  `frontend/src/app/features/stakeholders/us-030-assessment-sichtbarkeit-user.spec.ts`. Zusammen
  decken beide alle vier Akzeptanzkriterien ohne Lücke oder Doppelung ab — keine Korrektur nötig.
- Für Akzeptanzkriterium 4 fehlte bislang ein automatisierter Regressionstest, der die tatsächliche
  Routenkonfiguration (nicht nur die generische `roleGuard`-Funktion) gegen versehentliches
  Entfernen der Map-Sperre absichert. Ergänzt: `frontend/src/app/app.routes.spec.ts` (2 Testfälle:
  Rolle `User` wird auf `access-denied` umgeleitet, Rolle `PL` kommt durch) — kein Ersatz für den
  weiterhin offenen Backend-Punkt (Map-Query-Endpoint aus US-031 existiert noch nicht).
- Vollständige Regressionssuite grün: `dotnet build`/`dotnet test SlobSteak.sln` (Domain.Tests 93,
  Application.Tests 68, Api.Tests 162 — 323 Tests gesamt) sowie `dotnet format SlobSteak.sln
  --verify-no-changes` ohne Änderungen; `ng test --watch=false` (177/177) sowie `ng lint` ohne
  Fehler. `SlobSteak.Domain`-Testabdeckung (Line-Rate, `coverlet`/Cobertura): 84,95 % (Richtwert
  80 % laut `.claude/agents/backend.md` erfüllt).
- Lokale Verifizierbarkeit: reproduzierbarer `docker-compose up`-Start in einem isolierten Stack
  (`-p us030-smoke`, eigene Host-Ports 5100/4300/5533, danach vollständig abgebaut inkl. Volumes/
  Images) end-to-end gegen echte Container geprüft — Admin-Login, Anlage eines Testnutzers mit Rolle
  `User` sowie eines PL-Mitglieds und eines Stakeholders über die bestehenden Admin-/Projekt-APIs,
  danach `GET /api/v1/stakeholders/{id}/assessments`: mit PL-Token `200` inkl. Assessment-Daten, mit
  User-Token `403 {"error":"FORBIDDEN"}` ohne jegliche Assessment-Felder — deckungsgleich mit
  Akzeptanzkriterium 1/2 und dem Story-Test. Der bereits laufende Entwickler-Stack des
  Projektverantwortlichen auf den Standardports wurde dabei nicht angefasst.
- **So probierst du es manuell aus (Reviewer-Anleitung):** `docker-compose up` starten, als
  Systemadmin einloggen (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`), Passwort ändern (Pflicht beim
  ersten Login), unter „Admin → Nutzer" einen Nutzer sowie unter „Admin → Projekte" ein Projekt
  anlegen, den Nutzer dem Projekt mit Rolle `User` zuweisen, einen Stakeholder im Projekt anlegen.
  Danach: (a) als der `User`-Nutzer einloggen und die Stakeholder-Detailseite öffnen — der
  Assessment-Bereich (Überschrift + Tabs) fehlt vollständig, nicht nur ausgegraut; (b) mit demselben
  Token direkt `GET /api/v1/stakeholders/{id}/assessments` aufrufen (z. B. per `curl` oder Browser-
  DevTools) — Antwort ist `403 {"error":"FORBIDDEN"}`, keine Assessment-Felder im Body. Zum
  Vergleich: derselbe Aufruf mit einem `PL`/`Coreteam`/`Architect`-Token liefert weiterhin `200` mit
  den Assessment-Daten.
- Explorativer Test (qa.md Abschnitt 4): direkter Aufruf des Endpoints ohne jeglichen Token liefert
  weiterhin `401` (bestehendes Verhalten, unverändert durch diese Story); ein abgelaufener/ungültiger
  Token liefert ebenfalls `401` vor der `403`-Rollenprüfung — beides bereits durch die bestehende
  Auth-Middleware/Story-Tests aus US-006/US-007/US-044 abgedeckt, keine Auffälligkeit gefunden.
- Kein neues Test-Projekt, keine E2E-Tests, keine EF-Core-Migration, keine neue Lint-Regel in dieser
  Story — `.github/workflows/pr-checks.yml` unverändert, die sechs Required Status Checks bleiben
  wie sie sind.
- Kein ADR nötig: reine Wiederverwendung der bestehenden `[RequireProjectRole(...)]`- und
  `roleGuard`-Infrastruktur, keine neue Architekturentscheidung mit Tragweite.

### Status

Fertig am 24.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-030-assessment-sichtbarkeit-user`), PR
[#45](https://github.com/Inso666/SlobSteak/pull/45), Auto-Merge gemäß ADR-0003 aktiviert.
