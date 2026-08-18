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

### Anmerkungen des Dev-Agenten

- `Project` erhält abweichend von ADR-0001s allgemeiner "keine EF-Navigationsproperties"-Regel eine
  echte EF-Core-Navigation `Memberships` — ADR-0001 schließt das explizit nur für
  Cross-Aggregate-/Cross-Bounded-Context-Referenzen aus; `ProjectMembership` ist laut Story-Text
  selbst "Teil des Aggregates Project", eine Intra-Aggregate-Navigation ist hier DDD-konform.
- Bei der Integration gegen echtes PostgreSQL zeigte sich ein nicht-triviales EF-Core-Verhalten bei
  client-generierten Guid-Schlüsseln in Kind-Kollektionen (fälschliches UPDATE statt INSERT für neu
  hinzugefügte Mitgliedschaften, Fehler beim Entfernen aus einer Pflicht-Navigation) — Ursache,
  Fix und Implikationen für künftige Aggregate mit Kind-Kollektionen sind in
  `docs/adr/0006-ef-core-aggregate-kindkollektion-reconciliation.md` dokumentiert.
- `MembershipNotFoundError` (nicht explizit als Akzeptanzkriterium gefordert) ergänzt, damit
  `ChangeMemberRole` bei einer nicht existierenden Mitgliedschaft ein definiertes, fachliches
  Fehlverhalten statt eines `NullReferenceException`-artigen Zustands zeigt.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-011-project-membership`),
Auto-Merge gemäß ADR-0003 aktiviert.
