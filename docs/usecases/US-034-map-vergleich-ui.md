**ID:** US-034
**Titel:** Vergleichsmodus-UI (zwei Punkte, Verbindungslinie, Legende, Diff)
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-033, US-032

---

### 1. User Story

Als **Nutzer** möchte ich **zwei Perspektiven gleichzeitig auf der Map aktivieren und Wahrnehmungsunterschiede zwischen Rollen visuell erkennen**, damit **ich divergierende Einschätzungen zwischen Rollen proaktiv ansprechen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.2
- **Relevant für DDD:** Presentation-Schicht (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [ ] Ein zweites Dropdown aktiviert eine Vergleichsperspektive und ruft `GET .../map/compare` auf.
- [ ] Für Stakeholder mit Assessment in beiden Perspektiven werden zwei visuell unterschiedene Punkte (Form oder Farbe je Rolle) sowie eine Verbindungslinie zwischen ihnen gerendert.
- [ ] Für Stakeholder mit Assessment nur in einer der beiden Perspektiven wird genau ein Punkt ohne Verbindungslinie gerendert.
- [ ] Eine Legende erklärt die Farb-/Formcodierung je Rolle.
- [ ] Hover/Klick auf eine Verbindungslinie zeigt ein Tooltip/Popover mit der konkreten Differenz, z. B. „Einfluss: PL 30 vs. Architect 75“.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/map/comparison-mode-toggle/comparison-mode-toggle.component.ts`
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts` (Erweiterung um Vergleichs-Rendering)
- `frontend/src/app/features/map/connection-line-tooltip/connection-line-tooltip.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Punktkodierung ist konsistent zwischen Legende und Chart (gleiche Farb-/Form-Zuordnung je Rolle).
