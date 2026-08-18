**ID:** US-035
**Titel:** Drag & Drop Update-API mit Konfliktregel
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-028

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **über einen API-Endpoint die Position eines Stakeholder-Punkts (Einfluss/Interesse) meiner eigenen Rollen-Perspektive aktualisieren, mit derselben Konfliktregel wie beim manuellen Bearbeiten**, damit **Positionsänderungen per Drag & Drop dieselbe fachliche Integrität wie Formular-Updates besitzen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.3
- **Relevant für DDD:** Application Service, Wiederverwendung von `UpsertStakeholderAssessmentService` (US-028) — kein neues Aggregate, nur alternativer Aufrufpfad (StakeholderMap Context ruft StakeholderAssessment Context)

### 3. Akzeptanzkriterien

- [ ] Drag & Drop im Frontend ruft denselben Endpoint `PUT /api/v1/stakeholders/{id}/assessments/{role}` aus US-028 auf — kein separater Map-spezifischer Schreib-Endpoint, um Schreiblogik nicht zu duplizieren.
- [ ] Ein Request für eine Rolle, die nicht der eigenen Projekt-Rolle des Nutzers entspricht, liefert `403 Forbidden` (identische Regel wie US-028).
- [ ] Ein Request mit veralteter `expectedVersion` (Assessment wurde zwischen Laden der Map und Loslassen von anderem Nutzer derselben Rolle geändert) liefert `409 Conflict` mit denselben Feldern wie in US-028.
- [ ] Integrationstest simuliert: Map laden (Version X) → paralleles Update durch zweiten Nutzer derselben Rolle (Version X+1) → Drag-Drop-Save mit `expectedVersion = X` → `409`.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- Keine neuen Backend-Dateien — Wiederverwendung von `AssessmentController`/`UpsertStakeholderAssessmentService` aus US-028.
- Integrationstest `tests/SlobSteak.Api.Tests/Assessments/AssessmentController_DragDropConflictTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Identische Schreiblogik wie F2.1 — keine Sonderregel für Map-Updates (F3.3).
