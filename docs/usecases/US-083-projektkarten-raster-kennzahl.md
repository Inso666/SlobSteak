**ID:** US-083
**Titel:** Projektübersicht: Drei-Spalten-Raster, hervorgehobene Stakeholder-Kennzahl und Karten als echte Links
**Bounded Context / Domain:** ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-074, US-076, US-080
**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich auf der Projektübersicht großzügige Karten mit einer sofort erfassbaren Stakeholder-Zahl sehen und Projekte wie normale Links öffnen können (auch in einem neuen Tab), damit die Übersicht als Einstiegsseite taugt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #122](https://github.com/Inso666/SlobSteak/issues/122), QA-Design-Abgleich vom 04.09.2026. Ergänzt die bereits umgesetzten Stories US-074 und US-076 (Issue #99) um die dort noch nicht getroffenen Layout-Punkte.

**Befund 1 — Kartenraster**

| | Design (`Main.dc.html`) | App |
|---|---|---|
| Regel | `.grid{grid-template-columns:repeat(3, minmax(0,1fr));gap:20px;}` | `.project-cards{grid-template-columns:repeat(auto-fill, minmax(14rem,1fr));}` |
| Ergebnis bei 2560px | 3 Spalten | 9 Spalten à 238px |

Bei 238px Kartenbreite bricht der Kartentitel um (etwa „Rechenzentrum-Konsolidierung"), wodurch Rollen-Badge, Kennzahl und Ringreihe zwischen den Karten vertikal verspringen.

**Befund 2 — Kennzahl-Typografie**

`.stat-num` setzt keine `font-size` und erbt damit `--app-font-size-body` (14px) aus `.stat-row`; das Design gibt 28px vor. Die Stakeholder-Zahl ist damit exakt so groß wie ihr eigenes Label. Das passende Token existiert bereits ungenutzt: `--app-font-size-data: 1.75rem` in `frontend/src/styles.css`.

**Befund 3 — kleinere Punkte derselben Karte**

- Das Label „Meine Rolle" vor dem Rollen-Badge fehlt (`.role-row > .role-label` im Design); ein alleinstehendes „PL" ist auf der Karte nicht selbsterklärend.
- Kartenradius: App `--app-radius-md` (8px), Design `--radius: 10px`.
- Die Karte ist ein `<button (click)="onOpenProject(...)">`. Die Design-Annotation zu diesem Artboard schreibt ausdrücklich: „Karten sind echte Links, keine div+onclick". Als Button gibt es kein Öffnen in neuem Tab, keine Statusleisten-URL und keinen Link-Kontext für Screenreader.

### 3. Akzeptanzkriterien

- [ ] Das Kartenraster zeigt drei Spalten. Der in `docs/design/Mobile.dc.html` dokumentierte Bruch wird eingehalten: unter 1024px eine Spalte mit voller Kartenbreite.
- [ ] Die Stakeholder-Zahl auf der Karte nutzt `--app-font-size-data` in `--app-font-family-mono`; das Label „Stakeholder" bleibt in `--app-font-size-body` und `--app-color-text-muted`.
- [ ] Vor dem Rollen-Badge steht das Label „Meine Rolle" in der Gestaltung des Designs.
- [ ] Der Kartenradius entspricht `--app-radius-lg` (10px).
- [ ] Jede Projektkarte ist ein `<a [routerLink]>` mit sprechendem `aria-label` („Projekt <Name> öffnen", bei archivierten Projekten „Archiviertes Projekt <Name> öffnen"). Mittelklick und Strg/Cmd-Klick öffnen das Projekt in einem neuen Tab.
- [ ] Der Fokus-Ring aus SPEC-00 §2 bleibt auf der Karte sichtbar; die Tab-Reihenfolge folgt der Design-Annotation: Sidebar, Suche, Sortierung, Tabs, „Neues Projekt", Karten.
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: drei Rasterspalten in der CSS-Regel, `stat-num` mit Daten-Schriftgröße, Label „Meine Rolle" vorhanden, Karte als `<a>` mit `routerLink` und `aria-label`.
- [ ] Manueller Smoke-Test gegen `docker compose up` inklusive Öffnen eines Projekts per Mittelklick — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-018, US-074, US-076).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/projects/project-overview/project-overview.component.html`/`.css`/`.ts`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Berechtigungsverhalten unverändert: „Alle Projekte" und „Neues Projekt" bleiben ausschließlich für Systemadmins sichtbar (US-014, US-018, US-074).
- Fortschrittsringe und „unbewertet"-Banner aus US-076 bleiben inhaltlich unverändert; sie ordnen sich nur im breiteren Kartenlayout neu an.
- Keine Backend-Änderung, keine Migration.
