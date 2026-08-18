**ID:** US-003
**Titel:** Datenbankschema & Migrationen für alle Aggregate
**Bounded Context / Domain:** Shared Kernel / Infrastructure
**Abhängigkeiten:** US-001, US-002

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **das vollständige relationale Schema aus Abschnitt 4.1 des PRD als EF-Core-Entitäten mit Fluent-API-Konfiguration und darauf basierende Code-First-Migrationen (`dotnet ef migrations add`) gegen PostgreSQL anlegen**, damit **alle nachfolgenden Domain-Stories gegen ein stabiles, vollständiges Schema inklusive aller Constraints implementiert werden können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entitäten), Abschnitt 4.2 (Beziehungsübersicht), Abschnitt 4.3 (Zentrale Invarianten)
- **Relevant für DDD:** Infrastructure-Schicht (Persistenzmodell für Aggregates: User, Project, Stakeholder, StakeholderAssessment, CommunicationType, StakeholderCommunicationAssignment)

### 3. Akzeptanzkriterien

- [x] `SlobSteakDbContext` (EF Core) definiert `DbSet<User>`, `DbSet<Project>`, `DbSet<ProjectMembership>`, `DbSet<Stakeholder>`, `DbSet<StakeholderAssessment>`, `DbSet<CommunicationType>`, `DbSet<StakeholderCommunicationAssignment>`.
- [x] Je Entität existiert eine `IEntityTypeConfiguration<T>`-Klasse (Fluent API), die Feldtypen, Pflichtfelder, `HasIndex(...).IsUnique()` und Fremdschlüssel gemäß Abschnitt 4.1 abbildet — keine Konfiguration per Data-Annotations, um Domain-Klassen frei von Infrastruktur-Attributen zu halten.
- [x] `ProjectMembershipConfiguration` setzt `HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique()`.
- [x] `StakeholderAssessmentConfiguration` setzt `HasIndex(a => new { a.StakeholderId, a.Role }).IsUnique()`.
- [x] `StakeholderCommunicationAssignmentConfiguration` setzt `HasIndex(a => new { a.StakeholderId, a.CommunicationTypeId }).IsUnique()`.
- [x] Eine initiale EF-Core-Migration (`dotnet ef migrations add InitialCreate --project src/SlobSteak.Infrastructure --startup-project src/SlobSteak.Api`) erzeugt alle Tabellen; `dotnet ef database update` läuft gegen eine leere PostgreSQL-Instanz fehlerfrei durch, ebenso ein anschließendes `dotnet ef database update 0` (vollständiger Rollback über die generierten `Down()`-Methoden).
- [x] Integrationstest (`tests/SlobSteak.Infrastructure.Tests` oder `SlobSteak.Api.Tests`, gegen eine Testcontainers-PostgreSQL-Instanz) verifiziert, dass ein Insert-Versuch, der einen der o. g. Unique-Indizes verletzt, von PostgreSQL mit `DbUpdateException` abgelehnt wird.

**Status:** fertig am 18.08.2026, Branch `feature/US-003-datenbankschema`, PR siehe Verlinkung in `BACKLOG.md`.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Infrastructure/Persistence/SlobSteakDbContext.cs`
- `src/SlobSteak.Infrastructure/Persistence/Configurations/UserConfiguration.cs` (+ Configuration-Klasse je weiterer Entität)
- `src/SlobSteak.Infrastructure/Persistence/Migrations/*_InitialCreate.cs` (von EF Core generiert)
- `src/SlobSteak.Api/appsettings.json` (Connection-String-Platzhalter, per Umgebungsvariable überschreibbar)
- Integrationstest `tests/SlobSteak.Api.Tests/Persistence/SchemaConstraintsTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- `StakeholderAssessments`: höchstens ein Datensatz je (`StakeholderId`, `Role`) — DB-Unique-Index, nicht nur Anwendungslogik (Abschnitt 4.3 Punkt 1).
- `ProjectMemberships`: höchstens ein Datensatz je (`ProjectId`, `UserId`) — DB-Unique-Index (Abschnitt 4.3 Punkt 2).
- Schemaänderungen erfolgen ausschließlich über neue EF-Core-Migrationen; kein manuelles Editieren der Datenbank oder bereits angewendeter Migrationsdateien.

### 5. Anmerkungen des Dev-Agenten

- **Domain-Entity-Skeletons vor den jeweiligen Aggregate-Stories (Abschnitt 4 Eskalation):** Die
  Akzeptanzkriterien verlangen `DbSet`s und eine vollständige initiale Migration für alle sieben
  Aggregate/Entities — die zugehörigen Domain-Klassen (`User`, `Project`, `ProjectMembership`,
  `Stakeholder`, `StakeholderCommunicationAssignment`, `StakeholderAssessment`,
  `CommunicationType`) existierten zu diesem Zeitpunkt aber noch nicht, da ihre eigentliche
  DDD-Reichhaltigkeit (`Create`-Factories, Invarianten, Repository-Interfaces) laut Backlog erst
  in den späteren, dedizierten Aggregate-Stories (US-004, US-010, US-011, US-020, US-027, US-037,
  US-039) entsteht. Diese Klassen wurden daher bereits jetzt als minimale, ausschließlich
  strukturelle Skeletons an genau den Pfaden angelegt, die jene Stories in ihren "Technische
  Hinweise" referenzieren — siehe `docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md`
  für die vollständige Begründung. Keine der genannten Stories legt eine eigene Migration an;
  Schema-Änderungen bleiben bis dahin ausschließlich in US-003 gebündelt.
- **Optimistic-Concurrency-Spalte für `StakeholderAssessment`:** Das PRD-Schema (Abschnitt 4.1)
  listet keine Versionsspalte, US-027 fordert aber ein `expectedVersion`-Konfliktverfahren. Die
  Wahl einer expliziten `int Version`-Spalte (statt EF-`RowVersion`/Postgres-`xmin`) ist in
  `docs/adr/0002-optimistic-concurrency-assessment-version.md` begründet.
- **`EFCore.NamingConventions` (Abschnitt 4, NuGet-Library-Wahl):** Für die Abbildung der
  PascalCase-C#-Properties auf die snake_case-Tabellen-/Spaltennamen aus PRD Abschnitt 4.1 wurde
  das Paket `EFCore.NamingConventions` (Version 8.0.3, EF-Core-8-kompatibel) ergänzt
  (`UseSnakeCaseNamingConvention()`), statt jede Spalte einzeln per `HasColumnName(...)` zu
  benennen. Weit verbreitetes, reines Konventions-Paket ohne Verhaltensrisiko.
- **Keine EF-Navigationsproperties über Bounded-Context-/Aggregate-Grenzen hinweg:** Alle
  Fremdschlüssel (z. B. `Stakeholder.ProjectId` → `Project`, `Stakeholder.CreatedBy` → `User`,
  `StakeholderAssessment.StakeholderId` → `Stakeholder`) sind in den `IEntityTypeConfiguration`-
  Klassen als `HasOne<T>().WithMany()` **ohne** Navigationsproperty auf den Domain-Klassen
  konfiguriert — reiner DB-seitiger FK-Constraint für referenzielle Integrität, aber kein
  C#-Objektverweis zwischen Aggregaten/Kontexten (CLAUDE.md Abschnitt 3.1). `OnDelete` ist überall
  `Restrict`, um versehentliche Kaskadenlöschungen über Aggregatgrenzen zu verhindern.
- **Story-Test-Umgebung (Testbarkeit ohne Regression von US-001):** `WebApplicationFactory<Program>`
  verwendet standardmäßig die Hosting-Umgebung `"Development"` — dieselbe Umgebung, die den neuen
  automatischen `dbContext.Database.Migrate()`-Aufruf in `Program.cs` auslöst. Ohne Gegenmaßnahme
  hätte das den bestehenden, DB-losen `HealthCheckTests` aus US-001 gebrochen (empirisch verifiziert).
  Lösung: eine gemeinsame `SlobSteakApiFactory` (`tests/SlobSteak.Api.Tests/SlobSteakApiFactory.cs`)
  setzt die Testumgebung explizit auf `"Testing"`; `HealthCheckTests` wurde entsprechend minimal
  angepasst (kein Verhaltensunterschied, nur die Fixture). Tests, die eine echte Datenbank
  benötigen (`SchemaConstraintsTests`, dieser Story-Test), steuern Migration/Schema explizit selbst
  über eine Testcontainers-PostgreSQL-Instanz, unabhängig vom Environment-Namen.
- **Lokale Verifizierbarkeit über die Tests hinaus:** Zusätzlich zu den automatisierten Tests wurde
  manuell gegen eine temporäre echte PostgreSQL-Instanz verifiziert: `dotnet ef database update`
  (alle 7 Tabellen inkl. Indizes) sowie anschließend `dotnet ef database update 0` (vollständiger
  Rollback über `Down()`) liefen fehlerfrei durch. Zusätzlich wurde `docker compose up --build db
  api` durchgeführt: Die API wendet die Migration beim Start automatisch an (Log-Ausgabe bestätigt
  `CREATE TABLE`/`CREATE INDEX`-Befehle) und `GET /api/v1/health` antwortet weiterhin mit `200
  {"status":"ok"}`.

### 6. Lokale Verifizierbarkeit

```bash
# Gesamte Solution (Domain: 39 Tests; Api: 11 Tests, davon 3 Schema-Constraint- + 7 Story-Tests
# gegen eine echte Testcontainers-PostgreSQL-Instanz — Docker muss laufen)
dotnet test

# Nur der dedizierte Story-Test für US-003
dotnet test --filter "FullyQualifiedName~US003"

# dotnet format ohne Änderungen
dotnet format SlobSteak.sln --verify-no-changes

# Smoke-Check: API + DB per Docker Compose, automatische Migration beim Start
docker compose up -d --build db api
curl http://localhost:5000/api/v1/health   # {"status":"ok"}
docker compose down -v
```

Diese Story liefert keinen eigenen API-Endpoint/keine UI; der Smoke-Check ist der oben
dokumentierte `docker compose up` + Health-Check-Aufruf, ergänzt um die manuelle Verifikation von
`dotnet ef database update` / `dotnet ef database update 0` gegen eine temporäre PostgreSQL-
Instanz (siehe Anmerkungen).
