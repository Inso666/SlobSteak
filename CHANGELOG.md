# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier je User Story dokumentiert.

## [Unreleased]

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
