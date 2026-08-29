**ID:** US-039
**Titel:** StakeholderCommunicationAssignment-Entity (n:m, Invarianten)
**Bounded Context / Domain:** StakeholderCommunication
**Abhängigkeiten:** US-020, US-037

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **die n:m-Zuordnung zwischen Stakeholder und Kommunikationsart mit Frequenz und Kanal implementieren**, damit **einem Stakeholder mehrere Kommunikationsarten mit je eigener Frequenz/Kanal zugeordnet werden können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entität `stakeholder_communication_assignments`), F4.2
- **Relevant für DDD:** Entity `StakeholderCommunicationAssignment`, referenziert von Aggregate `Stakeholder` (StakeholderManagement/StakeholderCommunication Context)

### 3. Akzeptanzkriterien

- [ ] `Stakeholder.AssignCommunication(communicationTypeId, frequency, channel)` fügt eine Zuordnung hinzu; existiert für dieselbe `communicationTypeId` bereits eine Zuordnung, wirft die Methode `AssignmentAlreadyExistsError` (stattdessen muss Frequenz/Kanal per Update geändert werden).
- [ ] `Stakeholder.UpdateCommunicationAssignment(communicationTypeId, frequency, channel)` aktualisiert eine bestehende Zuordnung.
- [ ] `Stakeholder.RemoveCommunicationAssignment(communicationTypeId)` entfernt eine Zuordnung.
- [ ] `frequency` und `channel` akzeptieren ausschließlich Werte der Enums aus US-002 (`CommunicationFrequency`, `CommunicationChannel`).
- [ ] Integrationstest verifiziert die DB-seitige Unique-Constraint-Durchsetzung (`stakeholder_id`, `communication_type_id`) bei parallelem Insert.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Stakeholders/StakeholderCommunicationAssignment.cs`
- `src/SlobSteak.Domain/Stakeholders/Stakeholder.cs` (Erweiterung um Assignment-Methoden)
- `src/SlobSteak.Infrastructure/Persistence/Stakeholders/StakeholderRepository.cs` (Erweiterung)
- Unit-/Integrationstests `tests/SlobSteak.Domain.Tests/Stakeholders/StakeholderCommunicationAssignmentTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Höchstens eine Zuordnung je (`stakeholder_id`, `communication_type_id`) (Abschnitt 4.1).

---

### Status

Fertig am 29.08.2026. Branch `feature/US-039-communication-assignment-entity`, PR siehe GitHub.

### Anmerkungen des Agenten

- **Keine neue EF-Core-Migration nötig.** Die Tabelle `stakeholder_communication_assignments` inkl. Unique-Index `ix_stakeholder_communication_assignments_stakeholder_id_commun` existiert bereits seit der `InitialCreate`-Migration aus US-003 (Domain-Skeleton-Pattern, siehe ADR-0001). Diese Story ergänzt ausschließlich Verhalten (`AssignCommunication`/`UpdateCommunicationAssignment`/`RemoveCommunicationAssignment`) auf dem bestehenden Schema. Probeweise mit `dotnet ef migrations add` verifiziert: es entsteht keine reale Schema-Differenz — die einzige Konfigurationsänderung (`OnDelete(DeleteBehavior.ClientCascade)` statt `Restrict` für die Stakeholder-FK-Beziehung, damit `RemoveCommunicationAssignment` als Löschung statt als Aushängen einer Pflicht-Beziehung behandelt wird) wirkt laut ADR-0006 nur im EF-Core-Change-Tracker, nicht auf DB-Schema-Ebene.
- **`StakeholderCommunicationAssignment` als echte Kind-Entity des `Stakeholder`-Aggregates umgesetzt** (EF-Core-Navigation `Stakeholder.CommunicationAssignments`), nicht als eigenständiges Aggregate mit separatem Repository (wie `StakeholderAssessment` aus US-027). Begründung: Die Story verlangt explizit, dass `AssignCommunication`/`UpdateCommunicationAssignment`/`RemoveCommunicationAssignment` Methoden des Aggregate Root `Stakeholder` sind und `AssignmentAlreadyExistsError` dort geworfen wird — das setzt voraus, dass der Aggregate Root die Invariante "höchstens eine Zuordnung je Kommunikationsart" in-memory prüfen kann, was eine geladene Kind-Kollektion erfordert. Umgesetzt exakt analog zum Präzedenzfall `Project`/`ProjectMembership` (US-011, siehe ADR-0006, dessen Text `StakeholderCommunicationAssignment` bereits explizit als künftigen Anwendungsfall dieses Reconciliation-Musters nennt): `StakeholderRepository.SaveAsync` reconciled die Kollektion explizit (Neu-Erkennung per `AsNoTracking()`-Existenzabfrage, Entfernt-Erkennung ausschließlich über bereits getrackte `ChangeTracker`-Einträge), da client-generierte Guid-Schlüssel EF Cores automatische Change-Detection sonst fälschlich zwischen neu und geändert verwechseln.
- **`AssignmentNotFoundError` für `UpdateCommunicationAssignment` auf eine nicht existierende Zuordnung ergänzt**, obwohl kein Akzeptanzkriterium dieses Verhalten explizit fordert. Die Story beschreibt nur den Erfolgsfall ("aktualisiert eine bestehende Zuordnung"). Ohne definiertes Verhalten für den Fehlerfall wäre entweder ein stiller No-op (Datenverlust-Risiko/verwirrend) oder eine Exception die einzig sinnvollen Optionen — least-surprising Wahl analog zum etablierten Präzedenzfall `Project.ChangeMemberRole`/`MembershipNotFoundError` (US-011), keine zentrale PRD-Invariante betroffen (CLAUDE.md Abschnitt 6).
- **`RemoveCommunicationAssignment` idempotent** (kein Fehler bei nicht existierender Zuordnung), analog zu `Project.RemoveMember` (US-011) und `Stakeholder.SoftDelete` (US-020) — konsistent mit dem etablierten Idempotenz-Muster für Entfernen-Operationen im Repo, nicht explizit in den Akzeptanzkriterien gefordert, aber least-surprising.
