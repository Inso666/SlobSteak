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

### Status

Fertig am 30.08.2026. PR: `feature/US-068-verteiler-mail-cell-attention-farbe` → `main` (siehe PR-Beschreibung für Details).

**So probierst du es aus:**

1. `docker-compose up -d --build`, dann als Systemadmin (`admin@example.com` / initiales Passwort aus `SEED_ADMIN_PASSWORD`, Passwortänderung beim ersten Login erzwungen) unter `http://localhost:4200` anmelden.
2. Im Admin-Bereich ein Projekt anlegen, dich selbst (oder einen Testnutzer) als `PL` oder `Coreteam` zuweisen, eine Kommunikationsart anlegen und einen Stakeholder **ohne** E-Mail-Adresse anlegen, dem du diese Kommunikationsart auf der Stakeholder-Detailseite zuordnest.
3. Im Projekt-Workspace auf den Tab „Verteiler“ wechseln: In der Zeile des Stakeholders ohne E-Mail zeigt die Spalte „E-Mail“ das Warn-Icon in Orange (Attention-Farbe) und daneben den kursiven, gedämpften Text „keine E-Mail hinterlegt“ — deutlich unterscheidbarer Kontrast zwischen Icon- und Textfarbe. Hovern über die Zelle zeigt weiterhin den unveränderten Tooltip.
4. Alle übrigen Spalten/Filter/Aktionen (Kommunikationsart-Chip aus US-067, Fußzeile aus US-066, „E-Mails kopieren“, „CSV exportieren“) funktionieren unverändert wie vor dieser Story (reine Presentation-Änderung).

Story-Tests isoliert ausführen: `ng test --include='**/us-068-verteiler-mail-cell-attention-farbe.spec.ts'` (aus `frontend/`).

### Anmerkungen des Agenten

Gemäß CLAUDE.md Abschnitt 6 dokumentiert (keine stillen Abweichungen):

1. **Kein Markup-Änderung nötig.** Die Story-Technischen-Hinweise (Abschnitt 4) erwähnen „ggf. Markup-Anpassung für getrennte Icon-/Text-Selektoren“ als Möglichkeit. Das bestehende Markup (`distribution-list-page.component.html` Zeilen 110–113) trennt Icon (`<i class="pi pi-exclamation-triangle">`) und Text (`<span>{{ missingEmailLabel }}</span>`) bereits als zwei Geschwister-Elemente innerhalb des `.dl-mail-cell--missing`-Containers — eine reine CSS-Änderung (Farbe vom Container-`span` auf die beiden Kind-Elemente `i`/`span` verschoben) genügt, ohne die HTML-Datei anzufassen.
2. **Kein Docker-Compose-Smoke-Check gegen den geteilten Gesamtsystem-Stack.** Analog zur in US-066/US-067 „Anmerkungen des Agenten“ dokumentierten Situation wurde ein eigener, isolierter Stack unter einem separaten Compose-Projektnamen (`us068smoke`) mit temporär umgemappten Ports (5437/5005/4205 statt 5432/5000/4200) gestartet, der manuelle Smoke-Test (Login, Projekt-/Kommunikationsart-/Stakeholder-Anlage ohne E-Mail, Kommunikationszuordnung, Verteiler-Tab-Screenshot) darauf durchgeführt und der Stack anschließend vollständig wieder abgebaut (`docker compose down -v`); die dafür temporär in `docker-compose.yml` geänderten Ports wurden vor dem Commit vollständig zurückgesetzt (`git checkout -- docker-compose.yml`), sodass die Datei im PR unverändert bleibt. Der Screenshot-Nachweis liegt der PR-Beschreibung bei.
3. **`ng test`/`ng lint` Ergebnis.** Vollständige Angular-Testsuite (`ng test --watch=false --browsers=ChromeHeadless`): 412/412 grün (davon 4 neue Story-Test-Fälle in `us-068-verteiler-mail-cell-attention-farbe.spec.ts`). `ng lint`: fehlerfrei. `distribution-list-page.component.spec.ts` und `us-042-verteilerlisten-ui.spec.ts` blieben unverändert grün, da sie nur Icon-Präsenz/Text-Inhalt prüfen, nicht Farbwerte.
