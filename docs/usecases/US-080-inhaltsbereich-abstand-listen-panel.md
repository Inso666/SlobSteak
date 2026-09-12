**ID:** US-080
**Titel:** Inhaltsbereich mit Innenabstand und Datenlisten im Surface-Panel mit integrierter Fußzeile
**Bounded Context / Domain:** Frontend-Shell (App-Shell-Layout, geteilte Panel-Klasse)
**Abhängigkeiten:** US-055, US-072, US-075, US-078
**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich, dass Inhalte und Bedienelemente einen erkennbaren Rand zum Fensterrand halten und Tabellen als abgegrenzte Fläche erscheinen, damit keine Schaltfläche angeschnitten wird und ich Listeninhalt, Filter und Zusammenfassung als zusammengehörigen Block wahrnehme.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #118](https://github.com/Inso666/SlobSteak/issues/118) und [Issue #124](https://github.com/Inso666/SlobSteak/issues/124), QA-Design-Abgleich vom 04.09.2026.
- **Gruppierung:** Beide Befunde sind Container-Geometrie derselben Screens und lassen sich nur gemeinsam sinnvoll verifizieren — die Fußzeile einer Liste kann erst dann korrekt im Panel sitzen, wenn der Inhaltsbereich überhaupt einen Rand hat. Getrennt umgesetzt würden beide Stories dieselben vier Feature-CSS-Dateien plus `app-shell` anfassen.

**Befund 1 — fehlender Innenabstand.** Alle Artboards geben einen festen Rand vor (`Main.dc.html`: `.main{padding:32px 40px;}`, `Verteiler.dc.html`: `.main{padding:28px 40px;}`, übrige analog). Gemessen in der App bei Viewport 2560px:

```
.app-shell__content   padding = 0px
.project-overview     padding = 14px 0
```

Folge: Rechtsbündige Bedienelemente sitzen bündig auf der Viewport-Kante oder werden angeschnitten — „Stakeholder anlegen" endet exakt bei `right = innerWidth`, ebenso „CSV exportieren" (Verteiler), „Löschen" (Stakeholder-Detail), „Neues Projekt" (Projektübersicht) und der Hinweis „8 von 10 Stakeholdern sichtbar" (Map).

**Befund 2 — fehlendes Panel.** Das Design legt jede Datenliste in eine gefüllte Fläche:

```css
/* Verteiler.dc.html Z. 67 */
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
.foot-row{display:flex;justify-content:space-between;padding:14px 16px;border-top:1px solid var(--border);}
```

In der App ist `.sh-table-wrapper` transparent (`background: rgba(0,0,0,0)`), die Zeilen stehen direkt auf `--app-color-background`. Die Zusammenfassungs- und Aktionszeilen stehen außerdem außerhalb des Containers über die volle Seitenbreite statt als `.foot-row` im Panel. In der Stakeholder-Liste fehlt in dieser Fußzeile zusätzlich die gefilterte Anzahl (Design: „32 Stakeholder insgesamt · 6 angezeigt (gefiltert)", App: „10 Stakeholder insgesamt").

### 3. Akzeptanzkriterien

- [ ] Der Inhaltsbereich der App-Shell erhält den im Design vorgegebenen Innenabstand (horizontal entsprechend `--app-space-xl`, vertikal entsprechend `--app-space-lg`/`--app-space-xl`), definiert an genau einer Stelle — kein Screen setzt den Seitenrand zusätzlich lokal.
- [ ] Auf keinem Screen berührt ein Bedienelement oder Text die Viewport-Kante: geprüft für Projektübersicht, Stakeholder-Liste, Stakeholder-Detail, Map, Verteiler, Admin (alle drei Tabs).
- [ ] Eine geteilte Panel-Klasse in `frontend/src/styles.css` liefert `background: var(--app-color-surface)`, `border: 1px solid var(--app-color-border)`, `border-radius: 12px`, `overflow: hidden` — einmal definiert, nicht je Feature dupliziert.
- [ ] Stakeholder-Liste, Verteiler und die drei Admin-Listen nutzen diese Panel-Klasse; ihre Zusammenfassungs- und Aktionszeile sitzt als Fußzeile mit `border-top` innerhalb des Panels.
- [ ] Die Fußzeile der Stakeholder-Liste nennt zusätzlich die gefilterte Anzahl im Muster „N Stakeholder insgesamt · M angezeigt (gefiltert)"; ist kein Filter aktiv, entfällt der Zusatz.
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: Panel-Klasse auf den Listen-Containern vorhanden, Fußzeile innerhalb des Panels, gefilterte Anzahl im gefilterten Zustand sichtbar.
- [ ] Manueller Smoke-Test gegen `docker compose up` auf allen genannten Screens — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-050, US-066, US-072, US-074).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/app.css` bzw. die App-Shell-Komponente (`app-shell__content`)
- `frontend/src/styles.css` (geteilte Panel-Klasse)
- `frontend/src/app/features/stakeholders/**` (Listen-Container und Fußzeile)
- `frontend/src/app/features/distribution/**`
- `frontend/src/app/features/admin/**`
- `frontend/src/app/features/projects/project-overview/project-overview.component.css`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Der Kontrast der Meta-Texte in diesen Listen wird durch US-078 behoben; diese Story ändert keine Textfarben, nur Flächen und Abstände.
- Kein Screen darf horizontal scrollen; breite Tabellen bleiben in einem eigenen Scroll-Container.
- Keine Backend-Änderung, keine Migration.
