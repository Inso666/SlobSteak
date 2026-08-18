# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier je User Story dokumentiert.

## [Unreleased]

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
