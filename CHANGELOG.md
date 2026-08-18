# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier je User Story dokumentiert.

## [Unreleased]

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
