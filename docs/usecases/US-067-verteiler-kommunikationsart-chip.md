**ID:** US-067
**Titel:** Kommunikationsart-Spalte im Verteiler als Chip darstellen
**Bounded Context / Domain:** DistributionList (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-066

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich den Wert der Spalte „Kommunikationsart“ in der Verteilerliste als optisch abgesetzten Chip erkennen, damit ich Kommunikationsarten auf einen Blick von den übrigen Tabellenspalten unterscheiden kann.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #83](https://github.com/Inso666/SlobSteak/issues/83), Design-Abgleich gegen `docs/design/S2-Projektuebersicht-Wireframe.html`, Artboard `Verteiler.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` Zeile 116):** `<td>{{ row.communicationTypeName }}</td>` — reiner Fließtext ohne jede Chip-/Badge-Umrandung, optisch nicht von Nachbarspalten unterscheidbar.
- **Soll-Zustand (Issue #83 / `Verteiler.dc.html`):** Der Wert wird als `.chip`-Element dargestellt — abgerundete Pille mit eigenem Hintergrund und Rahmen, farblich abgesetzt vom übrigen Zelleninhalt (z. B. `<span class="chip">Statusbericht</span>`).
- **Token-Hinweis:** `docs/design` referenziert `var(--surface-2)` als Chip-Hintergrund — dieser Tokenname existiert nicht 1:1 in `frontend/src/styles.css` (SPEC-00-Tokens sind `--app-*`-präfixiert, z. B. `--app-color-surface`, `--app-color-surface-hover`, `--app-radius-full`). Analog zur bereits in US-042 Anmerkung 4 dokumentierten Vorgehensweise bei einem nicht deckungsgleichen Design-Tokennamen: es wird kein neues Token erfunden, sondern der semantisch passende bestehende SPEC-00-Token verwendet (`--app-color-surface-hover` als Hintergrund, `--app-radius-full` oder `--app-radius-sm` als Randradius, je nachdem was optisch der Pillenform aus dem Design am nächsten kommt).
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an `DistributionListEntryResponse`/API-Contract.

### 3. Akzeptanzkriterien

- [ ] Der Wert der Spalte „Kommunikationsart“ wird in einem `<span>`-Element mit eigenem, abgesetztem Hintergrund und abgerundeten Ecken (Pillenform) dargestellt, statt als reiner Zellentext.
- [ ] Das Chip-Styling nutzt ausschließlich bestehende SPEC-00-Tokens (kein neu erfundenes Farb-/Radius-Token).
- [ ] Chip bleibt bei langen Kommunikationsart-Namen lesbar (kein abgeschnittener Text ohne Tooltip/vollständigen Inhalt).
- [ ] Automatisierter Test (Angular `TestBed`) belegt: Zelle enthält ein Chip-Element mit dem korrekten Namen der Kommunikationsart als Inhalt.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Spalte „Kommunikationsart“ ist optisch als Pille erkennbar, vergleichbar mit `docs/design/Verteiler.dc.html` — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `DistributionListPageComponent` (inkl. `us-042-verteilerlisten-ui.spec.ts` und der Story-Tests aus US-066) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` (Zeile 116)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.css` (neue `.dl-communication-type-chip`-Regel, Namenskonvention analog zu bestehenden `dl-*`-Klassen dieser Komponente)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.spec.ts`, `frontend/src/app/features/distribution/us-042-verteilerlisten-ui.spec.ts`

**Wichtige Invarianten:**
- Keine Änderung an Filterlogik, Sortierung oder Datenmodell — reine visuelle Zellendarstellung.

### Anmerkungen des Product Owners

Zweite von drei sequenziell verketteten Verteiler-Design-Korrekturen (nach [US-066](US-066-verteiler-fusszeile-gesamtzahl.md), vor [US-068](US-068-verteiler-mail-cell-attention-farbe.md)) — Verkettung ausschließlich wegen gemeinsam betroffener Dateien, nicht wegen fachlicher Abhängigkeit.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
