**ID:** US-061
**Titel:** Map-Zoom skaliert Positionen statt Punkt-Marker unverhältnismäßig zu vergrößern
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-036, US-060

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle** möchte ich, dass mir das Vergrößern der Map hilft, dicht beieinanderliegende Stakeholder-Punkte eindeutig einzeln zu erkennen und zu ziehen, ohne dass dabei andere Punkte aus der sichtbaren Zeichenfläche verschwinden.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #68](https://github.com/Inso666/SlobSteak/issues/68), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §3.4 (Edge Case „dicht beieinanderliegende Punkte“).
- **Ist-Zustand (aus Issue #68):** `QuadrantChartComponent` wendet den Zoom-Faktor per `transform: scale(...)` auf den gesamten `.plot-surface`-Container an (`quadrant-chart.component.ts`, `surfaceTransform`-Getter: `translate(...) scale(${this.zoomLevel})`). Da die Punkt-Marker (`.map-point`, feste Größe `var(--app-space-lg)`) Kindelemente dieses Containers sind, werden sie von derselben CSS-`transform: scale()` mitskaliert — nach 5 Zoom-Schritten von ca. 20px auf ca. 70px Durchmesser. Gleichzeitig wandern weiter entfernte Punkte durch dieselbe Skalierung über den sichtbaren Bereich der `.plot-area` (fixe Größe, `overflow: hidden`) hinaus und werden ersatzlos abgeschnitten, ohne dass Pan automatisch nachführt.
- **Soll-Zustand (SPEC-04 §3.4):** Primär sollen die **Abstände** zwischen Punkten wachsen, während die Marker-Größe konstant bleibt oder deutlich langsamer wächst als der Abstand — das ist die eigentliche Voraussetzung dafür, dass sich zwei nahe Punkte nach Zoom „eindeutig einzeln selektieren/ziehen“ lassen (SPEC-04 §4).
- **Relevant für DDD:** Reine Presentation-Schicht (Koordinaten-/Transform-Logik), keine fachliche Logik betroffen.

### 3. Akzeptanzkriterien

- [ ] Nach Zoom-In wächst der Abstand zwischen zwei dicht beieinanderliegenden Punkten spürbar stärker als deren Marker-Durchmesser — Marker-Größe bleibt konstant oder wächst deutlich langsamer als der Abstand.
- [ ] Ein zunächst sichtbarer, weiter entfernter Punkt verschwindet nach mehrfachem Zoom-In nicht ersatzlos aus der sichtbaren Zeichenfläche, ohne dass eine Pan-Möglichkeit besteht, ihn wieder erreichbar zu machen (bereits vorhandene Maus-Pan-Funktion aus US-036 gilt weiterhin als ausreichend, sofern der Punkt durch Pan tatsächlich wieder erreichbar ist).
- [ ] Zwei nah beieinanderliegende Test-Punkte (z. B. Einfluss/Interesse 47/53 und 50/50) lassen sich nach ausreichendem Zoom-In eindeutig einzeln per Maus selektieren/ziehen (SPEC-04 §4, Kern-Akzeptanzkriterium des ursprünglichen Edge-Case-Tests).
- [ ] Bestehendes Zoom/Pan-Verhalten (Grenzwerte `MIN_ZOOM`/`MAX_ZOOM`/`ZOOM_STEP`, Pan-Begrenzung, `translate() scale()`-Reihenfolge aus US-036) bleibt in seinen übrigen Eigenschaften unverändert, soweit nicht direkt durch diese Story betroffen.
- [ ] Automatisierter Test belegt per `getBoundingClientRect()`/Style-Assertion, dass Marker-Größe nach Zoom konstant bleibt (oder das gewählte, im PR begründete Verhältnis einhält), während sich die berechnete Bildschirmdistanz zwischen zwei Punkten vergrößert.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `QuadrantChartComponent`/`DraggablePointComponent` (inkl. `us-036-*.spec.ts`) bleiben grün bzw. werden angepasst, falls sie das bisherige (fehlerhafte) Mitskalieren der Marker unbewusst mitgeprüft haben.

### 4. Technische Hinweise für den Dev-Agenten

**Zu prüfende Dateien:**
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts` (`surfaceTransform`-Getter, `setZoom`/Pan-Begrenzung)
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.css` (`.plot-surface`)
- `frontend/src/app/features/map/draggable-point/draggable-point.component.css` (`.map-point`, feste Größe `var(--app-space-lg)`)

**Mögliche Lösungsrichtungen (vom Dev-Agenten zu bewerten, keine Vorgabe):**
- Marker-Größe per Inline-Style/CSS-Variable gegen den `zoomLevel` gegenrechnen (z. B. `transform: scale(1 / zoomLevel)` auf dem einzelnen Punkt-Element), sodass die visuelle Marker-Größe trotz Container-Zoom konstant bleibt — Pixel→Prozent-Umrechnung für Maus-Drag (`updateFromPointer`, nutzt bereits die transformierte Bounding-Box) muss dabei unverändert korrekt bleiben.
- Alternativ: Zoom nicht per CSS-`transform: scale()` auf dem Container, sondern durch Neuberechnung der 0–100-Koordinaten selbst (größerer struktureller Eingriff) — nur falls die erste Lösungsrichtung sich als nicht tragfähig erweist.

**Wichtige Invarianten:**
- `DraggablePointComponent`s Pixel→Prozent-Umrechnung (`updateFromPointer`, liest `surfaceRef.getBoundingClientRect()`) darf durch die gewählte Lösung nicht verfälscht werden — jede Änderung an der Skalierungsstrategie muss gegen reale Maus-Drag-Interaktion nach Zoom verifiziert werden, nicht nur gegen die Zoom-Darstellung selbst.

### Anmerkungen des Product Owners

Technisch unabhängig von [US-060](US-060-map-zoom-buttons-sichtbar.md) (Issue #67, reine Button-Sichtbarkeit) — beide betreffen zwar denselben Zoom-Cluster-Funktionsbereich, aber unterschiedliche Ursachen (Icon-/CSS-Rendering vs. Transform-Strategie), daher keine Zusammenlegung zu einer Story. Sequenzielle Abhängigkeit zu US-060 ausschließlich, um parallele Änderungen an denselben Dateien (`quadrant-chart.component.ts`/`.css`) zu vermeiden.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

**Status:** fertig am 30.08.2026, Branch `feature/US-061-map-zoom-skalierung`, PR siehe Repository.

**Fix (erste Lösungsrichtung aus Abschnitt 4 gewählt, kein struktureller Umbau nötig):**
Gegenskalierung des einzelnen Punkt-Markers gegen den Container-Zoom, per CSS Custom Property statt
per direkt gebundenem `[style.transform]` auf dem Marker, damit die vorhandenen, formabhängigen
`transform`-Werte (`.map-point`-Zentrierung `translate(-50%, 50%)`, `.map-point--compare`-Diamant-
Rotation `rotate(45deg)`) unverändert in derselben CSS-Regel stehen bleiben, statt sie in
TypeScript dupliziert nachzubauen:
- `QuadrantChartComponent` erhält einen neuen `markerScale`-Getter (`1 / zoomLevel`) und reicht ihn
  über ein neues `[markerScale]`-Input an beide `<app-draggable-point>`-Vorkommen (eigene wie
  Vergleichspunkte) im Template durch.
- `DraggablePointComponent` erhält das neue `@Input() markerScale = 1` und setzt es als CSS Custom
  Property `--marker-counter-scale` auf sein `<button class="map-point">`-Element
  (`[style.--marker-counter-scale]="markerScale"`).
- `draggable-point.component.css`: `.map-point`/`.map-point--compare` hängen `scale(var(
  --marker-counter-scale, 1))` an ihre jeweils bestehende `transform`-Deklaration an. Effekt: die
  auf dem Bildschirm gerenderte Marker-Größe ist Container-Scale (`zoomLevel`, auf `.plot-surface`)
  × Marker-Gegenskalierung (`1 / zoomLevel`) = **konstant 1**, unabhängig vom Zoom-Level — nur die
  Punktabstände (bestimmt allein durch den unveränderten Container-Scale) wachsen weiter mit dem
  Zoom, exakt wie in SPEC-04 §3.4 gefordert.

**Wichtige Invariante verifiziert:** `DraggablePointComponent.updateFromPointer()` liest
weiterhin ausschließlich `surfaceRef.nativeElement.getBoundingClientRect()` (die Bounding-Box von
`.plot-surface`, NICHT des einzelnen `.map-point`-Buttons) — die neue Gegenskalierung wirkt
ausschließlich auf das `.map-point`-Kindelement selbst und verändert `.plot-surface`s eigene
Bounding-Box nicht (Kind-Transforms beeinflussen die Bounding-Box des Elternelements nicht). Die
Pixel→Prozent-Umrechnung für Maus-Drag bleibt dadurch unverändert korrekt — manuell gegen eine
eigene, isolierte `docker-compose up`-Instanz (Ports 4202/5002/5434) verifiziert: Login als
Seed-Admin, Projekt + zwei nah beieinanderliegende Assessments (Einfluss/Interesse 47/53 und
50/50) angelegt, Stakeholder Map geöffnet, mehrfach auf „Vergrößern" geklickt (Marker bleiben
sichtbar klein, Abstand zwischen den beiden Punkten wächst deutlich), anschließend beide Punkte
einzeln per Maus gegriffen und an unterschiedliche Positionen gezogen — jeweils exakt die erwartete
Position (keine durch die Gegenskalierung verfälschte Pixel→Prozent-Umrechnung), inkl. korrekter
`PUT .../assessments/{role}`-Aufrufe (Netzwerk-Tab).

**Testbarkeits-Hinweis (Zoneless-Rendering, dokumentiert für Nachfolge-Stories):** Das Frontend läuft
ohne `zone.js` (siehe `frontend/package.json`) mit Angulars zoneless Change-Detection-Scheduler.
Ein direkter TypeScript-Methodenaufruf einer `protected`/`public` Methode einer `OnPush`-Komponente
aus einem Test heraus (z. B. `instance.zoomIn()`) markiert deren Ansicht dort **nicht** als „dirty“
— ein anschließendes `fixture.detectChanges()` aktualisiert dadurch weder das DOM noch an die
Kind-Komponente durchgereichte `@Input`-Bindungen, obwohl reine Getter-/Feld-Zugriffe auf die
Komponenteninstanz selbst weiterhin den korrekten, bereits geänderten Wert liefern (dieser
Unterschied erklärt, warum bestehende Tests wie `quadrant-chart.component.spec.ts` bislang nur
`instance.zoomLevel`/`instance.surfaceTransform` direkt statt gerenderte DOM-Styles prüfen). Der
neue Story-Test aus dieser Story (`us-061-map-zoom-skalierung.spec.ts`) löst Zoom deshalb bewusst
über einen echten `.click()` auf den gerenderten Zoom-Cluster-Button aus, nicht über einen direkten
`zoomIn()`-Aufruf, wo eine DOM-/Style-Assertion nötig war.

**Tests:**
- Story-Test: `frontend/src/app/features/map/us-061-map-zoom-skalierung.spec.ts` (alle sieben
  Akzeptanzkriterien in Dokumentreihenfolge, Details siehe Datei-Kopfkommentar für die drei
  nicht-automatisierbaren/bereits anderweitig abgedeckten Kriterien 2/6/7). Einzeln ausführen:
  `ng test --include='**/us-061-map-zoom-skalierung.spec.ts'` (im `frontend/`-Verzeichnis).
- Vollständiger `ng test`-Lauf: 430/430 grün (inkl. `quadrant-chart.component.spec.ts`,
  `draggable-point.component.spec.ts`, `us-036-map-dragdrop-ui.spec.ts`,
  `us-060-map-zoom-buttons-sichtbar.spec.ts` — alle unverändert grün, keine Regression).
- `ng lint`: fehlerfrei.

**So probierst du es aus:** Stakeholder Map öffnen (Rolle mit perspektiv-tragender Projekt-Rolle),
zwei Stakeholder mit nah beieinanderliegenden Assessment-Werten anlegen (z. B. 47/53 und 50/50),
mehrfach auf den `+`-Zoom-Button klicken — die beiden Punkt-Marker bleiben sichtbar klein/gleich
groß, während sich ihr Abstand zueinander spürbar vergrößert; anschließend lässt sich jeder der
beiden Punkte einzeln per Maus greifen und ziehen, ohne den jeweils anderen zu treffen.
