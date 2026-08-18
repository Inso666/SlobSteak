**ID:** US-028
**Titel:** Assessment erstellen/aktualisieren API inkl. Optimistic-Locking-Konfliktregel
**Bounded Context / Domain:** StakeholderAssessment
**Abhängigkeiten:** US-027, US-007, US-011

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **über die API meine rollenspezifische Einschätzung von Einfluss und Interesse für einen Stakeholder eintragen oder aktualisieren, ohne die Einschätzung anderer Rollen zu beeinflussen**, damit **meine fachliche Perspektive unabhängig von anderen Rollen dokumentiert wird**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F2.1, F2.2
- **Relevant für DDD:** Application Service `UpsertStakeholderAssessmentService` (StakeholderAssessment Context)

### 3. Akzeptanzkriterien

- [ ] `PUT /api/v1/stakeholders/{id}/assessments/{role}` legt ein Assessment an, falls keins existiert, oder aktualisiert das bestehende; Response `200`/`201` enthält `influence`, `interest`, `notes`, `updatedBy`, `updatedAt`, `version`.
- [ ] Ein Nutzer mit `project_membership.role = X` darf ausschließlich `PUT .../assessments/X` für sein eigenes Rollensegment aufrufen; `PUT .../assessments/Y` (fremde Rolle) liefert `403 Forbidden` (erfüllt Abschnitt 4.3 Punkt 3).
- [ ] Request enthält optional `expectedVersion`; weicht dieser vom aktuell persistierten Wert ab, liefert die API `409 Conflict` mit `{"error":"ASSESSMENT_MODIFIED","modifiedBy":"...","modifiedAt":"..."}` statt zu überschreiben.
- [ ] Fehlt `expectedVersion` im Request (z. B. beim erstmaligen Anlegen), wird ohne Konfliktprüfung gespeichert.
- [ ] `GET /api/v1/stakeholders/{id}/assessments` liefert alle vorhandenen Assessments (max. 3) des Stakeholders inkl. `updatedBy`/`updatedAt`/`version` je Rolle, sowie für nicht vorhandene Rollen einen expliziten `status: "NOT_ASSESSED"`.
- [ ] Ist einem Projekt aktuell kein Nutzer mit der angefragten Rolle zugewiesen, liefert `GET` für diese Rolle `status: "NO_ROLE_ASSIGNED"` statt `NOT_ASSESSED` (F2.1 Edge Case).
- [ ] Integrationstest deckt: Erstanlage, Update durch berechtigte Rolle, Update-Versuch fremder Rolle (`403`), veraltete Version (`409`).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Assessments/UpsertStakeholderAssessmentService.cs`
- `src/SlobSteak.Application/Assessments/GetStakeholderAssessmentsQuery.cs`
- `src/SlobSteak.Api/Controllers/AssessmentController.cs`
- Integrationstest `tests/SlobSteak.Api.Tests/Assessments/AssessmentControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Schreibzugriff auf ein Assessment mit `role = X` ist ausschließlich Nutzern mit `project_membership.role = X` im selben Projekt gestattet (Abschnitt 4.3 Punkt 3).
- Last-Write-Wins mit vorgelagerter Konfliktwarnung, kein automatisches Merge (F2.1 Edge Case).
