**ID:** US-080
**Titel:** Inhaltsbereich mit Innenabstand und Datenlisten im Surface-Panel mit integrierter Fußzeile
**Bounded Context / Domain:** Frontend-Shell (App-Shell-Layout, geteilte Panel-Klasse)
**Abhängigkeiten:** US-055, US-072, US-075, US-078
**Status:** fertig am 2026-09-13, Branch `feature/US-080-inhaltsbereich-abstand-listen-panel`

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

### 5. Anmerkungen des Agenten (Umsetzung 2026-09-13)

- **Vertikaler Innenabstand `--app-space-lg` statt `--app-space-xl` (Akzeptanzkriterium 1):** Das
  Akzeptanzkriterium erlaubt für die vertikale Komponente ausdrücklich beide Token
  (`--app-space-lg`/`--app-space-xl`). Fast jeder betroffene Screen (`.stakeholder-list`,
  `.project-overview`, `.workspace`, `.admin-page`, `.stakeholder-detail` u. a.) setzt bereits
  zusätzlich lokal `padding: var(--app-space-md) 0;` — dieser lokale Vertikalabstand ist kein
  „zusätzlicher Seitenrand" im Sinne des Akzeptanzkriteriums (das Kriterium meint mit „Seitenrand"
  den horizontalen Rand zur Viewport-Kante; die lokalen Regeln setzen horizontal durchgehend `0`).
  Er addiert sich aber sichtbar zum Shell-Wert: `--app-space-lg` + `--app-space-md` (20px + 14px =
  34px) trifft den in `Main.dc.html`/`Verteiler.dc.html` vorgegebenen Gesamtabstand (28–32px)
  deutlich genauer als `--app-space-xl` + `--app-space-md` (36px + 14px = 50px), das den Inhalt
  spürbar zu weit vom oberen Rand rücken würde. Daher `--app-space-lg` für die vertikale Komponente
  gewählt, horizontal wie gefordert `--app-space-xl`.
- **Panel-Radius `--app-radius-lg` (10px) statt des wörtlich zitierten `12px` (Akzeptanzkriterium
  3, CLAUDE.md Abschnitt 6):** SPEC-00 §1.2 weist den Wireframe-Wert `10px` bereits als
  `radius.lg`/`--app-radius-lg` exakt für die Verwendung „Panels, Tabs-Container, Legende" aus. Die
  Story-Akzeptanzkriterien zitieren daneben wörtlich `border-radius: 12px` aus dem rohen
  `Verteiler.dc.html`-Fragment — ein eigenständiges 12px-Token existiert in SPEC-00 nicht, und ein
  neues Token allein für diesen einen Wert zu erfinden widerspräche `.claude/agents/frontend.md`
  Abschnitt 1 („kein frei wählbarer Wert" bei fehlendem Token — Eskalation statt Erfindung). Bei
  einem Widerspruch zwischen Story-Text und bestehender Spec gewinnt laut CLAUDE.md Abschnitt 6 die
  Spec; `--app-radius-lg` ist zudem bereits produktiv für exakt diesen Zweck im Einsatz
  (`.catalog-panel`, US-065) — die neue geteilte `.list-panel`-Klasse übernimmt diesen Wert
  unverändert, statt ihn lokal auf `12px` zu vereinheitlichen.
- **Kein neuer Zusammenfassungs-/Aktions-Footer für Admin-Nutzer/-Projekte:** Die drei Admin-Listen
  nutzen alle die neue `.list-panel`-Klasse (Akzeptanzkriterium 4). Nur Stakeholder-Liste und
  Verteiler hatten jedoch bereits eine Zusammenfassungs-/Aktionszeile, die jetzt als
  `.list-panel__foot` innerhalb des Panels sitzt (`.sh-row-count`/`.dl-foot-row`, Border-Top über
  die geteilte Klasse). Für Admin — Nutzer/Admin — Projekte existierte weder im bestehenden Code
  noch in SPEC-07 oder einer Design-Referenz eine solche Fußzeile (nur ein „Anlegen"-Button in
  einer Toolbar **oberhalb** der Tabelle, konsistent mit SPEC-07 §1.3/§1.4) — eine neue
  Zähl-/Aktionszeile dort zu erfinden wäre eine stille Feature-Erweiterung über die
  Container-Geometrie-Story hinaus gewesen (CLAUDE.md Abschnitt 6, „Wichtige Invarianten" dieser
  Story: nur Flächen/Abstände, keine neue Fachlogik). Admin — Kommunikationsarten behält seine
  bereits in US-065 bewusst ohne `border-top` gestaltete Inline-„Kommunikationsart
  hinzufügen"-Zeile unverändert bei (`.catalog-add-row`), da sie strukturell keine
  Zusammenfassungs-/Aktionszeile im Sinne dieser Story ist, sondern ein eigenständiges,
  vorher etabliertes Inline-Formular-Muster.
- **Manueller Smoke-Test ohne Docker:** Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar
  (`//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe Einschränkung wie bereits bei
  US-077/US-078/US-079 dokumentiert). Da mehrere betroffene Routen (`/projects/:id/...`) einen
  `roleGuard` mit echtem HTTP-Aufruf besitzen und ohne Backend sofort auf `access-denied`
  umleiten, wurde zusätzlich zur (per Fake-Token erreichbaren) Projektübersicht eine temporäre,
  nicht committete Vorschau-Route eingerichtet, die die fünf betroffenen Listen-Komponenten
  unverändert mit gemockten Services innerhalb der echten App-Shell rendert (analog zum Vorgehen
  bei US-079). Per `getComputedStyle` im echten Chrome bestätigt: `.app-shell__content` liefert
  `padding: 20px 36px` exakt wie vorgesehen, kein horizontales Scrollen
  (`document.documentElement.scrollWidth === clientWidth`). Screenshots aller fünf Panels sowie der
  echten Projektübersicht (Fake-Token, Sidebar sichtbar, „Neues Projekt" ohne Kantenberührung) im
  PR. Datei und temporärer Routeneintrag wurden vor Story-Abschluss vollständig wieder entfernt
  (`git status` bestätigt keine verbleibenden Änderungen).
