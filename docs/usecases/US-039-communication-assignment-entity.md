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
