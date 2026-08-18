**ID:** US-011
**Titel:** ProjectMembership-Entity mit Rollen-Invariante
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-004, US-010

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **die Entity `ProjectMembership` implementieren, die einem Nutzer genau eine Rolle innerhalb eines Projekts zuordnet**, damit **die zentrale Invariante „ein Nutzer hat pro Projekt genau eine Rolle“ domänenseitig garantiert wird**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 2.1, Abschnitt 4.1 (Entität `project_memberships`), Abschnitt 4.3 Punkt 2
- **Relevant für DDD:** Entity `ProjectMembership`, Teil des Aggregates `Project` (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] `Project.AssignMember(userId, role)` fügt eine `ProjectMembership` hinzu; existiert für `userId` bereits eine Mitgliedschaft in diesem Projekt, wirft die Methode `MembershipAlreadyExistsError` (Rolle muss stattdessen über `ChangeMemberRole` geändert werden).
- [ ] `Project.ChangeMemberRole(userId, newRole)` aktualisiert die Rolle einer bestehenden Mitgliedschaft.
- [ ] `Project.RemoveMember(userId)` entfernt die Mitgliedschaft; ein Integrationstest verifiziert, dass bereits erfasste `stakeholder_assessments` der zugehörigen Rolle davon unberührt bleiben (Abschnitt F5.2, Assessments gehören der Rolle im Projekt, nicht dem Nutzer).
- [ ] `role` akzeptiert ausschließlich Werte des `ProjectRole`-Enums (`PL`, `Coreteam`, `Architect`, `User`) — kein `Admin`-Wert möglich.
- [ ] Unique-Constraint-Verletzung (doppelte Mitgliedschaft) wird bei parallelem Zugriff von der DB abgefangen und als `MembershipAlreadyExistsError` in eine fachliche Exception übersetzt (Integrationstest mit gleichzeitigem Insert).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Projects/ProjectMembership.cs`
- `src/SlobSteak.Domain/Projects/Project.cs` (Erweiterung um Membership-Methoden)
- `src/SlobSteak.Infrastructure/Persistence/Projects/ProjectRepository.cs` (Erweiterung)
- Unit-/Integrationstests `tests/SlobSteak.Domain.Tests/Projects/ProjectMembershipTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Höchstens ein `ProjectMembership`-Datensatz je (`project_id`, `user_id`) (Abschnitt 4.3 Punkt 2).
- Ein Nutzer kann in unterschiedlichen Projekten unterschiedliche Rollen haben.
