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

### Anmerkungen des Dev-Agenten

- `PATCH /api/v1/stakeholders/{id}` referenziert das Projekt nicht über ein `projectId`-
  Routensegment (anders als `POST .../projects/{projectId}/stakeholders`). Der bestehende
  `RequireProjectRoleAttribute`/`ProjectRoleAuthorizationHandler`-Mechanismus (US-007) konnte
  daher nicht direkt wiederverwendet werden — ergänzt: ein zweiter Handler
  (`StakeholderProjectRoleAuthorizationHandler`) für dieselbe `ProjectRoleRequirement`, der das
  Projekt über die Stakeholder-Id auflöst. ASP.NET Core erlaubt mehrere Handler je Requirement;
  die Autorisierung gilt als erfüllt, sobald einer davon zustimmt. Bewusst mit
  `includeDeleted: true` aufgelöst, damit ein autorisierter Nutzer für einen bereits gelöschten
  Stakeholder den fachlich korrekten `404` aus der Application-Schicht erhält (Akzeptanzkriterium 5)
  statt eines irreführenden `403`.
- `IStakeholderRepository.FindByIdAsync(..., includeDeleted: false)` liefert für einen
  soft-gelöschten **und** einen nicht existierenden Stakeholder gleichermaßen `null` — dadurch
  erfüllt `UpdateStakeholderDetailsService` Akzeptanzkriterium 5 ohne gesonderte Fallunterscheidung.
- `CreateStakeholderRequest` (US-021) in `StakeholderDetailsRequest` umbenannt, da beide Endpunkte
  (Anlegen/Bearbeiten) dieselben Stammdatenfelder erwarten — keine Duplizierung eines
  praktisch identischen DTOs.
- `StakeholderResponse` um `updatedByName`/`updatedAt` erweitert (Akzeptanzkriterium 1/4); dafür
  löst jetzt auch `CreateStakeholderService` (US-021) den anlegenden Nutzer über
  `IUserRepository` auf (`CreatedBy` == `UpdatedBy` bei der Erstellung) — für einen konsistenten
  Response-Contract zwischen beiden Endpunkten.
- Akzeptanzkriterium 4 ("Stakeholder-Detailseite zeigt …") wird mangels eigener Detailseite
  (folgt erst mit US-026) innerhalb der bestehenden session-lokalen Liste aus US-021 erfüllt: die
  neue `EditStakeholderFormComponent` zeigt „Zuletzt geändert von [Name] am [Datum]“ im
  Kopfbereich des Bearbeiten-Formulars.
- Akzeptanzkriterium 3 (keine Freigabe-/Draft-Logik) ist strukturell erfüllt — es gibt schlicht
  kein Draft-/Approval-Feld im Datenmodell; der Story-Test verifiziert das über einen direkten
  DB-Read nach dem `PATCH` mangels eines eigenen GET-Endpunkts für einen einzelnen Stakeholder.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-022-stakeholder-bearbeiten`),
Auto-Merge gemäß ADR-0003 aktiviert.
