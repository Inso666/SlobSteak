# SPEC: Stakeholder-Map / Perspektiven-Radar

> Screen S3, Tab „Map" im Projekt-Workspace. Feature-Referenz F3.1–F3.3 (siehe `docs/PRD-SlobSteak.md`).
> Quelle: Design-Canvas-Wireframe `Map.dc.html`, Vergleichsmodus aktiv dargestellt (komplexerer Fall).
> Vorschlag für den Feature-Ordner (nicht verbindlich, vom Frontend-Agenten gegen das bestehende Schema zu prüfen): `frontend/src/app/features/stakeholder-map/`.

Diese Spezifikation beschreibt ausschließlich den Inhalt des Tabs „Map" innerhalb des Projekt-Workspace. Sidebar, Projekt-Navigation und Kopfbereich (`Projektübersicht`, `Stakeholder-Liste`, `Verteiler`, `Admin-Bereich`, User-Card) sind Bestandteil der bestehenden App-Shell und werden hier nicht neu spezifiziert — mit Ausnahme der rollenbasierten Sichtbarkeitsregel für den Sub-Nav-Eintrag „Map" (siehe Abschnitt 3).

---

## 1. PrimeNG Component Tree & Layout

Layout-Basis: PrimeFlex-Utilities (`flex`, `flex-column`, `gap-*`, `align-items-center`, `justify-content-between`, `flex-wrap`, `w-full`), keine hartkodierten Pixelwerte. Farben ausschließlich über PrimeNG-CSS-Variablen (`var(--surface-card)`, `var(--surface-border)`, `var(--surface-ground)`, `var(--text-color)`, `var(--text-color-secondary)`, `var(--primary-color)`) sowie über projektweite Rollenfarb-Tokens (siehe Hinweis am Ende dieses Abschnitts).

```
<app-stakeholder-map-page>                                  (Routed Standalone Component, Route: /projects/:projectId/map)
├── p-toast                                                 (position="top-right"; global Fehler-/Erfolgsmeldungen, z. B. Drag-Konflikt)
│
├── div.head [flex align-items-center gap-3]
│   ├── h1.page-title  "{{ project.name }}"                 (display, kein PrimeNG-Element)
│   └── p-tag  [value]="'PL'" [rounded]="true"               (Rollen-Badge des eingeloggten Users im Projekt)
│
├── form [formGroup]="mapFilterForm"  div.toolbar [flex align-items-center gap-3 flex-wrap]
│   ├── div.field [flex align-items-center gap-2]
│   │   ├── label  "Meine Sicht:"
│   │   └── p-select  formControlName="ownPerspective"
│   │         [options]="perspectiveOptions" optionLabel="label" optionValue="value"
│   │         [style]="{minWidth:'140px'}"
│   │
│   ├── div.field [flex align-items-center gap-2]
│   │   ├── label  for="compareMode"  "Vergleichsmodus"
│   │   └── p-toggleswitch  inputId="compareMode"  formControlName="compareMode"
│   │
│   ├── div.field [flex align-items-center gap-2]  *ngIf/[class.hidden] gesteuert über compareMode==true
│   │   ├── label  "Vergleichen mit:"
│   │   └── p-select  formControlName="comparePerspective"
│   │         [options]="comparePerspectiveOptions" optionLabel="label" optionValue="value"
│   │         [disabled]="!mapFilterForm.value.compareMode"
│   │
│   ├── div.spacer [flex-1]
│   └── span.info-text.mono  "{{ visibleCount }} von {{ totalCount }} Stakeholdern sichtbar"
│
├── div.content [flex gap-4]  (min-height:0, flex:1 — Scroll-Container für den Canvas-Bereich)
│   │
│   ├── p-card.map-card  [styleClass]="'surface-card'"      (Container für Achsen + Zeichenfläche)
│   │     ng-template pTemplate="content"
│   │     ├── span.y-axis-title  "Interesse →"               (vertical-rl, reines Layout-Element, kein PrimeNG)
│   │     ├── div.y-ticks.mono  "100 / 75 / 50 / 25 / 0"      (statische Achsenbeschriftung, generiert aus Skalenkonfiguration)
│   │     │
│   │     └── div.plot-col [flex flex-column]
│   │         ├── app-stakeholder-map-canvas                 (CUSTOM COMPONENT — siehe Vertrag unten; SVG-basiert)
│   │         │     [points]="mapPoints$ | async"
│   │         │     [connections]="mapConnections$ | async"
│   │         │     [compareMode]="mapFilterForm.value.compareMode"
│   │         │     [zoom]="zoomState.level"
│   │         │     [pan]="zoomState.offset"
│   │         │     [selectedConnectionId]="selectedConnectionId"
│   │         │     [loading]="isLoading"
│   │         │     (pointDragEnd)="onPointMoved($event)"
│   │         │     (connectionSelected)="onConnectionSelected($event)"
│   │         │     (zoomPanChange)="onZoomPanChange($event)"
│   │         │     — enthält intern: Quadranten-Linien (gestrichelt), Quadranten-Labels
│   │         │       ("Informiert halten", "Eng betreuen", "Beobachten", "Zufriedenstellen"),
│   │         │       Punkte (Kreis/Diamant), Verbindungslinien, Zoom/Pan-Viewport
│   │         │
│   │         │     └── (innerhalb der Canvas, als Overlay) div.zoom-cluster [flex flex-column]
│   │         │           ├── p-button  icon="pi pi-plus"    [text]="true" [rounded]="false" (aria-label="Vergrößern")   (click)="canvas.zoomIn()"
│   │         │           ├── p-button  icon="pi pi-minus"   [text]="true" [rounded]="false" (aria-label="Verkleinern")  (click)="canvas.zoomOut()"
│   │         │           └── p-button  icon="pi pi-refresh" [text]="true" [rounded]="false" (aria-label="Ansicht zurücksetzen") (click)="canvas.resetView()"
│   │         │
│   │         ├── div.x-ticks.mono  "0 / 25 / 50 / 75 / 100"
│   │         └── span.x-axis-title  "Einfluss →"
│   │
│   │     ng-template pTemplate="content" (Ladezustand, alternativ zum obigen Block)
│   │     └── p-skeleton  width="100%" height="640px"  styleClass="border-round"   (siehe UI-State „Loading")
│   │
│   │     ng-template pTemplate="content" (Empty-State, alternativ)
│   │     └── app-map-empty-state                            (siehe UI-State „Empty")
│   │
│   └── aside.legend-col [flex flex-column gap-3, w-19rem]
│       │
│       ├── p-panel  header="Legende"  [toggleable]="false"
│       │     ├── div.legend-row  span.lswatch(circle, role="own")  "PL — deine Sicht (ziehbar)"
│       │     ├── div.legend-row  span.lswatch(diamond, role="compare")  "Architect — Vergleich (nicht ziehbar)"
│       │     ├── div.legend-row  span.lswatch(dashed-line)  "Verbindungslinie — Bewertung in beiden Sichten"
│       │     └── p.legend-note  "Punkte ohne Bewertung in einer der gewählten Perspektiven zeigen keine Linie.
│       │                          Stakeholder ganz ohne Bewertung in beiden Sichten erscheinen nicht auf der Map."
│       │
│       └── p-panel  [header]="'Ausgewählte Verbindung — ' + selectedConnection?.stakeholderName"
│             *ngIf="selectedConnection"                     (Panel erscheint nur bei aktiver Auswahl/Hover; siehe Abschnitt 3)
│             ├── div.diff-row (Einfluss)
│             │     ├── span.k  "Einfluss"
│             │     └── div.diff-vals.mono
│             │           span.pl "PL {{ selectedConnection.influence.own }}"
│             │           span.ar "Architect {{ selectedConnection.influence.compare }}"
│             │           p-tag [value]="'Δ ' + selectedConnection.influence.delta" severity="warn"
│             ├── div.diff-row (Interesse)  — analog zu Einfluss
│             └── p.diff-hint  "Klick auf eine Verbindungslinie füllt diese Ansicht;
│                                Hover zeigt dieselbe Differenz als Tooltip direkt an der Linie."
│
└── (Route Guard, außerhalb des Component Trees) MapTabRoleGuard  — siehe Abschnitt 3, Sichtbarkeitsregel
```

### Custom Component: `app-stakeholder-map-canvas`

Die eigentliche 2D-Zeichenfläche (Quadranten-Raster, ziehbare Punkte, Verbindungslinien, Zoom/Pan) ist **keine PrimeNG-Komponente** und wird als eigenständige, SVG-basierte Custom-Komponente gebaut (Canvas-2D-API ist eine denkbare Alternative, SVG wird wegen Hit-Testing/Accessibility/Tooltip-Integration empfohlen).

**Inputs:**
- `points: MapPoint[]` — `{ stakeholderId, stakeholderName, perspectiveRole, influence: number(0–100), interest: number(0–100), kind: 'own' | 'compare', draggable: boolean }`
- `connections: MapConnection[]` — `{ id, stakeholderId, stakeholderName, ownPoint: MapPoint, comparePoint: MapPoint, influenceDelta, interestDelta }` (nur befüllt, wenn `compareMode === true` und beide Seiten eine Bewertung haben)
- `compareMode: boolean`
- `zoom: number`, `pan: { x: number; y: number }`
- `selectedConnectionId: string | null`
- `loading: boolean`

**Outputs:**
- `pointDragEnd: EventEmitter<{ stakeholderId: string; perspectiveRole: string; influence: number; interest: number }>`
- `connectionSelected: EventEmitter<{ connectionId: string }>` — Klick auf eine Verbindungslinie
- `connectionHovered: EventEmitter<{ connectionId: string | null }>` — für Tooltip-Anzeige der Differenz direkt an der Linie
- `zoomPanChange: EventEmitter<{ zoom: number; pan: { x: number; y: number } }>`

**Öffentliche Methoden** (für die externen Zoom-Buttons): `zoomIn()`, `zoomOut()`, `resetView()`.

Konsistenzhinweis: Dieselbe Punkt-/Rollenfarb-Darstellung (gefüllter Kreis mit hellem Ring = eigene Sicht, Diamant mit reduzierter Deckkraft = Vergleichssicht) wird laut Design-Notiz auch in der Stakeholder-Liste und im „Perspektiven-Radar" der Komponentenbibliothek verwendet. Diese Visualisierungslogik ist daher **nicht neu zu erfinden**, sondern als geteiltes, wiederverwendbares Darstellungs-/Token-Set zu implementieren (z. B. gemeinsame Rollenfarb-Tokens/SCSS-Mixin, das von beiden Screens referenziert wird), statt lokal im Map-Feature dupliziert zu werden.

**Design-Tokens (Rollenfarben):** Das Wireframe definiert eigene CSS-Variablen (`--role-pl`, `--role-ct`, `--role-ar`) für die Rollenfarben der Perspektiven. Diese sind projektspezifische, nicht aus PrimeNG stammende Tokens — sie sind zentral (z. B. in einer globalen `_role-colors.scss`/Theme-Erweiterung) zu definieren und von Map-Canvas, Legende und Diff-Panel gemeinsam referenziert, nicht als Hex-Werte in der Komponente hartzukodieren. Alle übrigen Flächen/Rahmen/Text-Farben nutzen Standard-PrimeNG-Surface-Variablen (`var(--surface-card)`, `var(--surface-border)`, `var(--text-color-secondary)`).

---

## 2. Forms, Directives & Validation

### 2.1 Filter-/Auswahlformular (Reactive Forms)

```ts
mapFilterForm = new FormGroup({
  ownPerspective:     new FormControl<PerspectiveRole>(currentUserRoleInProject, { nonNullable: true, validators: [Validators.required] }),
  compareMode:        new FormControl<boolean>(false, { nonNullable: true }),
  comparePerspective: new FormControl<PerspectiveRole | null>(null),
});
```

- `comparePerspective` erhält einen **bedingten Validator**: `Validators.required`, sobald `compareMode === true`; wird deaktiviert/zurückgesetzt (`disable()` + `setValue(null)`), wenn `compareMode === false`. Umsetzung z. B. über eine `valueChanges`-Subscription auf `compareMode`, die `comparePerspective.setValidators(...)` bzw. `.updateValueAndValidity()` neu setzt — keine statische Validator-Definition, da abhängig von einem Geschwister-Control.
- Es ist **zulässig**, dass `comparePerspective === ownPerspective` gewählt wird (F3.3, Edge Case „zufällige Rollenübereinstimmung") — hierfür existiert **keine** Validierungsregel, die dies verhindert; die Interaktionsregel „Vergleichspunkt nie ziehbar" wird ausschließlich im Canvas (Abschnitt 3) durchgesetzt, nicht im Formular.
- `mapFilterForm.valueChanges` (kombiniert mit `distinctUntilChanged`/`debounceTime` für den Select-Wechsel) triggert den Reload der Map-Daten über einen Service-Call (`StakeholderMapService.getMapData(projectId, ownPerspective, compareMode ? comparePerspective : null)`).
- `ownPerspective`-Optionsliste (`perspectiveOptions`) wird serverseitig aus den im Projekt vorhandenen Perspektiven-Rollen geladen, nicht hartkodiert im Frontend.

### 2.2 Drag-Interaktion (kein Formularfeld)

Das Verschieben eines eigenen Punkts ist **keine klassische Formulareingabe**, sondern ein Drag-Gesture innerhalb von `app-stakeholder-map-canvas`. Vertrag:

```html
<app-stakeholder-map-canvas
  ...
  (pointDragEnd)="onPointMoved($event)">
</app-stakeholder-map-canvas>
```

```ts
onPointMoved(event: { stakeholderId: string; perspectiveRole: string; influence: number; interest: number }): void {
  // 1. Optimistisches Rendering: Canvas hat den Punkt bereits visuell an neuer Position
  // 2. Persistierung über bestehenden Assessment-Endpoint (vgl. US-028, Optimistic-Locking-Konfliktregel)
  this.assessmentService.updatePosition(event.stakeholderId, event.perspectiveRole, {
    influence: event.influence,
    interest: event.interest,
  }).subscribe({
    next: () => { /* Position bestätigt, ggf. Concurrency-Token aktualisieren */ },
    error: (err) => this.onDragSaveError(event, err),   // siehe Error-State, Abschnitt 3
  });
}
```

- Der Service-Call nutzt den bestehenden Assessment-Update-Endpoint inklusive dessen Optimistic-Locking-Mechanismus (bereits umgesetzt, siehe US-028) — es wird **kein neuer** Persistenz-Mechanismus für die Map eingeführt.
- Werte für `influence`/`interest` werden vom Canvas aus Pixel-Koordinaten in die 0–100-Skala umgerechnet und geklemmt (`clamp(0, 100)`), bevor sie emittiert werden.

### 2.3 Barrierefreiheits-Alternative zu Drag&Drop (WCAG 2.1 AA)

Reines Drag&Drop ist nicht tastaturbedienbar und daher allein nicht ausreichend. Verbindlich vorzusehen:

- Jeder ziehbare Punkt ist fokussierbar (`tabindex="0"`, Rolle `role="button"` oder äquivalent) und per **Pfeiltasten** in Einfluss-/Interesse-Schritten (z. B. ±1, mit Shift ±10) verschiebbar; jede Pfeiltasten-Bewegung löst denselben `pointDragEnd`-Vertrag aus wie ein Maus-Drop, sobald die Fokus-Bewegung „committed" wird (z. B. `Enter`/Blur bestätigt, `Escape` verwirft).
- Zusätzlich (empfohlen als robustere Alternative statt reiner Pfeiltasten-Feinsteuerung): eine **alternative Formular-Eingabe** der Position — z. B. ein per Tastatur erreichbarer „Position bearbeiten"-Button je Punkt, der einen `p-dialog` mit zwei `p-inputnumber`-Feldern (`Einfluss`, `Interesse`, `[min]="0" [max]="100"`) öffnet und beim Speichern denselben `AssessmentService.updatePosition(...)`-Call auslöst.
- Der Diamant (Vergleichspunkt) ist von dieser Tastatur-Alternative **ausgenommen**, da er grundsätzlich nie editierbar ist (siehe Interaktionsregel, Abschnitt 3).

---

## 3. UI States & Event Handling

### 3.1 Fixe Interaktionsregeln (kein UI-State, gilt immer)

- **Eigener Punkt** (gefüllter Kreis mit hellem Ring, `kind: 'own'`) ist **immer ziehbar** (Maus-Drag und Tastatur-Alternative gemäß 2.3).
- **Vergleichspunkt** (Diamant, reduzierte Deckkraft, `kind: 'compare'`) ist **niemals ziehbar** — auch dann nicht, wenn `comparePerspective === ownPerspective` zufällig zutrifft (F3.3). Diese Regel wird hart im Canvas kodiert (`draggable` wird für `kind: 'compare'`-Punkte nie auf `true` gesetzt, unabhängig vom Rollenwert) und ist keine konfigurierbare/umschaltbare Eigenschaft.
- Cursor-Feedback: `cursor: grab` (bzw. `grabbing` während Drag) auf eigenen Punkten, `cursor: not-allowed` auf Vergleichspunkten.

### 3.2 Default-State (Basis-Ansicht, `compareMode === false`)

- Nur eigene Punkte (Kreise) der in „Meine Sicht" gewählten Perspektive werden gerendert.
- Diamanten, Verbindungslinien und das Diff-Panel „Ausgewählte Verbindung" sind **nicht vorhanden** (nicht nur ausgeblendet — sie werden gar nicht ins DOM/SVG gerendert, da `connections` in diesem Zustand leer ist).
- Feld „Vergleichen mit" ist deaktiviert/ausgeblendet oder zumindest visuell inaktiv, solange `compareMode === false`.
- Legende zeigt weiterhin alle drei Einträge (informativ, auch wenn Vergleich gerade inaktiv ist) — Ausnahme ist Ermessensfrage des Frontend-Agenten; alternativ Vergleichs-/Linien-Legendenzeile ausblenden, wenn `compareMode === false`.

### 3.3 Vergleichsmodus-aktiv-State (`compareMode === true`)

- Zusätzlich zu den eigenen Punkten werden Diamanten der gewählten Vergleichsperspektive sowie gestrichelte Verbindungslinien zwischen Punktpaaren mit Bewertung in **beiden** Perspektiven gerendert.
- Punkte ohne Bewertung in einer der beiden gewählten Perspektiven zeigen **keine** Verbindungslinie (siehe `legend-note`-Text, wortgleich zu übernehmen).
- Stakeholder ganz ohne Bewertung in beiden gewählten Sichten erscheinen **nicht** auf der Map (weder Kreis noch Diamant).
- `(connectionHovered)`: Hover über eine Verbindungslinie zeigt die Differenz (Einfluss-/Interesse-Delta) als Tooltip direkt an der Linie (z. B. `p-tooltip` oder eigenes SVG-`<title>`/Overlay).
- `(connectionSelected)`: Klick auf eine Verbindungslinie setzt `selectedConnectionId` und füllt das Panel „Ausgewählte Verbindung — {{ stakeholderName }}" mit den PL-/Vergleichswerten und der Delta-Anzeige je Achse (Einfluss, Interesse).
- Beim Umschalten von `compareMode: true → false` werden `selectedConnectionId` und das Diff-Panel zurückgesetzt.

### 3.4 Edge Case: dicht beieinanderliegende Punkte (Zoom/Pan-Bedarf)

- Wenn zwei oder mehr Punkte (z. B. eigener Kreis und Vergleichs-Diamant desselben Stakeholders, siehe Beispiel „Systemhaus Nord GmbH" im Wireframe) so nah beieinanderliegen, dass Hover/Klick/Drag nicht mehr eindeutig einem Punkt zuordenbar ist, ist Zoom/Pan die vorgesehene Lösung — **kein** automatisches Auseinanderschieben der Punkte (keine „Jitter"-Logik), da dies die tatsächlichen Werte verfälschen würde.
- Zoom-Cluster-Buttons (`+`, `−`, Reset) steuern `zoomState` (`level`, `offset`); Pan erfolgt zusätzlich per Maus-Drag auf leerer Canvas-Fläche (nicht auf einem Punkt) bzw. per Touch/Trackpad-Geste.
- Zoom/Pan-State ist reiner Präsentations-State (nicht persistiert, nicht Teil des Formulars) und wird beim Verlassen/Neuladen des Tabs zurückgesetzt, sofern nicht anders vom UX/UI-Agenten spezifiziert.

### 3.5 Loading-State

- Beim initialen Laden bzw. beim Neuladen nach Filteränderung (`ownPerspective`/`comparePerspective`/`compareMode`-Wechsel) wird die Zeichenfläche durch `p-skeleton` (Platzhalter in Canvas-Maßen) ersetzt; Toolbar bleibt bedienbar, Selects zeigen ggf. eigenen Ladezustand (`[loading]` an `p-select`, falls Optionslisten selbst nachgeladen werden).
- Legende bleibt sichtbar (statischer Inhalt, kein Ladezustand nötig); Diff-Panel wird ausgeblendet, solange geladen wird.

### 3.6 Empty-State

- Bedingung: keine Stakeholder mit Bewertung in der gewählten Perspektive (bzw. in keiner der beiden gewählten Perspektiven bei aktivem Vergleichsmodus) vorhanden.
- Darstellung: `app-map-empty-state` anstelle der Zeichenfläche — z. B. `p-message severity="info"` oder zentriertes Panel mit Hinweistext (Wortlaut vom UX/UI-Agenten final festzulegen; sinngemäß „Für diese Perspektive liegen noch keine Bewertungen vor") und optionalem Link/Button zurück zur „Stakeholder-Liste" bzw. zum Bewertungs-Tab (Assessment, vgl. US-029).
- Achsen (Y-/X-Ticks, Achsentitel) und Quadranten-Labels können informativ weiter angezeigt werden, um den Kontext („leeres Koordinatensystem") zu erhalten — Entscheidung liegt beim Frontend-/UX-Agenten, sofern nicht separat spezifiziert.

### 3.7 Error-State

- **Drag-Speicherfehler / Optimistic-Locking-Konflikt** (z. B. ein anderer Nutzer hat die Bewertung zwischenzeitlich geändert): `pointDragEnd` löst den Service-Call aus, dieser scheitert → `p-toast` mit `severity="error"` und Meldung (z. B. „Position konnte nicht gespeichert werden — Bewertung wurde zwischenzeitlich geändert."); der Punkt springt **visuell zurück** auf die zuletzt bestätigte Position (kein optimistisches Verharren auf der fehlerhaften Position). Bei Konflikt ist zu prüfen, ob ein Reload der betroffenen Bewertung angeboten wird (Konsistenz mit dem bestehenden Optimistic-Locking-Verhalten aus US-028).
- **Allgemeiner Ladefehler** (Map-Daten nicht abrufbar): `p-toast` `severity="error"` plus Fallback-Anzeige anstelle der Zeichenfläche (z. B. `p-message severity="error"` mit „Erneut versuchen"-Button, der den letzten Service-Call wiederholt).
- Toast-Meldungen erscheinen zusätzlich zum ggf. bereits sichtbaren Zustand (Default/Vergleichsmodus) — sie ersetzen nicht die gesamte Ansicht, außer beim allgemeinen Ladefehler.

### 3.8 Rollenbasierte Sichtbarkeit „Map"-Tab

- Rolle **User**: Der komplette Tab „Map" ist **ausgeblendet**, nicht nur deaktiviert/disabled — der Sub-Nav-Eintrag „Map" wird für diese Rolle gar nicht gerendert (`*ngIf`/Structural Directive auf Basis der Projekt-Rolle, kein rein CSS-basiertes Verstecken).
- Die Route (`/projects/:projectId/map`) wird zusätzlich durch einen `CanActivate`-Route-Guard (`MapTabRoleGuard`) geschützt, der bei Rolle „User" auf eine erlaubte Route umleitet (z. B. „Stakeholder-Liste" oder 403-Seite).
- Diese Frontend-Sichtbarkeitsregel ist **ausschließlich UX-Schicht** und **kein Ersatz** für den serverseitigen Schutz des zugrunde liegenden API-Endpunkts — die Route ist laut Design-Notiz „serverseitig geschützt"; das Frontend darf sich nicht allein auf Client-seitige Sichtbarkeit verlassen (Backend liefert bei fehlender Berechtigung 403, Frontend behandelt dies wie den allgemeinen Error-State).

---

## 4. Acceptance Criteria (DoD)

- [ ] **F3.1 Basis-Ansicht:** Mit `compareMode = false` zeigt die Map ausschließlich eigene Punkte (Kreise, ziehbar) der in „Meine Sicht" gewählten Perspektive; keine Diamanten, keine Verbindungslinien, kein Diff-Panel im DOM.
- [ ] **F3.2 Vergleichsmodus:** Aktivieren von `compareMode` und Auswahl einer Perspektive in „Vergleichen mit" ergänzt die Map um Diamanten (Vergleichspunkte, reduzierte Deckkraft) und gestrichelte Verbindungslinien für Stakeholder mit Bewertung in beiden gewählten Perspektiven; Stakeholder ohne Doppelbewertung zeigen keine Linie; Stakeholder ganz ohne Bewertung in beiden Sichten erscheinen nicht.
- [ ] **F3.3 Ziehbarkeits-Regel:** Eigene Punkte sind per Maus-Drag **und** per Tastatur (Pfeiltasten oder alternative Positions-Eingabe) verschiebbar; jede Positionsänderung persistiert über den bestehenden Assessment-Update-Endpoint. Vergleichspunkte (Diamanten) sind unter keiner Bedingung ziehbar — dies gilt nachweislich auch dann, wenn `comparePerspective === ownPerspective` gewählt wird (automatisierter Test deckt genau diesen Edge Case ab).
- [ ] **Zoom/Pan bei dicht beieinanderliegenden Punkten:** Zoom-In/-Out/Reset-Controls sind bedienbar; bei zwei nah beieinanderliegenden Punkten (Testfall analog „Systemhaus Nord GmbH") lassen sich beide nach Zoom eindeutig einzeln selektieren/ziehen bzw. deren Diamant separat hovern.
- [ ] **Diff-Panel:** Klick auf eine Verbindungslinie befüllt das Panel „Ausgewählte Verbindung" mit den PL-/Vergleichswerten und der Delta-Berechnung je Achse (Einfluss, Interesse); Hover über dieselbe Linie zeigt die identische Differenz als Tooltip an der Linie, ohne das Panel zu verändern (bzw. gemäß finaler UX-Entscheidung synchron dazu).
- [ ] **Loading-State:** Während des Ladens/Neuladens (initial oder nach Filterwechsel) wird ein Skeleton-Platzhalter anstelle der Zeichenfläche angezeigt; keine falschen/leeren Punkte werden zwischenzeitlich gerendert.
- [ ] **Empty-State:** Fehlen Bewertungen für die gewählte(n) Perspektive(n) vollständig, wird ein dedizierter Empty-State statt einer leeren oder fehlerhaften Zeichenfläche angezeigt.
- [ ] **Error-State / Konflikt:** Ein fehlgeschlagener Drag-Speichervorgang (inkl. simuliertem Optimistic-Locking-Konflikt) zeigt einen `p-toast` mit Fehlermeldung und setzt den betroffenen Punkt visuell auf die zuletzt bestätigte Position zurück.
- [ ] **Rollen-Sichtbarkeit:** Für Rolle „User" ist der Sub-Nav-Eintrag „Map" nicht im DOM vorhanden (nicht nur `disabled`), und ein direkter Aufruf der Map-Route wird durch den Route-Guard umgeleitet; ein serverseitig 403-antwortender Aufruf wird im Frontend als Error-State behandelt, nicht als stiller Absturz.
- [ ] **Formularvalidierung:** `comparePerspective` ist genau dann pflichtig (`Validators.required` aktiv), wenn `compareMode === true`; bei `compareMode === false` ist das Feld deaktiviert/zurückgesetzt und nimmt nicht an der Validierung teil.
- [ ] **Barrierefreiheit (WCAG 2.1 AA):** Jeder eigene Punkt ist per Tastatur fokussierbar und ohne Maus vollständig positionierbar (Pfeiltasten-Steuerung oder alternative numerische Eingabe); Fokuszustände sind sichtbar (`:focus-visible`); alle interaktiven Controls (Selects, Toggle, Zoom-Buttons, Verbindungslinien) sind per Tastatur erreichbar und mit korrekten ARIA-Labels versehen (u. a. `role="img"` mit beschreibendem `aria-label` für die Gesamt-Zeichenfläche, analog zum Wireframe-Wortlaut „Quadranten-Diagramm: Einfluss gegen Interesse …").
- [ ] **Styling-Konsistenz:** Keine hartkodierten Hex-/Pixelwerte in Komponenten-Templates/Styles; Rollenfarben (Kreis/Diamant) referenzieren zentrale, projektweite Rollenfarb-Tokens, die auch von Stakeholder-Liste und Perspektiven-Radar-Komponentenbibliothek genutzt werden; Flächen/Rahmen/Text nutzen PrimeNG-Surface-Variablen.
- [ ] **Terminologie:** UI-Texte sind deutsch und wortgleich mit dem Wireframe („Meine Sicht", „Vergleichsmodus", „Vergleichen mit", „Einfluss", „Interesse", Quadranten-Labels „Informiert halten" / „Eng betreuen" / „Beobachten" / „Zufriedenstellen", Legenden- und Diff-Panel-Texte).
