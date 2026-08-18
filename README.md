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

```bash
dotnet run --project src/SlobSteak.Api
```

Die API ist danach unter `http://localhost:5042` erreichbar (Port siehe Konsolenausgabe bzw.
`src/SlobSteak.Api/Properties/launchSettings.json`). Health-Check:

```bash
curl http://localhost:5042/api/v1/health
# {"status":"ok"}
```

Swagger-UI (nur im Development-Environment) ist unter `/swagger` verfügbar.

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

## CI/CD

`.github/workflows/docker-publish.yml` baut bei jedem auf `main` gemergten Pull Request die
Docker-Images für `api` und `frontend` und veröffentlicht sie nach GitHub Container Registry
(`ghcr.io/<owner>/<repo>-api`, `ghcr.io/<owner>/<repo>-frontend`), jeweils getaggt mit `latest`
und dem Short-SHA des Merge-Commits.
