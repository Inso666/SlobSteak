**ID:** US-019
**Titel:** Projekt-Workspace-Shell mit Tab-Navigation (S3)
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-018

---

### 1. User Story

Als **Nutzer** möchte ich **nach Auswahl eines Projekts eine Workspace-Ansicht mit Header (Projektname, eigene Rollen-Badge) und Tab-Navigation (Stakeholder / Map / Verteiler) sehen**, damit **ich innerhalb eines Projekts konsistent zwischen den Kernfunktionen wechseln kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S3 — Projekt-Workspace), Abschnitt 6.3 (Navigationsstruktur)
- **Relevant für DDD:** Presentation-Schicht (Composition Root, orchestriert ProjectManagement + spätere Feature-Contexts)

### 3. Akzeptanzkriterien

- [ ] Header zeigt Projektname und ein Rollen-Badge mit der Rolle des angemeldeten Nutzers in diesem Projekt.
- [ ] Tab „Stakeholder-Liste“ ist Standard-Landingtab und für alle Rollen inkl. User sichtbar (Inhalt folgt in US-025).
- [ ] Tab „Map“ ist für Rolle `User` ausgeblendet (Platzhalter-Routing-Guard; Inhalt folgt in US-032).
- [ ] Tab „Verteiler“ ist ausschließlich für `PL`/`Coreteam` sichtbar, nicht für `Architect`/`User` (Platzhalter-Routing-Guard; Inhalt folgt in US-042).
- [ ] Direkter Aufruf einer per Tab ausgeblendeten Route liefert clientseitig eine „Kein Zugriff“-Ansicht; der zugrunde liegende API-Aufruf ist ohnehin serverseitig durch US-007 geschützt.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts`
- `frontend/src/app/core/guards/role.guard.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Tab-Sichtbarkeit folgt exakt der Berechtigungsmatrix aus Abschnitt 2.3.

### Anmerkungen des Dev-Agenten

- Neuer Backend-Endpoint `GET /api/v1/projects/{projectId}` (im bestehenden `ProjectController`
  aus US-018) liefert Projektname und eigene Rolle für Header/Rollen-Badge; `404`, wenn der Nutzer
  in diesem Projekt keine Mitgliedschaft hat — auch für Systemadmins ohne eigene Zuweisung (PRD
  Abschnitt 2.3: Admin hat keinen fachlichen Zugriff, sofern er sich nicht zusätzlich selbst einem
  Projekt zuweist). Kein Vorgriff auf eine spätere Story, notwendige Infrastruktur.
- `roleGuard` (`frontend/src/app/core/guards/role.guard.ts`) ist eine Guard-**Fabrik**
  (`roleGuard(allowedRoles)`), nicht ein einzelner Guard — damit derselbe Mechanismus sowohl die
  Mitgliedschaftsprüfung auf `/projects/:id` selbst (alle vier Rollen erlaubt) als auch die
  engeren Tab-Guards auf `map`/`distribution` abdeckt. Bei fehlender Berechtigung oder fehlender
  Mitgliedschaft (404) leitet er auf `/projects/:id/access-denied` um (Akzeptanzkriterium 5).
- Die Inhalte der drei Tabs (Stakeholder-Liste, Map, Verteiler) sind bewusst minimale
  Platzhalter-Komponenten (`StakeholderListPlaceholderComponent` usw.) — der fachliche Inhalt folgt
  in US-025 (Stakeholder-Liste), US-032 (Map) bzw. US-042 (Verteiler), wie in der Story selbst
  vermerkt.
- Kein sichtbarer globaler Navigationseinstieg zum Admin-Bereich wurde ergänzt, obwohl die Story
  ursprünglich als Ort dafür genannt war (siehe US-016/US-017-Anmerkungen) — die Workspace-Shell
  ist projektbezogen (Tabs Stakeholder/Map/Verteiler), ein globales Adminmenü passt konzeptionell
  eher zu einer künftigen App-weiten Shell/Header-Komponente außerhalb des Scopes dieser Story;
  `/admin/users` und `/admin/projects` bleiben über direkten URL-Aufruf erreichbar.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-019-projekt-workspace-shell`), Auto-Merge gemäß ADR-0003 aktiviert.
