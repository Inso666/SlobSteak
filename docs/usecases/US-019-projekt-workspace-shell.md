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
