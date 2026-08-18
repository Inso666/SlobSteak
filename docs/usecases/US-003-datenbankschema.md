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

- [ ] `SlobSteakDbContext` (EF Core) definiert `DbSet<User>`, `DbSet<Project>`, `DbSet<ProjectMembership>`, `DbSet<Stakeholder>`, `DbSet<StakeholderAssessment>`, `DbSet<CommunicationType>`, `DbSet<StakeholderCommunicationAssignment>`.
- [ ] Je Entität existiert eine `IEntityTypeConfiguration<T>`-Klasse (Fluent API), die Feldtypen, Pflichtfelder, `HasIndex(...).IsUnique()` und Fremdschlüssel gemäß Abschnitt 4.1 abbildet — keine Konfiguration per Data-Annotations, um Domain-Klassen frei von Infrastruktur-Attributen zu halten.
- [ ] `ProjectMembershipConfiguration` setzt `HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique()`.
- [ ] `StakeholderAssessmentConfiguration` setzt `HasIndex(a => new { a.StakeholderId, a.Role }).IsUnique()`.
- [ ] `StakeholderCommunicationAssignmentConfiguration` setzt `HasIndex(a => new { a.StakeholderId, a.CommunicationTypeId }).IsUnique()`.
- [ ] Eine initiale EF-Core-Migration (`dotnet ef migrations add InitialCreate --project src/SlobSteak.Infrastructure --startup-project src/SlobSteak.Api`) erzeugt alle Tabellen; `dotnet ef database update` läuft gegen eine leere PostgreSQL-Instanz fehlerfrei durch, ebenso ein anschließendes `dotnet ef database update 0` (vollständiger Rollback über die generierten `Down()`-Methoden).
- [ ] Integrationstest (`tests/SlobSteak.Infrastructure.Tests` oder `SlobSteak.Api.Tests`, gegen eine Testcontainers-PostgreSQL-Instanz) verifiziert, dass ein Insert-Versuch, der einen der o. g. Unique-Indizes verletzt, von PostgreSQL mit `DbUpdateException` abgelehnt wird.

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
