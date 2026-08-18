**ID:** US-001
**Titel:** Projekt-Grundgerüst & Architektur-Setup
**Bounded Context / Domain:** Shared Kernel / Infrastructure
**Abhängigkeiten:** Keine

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **ein lauffähiges Grundgerüst für Backend, Frontend und Persistenzschicht gemäß DDD-Schichtenarchitektur (Domain, Application, Infrastructure, Interface/API, Frontend) anlegen**, damit **alle nachfolgenden Stories auf einer konsistenten, testbaren Architektur aufsetzen können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 1.5 (Technologie-Rahmenbedingungen), Abschnitt 6 (UI-Architektur, Grundstruktur)
- **Relevant für DDD:** Shared Kernel, Schichtenarchitektur (Domain / Application / Infrastructure / Interface)

### 3. Akzeptanzkriterien

- [x] Repository enthält eine .NET-Solution `SlobSteak.sln` mit klar getrennten Projekten je Schicht: `src/SlobSteak.Domain` (Class Library, keine Paketabhängigkeiten außerhalb BCL), `src/SlobSteak.Application` (Class Library), `src/SlobSteak.Infrastructure` (Class Library, EF Core), `src/SlobSteak.Api` (ASP.NET Core Web API) sowie `tests/SlobSteak.Domain.Tests`, `tests/SlobSteak.Application.Tests`, `tests/SlobSteak.Api.Tests` (xUnit).
- [x] Projektreferenzen erzwingen die Schichtenrichtung: `SlobSteak.Domain` referenziert kein anderes Projekt; `SlobSteak.Application` referenziert nur `SlobSteak.Domain`; `SlobSteak.Infrastructure` referenziert `SlobSteak.Domain`; `SlobSteak.Api` referenziert `SlobSteak.Application` und `SlobSteak.Infrastructure` (Composition Root für Dependency Injection).
- [x] `SlobSteak.Api` startet lokal über `dotnet run --project src/SlobSteak.Api` und stellt einen Health-Check-Endpoint `GET /api/v1/health` bereit, der `200 OK` mit `{"status":"ok"}` liefert (ASP.NET Core Health Checks Middleware).
- [x] Ein eigenständiges Angular-Workspace `frontend/` (erzeugt via Angular CLI, `ng new --standalone`) startet lokal über `ng serve` und rendert eine leere Platzhalterseite ohne Konsolenfehler.
- [x] Ein `docker-compose.yml` startet drei Container — `api` (ASP.NET Core, Multi-Stage-`Dockerfile` mit `mcr.microsoft.com/dotnet/sdk` zum Bauen und `mcr.microsoft.com/dotnet/aspnet` zur Laufzeit), `frontend` (Node-Build, ausgeliefert über `nginx`) und `db` (offizielles `postgres`-Image) — ohne Abhängigkeit zu externen Cloud-Diensten (erfüllt Abschnitt 1.5).
- [x] xUnit ist in `tests/SlobSteak.Domain.Tests` konfiguriert; ein Beispieltest läuft erfolgreich über `dotnet test`. Für Angular ist das Standard-Test-Setup (Jasmine/Karma über Angular CLI) konfiguriert; ein Beispieltest läuft über `ng test`.
- [x] Eine GitHub-Actions-Workflow-Datei `.github/workflows/docker-publish.yml` baut bei jedem gemergten Pull Request auf `main` sowohl `src/SlobSteak.Api/Dockerfile` als auch `frontend/Dockerfile` und veröffentlicht beide Images in der GitHub Container Registry (`ghcr.io/<owner>/<repo>-api` und `ghcr.io/<owner>/<repo>-frontend`), jeweils getaggt mit `latest` sowie dem Short-SHA des Merge-Commits.

**Status:** fertig am 18.08.2026, Branch `feature/US-001-projekt-setup`, PR siehe Verlinkung in `BACKLOG.md`.

### 5. Anmerkungen des Dev-Agenten

- **Angular-Testrunner (Abschnitt 4 Eskalation):** `ng new` erzeugt in der installierten Angular-CLI-Version (22.x) standardmäßig den experimentellen Vitest-basierten `unit-test`-Builder statt Jasmine/Karma; der klassische `@angular-devkit/build-angular:karma`-Builder gilt zudem als deprecated (Ablösung durch Angular selbst). Da `CLAUDE.md` Jasmine/Karma über Angular CLI verbindlich vorschreibt, wurde das Test-Target in `frontend/angular.json` explizit auf den nicht-deprecated, esbuild-basierten `@angular/build:karma`-Builder mit Jasmine/Karma (`frontend/karma.conf.js`) umkonfiguriert. Dies ist die PRD-/CLAUDE.md-konformste verfügbare Option, keine stille Abweichung.
- **Node.js-Version für Docker-Build:** Angular 22 benötigt Node.js ≥ 22.22.3/24.15/26; `frontend/Dockerfile` nutzt daher `node:22-alpine` als Build-Stage (nicht `node:20-alpine`).
- **ESLint/Prettier:** Da im PRD/CLAUDE.md „ng lint/ESLint+Prettier“ gefordert wird, aber `ng new` keinen Linter mehr vorkonfiguriert, wurde `angular-eslint` per `ng add angular-eslint` ergänzt (`frontend/eslint.config.js`, `lint`-Target in `angular.json`); Prettier war bereits über `.prettierrc` vorkonfiguriert.
- **PR-Erstellung:** In dieser Agenten-Umgebung ist weder die GitHub-CLI (`gh`) noch ein `GITHUB_TOKEN` verfügbar. Der Feature-Branch wurde gepusht; die Eröffnung des Pull Request auf GitHub.com muss manuell bzw. über die von GitHub bereitgestellte Compare-URL erfolgen. Der Publish-Workflow konnte dementsprechend nicht end-to-end gegen einen echten Merge auf `main` verifiziert werden; Workflow-Syntax und -Logik wurden manuell geprüft.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `SlobSteak.sln`
- `src/SlobSteak.Domain/SlobSteak.Domain.csproj`
- `src/SlobSteak.Application/SlobSteak.Application.csproj`
- `src/SlobSteak.Infrastructure/SlobSteak.Infrastructure.csproj`
- `src/SlobSteak.Api/SlobSteak.Api.csproj`, `src/SlobSteak.Api/Program.cs`
- `tests/SlobSteak.Domain.Tests/SlobSteak.Domain.Tests.csproj`, `tests/SlobSteak.Application.Tests/`, `tests/SlobSteak.Api.Tests/`
- `frontend/` (Angular-CLI-Workspace, `angular.json`, `frontend/src/app/`)
- `docker-compose.yml`, `src/SlobSteak.Api/Dockerfile`, `frontend/Dockerfile`
- `README.md` mit Setup-/Start-Anleitung
- `.github/workflows/docker-publish.yml`

**Wichtige Invarianten & Validierungsregeln:**

- Die Domain-Schicht (`SlobSteak.Domain`) darf keine NuGet-Paketreferenz und keine Projektreferenz zu Infrastructure oder Api besitzen (Dependency Rule von innen nach außen).
- Keine Cloud-Pflichtabhängigkeit — `api`, `frontend` und `db` müssen vollständig per `docker-compose up` lokal betreibbar sein.
- Der Publish-Workflow löst ausschließlich auf einem tatsächlich gemergten Pull Request auf `main` aus (`pull_request` mit `types: [closed]` und Job-Bedingung `github.event.pull_request.merged == true`), nicht bei geschlossenen, aber nicht gemergten PRs und nicht bei direkten Pushes.
- Authentifizierung gegen `ghcr.io` erfolgt über das automatisch bereitgestellte `GITHUB_TOKEN` (Berechtigung `packages: write`); es werden keine zusätzlichen Secrets für die Registry benötigt.
- Beide Images (`api`, `frontend`) werden im selben Workflow-Lauf, aber unabhängig voneinander gebaut (Matrix- oder Parallel-Jobs), sodass ein Fehler in einem Image-Build den anderen nicht blockiert.
