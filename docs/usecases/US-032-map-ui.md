**ID:** US-032
**Titel:** Map-UI Quadranten-Diagramm mit Perspektiv-Dropdown
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-031, US-019

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **meine Stakeholder als Quadranten-Diagramm (Einfluss × Interesse) sehen, um Prioritäten auf einen Blick zu erkennen**, damit **ich meine Steuerungsgespräche gezielt vorbereiten kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.1
- **Relevant für DDD:** Presentation-Schicht (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [ ] X-Achse zeigt „Einfluss“ (0–100), Y-Achse „Interesse“ (0–100); bei 50/50 sind vier Quadranten visuell getrennt und mit „Eng betreuen“, „Zufriedenstellen“, „Informiert halten“, „Beobachten“ beschriftet.
- [ ] Ein Dropdown wählt die Perspektive (`PL`/`Coreteam`/`Architect`); Standardauswahl ist die eigene Projekt-Rolle des angemeldeten Nutzers.
- [ ] Jeder Punkt repräsentiert einen Stakeholder aus der Map-Query (US-031); Klick auf einen Punkt navigiert zur Stakeholder-Detailseite (US-026).
- [ ] Tab „Map“ ist in der Sidebar/Workspace-Navigation für Rolle `User` ausgeblendet (Konsistenz mit US-019/US-030/US-031).
- [ ] Komponententest deckt Rendering mit leerer Datenmenge (Leerzustand) und mit ≥1 Punkt ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.ts`
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts`
- `frontend/src/app/features/map/map.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Standard-Perspektive entspricht der eigenen Rolle des angemeldeten Nutzers.
