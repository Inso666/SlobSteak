**ID:** US-062
**Titel:** Tastatur-Positionierung eigener Map-Punkte für Screenreader-Nutzer:innen zuverlässig ankündigen
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht, Barrierefreiheit)
**Abhängigkeiten:** US-036, US-061

---

### 1. User Story

Als **Nutzer:in mit Rolle PL/Coreteam/Architect, die/der die Map ausschließlich per Tastatur und Screenreader bedient**, möchte ich, dass mir jede Pfeiltasten-Bewegung eines eigenen Punkts unmittelbar über den Screenreader angekündigt wird, damit ich meine Bewertung ohne Maus vollständig und mit verlässlichem Feedback vornehmen kann (WCAG 2.1 AA).

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #69](https://github.com/Inso666/SlobSteak/issues/69) („Keine Tastatur-Alternative zum Drag&Drop (Pfeiltasten/Positions-Dialog fehlen)“), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §2.3/§4 (WCAG-2.1-AA-Akzeptanzkriterium).
- **PO-Korrektur des Befunds (Code-Review vor Story-Anlage):** Issue #69 beschreibt, dass Pfeiltasten „keinerlei Positionsänderung“ bewirken. Der aktuelle Code widerspricht dem teilweise: `frontend/src/app/features/map/draggable-point/draggable-point.component.ts` (`onKeydown`) implementiert bereits `ArrowRight`/`ArrowLeft`/`ArrowUp`/`ArrowDown` (±1, mit `Shift` ±10), `Enter` (bestätigen), `Escape` (verwerfen) sowie `onBlur()` (Fokusverlust bestätigt), jeweils inkl. `changeDetectorRef.markForCheck()`. `displayInfluence`/`displayInterest` (und damit `[style.left.%]`/`[style.bottom.%]` des Buttons sowie die separate `.map-point__live`-Statusanzeige) reagieren auf `livePosition` und sollten sich damit **visuell** bewegen.
- **Tatsächlich bestätigter, engerer Bug:** Das `aria-label`-Attribut des Punkt-`<button>` ist ein reiner, von `QuadrantChartComponent` berechneter `@Input`-String (`draggable-point.component.html`, `[attr.aria-label]="ariaLabel"`) — er wird ausschließlich aus den zuletzt **bestätigten** `influence`/`interest`-Werten abgeleitet und reagiert nicht auf `livePosition` (die unbestätigte Live-Vorschau während einer laufenden Tastatur-Bewegung). Ein Screenreader liest beim Fokussieren also nur den zuletzt bestätigten Stand vor und kündigt keine der Pfeiltasten-Bewegungen an, bis `Enter`/Fokusverlust die Änderung committet — exakt die von Issue #69 (nicht-visuell) geschilderte Beobachtung „`aria-label` bleibt nach mehrfachem Drücken unverändert“, für sehende Maus-Nutzer:innen aber ggf. bereits sichtbar bewegt.
- **Nicht abschließend geklärt:** Ob die Pfeiltasten-Bewegung auch **visuell** ausbleibt (wie im Rest von Issue #69 beschrieben) konnte im Rahmen dieser Story-Erstellung nicht gegen einen laufenden Stack reproduziert werden (kein Zugriff auf aktuelle Login-Daten des laufenden Dev-Stacks). Der Dev-Agent beginnt daher mit einer Reproduktion gegen `docker-compose up` (Präzedenzfall US-051), bevor er den Fix ansetzt — sollte sich dabei zeigen, dass auch die visuelle Bewegung tatsächlich ausbleibt (z. B. weil `ownPointsDraggable` für den getesteten Punkt fälschlich `false` liefert), ist das zusätzlich zu beheben und hier zu dokumentieren.
- **„Position bearbeiten“-Dialog (SPEC-04 §2.3):** Existiert tatsächlich nicht, ist aber gemäß der eigenen AC-Formulierung in SPEC-04 §4 („Pfeiltasten-Steuerung **oder** alternative numerische Eingabe“) keine zwingende Voraussetzung, sofern die Pfeiltasten-Alternative selbst vollständig funktioniert und ihre Bewegungen verlässlich ankündigt — kein separates Akzeptanzkriterium dieser Story, siehe Abschnitt 3.

### 3. Akzeptanzkriterien

- [x] Reproduktion gegen einen laufenden `docker-compose`-Stack dokumentiert im PR, ob die Pfeiltasten-Bewegung eines eigenen Punkts visuell (Position/`.map-point__live`-Anzeige) tatsächlich funktioniert oder ebenfalls fehlschlägt. (Ergebnis: funktioniert bereits korrekt — siehe „Anmerkungen des Agenten".)
- [x] Das `aria-label` des fokussierten Punkt-`<button>` spiegelt während einer unbestätigten Tastatur-Bewegung (`livePosition !== null`) die aktuellen Live-Werte wider (nicht nur die zuletzt bestätigten), sodass ein Screenreader jede Pfeiltasten-Bewegung ankündigt.
- [x] Nach `Enter`/Fokusverlust (Bestätigung) bzw. `Escape` (Verwerfen) kehrt das `aria-label` zuverlässig zum jeweils korrekten Endzustand zurück.
- [x] Ist bei der Reproduktion (erstes Akzeptanzkriterium) eine zusätzliche, rein visuelle Ursache gefunden worden, die die Bewegung insgesamt verhindert (z. B. `ownPointsDraggable`/Fokussierbarkeit), ist auch diese behoben. (Keine weitere Ursache gefunden — entfällt.)
- [x] Automatisierter Test (Angular `TestBed`) simuliert eine Pfeiltasten-Sequenz auf einem fokussierten, ziehbaren Punkt und prüft das `aria-label`-Attribut nach jedem Tastendruck sowie nach Bestätigung/Verwerfen.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests von `DraggablePointComponent`/`QuadrantChartComponent` (inkl. `us-036-*.spec.ts`) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/map/draggable-point/draggable-point.component.ts` — `ariaLabel` als reine `@Input`-Übernahme reicht nicht aus; Komponente benötigt einen Weg, das angezeigte Label während `livePosition !== null` aus den Live-Werten abzuleiten (z. B. eigener Getter `displayAriaLabel`, der bei aktiver `livePosition` einen aus `displayInfluence`/`displayInterest` generierten Text liefert, sonst das `@Input` `ariaLabel` unverändert durchreicht — konkrete Textformulierung liegt beim Dev-/UX-Agenten, orientiert an der bereits vorhandenen `.map-point__live`-Formulierung „Einfluss {{displayInfluence}} · Interesse {{displayInterest}}“).
- `frontend/src/app/features/map/draggable-point/draggable-point.component.html` — `[attr.aria-label]` auf den neuen Getter umstellen.

**Wichtige Invarianten:**
- Das von `QuadrantChartComponent` gelieferte `ariaLabel` (bestätigter Zustand) bleibt die Quelle der Wahrheit außerhalb einer aktiven Live-Bewegung — keine Änderung an dessen Berechnung/Formulierung nötig.
- Maus-Drag nutzt denselben `livePosition`-Mechanismus (`updateFromPointer`) — die Ankündigung sollte für Maus- und Tastatur-Bewegung einheitlich funktionieren, auch wenn der praktische Nutzen (Screenreader während Maus-Drag) sekundär ist.

### Anmerkungen des Product Owners

Titel/Scope dieser Story wurde gegenüber Issue #69 bewusst präzisiert: Der Issue-Titel suggeriert eine komplett fehlende Tastatursteuerung; Code-Review zeigt, dass die Kernmechanik (Pfeiltasten, Bestätigen, Verwerfen) bereits existiert (US-036) und nur die Screenreader-Ankündigung während einer laufenden Bewegung lückenhaft ist. Keine stille Abweichung vom gemeldeten Befund (CLAUDE.md Abschnitt 6) — die Diskrepanz ist oben dokumentiert, inkl. der noch offenen Reproduktionspflicht für den rein-visuellen Teilaspekt.

### Anmerkungen des Agenten

**Status:** fertig am 30.08.2026, Branch `feature/US-062-map-tastatur-positionierung-ankuendigen`, PR siehe Repository.

**Reproduktion gegen laufenden `docker-compose`-Stack (Akzeptanzkriterium 1, Präzedenzfall US-051):**
Isolierter Stack, eigener Compose-Datei (nicht committet, nur zur Reproduktion, danach wieder
entfernt), Projektname `us062smoke`, eigene Ports 4262 (Frontend) / 5062 (API) / 5562 (DB), nicht
der gemeinsam genutzte Container-Stack. Test-Setup direkt über die API angelegt (Seed-Admin nach
Pflicht-Passwortwechsel als PL-Mitglied einem neuen Projekt zugeordnet, ein Stakeholder mit
PL-Assessment `Einfluss 30 / Interesse 40` angelegt), anschließend im Browser (Chrome via
`claude-in-chrome`) auf `/projects/{id}/map` fokussiert und `ArrowRight`/`ArrowUp` gedrückt:

- **Visuelle Bewegung funktioniert bereits korrekt** — sowohl die Button-Position
  (`[style.left.%]`/`[style.bottom.%]`) als auch die `.map-point__live`-Statusanzeige aktualisieren
  sich sofort und korrekt bei jedem Tastendruck (per JS-Introspektion im Browser verifiziert:
  `left` ging von `30%` auf `31%`, `.map-point__live` zeigte „Einfluss 31 · Interesse 40“). Der in
  Issue #69 geschilderte, rein-visuelle Teilaspekt („keinerlei Positionsänderung“) reproduziert sich
  **nicht** — die PO-Korrektur der Story-Datei (Abschnitt 2) bestätigt sich vollständig.
- **Der engere, bestätigte Bug reproduziert sich exakt wie beschrieben:** Das `aria-label` des
  Punkt-`<button>` blieb während der laufenden Bewegung unverändert bei „Einfluss 30, Interesse
  40“ (dem zuletzt bestätigten Stand), obwohl die Position bereits sichtbar auf 31/40 gewandert
  war — ein Screenreader hätte hier keine der beiden Pfeiltasten-Bewegungen angekündigt. Nach
  `Enter` (Bestätigung) aktualisierte sich das `aria-label` korrekt auf den neuen bestätigten
  Stand („Einfluss 31, Interesse 42“ nach einer zweiten Testsequenz mit zusätzlichem `ArrowUp`).
- **Akzeptanzkriterium 4 (zusätzliche rein-visuelle Ursache):** entfällt — `ownPointsDraggable`
  funktionierte im Test korrekt (eigener PL-Punkt in eigener Perspektive war ziehbar), keine
  weitere Ursache gefunden, die die Bewegung insgesamt verhindert.

**Fix:** `DraggablePointComponent` erhält zwei neue `protected get`-Accessor:
- `liveValuesText`: der Textbaustein „Einfluss X · Interesse Y“, jetzt von der `.map-point__live`-
  Statusanzeige (Template) **und** vom neuen Aria-Label-Getter gemeinsam verwendet (frontend.md
  Abschnitt 3 — Wording nicht dupliziert pflegen).
- `displayAriaLabel`: liefert während `isLiveEditing` (`livePosition !== null`) einen aus
  `liveValuesText` sowie dem neuen, zentral in `map-messages.ts` gehaltenen Präfix
  `MAP_POINT_LIVE_ARIA_LABEL_PREFIX = 'Wird verschoben'` zusammengesetzten Live-Text (z. B. „Wird
  verschoben: Einfluss 31 · Interesse 42.“), sonst unverändert das `@Input() ariaLabel` (Wording-
  Entscheidung des Dev-/UX-Agenten in dieser Story, wie in Abschnitt 4 vorgesehen). Das Template
  bindet `[attr.aria-label]` jetzt an `displayAriaLabel` statt direkt an `ariaLabel`. Nach
  Bestätigung (`Enter`/Fokusverlust) oder Verwerfen (`Escape`) wird `livePosition` wieder `null`,
  wodurch der Getter automatisch auf `ariaLabel` zurückfällt — dessen von `QuadrantChartComponent`
  neu berechneter Wert liegt dank des bestehenden optimistischen Übernahme-Musters (SPEC-04 §2.2)
  bereits vor dem nächsten Rendern vor, sodass kein veralteter Zwischenstand angezeigt wird
  (verifiziert sowohl automatisiert als auch erneut manuell gegen den Docker-Stack nach dem Fix).

**Tests:**
- Story-Test: `frontend/src/app/features/map/us-062-map-tastatur-positionierung-ankuendigen.spec.ts`
  (alle sieben Akzeptanzkriterien in Dokumentreihenfolge — Kriterium 1 und 4 sind dort als
  Doku-Kommentar auf diese „Anmerkungen des Agenten“ verwiesen, da nicht automatisiert prüfbar bzw.
  entfallen; Kriterium 7 wird durch den vollständigen `ng test`-Lauf nachgewiesen). Testet eine
  vollständige Pfeiltasten-Sequenz auf einem echten, gerenderten und fokussierten Punkt-Button
  (echte `KeyboardEvent`-Dispatches, nicht direkte Methodenaufrufe) über die vollständige Seite
  (`StakeholderMapPageComponent`). Einzeln ausführen:
  `ng test --include='**/us-062-map-tastatur-positionierung-ankuendigen.spec.ts'` (im
  `frontend/`-Verzeichnis).
- Ergänzende Komponententests in `draggable-point.component.spec.ts` (neue `describe`-Gruppe „live
  aria-label announcement during an active move“): aria-label nach jedem einzelnen Tastendruck
  (inkl. Shift-Schritt), nach Bestätigung (Enter), Verwerfen (Escape), Fokusverlust (blur) sowie
  während eines Maus-Drags — insgesamt 6 neue Testfälle.
- Vollständiger `ng test`-Lauf: 445/445 grün (inkl. `quadrant-chart.component.spec.ts`,
  `us-036-map-dragdrop-ui.spec.ts`, `us-060-map-zoom-buttons-sichtbar.spec.ts`,
  `us-061-map-zoom-skalierung.spec.ts` — alle unverändert grün, keine Regression).
- `ng lint`: fehlerfrei.

**So probierst du es aus:** Stakeholder Map öffnen (Rolle mit perspektiv-tragender Projekt-Rolle,
mindestens ein Stakeholder mit eigenem Assessment), eigenen Punkt per Tab fokussieren, Screenreader
aktivieren (oder im Browser die DevTools-Konsole `document.activeElement.getAttribute('aria-label')`
nach jedem Tastendruck auswerten), Pfeiltasten drücken — das `aria-label` kündigt nach jedem
einzelnen Tastendruck die aktuellen Live-Werte an („Wird verschoben: Einfluss …“); nach `Enter`
oder Fokusverlust liest der Screenreader den neu bestätigten Stand vor, nach `Escape` wieder den
ursprünglichen, unveränderten Stand.
