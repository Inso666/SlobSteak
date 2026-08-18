**ID:** US-010
**Titel:** Project-Aggregate (Domain Model)
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-002, US-003

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **das `Project`-Aggregate mit Name, Beschreibung und Status implementieren**, damit **Projekte als eigenständige, konsistente fachliche Einheit modelliert sind, bevor Stakeholder und Mitgliedschaften daran gebunden werden**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entität `projects`)
- **Relevant für DDD:** Aggregate Root `Project` (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] `Project.Create(name, description)` erzeugt eine Instanz mit `status = active`.
- [ ] `Project.Create` wirft `ProjectNameRequiredError`, wenn `name` leer oder nur Leerzeichen ist.
- [ ] `Project.Archive()` setzt `status` auf `archived`; `Project.Reactivate()` setzt ihn zurück auf `active`.
- [ ] Repository-Interface `ProjectRepository` mit `FindById`, `Save`, `FindAll`, `FindByMemberUserId` ist definiert; Infrastruktur-Implementierung gegen `projects` erfüllt das Interface (Integrationstest).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Projects/Project.cs`
- `src/SlobSteak.Domain/Projects/IProjectRepository.cs`
- `src/SlobSteak.Infrastructure/Persistence/Projects/ProjectRepository.cs`
- Unit-Tests `tests/SlobSteak.Domain.Tests/Projects/ProjectTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- `name` ist ein Pflichtfeld und darf nicht leer sein.

### Anmerkungen des Dev-Agenten

- Reihenfolge-Abweichung: US-007 (nächste Story in Phase 1) hängt zusätzlich zu US-006 von US-011
  (ProjectMembership, Phase 2) ab, das seinerseits US-010 voraussetzt. US-007 ist damit vor Umsetzung
  von US-010/US-011 nicht startbereit (Definition of Ready, CLAUDE.md Abschnitt 3.3). Um weder gegen
  die Definition of Ready noch gegen die grundsätzliche Phasenreihenfolge zu verstoßen, wird als
  PRD-/CLAUDE.md-konformste Interpretation (Abschnitt 4) ein minimaler Vorgriff auf US-010/US-011
  vorgenommen — ausschließlich um US-007 danach wie in Phase 1 vorgesehen fortsetzen zu können,
  keine sonstige spätere Story wird vorgezogen.
- Repository-Methode `FindByMemberUserId` verknüpft `Project`/`ProjectMembership` ausschließlich über
  die rohe `UserId`/`ProjectId` (kein EF-Core-Navigation-Property), gemäß CLAUDE.md Abschnitt 3.1.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-010-project-aggregate`),
Auto-Merge gemäß ADR-0003 aktiviert.
