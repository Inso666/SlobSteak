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
