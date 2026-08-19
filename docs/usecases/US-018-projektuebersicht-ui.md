**ID:** US-018
**Titel:** Projektübersicht-Screen (S2)
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-010, US-011, US-017

---

### 1. User Story

Als **Nutzer** möchte ich **nach dem Login eine Kartenübersicht der mir zugewiesenen Projekte mit meiner jeweiligen Rolle sehen**, damit **ich schnell in das gewünschte Projekt wechseln kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S2 — Projektübersicht)
- **Relevant für DDD:** Presentation-Schicht, Read-Modell `ProjectOverviewQuery` (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/projects` liefert für den angemeldeten Nutzer ausschließlich Projekte, in denen er eine `project_membership` hat, jeweils mit `role` und `stakeholderCount`.
- [ ] Systemadmins sehen zusätzlich einen Tab/Bereich „Alle Projekte“, der `GET /api/v1/admin/projects` (alle Projekte, unabhängig von Mitgliedschaft) abfragt.
- [ ] Jede Projektkarte zeigt Projektname, eigene Rolle im Projekt und Anzahl Stakeholder; Klick navigiert zum Projekt-Workspace (S3, siehe US-019).
- [ ] CTA „Neues Projekt“ ist ausschließlich für Systemadmins sichtbar.
- [ ] Nutzer ohne jegliche Projektzuweisung sieht eine Leerzustand-Meldung statt einer leeren Kartenliste.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/projects/project-overview/project-overview.component.ts`
- `src/SlobSteak.Api/Controllers/ProjectController.cs` (`GET /api/v1/projects`)
- `src/SlobSteak.Application/Projects/ProjectOverviewQuery.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nicht-Admin-Nutzer sehen ausschließlich Projekte mit eigener Mitgliedschaft (kein Zugriff auf fremde Projekte über diese Liste).

### Anmerkungen des Dev-Agenten

- `GET /api/v1/projects` ist als reines Read-Modell umgesetzt: `IProjectOverviewQuery` liegt
  bewusst in `SlobSteak.Domain.Projects` (nicht `SlobSteak.Application`, wie der Name
  `ProjectOverviewQuery.cs` in den technischen Hinweisen zunächst vermuten lassen könnte) — die
  Infrastructure-Implementierung darf laut CLAUDE.md Abschnitt 3.1 nur auf `SlobSteak.Domain`
  referenzieren, nicht auf `SlobSteak.Application`, analog zu `IProjectRepository`.
- Die Stakeholder-Zählung greift direkt auf das seit US-003 migrierte `Stakeholders`-DbSet zu
  (`DeletedAt == null`), ohne über ein `IStakeholderRepository` zu gehen — das existiert erst ab
  US-020 (siehe `docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md`). Als reines,
  lastarmes Read-Modell (keine Aggregate-Rekonstruktion) ist das zulässig; sobald US-020 landet,
  liefert dieselbe Query automatisch korrekte Werte für tatsächlich angelegte Stakeholder.
- Neuer `authGuard` (jede gültige Session) ergänzt den bestehenden `adminGuard` (zusätzlich
  `isSystemAdmin`) für die `/projects`-Route.
- Klick auf eine Projektkarte navigiert zu `/projects/:id` (Projekt-Workspace, S3) — diese Route
  entsteht erst mit US-019; aktuell ohne Treffer, analog zum Zwischenzustand, den `/projects`
  selbst zwischen US-009 und dieser Story hatte (siehe Anmerkungen dort).
- CTA „Neues Projekt“ (Akzeptanzkriterium 4) navigiert zur bestehenden Projektanlage aus US-017
  (`/admin/projects`) statt ein eigenes Formular zu duplizieren — die Story spezifiziert keinen
  eigenen Anlage-Dialog auf diesem Screen.
- Tab „Alle Projekte“ (Akzeptanzkriterium 2) fragt den bestehenden `GET /api/v1/admin/projects`
  aus US-017 ab (`AdminProjectsService` wiederverwendet) statt einen neuen Endpoint zu duplizieren.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-018-projektuebersicht-ui`), Auto-Merge gemäß ADR-0003 aktiviert.
