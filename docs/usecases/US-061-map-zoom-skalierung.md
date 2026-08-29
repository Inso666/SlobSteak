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
