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

- [x] Ein zweites Dropdown aktiviert eine Vergleichsperspektive und ruft `GET .../map/compare` auf.
- [x] Für Stakeholder mit Assessment in beiden Perspektiven werden zwei visuell unterschiedene Punkte (Form oder Farbe je Rolle) sowie eine Verbindungslinie zwischen ihnen gerendert.
- [x] Für Stakeholder mit Assessment nur in einer der beiden Perspektiven wird genau ein Punkt ohne Verbindungslinie gerendert.
- [x] Eine Legende erklärt die Farb-/Formcodierung je Rolle.
- [x] Hover/Klick auf eine Verbindungslinie zeigt ein Tooltip/Popover mit der konkreten Differenz, z. B. „Einfluss: PL 30 vs. Architect 75“.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/map/comparison-mode-toggle/comparison-mode-toggle.component.ts`
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts` (Erweiterung um Vergleichs-Rendering)
- `frontend/src/app/features/map/connection-line-tooltip/connection-line-tooltip.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Punktkodierung ist konsistent zwischen Legende und Chart (gleiche Farb-/Form-Zuordnung je Rolle).

---

### 5. Status

**Fertig am 29.08.2026.** Umsetzung in `feature/US-034-map-vergleich-ui`:

- `MapService` (`frontend/src/app/features/map/map.service.ts`) um `MapComparisonEntry`/
  `MapComparisonValue` (1:1 zum US-033-Response-Contract) sowie `getComparisonData(projectId,
  primary, secondary)` erweitert, ruft `GET .../map/compare`.
- Neue Komponente `ComparisonModeToggleComponent` (`comparison-mode-toggle/`): kapselt den
  `p-toggleswitch`-Schalter „Vergleichsmodus" (SPEC-04 §1) als `ControlValueAccessor`, damit er wie
  jedes andere Reactive-Forms-Steuerelement per `formControlName="compareMode"` eingebunden wird.
- Neue Komponente `ConnectionLineTooltipComponent` (`connection-line-tooltip/`): rein
  präsentationelles Tooltip/Popover (`role="tooltip"`), zeigt die konkrete Differenz im Wortlaut
  der Story-AC („Einfluss: PL 30 vs. Architect 75" / „Interesse: …").
- `QuadrantChartComponent` um Vergleichs-Rendering erweitert: neue Inputs `compareMode`,
  `comparisonEntries`, `comparePerspective`. Eigene Punkte (Kreise) aus `entry.primary`,
  Vergleichspunkte (Diamanten, reduzierte Deckkraft, gleiche Rollenfarb-Klasse wie der Kreis) aus
  `entry.secondary`; eine gestrichelte SVG-Verbindungslinie je Stakeholder mit Assessment in
  **beiden** Perspektiven (Akzeptanzkriterium 2) — Stakeholder mit nur einer Bewertung erhalten
  automatisch keine Linie (Akzeptanzkriterium 3), da dies unmittelbar aus der Filterung der
  Vergleichsdaten folgt. Legende (`.legend`, nur im Vergleichsmodus sichtbar) verwendet dieselben
  Rollen-Modifier-Klassen wie die Punkte (Akzeptanzkriterium 4 — Punktkodierung konsistent).
  Verbindungslinie ist ein fokussierbares SVG-`<g role="button" tabindex="0">`, reagiert auf
  Hover **und** Klick/`Enter`/`Space` (Akzeptanzkriterium 5, zusätzlich tastaturbedienbar) und
  füllt darüber `ConnectionLineTooltipComponent`.
- `StakeholderMapPageComponent`: `filterForm` um `compareMode` (boolean) und `comparePerspective`
  (`PerspectiveRole | null`, initial deaktiviert) erweitert; `comparePerspective` wird gemäß
  SPEC-04 §2.1 nur bei aktivem `compareMode` pflichtig (`Validators.required`) und beim
  Deaktivieren zurückgesetzt/deaktiviert. `reload()` lädt je nach `compareMode` entweder
  `GET .../map` oder `GET .../map/compare` neu.

**Lokale Verifizierbarkeit:**

Story-Tests isoliert ausführen:
```
cd frontend
ng test --include='**/us-034*.spec.ts'
ng test --include='**/features/map/**/*.spec.ts'
```
Vollständige Frontend-Testsuite: `ng test` (295/295 grün), `ng lint` (fehlerfrei), `ng build`
(erfolgreich, Bundle-Budget-Warnung bereits vor dieser Story vorhanden, siehe Anmerkungen).

**So probierst du es aus** (gegen den über `docker-compose up` laufenden Gesamtstack):

1. Als Admin einen Nutzer mit Projekt-Rolle `PL` und einen mit `Architect` im selben Projekt
   anlegen (Admin-Bereich, US-012/US-015), je einen Stakeholder anlegen und für beide Rollen ein
   Assessment eintragen (Assessment-Tab der Stakeholder-Detailseite, US-028/US-029) — für einen
   zweiten Stakeholder nur eine der beiden Rollen bewerten.
2. Als `PL`-Nutzer einloggen, Tab „Map" öffnen.
3. „Vergleichsmodus" aktivieren → Dropdown „Vergleichen mit:" erscheint (zeigt alle Perspektiven
   außer der aktuell gewählten „Meine Sicht", siehe Anmerkungen), `Architect` wählen.
4. Erwartung: Der doppelt bewertete Stakeholder erscheint als Kreis (eigene Sicht) **und** Diamant
   (Vergleichssicht), verbunden durch eine gestrichelte Linie; der nur einfach bewertete
   Stakeholder erscheint als genau ein Punkt ohne Linie. Rechts erscheint die Legende mit
   Farb-/Formerklärung je Rolle.
5. Klick (oder Hover) auf die Verbindungslinie zeigt ein Tooltip mit z. B. „Einfluss: PL 30 vs.
   Architect 75" / „Interesse: PL 40 vs. Architect 20".
6. „Vergleichsmodus" wieder deaktivieren → zweites Dropdown verschwindet, Map zeigt wieder nur die
   eigenen Punkte (US-032-Basisverhalten unverändert).

Manueller Smoke-Test wie oben beschrieben gegen den über `docker-compose up` laufenden Gesamtstack
durchgeführt (Setup über die Admin-/Assessment-Endpunkte, Login als PL-Testnutzer, visuelle
Prüfung aller fünf Akzeptanzkriterien im Browser) — erfolgreich, keine Auffälligkeiten.

### 6. Anmerkungen des Agenten

- **Dokumentierte Abweichung von SPEC-04 §2.1 (CLAUDE.md Abschnitt 6):** SPEC-04 erlaubt
  ausdrücklich, dass `comparePerspective === ownPerspective` gewählt wird („keine
  Validierungsregel, die dies verhindert" — die Interaktionsregel „Vergleichspunkt nie ziehbar"
  sollte laut Spec allein ausreichen). Der zwischenzeitlich fertiggestellte, dieser Story zugrunde
  liegende Endpoint `GET .../map/compare` (US-033) liefert für `primary === secondary` jedoch
  `400 Bad Request` (`PRIMARY_EQUALS_SECONDARY`) — SPEC-04 wurde vor dieser im Rahmen von US-033
  bewusst getroffenen, strengeren Backend-Entscheidung verfasst. Statt einen serverseitig
  grundsätzlich abgelehnten Request über die UI auslösbar zu lassen, schließt die
  `comparePerspective`-Optionsliste die aktuell gewählte `ownPerspective` aus (fachlich ohnehin
  naheliegend — der Vergleich einer Perspektive mit sich selbst liefert keine Erkenntnis); ändert
  sich `ownPerspective` auf den Wert der aktuell gewählten `comparePerspective`, wird Letztere
  zurückgesetzt. PRD-konformste, am wenigsten überraschende Interpretation angesichts des bereits
  verbindlich feststehenden Backend-Contracts.
- **Konsistenz mit `ownPerspective` (dokumentierte Fortführung einer Abweichung von SPEC-04 §1,
  bereits seit US-032):** SPEC-04 sieht `p-select` für beide Perspektiv-Dropdowns vor; das
  bestehende `ownPerspective`-Steuerelement (US-032, bereits gemergt) nutzt stattdessen ein
  natives `<select>`. Um innerhalb derselben Toolbar nicht zwei unterschiedliche
  Auswahl-Paradigmen zu mischen, übernimmt `comparePerspective` dasselbe, bereits etablierte
  native `<select>`-Muster statt an dieser Stelle isoliert auf `p-select` zu wechseln.
- **„Ziehbar"-Wortlaut der Legende bewusst nicht wörtlich aus SPEC-04 übernommen:** SPEC-04 §1
  gibt als Beispieltext „PL — deine Sicht (ziehbar)" / „Architect — Vergleich (nicht ziehbar)" vor
  — Drag&Drop ist jedoch laut BACKLOG.md Phase 5 explizit als eigene Folgestory (US-035/US-036)
  geschnitten und in dieser Story bewusst nicht enthalten (CLAUDE.md Abschnitt 3 „kein Vorgriff auf
  spätere Stories", vgl. bereits dieselbe Abgrenzung in US-032). Die Legende dieser Story verzichtet
  daher auf die Klammerzusätze „(ziehbar)"/„(nicht ziehbar)", da eine Ziehbarkeits-Aussage vor
  US-036 sachlich falsch wäre; Farb-/Formcodierung und Verbindungslinien-Hinweistext sind
  unverändert wortgleich zu SPEC-04 übernommen. Wird in US-036 nachgezogen.
- **Legende nur im Vergleichsmodus sichtbar:** SPEC-04 §3.2 stellt dies explizit als
  „Ermessensfrage des Frontend-Agenten" frei. Entscheidung: Die Legende erklärt ausschließlich die
  Vergleichs-Farb-/Formcodierung (zwei Rollen, Verbindungslinie) — außerhalb des Vergleichsmodus
  gibt es nur eine einzige Punktart, für die keine Legende nötig ist; sie wird daher nur gerendert,
  wenn `compareMode === true` und eine `comparePerspective` gewählt ist.
- **Reduzierte Deckkraft des Vergleichspunkts als fester Wert (`0.72`):** SPEC-04 §1 fordert für den
  Diamanten „reduzierte Deckkraft", ohne einen Zahlenwert zu nennen; SPEC-00 §1.2 sieht dafür kein
  Token vor. `0.72` ist eine dokumentierte, spec-konforme Auslegung dieser qualitativen Vorgabe
  (CLAUDE.md Abschnitt 6) — kein neu erfundenes Farb-/Radius-/Abstands-Token, da es sich um einen
  reinen Opazitätswert außerhalb der SPEC-00-Token-Tabelle handelt.
- Keine Abweichung von zentralen PRD-Invarianten (Abschnitt 4.3); keine offenen TODOs.
