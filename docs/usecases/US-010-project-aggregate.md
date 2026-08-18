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
