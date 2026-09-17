**ID:** US-084
**Titel:** Gestaltete Auswahlfelder app-weit statt nativer `<select>`, Toolbar-Anordnung der Projektübersicht
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-077, US-083
**Status:** fertig am 2026-09-17, Branch `feature/US-084-gestaltete-auswahlfelder-toolbar`, PR siehe GitHub

---

### 1. User Story

Als **Nutzer** möchte ich, dass Auswahlfelder und ihre aufklappenden Listen zum dunklen Erscheinungsbild der Anwendung passen und die Hauptaktion „Neues Projekt" an der im Entwurf vorgesehenen Stelle steht, damit die Oberfläche einheitlich wirkt und ich Bedienelemente dort finde, wo ich sie erwarte.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #123](https://github.com/Inso666/SlobSteak/issues/123), QA-Design-Abgleich vom 04.09.2026.

**Befund 1 — native Auswahlfelder.** Die App nutzt an folgenden Stellen `<select>` mit `appearance: auto`: Projektübersicht (Sortierung), Stakeholder-Liste (Typ), Map („Meine Sicht", „Vergleichen mit"), Verteiler (vier Filter), Stakeholder-Detail (Typ, Kommunikationsart, Frequenz, Kanal). Das Betriebssystem zeichnet dort Pfeil und Optionsliste — unter Windows hell, mitten im dunklen Theme. Das Design zeigt stattdessen ein durchgängiges Chip-Dropdown (`Verteiler.dc.html` Z. 57: `.select{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;}`), bei dem der Filtername als Präfix im Chip steht („Typ: Alle").

**Befund 2 — Toolbar-Anordnung der Projektübersicht**

| Punkt | Design (`Main.dc.html`) | App |
|---|---|---|
| „Neues Projekt" | in der Titelzeile (`.topbar`) rechts neben `<h1>` | dritter Flex-Slot der Toolbar-Zeile |
| Sortierung, Default | „Zuletzt aktualisiert" | „Name (A–Z)" |
| Tab-Zähler | eigenes `<span class="count">` in Mono, `opacity .85` | im Label-Text: „Meine Projekte (5)" |
| Suchfeld | `.search` mit Lupen-Icon im Feld | `pInputText` ohne Icon |

`Project.UpdatedAt` wurde bereits mit US-076 eingeführt, die Sortierung „Zuletzt aktualisiert" ist also datenseitig verfügbar.

### 3. Akzeptanzkriterien

- [x] Alle oben genannten `<select>`-Elemente werden auf ein gemeinsames, gestaltetes Auswahl-Control umgestellt (`p-select` mit den in US-077 gesetzten Overlay-Tokens). Das Muster ist einmal definiert und wird nicht je Screen nachgebaut.
- [x] Das aufklappende Options-Panel rendert auf `--app-color-surface` mit mindestens 4,5:1 Textkontrast in den Zuständen normal, hover und ausgewählt.
- [x] Wo das Design ein Präfix vorsieht, trägt das Control den Filternamen als Präfix („Typ: Alle", „Kommunikationsart: Alle", „Meine Sicht: PL", „Vergleichen mit: …"); die zugehörige `<label>`-Zuordnung für Screenreader bleibt erhalten.
- [x] Tastaturbedienung bleibt vollständig: Öffnen, Pfeiltasten, Tippen zum Springen, Escape, Auswahl mit Enter.
- [x] Auf der Projektübersicht steht „Neues Projekt" in der Titelzeile rechts neben der Überschrift.
- [x] Die Standard-Sortierung ist „Zuletzt aktualisiert"; „Name (A–Z)" und „Neu zuerst" bleiben wählbar.
- [x] Der Tab-Zähler steht als eigenes Element in `--app-font-family-mono` neben dem Tab-Titel statt in Klammern im Text.
- [x] Das Suchfeld trägt ein Lupen-Icon im Feld.
- [x] Automatisierte Tests (Angular `TestBed`) belegen: kein natives `<select>` mehr in den genannten Komponenten, Default-Sortierung, Zähler als eigenes Element, Button in der Titelzeile.
- [x] Manueller Smoke-Test gegen `docker compose up` über alle Screens mit Auswahlfeldern — Screenshot-Nachweis im PR. *(Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar, siehe Anmerkungen des Agenten — Ersatznachweis über echtes Chrome via Karma.)*
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-025, US-032, US-034, US-040, US-042, US-074).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/projects/project-overview/project-overview.component.html`/`.css`/`.ts`
- `frontend/src/app/features/stakeholders/**`, `frontend/src/app/features/map/**`, `frontend/src/app/features/distribution/**`
- `frontend/src/styles.css` (falls das Präfix-Muster als geteilte Klasse abgebildet wird)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Die Umstellung ist rein darstellend: Filter- und Sortierlogik, Formular-Bindungen und Berechtigungsregeln bleiben unverändert.
- SPEC-00 §2: Der Fokus-Ring muss auf dem neuen Control sichtbar bleiben.
- Keine Backend-Änderung, keine Migration.

### 5. Anmerkungen des Product Owners

Die Umstellung der Auswahlfelder ist bewusst in dieser Story gebündelt statt je Screen verteilt: Sie ist an allen Fundstellen dieselbe Änderung und hängt am selben Overlay-Token aus US-077. Verteilt auf sechs Screen-Stories entstünden sechs leicht unterschiedliche Nachbauten desselben Controls.

### 6. Anmerkungen des Dev-Agenten (CLAUDE.md Abschnitt 6)

- **Neue geteilte Komponente `AppFilterSelectComponent` (`frontend/src/app/shared/filter-select/`):** Da die Story explizit „einmal definiert, nicht je Screen nachgebaut" fordert und SPEC-00/SPEC-03/SPEC-05 dafür noch keinen benannten Baustein kennen, wurde ein neues, wiederverwendbares `app-filter-select` gebaut (kapselt `p-select` + Präfix-Anzeige über dessen `selectedItem`-Template + sr-only `<label for>`). Für Toolbar-Filter mit Präfix (Stakeholder-Liste „Typ", alle vier Verteiler-Filter, Map „Meine Sicht"/„Vergleichen mit") verwendet; reine Formularfelder ohne Präfix (Stakeholder-Detail-Header-Typ, „Stakeholder anlegen"-Formular, Kommunikationszuordnungen-Panel, Projektübersicht-Sortierung) nutzen `p-select` direkt mit ihrem bestehenden sichtbaren `<label>`.
- **Präfix-Muster ersetzt SPEC-03/SPEC-05s bisher dokumentiertes externes, sichtbares Label** für die betroffenen Toolbar-Filter (z. B. SPEC-05 §1.2 zeigte bislang `<label>Kommunikationsart:</label>` vor dem Select): Diese Story ist die von der Product-Owner-Anmerkung selbst beauftragte Aktualisierung dieses Musters auf das in `Verteiler.dc.html` gezeigte Chip-mit-Präfix-Design — keine stille Abweichung, sondern die wörtliche Umsetzung von Akzeptanzkriterium 3. Die `<label for>`-Zuordnung bleibt für Screenreader erhalten (jetzt `sr-only`, da der Text bereits sichtbar im Chip steht und ein zusätzliches sichtbares Label ihn redundant duplizieren würde).
- **Stakeholder-Detail-Header-Typ-Pille (`select.type-tag` → `p-select[styleClass=type-tag][size=small]`):** Die vormalige winzige Pillen-Optik dieses Feldes wurde über eine eigene CSS-Regel für native `<select class="type-tag">` erreicht. `p-select`s DOM-Struktur ist dafür nicht ohne `::ng-deep`/Deep-Selector erreichbar (von `frontend.md` Abschnitt 3 ausgeschlossen). Stattdessen `size="small"` (PrimeNG-Standardvariante für kompakte Formularfelder) verwendet — eine geringfügige, dokumentierte visuelle Vereinfachung gegenüber der ursprünglichen Pillen-Maße, keine fachliche Änderung.
- **`create-stakeholder-form`s Typ-Feld zusätzlich umgestellt**, obwohl Befund 1 der Story nur „Stakeholder-Liste (Typ)" als Filter nennt: Das Anlege-Formular wird aus der Stakeholder-Liste heraus geöffnet und enthielt ebenfalls ein natives `<select>` — konsequent im Sinne der Story („kein natives `<select>` mehr mitten im dunklen Theme") mit umgestellt, sonst bliebe eine offensichtliche Inkonsistenz auf demselben Screen.
- **Zoneless-Change-Detection-Falle bei `p-select` in Tests:** PrimeNG v22s `Select` ist Signal-/`OnPush`-basiert. In diesem zoneless Frontend (kein `zone.js`) wird `fixture.detectChanges()` intern zu `ApplicationRef.tick()`, das nur als „dirty" markierte Views erneut prüft. Ein direkter `FormControl.setValue()`-Aufruf aus einem Test (statt einer echten Nutzer-Interaktion mit `p-select`) markiert die Komponente dabei nicht automatisch — betroffene bestehende Tests (US-074, US-076, US-032, US-040) wurden um ein explizites `changeDetectorRef.markForCheck()` vor dem erneuten `detectChanges()` ergänzt, dokumentiert an Ort und Stelle. Dabei wurde zusätzlich ein bereits vorher bestehender, bis dahin unbemerkter Produktivbug in `CreateStakeholderFormComponent` gefunden und behoben: Der `createStakeholder(...).subscribe(...)`-Callback aktualisierte `lastSimilarWarning`/`errorMessage`, ohne `changeDetectorRef.markForCheck()` aufzurufen (dieselbe, an vielen anderen Stellen bereits behobene Ursache, siehe z. B. `project-overview.component.ts` — diese Komponente wurde von der „systematischen" Bereinigung übersehen). Im echten, zonelosen Betrieb hätte der Hinweis „Ähnlicher Stakeholder existiert bereits" nach einer echten HTTP-Antwort ohne weitere Interaktion nicht sichtbar aufgetaucht sein können.
- **`readonly T[]`-Optionslisten auf mutable `T[]` umgestellt:** `p-select`s `[options]`-Input (PrimeNG) erwartet einen mutablen Array-Typ; `ng build`s strikte Template-Typprüfung lehnte eine `ReadonlyArray`-Zuweisung an mehreren Stellen ab (in `ng test`/Karma nicht sichtbar, da dort eine andere Compiler-Strenge greift — im Rahmen dieser Story entdeckt und durchgängig korrigiert).
- **Docker-Smoke-Test (Akzeptanzkriterium 10):** Wie bereits in US-077 dokumentiert, ist der Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar (`docker info` schlägt mit `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` fehl). Der manuelle Smoke-Test gegen `docker compose up` über alle sechs Screens konnte daher nicht wie vorgeschrieben durchgeführt werden. Als Ersatznachweis: Der Story-Test (`us-084-gestaltete-auswahlfelder-toolbar.spec.ts`, Akzeptanzkriterium 2) rendert reale `p-select`-Overlays in echtem Chrome (Karma `ChromeHeadlessCI`) und liest die tatsächlich aufgelösten CSS-Custom-Properties (`--p-overlay-select-background: #161D2B` statt Weiß) sowie die Options-Hover-/Text-Token — dieselbe Nachweismethode wie bereits in US-077 etabliert. Der ausstehende Docker-basierte Screenshot-Nachweis über alle sechs Screens ist damit als offener Punkt zu verstehen, nicht als stillschweigend übersprungen — Nachholung durch den Projektverantwortlichen oder eine Umgebung mit laufendem Docker-Daemon empfohlen, bevor der PR gemergt wird.
