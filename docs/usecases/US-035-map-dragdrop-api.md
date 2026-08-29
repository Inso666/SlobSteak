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

### Anmerkungen des Dev-Agenten

- Es war **keine neue Produktionslogik** nötig. Verifikation ergab: `AssessmentController.UpsertAssessment`
  und `UpsertStakeholderAssessmentService` (beide aus US-028) erfüllen bereits alle vier
  Akzeptanzkriterien dieser Story unverändert — der Rollen-Check (`ProjectRolePolicy.IsAllowed`,
  Akzeptanzkriterium 2) und die Konfliktprüfung (`StaleAssessmentError` → `409 ASSESSMENT_MODIFIED`
  mit `modifiedBy`/`modifiedAt`, Akzeptanzkriterium 3) sind vollständig unabhängig davon, ob der
  Aufruf aus einem Formular oder aus einem Drag&Drop-Vorgang der Map stammt; beide nutzen exakt
  denselben Endpoint (Akzeptanzkriterium 1).
- Für das in Akzeptanzkriterium 4 explizit geforderte Zwei-Nutzer-Szenario (zwei unterschiedliche
  Nutzer mit **derselben** Projekt-Rolle) wurde verifiziert, dass `Project.AssignMember` dies bereits
  zulässt — die Eindeutigkeitsprüfung dort greift nur auf die Nutzer-Id, nicht auf die Rolle
  (mehrere Personen können dieselbe perspektiv-tragende Rolle im selben Projekt innehaben, PRD
  Abschnitt 4.3). Kein Anpassungsbedarf.
- Story-Test: `tests/SlobSteak.Api.Tests/UserStories/US035_MapDragDropApiTests.cs` (ein Fact je
  Akzeptanzkriterium, in Story-Reihenfolge). Ergänzend dazu vertieft
  `tests/SlobSteak.Api.Tests/Assessments/AssessmentController_DragDropConflictTests.cs` (Pfad gemäß
  Story-Technik-Hinweis) das Zwei-Nutzer-Konfliktszenario inkl. Nachweis, dass die
  Positionsänderung des unterlegenen Nutzers nicht überschrieben wird (Last-Write-Wins mit
  vorgelagerter Konfliktwarnung, F2.1 Edge Case).
- `docs/PRD-SlobSteak.md` Abschnitt 4.3 Punkt 3 (rollenspezifischer Schreibschutz) bleibt dadurch
  ohne Sonderfall für Map-Updates gewahrt — konsistent mit der Story-Vorgabe „keine Sonderregel für
  Map-Updates" (F3.3).

### Status

Fertig am 29.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-035-map-dragdrop-api`),
Auto-Merge gemäß ADR-0003 aktiviert. Keine Produktionscode-Änderung — ausschließlich
Integrationstests zur Verifikation der Wiederverwendung von US-028.
