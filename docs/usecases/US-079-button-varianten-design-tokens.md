**ID:** US-079
**Titel:** PrimeNG-Button-Varianten (outlined, text, deaktiviert) auf die Design-Tokens mappen
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht, zentrales PrimeNG-Preset)
**Abhängigkeiten:** US-077, US-078
**Status:** offen

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

- [ ] `slobsteak-preset.ts` mappt die Button-Varianten `outlined`, `text` und `secondary` auf die Design-Tokens: Schrift `color.text` (`#EDEFF4`), Rahmen `color.border` (`#262F42`), Fläche transparent, Hover-Rahmen entsprechend dem in US-078 festgelegten Wert.
- [ ] Der deaktivierte Zustand erhält eine bewusst gewählte Farbe mit mindestens 4,5:1 gegen beide Flächen (`#10151F` und `#161D2B`). Begründung: „Abbrechen" ist in mehreren Formularen die einzige Abbruchoption; ein unlesbarer Deaktiviert-Zustand wird nicht als „ausgegraut", sondern als „nicht vorhanden" wahrgenommen.
- [ ] Kein Screen setzt Button-Farben lokal (SPEC-00 §4) — die Änderung erfolgt ausschließlich im Preset.
- [ ] Alle Button-Varianten erreichen mindestens 4,5:1 in den Zuständen normal, hover, fokussiert und deaktiviert: `primary`, `outlined`, `text`, `secondary`.
- [ ] Automatisierter Test (Angular `TestBed`) belegt die Farbzuweisung mindestens für `outlined` und `text` inklusive deaktiviertem Zustand.
- [ ] Manueller Smoke-Test gegen `docker compose up`: Verteiler („E-Mails kopieren", „CSV exportieren") und Stakeholder-Detail („Abbrechen" im unveränderten Formularzustand) — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-043, dessen Verarbeitungs-Buttons dieselben Varianten nutzen).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/theme/slobsteak-preset.ts`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Der primäre Button bleibt beim Wireframe-Muster „Fläche = `color.text`, Schrift = `color.background`" (SPEC-00 §1.3).
- Die Akzentfarbe bleibt dem Fokus-Ring und Aufmerksamkeitssignalen vorbehalten (SPEC-00 §4) und wird nicht zur Button-Farbe.
- Keine Backend-Änderung, keine Migration.
