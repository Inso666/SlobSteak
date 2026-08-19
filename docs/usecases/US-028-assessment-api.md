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

### Anmerkungen des Dev-Agenten

- Der dedizierte Story-Test liegt unter `tests/SlobSteak.Api.Tests/UserStories/US028_AssessmentApiTests.cs`
  statt am im technischen Hinweis genannten Pfad `tests/SlobSteak.Api.Tests/Assessments/
  AssessmentControllerTests.cs` — CLAUDE.md Kernregel 3 schreibt das `UserStories/`-Namensschema
  für den dedizierten Story-Test verbindlich vor, konsistent mit allen bisherigen Stories seit
  US-020.
- Die Rollen-Schreibbeschränkung aus Akzeptanzkriterium 2 (Nutzer mit Rolle `X` darf nur
  `.../assessments/X` beschreiben) lässt sich nicht über das deklarative
  `RequireProjectRoleAttribute` ausdrücken, da die erlaubte Rolle vom URL-Segment abhängt statt
  einer für die Action statischen Liste zu entsprechen. Gelöst über eine manuelle Prüfung direkt
  in der Action mit der bereits bestehenden, framework-freien `ProjectRolePolicy` — keine neue
  Autorisierungsinfrastruktur, exakt dieselbe Regel-Engine wie
  `ProjectRoleAuthorizationHandler`/die `deleted=true`-Prüfung aus US-024.
- „Fehlt `expectedVersion`, wird ohne Konfliktprüfung gespeichert“ (Akzeptanzkriterium 4) ist in
  der Application-Schicht gelöst, ohne die Domain-Methode `StakeholderAssessment.Update` zu
  verändern: `UpsertStakeholderAssessmentService` übergibt bei fehlendem `expectedVersion` die
  aktuelle `Version` des geladenen Assessments selbst als „erwartete“ Version — die
  Domain-Prüfung ist dadurch immer erfüllt, ohne eine Sonderbehandlung für „keine Prüfung“ im
  Aggregate zu benötigen.
- `modifiedBy` im `409`-Konflikt-Body ist der aufgelöste Name (nicht die User-Id) — konsistent mit
  dem `updatedByName`-Konzept aus allen anderen Stakeholder-/Assessment-Responses; die Story
  spezifiziert nur den Feldnamen, nicht das Format des Werts.
- `InvalidAssessmentRoleError` (Rolle `User` versucht zu schreiben) wird auf `403 FORBIDDEN`
  gemappt statt `400` — praktisch nur über einen direkten API-Aufruf erreichbar, da die
  Rollen-Übereinstimmungsprüfung bereits vorher greift; als Fehlercode dennoch konsistent mit der
  fachlichen Bedeutung „diese Aktion ist für dich nicht erlaubt“.
- Die Sichtbarkeitsregel für Rolle `User` (F2.3 — Einfluss-/Interesse-Werte in der `GET`-Response
  ausblenden) ist bewusst noch nicht Teil dieser Story — folgt explizit erst mit US-030, wie im
  Backlog vorgegeben; `GetStakeholderAssessmentsQuery` liefert aktuell an alle vier Rollen
  identische Daten.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-028-assessment-api`),
Auto-Merge gemäß ADR-0003 aktiviert.
