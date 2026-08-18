**ID:** US-022
**Titel:** Stakeholder-Stammdaten bearbeiten: API + UI inkl. Änderungsverlauf
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-021

---

### 1. User Story

Als **PL, Coreteam-Mitglied oder Architekt** möchte ich **die Stammdaten eines bestehenden Stakeholders bearbeiten**, damit **die erfassten Daten aktuell bleiben**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F1.2
- **Relevant für DDD:** Application Service `UpdateStakeholderDetailsService` (StakeholderManagement Context)

### 3. Akzeptanzkriterien

- [ ] `PATCH /api/v1/stakeholders/{id}` aktualisiert beliebige Stammdatenfelder aus F1.1 und liefert `200 OK` mit aktualisiertem `updated_by`/`updated_at`.
- [ ] Endpoint ist für `PL`, `Coreteam`, `Architect` erreichbar, für `User` `403 Forbidden`.
- [ ] Änderungen sind ohne Freigabeprozess sofort für alle Projektmitglieder sichtbar (kein Draft-/Approval-Zustand im Datenmodell).
- [ ] Stakeholder-Detailseite zeigt „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“ im Kopfbereich, gespeist aus `updated_by`/`updated_at`.
- [ ] `PATCH` auf einen soft-gelöschten Stakeholder liefert `404 Not Found` (gelöschte Stakeholder gelten für Standardrouten als nicht existent, Abschnitt 4.3 Punkt 5).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/UpdateStakeholderDetailsService.cs`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`PATCH /api/v1/stakeholders/{id}`)
- `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Alle Standard-Leseabfragen filtern `deleted_at IS NULL` (Abschnitt 4.3 Punkt 5) — auch das Ziel eines Edit-Requests.
