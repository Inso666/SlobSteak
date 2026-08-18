# SlobSteak

Stakeholder-Management-Tool. Backend in C#/.NET (ASP.NET Core, EF Core, PostgreSQL) nach
Domain-Driven-Design-Schichtenarchitektur, Frontend in Angular. Details zu Fachlichkeit und
Architektur siehe [`docs/PRD-Steakholder.md`](docs/PRD-Steakholder.md) und
[`docs/usecases/BACKLOG.md`](docs/usecases/BACKLOG.md). Verbindliche Entwicklungsrichtlinien für
autonome Coding-Agenten stehen in [`CLAUDE.md`](CLAUDE.md).

## Architektur

```
src/
  SlobSteak.Domain/           Aggregates, Value Objects, Domain Services (keine Abhängigkeiten)
  SlobSteak.Application/      Use-Case-Orchestrierung (referenziert nur Domain)
  SlobSteak.Infrastructure/   EF Core, Repository-Implementierungen (referenziert Domain)
  SlobSteak.Api/              ASP.NET Core Web API, Composition Root
tests/
  SlobSteak.Domain.Tests/
  SlobSteak.Application.Tests/
  SlobSteak.Api.Tests/
frontend/                     Angular-Workspace (Standalone Components)
```

## Voraussetzungen

- [.NET SDK 8.0](https://dotnet.microsoft.com/download) (LTS)
- [Node.js](https://nodejs.org/) 22 oder neuer sowie [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)
- [Docker](https://www.docker.com/) / Docker Compose

## Backend lokal starten

Die API benötigt seit US-003 eine erreichbare PostgreSQL-Instanz (ausstehende EF-Core-Migrationen
werden im Development-Environment beim Start automatisch angewendet). Am einfachsten zuerst nur
die Datenbank per Docker Compose hochfahren:

```bash
docker compose up -d db
dotnet run --project src/SlobSteak.Api
```

Der lokale Connection-String (`Host=localhost;Port=5432;...`) liegt in
`src/SlobSteak.Api/appsettings.Development.json` (nicht versioniert, siehe `.gitignore`) und passt
zu den Default-Zugangsdaten aus `docker-compose.yml`. Alternativ per Umgebungsvariable setzen:
`ConnectionStrings__Default="Host=localhost;Port=5432;Database=slobsteak;Username=slobsteak;Password=slobsteak"`.

Die API ist danach unter `http://localhost:5042` erreichbar (Port siehe Konsolenausgabe bzw.
`src/SlobSteak.Api/Properties/launchSettings.json`). Health-Check:

```bash
curl http://localhost:5042/api/v1/health
# {"status":"ok"}
```

Swagger-UI (nur im Development-Environment) ist unter `/swagger` verfügbar.

## EF-Core-Migrationen

```bash
dotnet tool install --global dotnet-ef   # einmalig, falls noch nicht installiert
dotnet ef migrations add <Name> --project src/SlobSteak.Infrastructure --startup-project src/SlobSteak.Api --output-dir Persistence/Migrations
dotnet ef database update --project src/SlobSteak.Infrastructure --startup-project src/SlobSteak.Api
```

Migrationen werden nie nachträglich editiert (CLAUDE.md Abschnitt 3.1) — Schemaänderungen erhalten
stets eine neue Migration.

## Backend-Tests ausführen

```bash
dotnet test
```

Führt alle Tests der Solution aus (`SlobSteak.Domain.Tests`, `SlobSteak.Application.Tests`,
`SlobSteak.Api.Tests`). Für eine einzelne Story-Testklasse (ab US-002 vorhanden):

```bash
dotnet test --filter "FullyQualifiedName~US0NN"
```

## Frontend lokal starten

```bash
cd frontend
npm install
ng serve
```

Das Frontend ist danach unter `http://localhost:4200` erreichbar.

## Frontend-Tests ausführen

```bash
cd frontend
ng test
```

Führt die Jasmine/Karma-Tests headless in Chrome aus (`karma.conf.js`, Zielbrowser
`ChromeHeadlessCI`). Voraussetzung: lokal installiertes Chrome bzw. `CHROME_BIN`-Umgebungsvariable
auf ein Chrome/Chromium-Binary gesetzt.

> **Hinweis (Anmerkung des Dev-Agenten, US-001):** Der Angular-CLI-Standardbuilder für Tests hat
> sich in aktuellen Angular-Versionen von Karma/Jasmine auf einen experimentellen
> Vitest-basierten `unit-test`-Builder verschoben; der klassische Webpack-Karma-Builder
> (`@angular-devkit/build-angular:karma`) gilt inzwischen als deprecated zugunsten des
> esbuild-basierten `@angular/build:karma`. Gemäß verbindlicher Vorgabe aus `CLAUDE.md`
> (Jasmine/Karma über Angular CLI) wurde das Projekt explizit auf den nicht-deprecated
> `@angular/build:karma`-Builder mit Jasmine/Karma umkonfiguriert (siehe `frontend/angular.json`,
> `frontend/karma.conf.js`), anstatt den neuen Vitest-Default zu übernehmen.

## Gesamtsystem über Docker Compose

```bash
docker compose up --build
```

Startet drei Container:

| Service    | Adresse                          | Beschreibung                          |
|------------|-----------------------------------|----------------------------------------|
| `db`       | `localhost:5432`                  | PostgreSQL 16                          |
| `api`      | `http://localhost:5000/api/v1/health` | ASP.NET Core Web API              |
| `frontend` | `http://localhost:4200`           | Angular-Build, ausgeliefert über nginx |

Datenbank-Zugangsdaten für die lokale Entwicklung können über die Umgebungsvariablen
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` überschrieben werden (Default: `slobsteak` /
`slobsteak` / `slobsteak`, ausschließlich für lokale Entwicklung, keine Produktions-Secrets).

Beenden mit:

```bash
docker compose down
```

## Aktuellen `main`-Stand testen (vorgebaute Images aus GHCR)

`docker-compose.ghcr.yml` startet dieselben drei Container, baut `api` und `frontend` aber
**nicht** lokal, sondern zieht die zuletzt bei einem gemergten Pull Request auf `main`
veröffentlichten Images (`:latest`-Tag) aus der GitHub Container Registry. Damit lässt sich der
aktuelle Stand von `main` jederzeit ohne lokalen Build/Checkout-Zwischenschritt hochziehen:

```bash
docker compose -f docker-compose.ghcr.yml up --pull always
docker compose -f docker-compose.ghcr.yml down
```

Die Container sind unter denselben Adressen wie oben erreichbar. `docker-compose.yml` (Build aus
lokalem Quellcode, s. o.) bleibt unverändert die Grundlage für die aktive Storyentwicklung gemäß
`CLAUDE.md` Abschnitt 3.4 — beide Compose-Dateien existieren nebeneinander für unterschiedliche
Zwecke.

> **Hinweis:** Falls der `pull` mit `unauthorized`/`denied` fehlschlägt, sind die GHCR-Pakete
> vermutlich noch als `private` markiert (Standard bei automatisch über `GITHUB_TOKEN`
> veröffentlichten Packages). Entweder Sichtbarkeit unter GitHub → Repo → Packages → jeweiliges
> Package → Package settings auf `Public` stellen, oder lokal einmalig einloggen:
> `echo <PAT-mit-read:packages> | docker login ghcr.io -u <github-user> --password-stdin`.

## CI/CD

`.github/workflows/docker-publish.yml` baut bei jedem auf `main` gemergten Pull Request die
Docker-Images für `api` und `frontend` und veröffentlicht sie nach GitHub Container Registry
(`ghcr.io/<owner>/<repo>-api`, `ghcr.io/<owner>/<repo>-frontend`), jeweils getaggt mit `latest`
und dem Short-SHA des Merge-Commits.

### PR-Checks / Required Status Checks

`.github/workflows/pr-checks.yml` läuft bei jedem **offenen** Pull Request auf `main`/`master`
(nicht erst beim Merge) und prüft den aktuellen Technologiestack vollautomatisch in sechs
eigenständigen Jobs:

| Job                                    | Prüft                                                          |
|-----------------------------------------|-----------------------------------------------------------------|
| `Backend: Build (Release)`              | `dotnet restore` + `dotnet build -c Release` der gesamten Solution |
| `Backend: Tests (dotnet test)`          | `dotnet test` (xUnit, inkl. Testcontainers-PostgreSQL-Integrationstests), Testreport + Artefakt |
| `Backend: Code-Format (dotnet format)`  | `dotnet format --verify-no-changes`                              |
| `Frontend: Build`                       | `npm ci` + `ng build`                                            |
| `Frontend: Lint (ng lint)`              | `ng lint` (ESLint/angular-eslint)                                |
| `Frontend: Tests (ng test)`             | `ng test --watch=false --browsers=ChromeHeadlessCI` (Karma/Jasmine), Coverage-Artefakt |

Diese sechs Job-Namen sollten unter **Settings → Branches → Branch protection rules** für `main`
als „Required status checks“ hinterlegt werden, damit ein PR erst mergebar ist, wenn alle sechs
grün sind.

**Erweiterungspflicht:** Führt eine User Story neue Komponenten ein (weitere Test-Projekte,
End-to-End-Tests, Datenbank-Migrationen o. Ä.), muss `pr-checks.yml` im selben Pull Request
entsprechend erweitert werden — siehe `CLAUDE.md`, Abschnitt 3.3 (Definition of Done).
