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

### Status

Fertig am 30.08.2026. PR: `feature/US-067-verteiler-kommunikationsart-chip` → `main` (siehe PR-Beschreibung für Details).

**So probierst du es aus:**

1. `docker-compose up -d --build`, dann als Systemadmin (`admin@example.com` / initiales Passwort aus `SEED_ADMIN_PASSWORD`, Passwortänderung beim ersten Login erzwungen) unter `http://localhost:4200` anmelden.
2. Im Admin-Bereich ein Projekt anlegen, dich selbst (oder einen Testnutzer) als `PL` oder `Coreteam` zuweisen, eine Kommunikationsart anlegen (z. B. „Monatlicher Statusbericht an alle Stakeholder“, bewusst lang gewählt) und mindestens einen Stakeholder mit E-Mail-Adresse anlegen, dem du diese Kommunikationsart auf der Stakeholder-Detailseite zuordnest.
3. Im Projekt-Workspace auf den Tab „Verteiler“ wechseln: Die Spalte „Kommunikationsart“ zeigt den Wert nicht mehr als reinen Zellentext, sondern als abgerundete Pille mit eigenem, vom Zeilenhintergrund abgesetztem Hintergrund — auch bei einem langen Namen bleibt der komplette Text sichtbar, ohne Abschneiden/Ellipsis.
4. Filter/Sortierung/„E-Mails kopieren“/„CSV exportieren“ funktionieren unverändert wie vor dieser Story (reine Presentation-Änderung).

Story-Tests isoliert ausführen: `ng test --include='**/us-067-verteiler-kommunikationsart-chip.spec.ts'` (aus `frontend/`).

### Anmerkungen des Agenten

Gemäß CLAUDE.md Abschnitt 6 dokumentiert (keine stillen Abweichungen):

1. **`docs/design/Verteiler.dc.html` als eigenständige Datei existiert im Repository nicht.** Die Story verweist auf diese Datei als Design-Quelle für die Chip-Optik. Tatsächlich ist dieses Artboard laut US-066 „Anmerkungen des Agenten“ Punkt 1 ein in `docs/design/S2-Projektuebersicht-Wireframe.html` eingebettetes Artboard, nicht eine separate Datei unter diesem Pfad — im Repository existiert unter `docs/design/` ausschließlich `S2-Projektuebersicht-Wireframe.html`. Da die Story selbst bereits einen konkreten, wörtlichen „Token-Hinweis“ (Abschnitt 2) mit den zu verwendenden SPEC-00-Tokens (`--app-color-surface-hover`, `--app-radius-full`/`--app-radius-sm`) sowie eine explizite Beispielmarkup-Vorgabe (`<span class="chip">Statusbericht</span>`) liefert, war die fachliche Vorgabe trotz der nicht auffindbaren Einzeldatei eindeutig und mit SPEC-05 §1.3 („Statusbericht“-Chip = `p-tag`/`.chip`-Klasse) konsistent — keine Rückfrage nötig, da keine Mehrdeutigkeit bei der eigentlichen Umsetzungsentscheidung bestand. Dies wird hier dennoch dokumentiert, damit die Diskrepanz zwischen Story-Referenz und tatsächlichem Repository-Inhalt nachvollziehbar bleibt (kein Hinweis, still übergangen).
2. **Token-Wahl: `--app-radius-full` statt `--app-radius-sm`.** Der Token-Hinweis in Abschnitt 2 der Story lässt ausdrücklich beide Radius-Token als Kandidaten offen ("je nachdem was optisch der Pillenform aus dem Design am nächsten kommt"). Da die Story selbst wörtlich von einer „Pillenform“ spricht (nicht von abgerundeten Ecken eines Rechtecks) und `--app-radius-full` (9999px) im bestehenden Code bereits exakt für dieses Muster verwendet wird (`.role-badge`, `.tab-pills`/`.tab-pill.active`-Kontext in `styles.css`), wurde `--app-radius-full` gewählt — die naheliegendste, am wenigsten überraschende Interpretation der Story-eigenen Formulierung.
3. **`.dl-communication-type-chip` als komponenten-gescopte CSS-Klasse (nicht als globale `styles.css`-Utility wie `.status-tag`/`.role-badge`).** Die Story-Technischen-Hinweise (Abschnitt 4) geben explizit vor, die Regel in `distribution-list-page.component.css` anzulegen, „Namenskonvention analog zu bestehenden `dl-*`-Klassen dieser Komponente“ — obwohl es in `styles.css` bereits ein etabliertes globales Chip-/Badge-Muster (`.status-tag`) gibt. Diese explizite Story-Vorgabe wurde wörtlich umgesetzt (keine stille Abweichung zu einer global wiederverwendbaren Utility-Klasse, die für diese Story nicht verlangt war); die 0.15rem-Vertikalpolsterung wurde dennoch bewusst konsistent mit `.role-badge`/`.status-tag` übernommen, um kein visuell abweichendes drittes Pill-Muster im selben Design-System zu erzeugen.
4. **Kein Docker-Compose-Smoke-Check gegen den geteilten Gesamtsystem-Stack.** Analog zur in US-066 „Anmerkungen des Agenten“ Punkt 5 dokumentierten Situation lief zum Zeitpunkt dieser Story bereits ein von anderen, parallel aktiven Story-Agenten genutzter `docker-compose`-Stack (`steakholder`) sowie weitere isolierte Test-Stacks anderer Agenten auf demselben Rechner. Statt diesen geteilten Stack zu beeinträchtigen, wurde ein eigener, isolierter Stack unter einem separaten Compose-Projektnamen (`us067smoke`) mit temporär umgemappten Ports (5435/5003/4203 statt 5432/5000/4200) gestartet, der manuelle Smoke-Test (Login, Projekt-/Kommunikationsart-/Stakeholder-Anlage, Kommunikationszuordnung, Verteiler-Tab-Screenshot) darauf durchgeführt und der Stack anschließend vollständig wieder abgebaut (`docker compose down -v`); die dafür temporär in `docker-compose.yml` geänderten Ports wurden vor dem Commit vollständig zurückgesetzt (`git checkout -- docker-compose.yml`), sodass die Datei im PR unverändert bleibt. Der Screenshot-Nachweis liegt der PR-Beschreibung bei.
5. **`ng test`/`ng lint` Ergebnis.** Vollständige Angular-Testsuite (`ng test --watch=false --browsers=ChromeHeadless`): 408/408 grün (davon 4 neue Story-Test-Fälle in `us-067-verteiler-kommunikationsart-chip.spec.ts` sowie je ein neuer Regressionstest in `distribution-list-page.component.spec.ts` und `us-042-verteilerlisten-ui.spec.ts`). `ng lint`: fehlerfrei.
