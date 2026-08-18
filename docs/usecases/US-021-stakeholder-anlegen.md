**ID:** US-021
**Titel:** Stakeholder anlegen: API + Formular-UI
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-020, US-007, US-019

---

### 1. User Story

Als **PL, Coreteam-Mitglied oder Architekt** möchte ich **einen neuen Stakeholder in meinem Projekt über ein Formular anlegen**, damit **ich ihn anschließend bewerten und in Verteilerlisten berücksichtigen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F1.1
- **Relevant für DDD:** Application Service `CreateStakeholderService`, Aggregate `Stakeholder` (StakeholderManagement Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/projects/{projectId}/stakeholders` mit `name`, `type` (Pflicht) sowie optional `organization`, `position`, `email`, `phone`, `locationDepartment`, `description` liefert `201 Created`.
- [ ] Endpoint ist für Rollen `PL`, `Coreteam`, `Architect` erreichbar, für `User` liefert er `403 Forbidden` (Berechtigungsmatrix Abschnitt 2.3).
- [ ] Ungültiges `email`-Format liefert `400 Bad Request` mit `{"error":"INVALID_EMAIL_FORMAT"}`; leeres `name` liefert `400` mit `{"error":"NAME_REQUIRED"}`.
- [ ] Existiert im selben Projekt bereits ein aktiver Stakeholder mit ähnlichem/identischem Namen, liefert die Response zusätzlich ein nicht-blockierendes Feld `similarStakeholderWarning` mit dessen Name/ID (Speichern wird **nicht** blockiert).
- [ ] Formular-UI erfasst alle o. g. Felder; Speichern-Button ist bei ungültigem E-Mail-Format deaktiviert (Inline-Validierung); bei `type = Organization` wird das Feld „Position/Funktion“ ausgeblendet.
- [ ] Nach erfolgreichem Anlegen navigiert die UI zur Stakeholder-Detailseite (US-026) bzw. zeigt den neuen Eintrag sofort in der Liste.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/CreateStakeholderService.cs`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`POST .../stakeholders`)
- `frontend/src/app/features/stakeholders/create-stakeholder-form/create-stakeholder-form.component.ts`
- Integrationstest `tests/SlobSteak.Api.Tests/Stakeholders/StakeholderController_CreateTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Namensduplikat ist ein Hinweis, kein Blocker (F1.1 Edge Case).
- `type = Organization` blendet `position` UI-seitig aus/optional, ohne die Domain-Validierung zu verschärfen.
