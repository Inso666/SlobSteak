**ID:** US-036
**Titel:** Drag & Drop UI inkl. Zoom/Pan
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-035, US-034

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **einen Stakeholder-Punkt direkt in der Map verschieben können, um meine Einschätzung schnell anzupassen, ohne ein Formular zu öffnen**, damit **ich meine Bewertung intuitiv und schnell aktualisieren kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.3
- **Relevant für DDD:** Presentation-Schicht (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [ ] Drag & Drop ist ausschließlich für Punkte der Perspektive aktiv, die (a) der eigenen Rolle des Nutzers entspricht **und** (b) im Vergleichsmodus die primäre (erste) Perspektive ist; Punkte der sekundären Vergleichsperspektive sind nie draggable, auch wenn sie zufällig der eigenen Rolle entsprechen.
- [ ] Nicht-draggable Punkte sind visuell erkennbar (reduzierte Deckkraft und/oder gesperrter Cursor beim Hover).
- [ ] Während des Ziehens wird die Position in Echtzeit in Einfluss-/Interesse-Werte umgerechnet und im UI angezeigt; nach Loslassen wird `PUT .../assessments/{role}` mit den neuen Werten und aktueller `expectedVersion` aufgerufen.
- [ ] Liefert der Server `409 Conflict`, erscheint derselbe Konfliktdialog wie in US-029 (Wiederverwendung der Komponente `AssessmentConflictDialog`).
- [ ] Map unterstützt Zoom/Pan, um nah beieinanderliegende Punkte präzise zu greifen (Komponententest simuliert zwei Punkte bei identischer Position 50/50).
- [ ] Ein Nutzer mit Rolle `Coreteam`, der die Map in Perspektive „Architect“ betrachtet (nicht seine eigene), kann keinen Punkt verschieben, selbst wenn technisch ein Coreteam-Assessment existiert.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/map/draggable-point/draggable-point.component.ts`
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts` (Erweiterung um Drag-Handler, Zoom/Pan)

**Wichtige Invarianten & Validierungsregeln:**

- Draggability folgt exakt der Regel: eigene Rolle **und** primäre Perspektive im Vergleichsmodus (F3.3).
