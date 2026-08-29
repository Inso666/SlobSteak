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

### Anmerkungen des Agenten

- **Draggability-Regel (Akzeptanzkriterium 1/6):** `QuadrantChartComponent` erhält ein neues
  `@Input() currentUserRole` — die tatsächliche, serverseitig zugewiesene Projekt-Rolle des
  Nutzers, bewusst getrennt von `perspective` (der frei wählbaren „Meine Sicht"-Auswahl). Ein
  eigener Punkt ist genau dann draggable, wenn `perspective === currentUserRole`; da die
  eigenen Punkte (Kreise) per Definition immer aus der primären Perspektive stammen (nie aus der
  sekundären Vergleichsperspektive), deckt dieser eine Vergleich beide Teilbedingungen aus
  Akzeptanzkriterium 1 ab. Vergleichspunkte (Diamanten) erhalten im Template hart `[draggable]="false"`
  — nicht konfigurierbar, deckt Akzeptanzkriterium 1 (nie draggable, auch bei zufälliger
  Rollenübereinstimmung) sowie den Edge Case aus Akzeptanzkriterium 6 (Coreteam betrachtet
  Architect) ab.
- **Dokumentierte Ergänzung zu SPEC-04 §2.2 (CLAUDE.md Abschnitt 6):** Der aggregierte
  Map-Response-Contract (`GET .../map`/`.../map/compare`, US-031/US-033) transportiert bewusst nur
  Koordinaten, keine Assessment-Version. Damit der Drag&Drop-Endpoint dennoch mit einer „aktuellen"
  `expectedVersion` aufgerufen werden kann (Akzeptanzkriterium 3), ohne den bereits abgenommenen
  Map-Response-Contract rückwirkend zu erweitern, holt `AssessmentsService.updatePosition(...)`
  die Version unmittelbar vor dem Schreiben frisch über den bestehenden `GET .../assessments`-
  Endpoint (US-028) — kein neuer Backend-Endpoint nötig, und ein kürzeres Konflikt-Zeitfenster als
  eine beim Map-Laden zwischengespeicherte Version.
- **Dokumentierte Abweichung von SPEC-04 §3.7 (p-toast):** Der bestehende Map-Screen (US-032)
  zeigt Ladefehler bereits über ein inline `<p class="load-error" role="alert">`-Muster; eine
  `p-toast`/`MessageService`-Infrastruktur ist im Projekt bisher nirgends registriert. Um nicht für
  eine einzelne Story eine neue globale Infrastruktur einzuführen und zwei parallele
  Fehlerdarstellungen im selben Screen zu vermeiden, zeigt ein fehlgeschlagener Drag-Speichervorgang
  (kein 409) ebenfalls ein inline `<p class="drag-error" role="alert">` mit denselben Fehler-Tokens.
  Der 409-Konfliktfall verwendet unverändert die wiederverwendete `AssessmentConflictDialogComponent`
  (US-029) — hierin besteht keine Abweichung.
- **Optimistisches Rendering + Rollback (SPEC-04 §2.2/§3.7):** `StakeholderMapPageComponent`
  übernimmt eine gemeldete Positionsänderung sofort optimistisch in `points`/`comparisonEntries`,
  bevor der Speicher-Request beobachtet wird; schlägt er fehl (409 oder allgemeiner Fehler), wird
  der zuvor gesicherte Wert wiederhergestellt — der Punkt „springt" dadurch visuell zurück, ohne
  dass `DraggablePointComponent` selbst den Erfolg/Misserfolg kennen muss.
- **Zoom/Pan-Umrechnung ohne manuelle Zoom-Faktor-Rechnung:** Die Pixel→Prozent-Umrechnung in
  `DraggablePointComponent` liest die tatsächliche, bereits per CSS `transform` (Zoom/Pan)
  veränderte Bounding-Box der `plotSurface`-Fläche — dadurch ist unabhängig vom aktuellen
  Zoom-Level keine zusätzliche Rechnung nötig. Die Transform-Reihenfolge `translate() scale()` hält
  den Pan-Versatz unabhängig vom Zoom-Faktor in echten Bildschirm-Pixeln (siehe Kommentar in
  `quadrant-chart.component.css`).
- Punkt-spezifische CSS-Regeln (`.map-point*`) sind von `quadrant-chart.component.css` nach
  `draggable-point.component.css` gewandert, da das Punkt-Markup jetzt in der eigenständigen
  `DraggablePointComponent` lebt (Angular View-Encapsulation greift nicht über
  Komponentengrenzen hinweg).

### Status

Fertig am 29.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-036-map-dragdrop-ui`),
Auto-Merge gemäß ADR-0003 aktiviert.
