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

- [ ] Repository enthält eine .NET-Solution `SlobSteak.sln` mit klar getrennten Projekten je Schicht: `src/SlobSteak.Domain` (Class Library, keine Paketabhängigkeiten außerhalb BCL), `src/SlobSteak.Application` (Class Library), `src/SlobSteak.Infrastructure` (Class Library, EF Core), `src/SlobSteak.Api` (ASP.NET Core Web API) sowie `tests/SlobSteak.Domain.Tests`, `tests/SlobSteak.Application.Tests`, `tests/SlobSteak.Api.Tests` (xUnit).
- [ ] Projektreferenzen erzwingen die Schichtenrichtung: `SlobSteak.Domain` referenziert kein anderes Projekt; `SlobSteak.Application` referenziert nur `SlobSteak.Domain`; `SlobSteak.Infrastructure` referenziert `SlobSteak.Domain`; `SlobSteak.Api` referenziert `SlobSteak.Application` und `SlobSteak.Infrastructure` (Composition Root für Dependency Injection).
- [ ] `SlobSteak.Api` startet lokal über `dotnet run --project src/SlobSteak.Api` und stellt einen Health-Check-Endpoint `GET /api/v1/health` bereit, der `200 OK` mit `{"status":"ok"}` liefert (ASP.NET Core Health Checks Middleware).
- [ ] Ein eigenständiges Angular-Workspace `frontend/` (erzeugt via Angular CLI, `ng new --standalone`) startet lokal über `ng serve` und rendert eine leere Platzhalterseite ohne Konsolenfehler.
- [ ] Ein `docker-compose.yml` startet drei Container — `api` (ASP.NET Core, Multi-Stage-`Dockerfile` mit `mcr.microsoft.com/dotnet/sdk` zum Bauen und `mcr.microsoft.com/dotnet/aspnet` zur Laufzeit), `frontend` (Node-Build, ausgeliefert über `nginx`) und `db` (offizielles `postgres`-Image) — ohne Abhängigkeit zu externen Cloud-Diensten (erfüllt Abschnitt 1.5).
- [ ] xUnit ist in `tests/SlobSteak.Domain.Tests` konfiguriert; ein Beispieltest läuft erfolgreich über `dotnet test`. Für Angular ist das Standard-Test-Setup (Jasmine/Karma über Angular CLI) konfiguriert; ein Beispieltest läuft über `ng test`.

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

**Wichtige Invarianten & Validierungsregeln:**

- Die Domain-Schicht (`SlobSteak.Domain`) darf keine NuGet-Paketreferenz und keine Projektreferenz zu Infrastructure oder Api besitzen (Dependency Rule von innen nach außen).
- Keine Cloud-Pflichtabhängigkeit — `api`, `frontend` und `db` müssen vollständig per `docker-compose up` lokal betreibbar sein.
