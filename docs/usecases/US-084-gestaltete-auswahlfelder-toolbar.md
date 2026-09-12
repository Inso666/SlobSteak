**ID:** US-084
**Titel:** Gestaltete Auswahlfelder app-weit statt nativer `<select>`, Toolbar-Anordnung der Projektübersicht
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-077, US-083
**Status:** offen

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

- [ ] Alle oben genannten `<select>`-Elemente werden auf ein gemeinsames, gestaltetes Auswahl-Control umgestellt (`p-select` mit den in US-077 gesetzten Overlay-Tokens). Das Muster ist einmal definiert und wird nicht je Screen nachgebaut.
- [ ] Das aufklappende Options-Panel rendert auf `--app-color-surface` mit mindestens 4,5:1 Textkontrast in den Zuständen normal, hover und ausgewählt.
- [ ] Wo das Design ein Präfix vorsieht, trägt das Control den Filternamen als Präfix („Typ: Alle", „Kommunikationsart: Alle", „Meine Sicht: PL", „Vergleichen mit: …"); die zugehörige `<label>`-Zuordnung für Screenreader bleibt erhalten.
- [ ] Tastaturbedienung bleibt vollständig: Öffnen, Pfeiltasten, Tippen zum Springen, Escape, Auswahl mit Enter.
- [ ] Auf der Projektübersicht steht „Neues Projekt" in der Titelzeile rechts neben der Überschrift.
- [ ] Die Standard-Sortierung ist „Zuletzt aktualisiert"; „Name (A–Z)" und „Neu zuerst" bleiben wählbar.
- [ ] Der Tab-Zähler steht als eigenes Element in `--app-font-family-mono` neben dem Tab-Titel statt in Klammern im Text.
- [ ] Das Suchfeld trägt ein Lupen-Icon im Feld.
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: kein natives `<select>` mehr in den genannten Komponenten, Default-Sortierung, Zähler als eigenes Element, Button in der Titelzeile.
- [ ] Manueller Smoke-Test gegen `docker compose up` über alle Screens mit Auswahlfeldern — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-025, US-032, US-034, US-040, US-042, US-074).

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
