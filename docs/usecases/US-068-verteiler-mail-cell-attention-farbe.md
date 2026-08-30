**ID:** US-068
**Titel:** „Keine E-Mail hinterlegt“-Hinweis: nur Icon in Attention-Farbe, Text gedämpft
**Bounded Context / Domain:** DistributionList (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-067

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich beim Hinweis „keine E-Mail hinterlegt“ auf einen Blick per Icon erkennen, dass hier Aufmerksamkeit nötig ist, während der begleitende Text ruhig/gedämpft bleibt, damit die Signalfarbe gezielt auf das Warn-Icon konzentriert ist statt die ganze Zelle unnötig zu betonen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #84](https://github.com/Inso666/SlobSteak/issues/84), Design-Abgleich gegen `docs/design/S2-Projektuebersicht-Wireframe.html`, Artboard `Verteiler.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.css` Zeilen 85–91, Klasse `.dl-mail-cell--missing`):** Sowohl Icon als auch Text „keine E-Mail hinterlegt“ erben `color: var(--app-attention)` — kein Kontrast zwischen Icon- und Textfarbe.
- **Soll-Zustand (Issue #84 / `Verteiler.dc.html`):** `.mail-cell.missing` — nur das Warn-Icon ist in der Attention-Farbe, der Text „keine E-Mail hinterlegt“ ist in gedämpftem, kursivem Grauton (`color:var(--text-faint); font-style:italic`, sinngemäß `--app-color-text-faint` in diesem Repo).
- **Kein Widerspruch zur bestehenden Barrierefreiheits-Begründung:** Der CSS-Kommentar über `.dl-mail-cell--missing` (Zeilen 80–84) begründet die Attention-Farbe mit SPEC-05 §3.6 („Icon **und** Text tragen die Information“ — gemeint ist: die Information „fehlende E-Mail“ wird nicht ausschließlich über Farbe vermittelt, sondern zusätzlich über Icon-Präsenz und expliziten Text). Diese Anforderung bleibt vollständig erfüllt, unabhängig davon, ob der Text zusätzlich farblich hervorgehoben ist oder gedämpft dargestellt wird — WCAG „nicht nur Farbe als Träger der Information“ ist bereits durch Icon + Klartext erfüllt. Die Design-Vorgabe aus Issue #84 (nur Icon farbig) steht dieser Begründung also nicht entgegen.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an Datenmodell oder Logik.

### 3. Akzeptanzkriterien

- [ ] Das Warn-Icon (`pi pi-exclamation-triangle`) in `.dl-mail-cell--missing` bleibt in `var(--app-attention)` dargestellt.
- [ ] Der begleitende Text „keine E-Mail hinterlegt“ wird in gedämpftem Grauton (`var(--app-color-text-faint)`, bestehendes SPEC-00-Token) und kursiv dargestellt, nicht mehr in `var(--app-attention)`.
- [ ] Das `title`-Attribut/Tooltip-Verhalten der Zelle bleibt unverändert erhalten.
- [ ] Automatisierter Test (Angular `TestBed`) belegt: berechnete Textfarbe des Labels weicht von der berechneten Icon-Farbe ab (bzw. Icon behält `--app-attention`, Text nutzt `--app-color-text-faint`).
- [ ] Manueller Smoke-Test gegen `docker-compose up`: sichtbarer Kontrast zwischen Icon- und Textfarbe in der Zelle, vergleichbar mit `docs/design/Verteiler.dc.html` — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `DistributionListPageComponent` (inkl. `us-042-verteilerlisten-ui.spec.ts` und der Story-Tests aus US-066/US-067) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.css` (Zeilen 85–91, `.dl-mail-cell--missing` — Farbe vom `span`-Container auf ein Icon-spezifisches Selektor-Element verschieben, z. B. `.dl-mail-cell--missing i` für die Attention-Farbe, ein neuer Selektor für das Text-`span` mit `var(--app-color-text-faint)` + `font-style: italic`)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` (Zeilen 110–113, ggf. Markup-Anpassung für getrennte Icon-/Text-Selektoren)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.spec.ts`, `frontend/src/app/features/distribution/us-042-verteilerlisten-ui.spec.ts`

**Wichtige Invarianten:**
- Kein neues Farb-Token — `--app-attention` (Icon) und `--app-color-text-faint` (Text) sind beide bereits bestehende SPEC-00-Tokens.
- Die in `frontend/src/styles.css`/CSS-Kommentar dokumentierte SPEC-05-§3.6-Begründung (Icon **und** Text tragen die Information) bleibt gültig und wird nicht entfernt, nur um die reine Farbzuordnung präzisiert.

### Anmerkungen des Product Owners

Dritte von drei sequenziell verketteten Verteiler-Design-Korrekturen (nach [US-066](US-066-verteiler-fusszeile-gesamtzahl.md), [US-067](US-067-verteiler-kommunikationsart-chip.md)) — Verkettung ausschließlich wegen gemeinsam betroffener Dateien, nicht wegen fachlicher Abhängigkeit.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
