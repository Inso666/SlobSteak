**ID:** US-064
**Titel:** Einheitlicher, tokenisierter Opacity-Wert für gesperrte Map-Punkte
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht / Design-System)
**Abhängigkeiten:** US-034, US-036, US-063

---

### 1. User Story

Als **Nutzer der Stakeholder Map** möchte ich, dass „gesperrte“ (nicht ziehbare) Punkte auf der Map unabhängig vom Grund ihrer Sperrung optisch einheitlich dargestellt werden, damit ich Deckkraft-Unterschiede nicht fälschlich als fachlichen Unterschied interpretiere.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #71](https://github.com/Inso666/SlobSteak/issues/71), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §3.1 und `docs/specs/SPEC-00-Design-System.md` §1.2 (Token-Tabelle).
- **Ist-Zustand (bestätigt im Code):**
  - `frontend/src/app/features/map/draggable-point/draggable-point.component.css`, `.map-point--compare` (Vergleichspunkt, Diamant): `opacity: 0.72` — dokumentiert in US-034 „Anmerkungen des Agenten“ als bewusste, spec-konforme Auslegung von SPEC-04s qualitativer Vorgabe „reduzierte Deckkraft“ (kein konkreter Zahlenwert in der Spec, kein SPEC-00-Token dafür vorgesehen).
  - `frontend/src/app/features/map/draggable-point/draggable-point.component.css`, `.map-point--locked:not(.map-point--compare)` (eigener Punkt einer fremden Rolle/Perspektive): `opacity: 0.55` — eingeführt in US-036, taucht in keiner Story-Datei und keiner Spec als begründeter Wert auf.
  - `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.css`, Zeile 222: dritte Fundstelle mit `opacity: 0.72` (zu prüfen, ob Duplikat derselben Bedeutung oder eigener, vierter Kontext — vom Dev-Agenten bei Umsetzung zu verifizieren).
  - Laut SPEC-04 §3.1 sind beide Fälle (Vergleichspunkt **und** eigener Punkt bei Rollen-/Perspektiven-Mismatch) gleichermaßen „nicht ziehbar“ (`cursor: not-allowed`), werden aber mit unterschiedlicher Deckkraft dargestellt, ohne dass ein fachlicher Unterschied kommuniziert wird (z. B. über unterschiedliche Legenden-Einträge).
- **Relevant für DDD:** Reine Presentation-/Design-System-Schicht.

### 3. Akzeptanzkriterien

- [x] Alle Vorkommen von `opacity`-Werten für „gesperrt/nicht ziehbar“ auf der Map sind auf einen einzigen, dokumentierten Wert vereinheitlicht (empfohlen: der bereits etablierte `0.72`-Wert aus US-034, sofern der Projektverantwortliche bei der PR-Abstimmung keinen fachlichen Unterschied zwischen den beiden Sperr-Gründen wünscht — siehe Anmerkung unten).
- [x] Der vereinheitlichte Wert ist als benanntes CSS-Custom-Property/Token (z. B. `--app-map-point-locked-opacity`) definiert statt als wiederholtes Zahlen-Literal, konsistent mit SPEC-00 §1.2 („zentral als Tokens definiert“).
- [x] `docs/specs/SPEC-00-Design-System.md` §1.2 (Token-Tabelle) wird um diesen neuen Token ergänzt, inkl. Verwendungszweck.
- [x] Sollte stattdessen ein bewusster fachlicher Unterschied beibehalten werden (Abweichung von der obigen Empfehlung), sind beide Werte als eigene, benannte Tokens dokumentiert und die Entscheidung im PR sowie in dieser Story-Datei unter „Anmerkungen des Agenten“ begründet (CLAUDE.md Abschnitt 6). — *entfällt: PO-Empfehlung (Vereinheitlichung) umgesetzt, keine abweichende Vorgabe des Projektverantwortlichen.*
- [x] Visuelle Regression: keine ungewollte Änderung an anderen, nicht mit „gesperrt“ zusammenhängenden Opacity-Werten (z. B. Fokus-Ring, Hover-Zustände).
- [x] Story-Test bzw. Komponententest belegt den einheitlichen (oder bewusst unterschiedenen, klar benannten) Wert für beide Sperr-Fälle.
- [x] Bestehende Tests (`us-034-*.spec.ts`, `us-036-*.spec.ts`) bleiben grün bzw. werden an den neuen Token angepasst.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/map/draggable-point/draggable-point.component.css` (`.map-point--compare`, `.map-point--locked:not(.map-point--compare)`)
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.css` (Zeile 222, dritte Fundstelle — Zusammenhang vor Änderung verifizieren)
- Zentrale Token-Definition (siehe bestehendes Muster für `--app-role-pl`/`--app-role-ct`/`--app-role-ar` etc. — Datei mit den globalen `--app-*`-Custom-Properties, vermutlich `frontend/src/styles.css` oder ein SPEC-00-spezifisches Theme-File, vom Dev-Agenten zu lokalisieren)
- `docs/specs/SPEC-00-Design-System.md` (Token-Tabelle §1.2)

**Wichtige Invarianten:**
- Der `.map-point--compare`-Diamant behält seine Form-Unterscheidung (`border-radius`, `rotate(45deg)`) unverändert — diese Story betrifft ausschließlich die Opacity, nicht die Form.

### Anmerkungen des Product Owners

Diese Story enthält eine echte fachliche Entscheidung, die über reine Bug-Behebung hinausgeht (soll ein einheitlicher Wert gelten, oder sind beide Sperr-Gründe bewusst unterschiedlich zu visualisieren?). Empfehlung des PO: Vereinheitlichung auf `0.72`, da SPEC-04 §3.1 keinen fachlichen Unterschied zwischen den beiden Sperr-Gründen beschreibt und die Legende ohnehin keine zwei getrennten „gesperrt“-Einträge vorsieht. Der Dev-Agent setzt diese Empfehlung um, sofern der Projektverantwortliche bei Story-Start keine andere Vorgabe macht (CLAUDE.md Abschnitt 6, Punkt 2: PRD-konformste, am wenigsten überraschende Interpretation).

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

**Status:** fertig am 30.08.2026, PR siehe Feature-Branch `feature/US-064-map-opacity-token-vereinheitlichen`.

**Entscheidung (CLAUDE.md Abschnitt 6):** PO-Empfehlung übernommen — Vereinheitlichung auf `0.72`
statt eines bewusst beibehaltenen fachlichen Unterschieds. Begründung: SPEC-04 §3.1 beschreibt
beide Sperr-Gründe (Vergleichspunkt, eigener Punkt bei Rollen-/Perspektiven-Mismatch) durchgängig
als gleichrangig „nicht ziehbar“, ohne eine unterschiedliche Bedeutung der beiden Fälle zu
kommunizieren; die Legende (US-034) sieht ebenfalls keine zwei getrennten „gesperrt“-Einträge vor.
Ein Beibehalten der Differenz (`0.72` vs. `0.55`) hätte eine fachliche Unterscheidung suggeriert,
die es laut Spec nicht gibt — genau der in der Story beschriebene Bug (Issue #71). Keine abweichende
Vorgabe des Projektverantwortlichen bekannt.

**Neuer Token:** `--app-map-point-locked-opacity: 0.72` in `frontend/src/styles.css` (zentrale
Token-Datei, SPEC-00 §1.2), dokumentiert in der Token-Tabelle mit Verwendungszweck.

**Dritte Fundstelle verifiziert (`quadrant-chart.component.css` Zeile ~222,
`.legend__swatch--diamond`):** kein eigener, vierter Bedeutungsfall — dieser Swatch bildet in der
Vergleichsmodus-Legende exakt Form und Deckkraft des tatsächlichen Vergleichspunkts
(`.map-point--compare`) ab (siehe Template `legend__row` „{{comparePerspective}} — Vergleich“, aus
US-034). Denselben Token hier zu verwenden ist daher keine willkürliche Wiederverwendung, sondern
stellt sicher, dass Legende und echter Punkt nie durch getrennte Literale auseinanderlaufen können.

**Konsolidierung:** `.map-point--compare` trägt im Markup immer auch die Klasse
`.map-point--locked` (der Vergleichspunkt ist laut `QuadrantChartComponent`/SPEC-04 §3.1 stets
nicht-ziehbar) — die beiden zuvor getrennten CSS-Regeln (`.map-point--compare { opacity: 0.72 }`
und `.map-point--locked:not(.map-point--compare) { opacity: 0.55 }`) wurden daher zu einer
einzigen Regel `.map-point--locked { opacity: var(--app-map-point-locked-opacity) }`
zusammengeführt, statt lediglich den Zahlenwert zu vereinheitlichen. Die Form-Unterscheidung des
Diamanten (`border-radius`, `rotate(45deg)`) in `.map-point--compare` bleibt unverändert.

**Keine ungewollte Nebenwirkung:** Fokus-Ring (`:focus-visible`, `--app-attention`) und
Hover-/Cursor-Zustände (`cursor: grab`/`grabbing`/`not-allowed`) wurden nicht angefasst; einzige
geänderte Deklaration ist `opacity`.

**Tests:** neuer Story-Test `frontend/src/app/features/map/us-064-map-opacity-token-vereinheitlichen.spec.ts`
(vier Fälle: identischer Opacity-Wert für beide Sperr-Gründe, Wert stammt aus dem zentralen Token,
ein ziehbarer Punkt bleibt unverändert voll deckend, Diamant-Form bleibt erhalten). Bestehende
`us-034-map-vergleich-ui.spec.ts` und `us-036-map-dragdrop-ui.spec.ts` prüften bereits nur
Klassenzugehörigkeit (nicht den konkreten Zahlenwert) und liefen unverändert grün — keine Anpassung
nötig. Gesamte Suite (`ng test`, 454 Tests) sowie `ng lint` grün.
