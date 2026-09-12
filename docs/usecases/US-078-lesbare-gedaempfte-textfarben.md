**ID:** US-078
**Titel:** Gedämpfte Textfarbe und Rollen-Badges auf WCAG-AA-Kontrast anheben
**Bounded Context / Domain:** Frontend-Shell (Design-System / zentrale Tokens)
**Abhängigkeiten:** US-047, US-077
**Status:** fertig am 2026-09-13, PR feature/US-078-lesbare-gedaempfte-textfarben

---

### 1. User Story

Als **Nutzer** möchte ich Meta-Angaben wie „Aktualisiert vor 2 Min.", Prozentwerte, Tabellenköpfe, „noch nicht bewertet" und die Rollenkürzel zuverlässig lesen können — auch bei durchschnittlicher Bildschirmhelligkeit oder eingeschränktem Sehvermögen — statt sie nur zu erahnen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #119](https://github.com/Inso666/SlobSteak/issues/119) und [Issue #121](https://github.com/Inso666/SlobSteak/issues/121), QA-Design-Abgleich vom 04.09.2026.
- **Gruppierung:** Beide Issues sind derselbe Fehlertyp (Farbwert eines zentralen Tokens verfehlt den AA-Mindestkontrast) und werden in derselben Datei (`frontend/src/styles.css`) plus derselben Spec-Stelle (SPEC-00 §1.2) behoben. Eine Aufteilung würde zwei Stories denselben Token-Block ändern lassen.

**Befund 1 — `--app-color-text-faint: #5d6883`** verfehlt 4,5:1 an jeder Verwendungsstelle (gemessen mit Auflösung von Alpha und Opacity gegen den effektiven Hintergrund):

| Stelle | Farbe auf Grund | Kontrast |
|---|---|---|
| `.meta` „Aktualisiert vor 2 Min." (Projektkarte) | `#5d6883` auf `#161d2b` | 3,03 |
| `.pct` „80 %" (Fortschrittsringe) | `#5d6883` auf `#161d2b` | 3,03 |
| `.app-navigation__project-label` | `#5d6883` auf `#161d2b` | 3,03 |
| `.sh-meta` / `.sh-none` „– noch nicht bewertet" | `#5d6883` auf `#10151f` | 3,28 |
| `.sh-row-count` „10 Stakeholder insgesamt" | `#5d6883` auf `#10151f` | 3,28 |
| `.au-meta` „Aktiv" / Datum (Admin) | `#5d6883` auf `#10151f` | 3,28 |
| `.dl-excluded-note` „(1 ausgeschlossen)" (Verteiler) | `#5d6883` auf `#10151f` | 3,28 |
| „keine E-Mail hinterlegt" (Verteiler) | `#5d6883` auf `#10151f` | 3,28 |

**Befund 2 — Rollen-Badges** (Rollenfarbe auf 16 % derselben Farbe als Fläche) verfehlen 4,5:1 knapp:

| Kontext | Farbe auf effektivem Grund | Kontrast |
|---|---|---|
| Projektkarte, PL-Badge | `#8b7cf6` auf `#292c4b` | 4,05 |
| Projekt-Header / Tabellenzelle, PL-Badge | `#8b7cf6` auf `#242541` | 4,44 |

Die Badges sind 11px bei Fettung 600/700 — das zählt nicht als „large text" (dafür wären mindestens 18,66px nötig), es gilt die 4,5:1-Schwelle.

**Verschärfend:** Abgedimmte Zustände multiplizieren den Fehler. Archivierte Projektkarten nutzen `--app-map-point-locked-opacity: 0.72` (US-064); im Wireframe sind es 0,6 — dort fällt `.tag-archived` auf 1,82:1 und `.role-label` auf 1,9:1.

### 3. Akzeptanzkriterien

- [ ] `--app-color-text-faint` in `frontend/src/styles.css` erhält einen Wert, der auf beiden im Produkt vorkommenden Flächen (`#10151F` Seitenhintergrund und `#161D2B` Surface) mindestens 4,5:1 erreicht. Der neue Wert bleibt visuell erkennbar schwächer als `--app-color-text-muted` (`#8D97AC`), damit die dreistufige Texthierarchie aus SPEC-00 §1.2 erhalten bleibt; ist das nicht erreichbar, wird `text-faint` ersatzlos auf `text-muted` zusammengeführt und die Zusammenführung in der Story-Datei begründet.
- [ ] Die Rollen-Badge-Kombination (`.role-badge--pl`/`--coreteam`/`--architect` in `styles.css`) erreicht mindestens 4,5:1. Zulässige Wege: Rollenfarbe für die Badge-Verwendung aufhellen oder Badge-Fläche abdunkeln bzw. Deckkraft senken.
- [ ] Die reinen Rollenfarben `--app-role-pl`/`-ct`/`-ar` als Datenfarbe (Map-Punkte, Fortschrittsringe, Slider) bleiben unverändert — die Änderung darf nur die Badge-Kombination betreffen, damit Map-Legende, Ringe und Badges weiterhin dieselbe Rolle signalisieren.
- [ ] Archivierte Projektkarten erreichen nach der Änderung ebenfalls mindestens 4,5:1 für alle Texte; falls die Deckkraft dafür angehoben werden muss, wird das Token angepasst, nicht der Karten-Screen lokal.
- [ ] `docs/specs/SPEC-00-Design-System.md` §1.2 wird auf die neuen Werte aktualisiert (Zeile 25 nennt aktuell `#5D6883`).
- [ ] Ein kurzes ADR (`docs/adr/00NN-kontrast-vor-wireframe-treue.md`) hält fest, dass bei Konflikt zwischen Wireframe-Farbwert und WCAG-AA-Kontrast der Kontrast gewinnt — inklusive der Begründung, dass die Wireframes dieselben Werte tragen und der Befund damit ein Fehler der Vorlage ist.
- [ ] Automatisierter Test belegt die Kontraste rechnerisch für alle geänderten Token-Kombinationen (Token-Werte aus `styles.css` einlesen und gegen eine kleine Kontrast-Hilfsfunktion prüfen).
- [ ] Manueller Smoke-Test gegen `docker compose up` über Projektübersicht, Stakeholder-Liste, Verteiler und Admin — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-047, US-064, US-068, US-076).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/styles.css` (`--app-color-text-faint`, Badge-Regeln bzw. `--app-role-*-bg`, ggf. `--app-map-point-locked-opacity`)
- `frontend/src/app/core/theme/slobsteak-preset.ts` (`formField.placeholderColor` und `formField.disabledColor` führen aktuell denselben Wert `#5D6883`)
- `docs/specs/SPEC-00-Design-System.md`
- `docs/adr/00NN-kontrast-vor-wireframe-treue.md`

**Wichtige Invarianten:**
- SPEC-00 §4: `--app-attention` bleibt Aufmerksamkeitssignalen vorbehalten und ist kein Ersatz für gedämpften Text.
- Keine Backend-Änderung, keine Migration.

### 5. Anmerkungen des Product Owners

`docs/design/S2-Projektuebersicht-Wireframe.html` wird in dieser Story bewusst nicht geändert. Der Wireframe ist die Momentaufnahme des Entwurfs; die verbindliche, gepflegte Quelle für Token-Werte ist `docs/specs/SPEC-00-Design-System.md`. Die Abweichung zwischen beiden wird über das ADR dokumentiert, damit ein späterer Design-Abgleich sie nicht erneut als Fehler meldet (CLAUDE.md Abschnitt 6).

### 6. Anmerkungen des Dev-Agenten (Umsetzung 2026-09-13)

**AC1 — `--app-color-text-faint` wurde ersatzlos mit `--app-color-text-muted` zusammengeführt**, nicht auf einen neuen Zwischenwert angehoben. Begründung: Der Token muss auf `color.surface` (die knappere der beiden Flächen) mindestens 4,5:1 erreichen. Der höchste rechnerisch mögliche Wert, der dabei noch sichtbar schwächer als `color.text-muted` bleibt (z. B. `#8993B5`, Kontrast 5,55:1), liegt nur noch 0,2 Kontrastpunkte unter `color.text-muted` (5,75:1) — auf einem realen Bildschirm praktisch nicht mehr unterscheidbar. Die dreistufige Texthierarchie aus SPEC-00 §1.2 wäre damit nur noch auf dem Papier, nicht mehr optisch, vorhanden gewesen. Alle vormaligen Verwendungsstellen (Meta-Infos, Zeitstempel, Map-Legende, Formularfeld-Platzhalter-/Disabled-Text in `slobsteak-preset.ts`, `select`/`textarea`-Hover-Rahmen) nutzen jetzt `--app-color-text-muted`. Siehe ADR-0012.

**AC2 — nur die PL-Badge-Kombination war betroffen.** Coreteam (`--app-role-ct`) und Architect (`--app-role-ar`) erreichen als Textfarbe auf ihrer jeweiligen 16%-Opazitätsfläche bereits >4,5:1 und wurden nicht verändert. Für PL wurde ein neuer, badge-exklusiver Token `--app-role-pl-badge` (`#A89DF8`) eingeführt, der ausschließlich `.role-badge--pl { color: … }` speist; die Badge-Hintergrundfläche (`--app-role-pl-bg`) blieb unverändert.

**AC4 — Konsequenz für `--app-map-point-locked-opacity`:** Die bestehende Wiederverwendung dieses Tokens für archivierte Projektkarten (`.project-card.archived`, US-074) bedeutet, dass CSS-`opacity` Text- und Flächenfarbe gemeinsam gegen den Seitenhintergrund faltet. Rechnerisch (siehe `us-078-lesbare-gedaempfte-textfarben.spec.ts` sowie ADR-0012) hält kein geprüfter Wert unterhalb von `0,92` alle betroffenen Kombinationen (bindend: `text-muted` im „ARCHIVIERT"-Status-Tag auf `color.surface-hover`) über 4,5:1 — der Token wurde daher von `0,72` auf `0,92` angehoben, nicht der Karten-Screen lokal verändert. Das bestehende, US-064 zugeordnete Story-Test-File `us-064-map-opacity-token-vereinheitlichen.spec.ts` wurde entsprechend auf den neuen Zahlenwert aktualisiert (die dortige Akzeptanz — ein einziger benannter Token statt verstreuter Literale — bleibt unberührt). **Sichtbare Nebenwirkung:** Archivierte Projektkarten wirken dadurch nur noch schwach gedimmt; die Erkennbarkeit stützt sich in der Praxis primär auf den „ARCHIVIERT"-Text-Tag. Das ist im ADR als bewusste, dokumentierte Konsequenz festgehalten, keine übersehene Regression.

**Lokale Verifizierbarkeit:** `docker compose up` war in dieser Ausführungsumgebung nicht erreichbar (kein Docker-Daemon) — dieselbe Einschränkung wie bereits bei US-077 dokumentiert. Stattdessen: vollständiger `ng test`-Lauf (515/515 grün, inkl. neuem Story-Test und den angepassten US-064-/US-068-Story-Tests), `ng lint` fehlerfrei, sowie eine rechnerische Verifikation aller elf betroffenen Token-Kombinationen (Node-Skript mit derselben WCAG-Kontrastformel wie im Story-Test) gegen die tatsächlichen finalen Hex-/Opazitätswerte. Ein Browser-Smoke-Test gegen das über `docker compose up` laufende Gesamtsystem konnte nicht durchgeführt werden und ist im PR als offene Einschränkung vermerkt.
