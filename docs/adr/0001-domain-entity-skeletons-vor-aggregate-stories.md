# ADR 0001: Minimale Domain-Entity-Skeletons in US-003, Verhalten folgt in den Aggregate-Stories

**Status:** Akzeptiert
**Datum:** 2026-08-18
**Kontext-Story:** US-003 (Datenbankschema & Migrationen für alle Aggregate)

## Kontext

`BACKLOG.md` schneidet die Domain-/Infrastructure-Grundlagen bewusst in eigene, vorgelagerte
Stories (Phase 0: US-001 Grundgerüst, US-002 Value Objects, US-003 Datenbankschema), auf denen
alle weiteren Stories aufbauen. US-003 fordert laut Akzeptanzkriterien einen vollständigen
`SlobSteakDbContext` mit `DbSet<User>`, `DbSet<Project>`, `DbSet<ProjectMembership>`,
`DbSet<Stakeholder>`, `DbSet<StakeholderAssessment>`, `DbSet<CommunicationType>`,
`DbSet<StakeholderCommunicationAssignment>` sowie eine vollständige initiale Migration gegen
PostgreSQL — **bevor** die jeweiligen Aggregate-Stories (US-004 User, US-010 Project, US-011
ProjectMembership, US-020 Stakeholder, US-027 StakeholderAssessment, US-037 CommunicationType,
US-039 StakeholderCommunicationAssignment) in späteren Phasen laufen.

Diese späteren Stories listen in ihren "Technische Hinweise" exakt dieselben Dateipfade
(`src/SlobSteak.Domain/Identity/User.cs`, `src/SlobSteak.Domain/Projects/Project.cs`,
`src/SlobSteak.Domain/Projects/ProjectMembership.cs`,
`src/SlobSteak.Domain/Stakeholders/Stakeholder.cs`,
`src/SlobSteak.Domain/Stakeholders/StakeholderCommunicationAssignment.cs`,
`src/SlobSteak.Domain/Assessments/StakeholderAssessment.cs`,
`src/SlobSteak.Domain/Communications/CommunicationType.cs`) und sollen dort die eigentliche
DDD-Reichhaltigkeit ergänzen: `Create`-Factory-Methoden mit domänenspezifischen Exceptions
(`PasswordTooShortError`, `ProjectNameRequiredError`, `StakeholderNameRequiredError`,
`InvalidAssessmentRoleError`, `MembershipAlreadyExistsError`, `AssignmentAlreadyExistsError`,
`StaleAssessmentError`), Zustandsübergänge (`SoftDelete`, `Restore`, `Archive`, `ChangePassword`
usw.) und Repository-Interfaces. Keine der späteren Stories listet eine eigene EF-Core-Migration
in ihren technischen Hinweisen — Migrationen entstehen ausschließlich in US-003.

**Konflikt:** Ohne Auflösung müsste US-003 entweder (a) auf unspezifizierte/nicht existierende
Domain-Klassen warten und wäre nicht umsetzbar, oder (b) selbst schon die volle
Aggregate-Business-Logik implementieren, die laut Backlog-Reihenfolge erst in viel späteren
Phasen (1–7) an der Reihe ist — Letzteres würde CLAUDE.md Abschnitt 3.3 ("kein Vorgriff auf
spätere Stories") verletzen.

## Entscheidung

`SlobSteak.Domain`-Entity-Klassen für alle sieben Aggregate/Entities werden bereits in US-003
angelegt, exakt an den Pfaden/Namensräumen, die die jeweiligen späteren Aggregate-Stories in ihren
"Technische Hinweise" referenzieren — aber **ausschließlich als minimale, persistenzfähige
Skeletons**:

- Alle Felder aus PRD Abschnitt 4.1 sind als typisierte Properties vorhanden (inkl.
  Wiederverwendung der Value Objects `Email`/`Score` und Enums aus US-002, wo laut PRD/Story
  vorgesehen).
- Konstruktoren führen ausschließlich strukturelle Guard-Clauses aus (z. B. `ArgumentException`
  bei `null`/leerem Pflichtfeld), **keine** fachlichen Invarianten, keine domänenspezifischen
  Exceptions, keine `Create`-Factory-Methoden, keine Zustandsübergangsmethoden.
- Repository-Interfaces (`IUserRepository`, `IProjectRepository`, `IStakeholderRepository`, …)
  werden **nicht** in US-003 angelegt — das bleibt Teil der jeweiligen Aggregate-Story, wie dort
  explizit als Akzeptanzkriterium gefordert.
- Cross-Aggregate-/Cross-Bounded-Context-Referenzen (z. B. `Stakeholder.CreatedBy` → `User`,
  `Stakeholder.ProjectId` → `Project`, `StakeholderAssessment.StakeholderId` → `Stakeholder`,
  `StakeholderCommunicationAssignment.CommunicationTypeId` → `CommunicationType`) werden
  ausschließlich als rohe `Guid`-Felder plus DB-seitigem Fremdschlüssel modelliert — **ohne**
  EF-Core-Navigationsproperties zwischen den Klassen, gemäß CLAUDE.md Abschnitt 3.1 ("Bounded
  Contexts kommunizieren ausschließlich über IDs … niemals über direkte
  EF-Core-Navigation-Properties … zwischen Aggregate-Grenzen hinweg").

Die jeweilige Aggregate-Story erweitert anschließend genau diese Datei um `Create`,
Zustandsmethoden, Invarianten und das Repository-Interface, statt eine neue Datei anzulegen.

## Konsequenzen

- Positiv: US-003 kann wie vom Backlog vorgesehen als reine Infrastructure-Story abgeschlossen
  werden; alle nachfolgenden Stories haben ein stabiles Schema, gegen das sie testen können, ohne
  eigene Migrationen anlegen zu müssen.
- Negativ/Trade-off: Die Domain-Klassen sind zwischen US-003 und ihrer jeweiligen Aggregate-Story
  bewusst "anämischer" als CLAUDE.md Abschnitt 3.1 für den Endzustand vorschreibt. Dies ist ein
  befristeter Zwischenzustand pro Aggregat, kein Zielbild — jede Aggregate-Story MUSS die
  Reichhaltigkeit gemäß ihrer eigenen Akzeptanzkriterien nachrüsten, bevor sie als "fertig" gilt.
- Migrationsfolgen: Ändert eine spätere Aggregate-Story das Schema (z. B. neue Spalte), erzeugt
  sie dafür eine eigene, neue Migration (`dotnet ef migrations add ...`) — die initiale Migration
  aus US-003 wird nicht nachträglich editiert (CLAUDE.md Abschnitt 3.1).
