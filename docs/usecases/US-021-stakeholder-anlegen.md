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

### Anmerkungen des Dev-Agenten

- `IStakeholderRepository` (US-020) um `FindSimilarNameInProjectAsync` ergänzt — die bestehende
  `ExistsSimilarNameInProjectAsync` liefert nur einen `bool`, Akzeptanzkriterium 4 braucht aber
  Name/ID des Treffers für `similarStakeholderWarning`. `ExistsSimilarNameInProjectAsync` delegiert
  jetzt intern an die neue Methode (kein duplizierter Vergleich).
- `CreateStakeholderRequest.Name` trägt bewusst **kein** `[Required]`-Attribut: das würde einen
  rein aus Leerzeichen bestehenden Namen bereits per automatischer ASP.NET-Core-Modellvalidierung
  mit einem generischen `ProblemDetails`-Body ablehnen, statt mit dem von Akzeptanzkriterium 3
  geforderten `{"error":"NAME_REQUIRED"}` — dieser Body kommt erst aus
  `Stakeholder.Create`/`StakeholderNameRequiredError` (zweite Verteidigungslinie).
- Erster echter Einsatz von `RequireProjectRoleAttribute`/`ProjectRoleAuthorizationHandler`
  (US-007) an einem Controller — bisher nur in Unit-Tests geprüft.
- Akzeptanzkriterium 6 ("zeigt den neuen Eintrag sofort in der Liste") wird über eine rein
  clientseitig für die aktuelle Sitzung akkumulierte Liste der selbst angelegten Stakeholder
  erfüllt (direkt aus den `POST`-Responses) — eine serverseitig geladene Liste mit Suche/Filter ist
  explizit erst Gegenstand von US-025; ein `GET`-Endpoint dafür wäre ein Vorgriff auf diese Story.
  Die Navigation zur Stakeholder-Detailseite (US-026, existiert noch nicht) entfällt entsprechend
  ebenfalls für jetzt.
- `CreateStakeholderFormComponent` ersetzt den bisherigen `StakeholderListPlaceholderComponent` im
  Standard-Landingtab „Stakeholder-Liste“ der Workspace-Shell (US-019) — dieser Platzhalter ist
  damit obsolet und wurde entfernt.
- Für Rolle `User` bleibt der Tab weiterhin sichtbar (US-019 Akzeptanzkriterium 2), das Formular
  selbst wird aber nicht zusätzlich clientseitig ausgeblendet — ein Sende-Versuch liefert die
  generische Fehlermeldung „Stakeholder konnte nicht angelegt werden“ (serverseitiges `403` ist die
  eigentliche Absicherung, CLAUDE.md Abschnitt 3.1). Eine feinere UX-Behandlung für diesen Fall ist
  kein Akzeptanzkriterium dieser Story.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-021-stakeholder-anlegen`),
Auto-Merge gemäß ADR-0003 aktiviert.
