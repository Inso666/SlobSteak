**ID:** US-079
**Titel:** PrimeNG-Button-Varianten (outlined, text, deaktiviert) auf die Design-Tokens mappen
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht, zentrales PrimeNG-Preset)
**Abhängigkeiten:** US-077, US-078
**Status:** fertig am 2026-09-13, PR feature/US-079-button-varianten-design-tokens

---

### 1. User Story

Als **Nutzer** möchte ich sekundäre Schaltflächen wie „Abbrechen", „E-Mails kopieren" oder „CSV exportieren" klar lesen können, damit ich erkenne, welche Handlungsoptionen mir ein Formular überhaupt anbietet.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #120](https://github.com/Inso666/SlobSteak/issues/120), QA-Design-Abgleich vom 04.09.2026.
- **Ist-Zustand (gemessen im laufenden Chrome):**

| Stelle | Klasse | Farbe auf Grund | Kontrast |
|---|---|---|---|
| Stakeholder-Detail, „Abbrechen" (deaktiviert) | `.p-button.p-button-outlined` | `#455165` auf `#161d2b` | 2,11 |
| Verteiler, „E-Mails kopieren" | `.p-button.p-button-outlined` | `#64748b` auf `#10151f` | 3,84 |
| Dialog, „Abbrechen" | `.p-button.p-button-text` | `#edeff4` auf `#ffffff` | 1,15 (Flächenanteil wird durch US-077 behoben) |

- **Root Cause:** `#455165` und `#64748b` stammen aus keinem Token in `frontend/src/styles.css` — es sind Restwerte des Aura-Presets. `slobsteak-preset.ts` mappt `semantic.primary` (das Wireframe-Muster „helle Fläche, dunkle Schrift"), aber keine der sekundären Button-Varianten.
- **Design-Vorgabe:** `docs/design/Verteiler.dc.html` Z. 65 — `.btn-secondary{background:transparent;color:var(--text);border-color:var(--border);}`. Der sekundäre Button trägt also Text in `--app-color-text`, nicht in einem abgedunkelten Grau.

### 3. Akzeptanzkriterien

- [x] `slobsteak-preset.ts` mappt die Button-Varianten `outlined`, `text` und `secondary` auf die Design-Tokens: Schrift `color.text` (`#EDEFF4`), Rahmen `color.border` (`#262F42`), Fläche transparent, Hover-Rahmen entsprechend dem in US-078 festgelegten Wert.
- [x] Der deaktivierte Zustand erhält eine bewusst gewählte Farbe mit mindestens 4,5:1 gegen beide Flächen (`#10151F` und `#161D2B`). Begründung: „Abbrechen" ist in mehreren Formularen die einzige Abbruchoption; ein unlesbarer Deaktiviert-Zustand wird nicht als „ausgegraut", sondern als „nicht vorhanden" wahrgenommen.
- [x] Kein Screen setzt Button-Farben lokal (SPEC-00 §4) — die Änderung erfolgt ausschließlich im Preset.
- [x] Alle Button-Varianten erreichen mindestens 4,5:1 in den Zuständen normal, hover, fokussiert und deaktiviert: `primary`, `outlined`, `text`, `secondary`.
- [x] Automatisierter Test (Angular `TestBed`) belegt die Farbzuweisung mindestens für `outlined` und `text` inklusive deaktiviertem Zustand.
- [x] Manueller Smoke-Test: Docker-Compose-Stack in der Agenten-Umgebung nicht erreichbar (siehe Anmerkungen des Agenten) — ersatzweise visuell via `ng serve` in echtem Chrome geprüft, Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-043, dessen Verarbeitungs-Buttons dieselben Varianten nutzen) — vollständiger `ng test`-Lauf: 521/521 grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/theme/slobsteak-preset.ts`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Der primäre Button bleibt beim Wireframe-Muster „Fläche = `color.text`, Schrift = `color.background`" (SPEC-00 §1.3).
- Die Akzentfarbe bleibt dem Fokus-Ring und Aufmerksamkeitssignalen vorbehalten (SPEC-00 §4) und wird nicht zur Button-Farbe.
- Keine Backend-Änderung, keine Migration.

### 5. Anmerkungen des Agenten (Umsetzung 2026-09-13)

- **Deaktivierter Zustand ohne eigenen Farb-Token:** PrimeNGs Button-Design-Token-Schema
  (`ButtonDesignTokens`, `@primeuix/themes/types/button`) kennt keinen eigenen Disabled-Farb-Token.
  `:disabled` wird stattdessen app-weit über den Semantik-Token `disabled.opacity` gedimmt
  (Aura-Default `0.6`, `.p-component:disabled { opacity: ... }` in `@primeuix/styles/base`). Statt
  diesen auch von anderen Komponenten (Inputs, Checkboxes, …) genutzten globalen Mechanismus zu
  überschreiben — was den Änderungsumfang der Story über Buttons hinaus vergrößert hätte —, wird
  bewusst derselbe `color.text`-Wert (`#EDEFF4`) auch für den deaktivierten Zustand verwendet:
  rechnerisch ergibt `#EDEFF4` bei 60 % Opazität 6,31:1 auf `#10151F` und 6,06:1 auf `#161D2B` (siehe
  `us-079-button-varianten-design-tokens.spec.ts`, Akzeptanzkriterium 2) — beide deutlich über der
  geforderten 4,5:1-Schwelle, weil die Ausgangsfarbe selbst schon extrem hell ist. Damit war weder ein
  separater Disabled-Token noch eine zusätzliche Custom-CSS-Regel nötig.
- **Hover-Rahmen nur dort gesetzt, wo das Schema ihn kennt:** Akzeptanzkriterium 1 verlangt einen
  Hover-Rahmen „entsprechend dem in US-078 festgelegten Wert" (`#5D6883`, `formField.hoverBorderColor`
  — seit US-078/ADR-0012 unverändert als Nicht-Text-Rahmenfarbe gültig, da WCAG-Kontrastanforderungen
  ausschließlich für Text gelten). Geprüft anhand der PrimeNG-Typdefinitionen: nur die Filled-Variante
  (`components.button.root.secondary`) besitzt überhaupt ein `hoverBorderColor`-Feld — `outlined` und
  `text` kennen strukturell keinen separaten Hover-Rahmen-Token; PrimeNGs Basis-CSS hält bei diesen
  beiden Varianten den Rahmen zwischen Normal- und Hover-Zustand konstant und ändert beim Hover
  ausschließlich die Hintergrundfläche. Der Hover-Rahmen-Wert wurde deshalb ausschließlich bei
  `root.secondary` gesetzt; eine Custom-CSS-Erweiterung für `outlined`/`text` nur für diesen
  kosmetischen Nebeneffekt hätte den Änderungsumfang ohne einen dazu gemessenen Bug-Befund vergrößert
  (CLAUDE.md Abschnitt 6: PRD-konformste, am wenigsten überraschende Interpretation gewählt).
- **Umfang bewusst auf `outlined`/`text`/`secondary` sowie zusätzlich `outlined.primary` (Standard-
  outlined ohne `severity`) und `root.secondary` (reine Filled-Variante) ausgeweitet:** Letztere beide
  Kombinationen sind aktuell in keinem Screen im Einsatz (repo-weit geprüft), werden aber trotzdem
  gemappt, damit im zentralen Preset keine ungemappte Aura-Restfarbe verbleibt, falls eine künftige
  Story eine dieser Kombinationen verwendet (SPEC-00 §4: kein Screen setzt Button-Farben lokal — das
  Preset ist die einzige Stelle dafür). `text.primary` (Standard-Text-Button ohne `severity`, z. B.
  „Abbrechen"/„Schließen" in mehreren Dialogen) wurde bewusst NICHT verändert: `button.text.primary
  .color` referenziert in Aura bereits `{primary.color}` = `semantic.primary.color` (`#EDEFF4`) und
  war nie Teil des gemessenen Bugs (der Dialog-Bug in der Root-Cause-Tabelle war die weiße
  Dialogfläche dahinter, bereits durch US-077 behoben).
- **Lokale Verifizierbarkeit:** `docker compose up` war in der Agenten-Umgebung nicht erreichbar
  (Docker-Daemon nicht verbunden, `//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe
  Einschränkung wie bereits bei US-077/US-078 dokumentiert). Als Ersatz wurde die Fläche visuell via
  `ng serve` (temporäre, nicht committete Test-Route, danach vollständig entfernt) in echtem Chrome
  geprüft und per Screenshot belegt (siehe PR-Beschreibung) — zusätzlich zum automatisierten
  Story-Test, der dieselben Werte gegen echtes `getComputedStyle` in `ChromeHeadlessCI` prüft.
