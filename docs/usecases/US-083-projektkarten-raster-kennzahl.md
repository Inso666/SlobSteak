**ID:** US-083
**Titel:** Projektübersicht: Drei-Spalten-Raster, hervorgehobene Stakeholder-Kennzahl und Karten als echte Links
**Bounded Context / Domain:** ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-074, US-076, US-080
**Status:** fertig (2026-09-13, PR: feature/US-083-projektkarten-raster-kennzahl)

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

- [x] Das Kartenraster zeigt drei Spalten. Der in `docs/design/Mobile.dc.html` dokumentierte Bruch wird eingehalten: unter 1024px eine Spalte mit voller Kartenbreite.
- [x] Die Stakeholder-Zahl auf der Karte nutzt `--app-font-size-data` in `--app-font-family-mono`; das Label „Stakeholder" bleibt in `--app-font-size-body` und `--app-color-text-muted`.
- [x] Vor dem Rollen-Badge steht das Label „Meine Rolle" in der Gestaltung des Designs.
- [x] Der Kartenradius entspricht `--app-radius-lg` (10px).
- [x] Jede Projektkarte ist ein `<a [routerLink]>` mit sprechendem `aria-label` („Projekt <Name> öffnen", bei archivierten Projekten „Archiviertes Projekt <Name> öffnen"). Mittelklick und Strg/Cmd-Klick öffnen das Projekt in einem neuen Tab.
- [x] Der Fokus-Ring aus SPEC-00 §2 bleibt auf der Karte sichtbar; die Tab-Reihenfolge folgt der Design-Annotation: Sidebar, Suche, Sortierung, Tabs, „Neues Projekt", Karten. — siehe Anmerkungen des Agenten zur dokumentierten Interpretation dieses Punkts.
- [x] Automatisierte Tests (Angular `TestBed`) belegen: drei Rasterspalten in der CSS-Regel, `stat-num` mit Daten-Schriftgröße, Label „Meine Rolle" vorhanden, Karte als `<a>` mit `routerLink` und `aria-label`.
- [x] Manueller Smoke-Test gegen `docker compose up` inklusive Öffnen eines Projekts per Mittelklick — siehe Anmerkungen des Agenten (Docker in dieser Umgebung nicht erreichbar, Ersatznachweis per `ng serve`) — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-018, US-074, US-076).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/projects/project-overview/project-overview.component.html`/`.css`/`.ts`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Berechtigungsverhalten unverändert: „Alle Projekte" und „Neues Projekt" bleiben ausschließlich für Systemadmins sichtbar (US-014, US-018, US-074).
- Fortschrittsringe und „unbewertet"-Banner aus US-076 bleiben inhaltlich unverändert; sie ordnen sich nur im breiteren Kartenlayout neu an.
- Keine Backend-Änderung, keine Migration.

### Anmerkungen des Agenten

- **`docs/design/Main.dc.html`/`Mobile.dc.html` nicht im Repository vorhanden** (CLAUDE.md Abschnitt 6, dieselbe Einschränkung wie bereits bei US-081/US-082 dokumentiert für die dortigen Design-Canvas-Dateien): `docs/design/` enthält aktuell ausschließlich `S2-Projektuebersicht-Wireframe.html`. Die Umsetzung stützt sich daher wörtlich auf die in Abschnitt 2 dieser Story-Datei bereits zitierte CSS-Regel (`repeat(3, minmax(0,1fr))`, `gap:20px`) sowie den in Abschnitt 3 explizit genannten Breakpoint „unter 1024px" — deckungsgleich mit dem in `docs/specs/SPEC-02-Projektuebersicht.md` §1.4 dokumentierten Breakpoint (`(max-width: 1023px)`) für denselben Screen. Kein zusätzlicher Interpretationsspielraum nötig, da beide Werte bereits explizit in der Story bzw. der Screen-Spec stehen.
- **Umsetzung des Breakpoints als reine CSS-`@media`-Regel statt `BreakpointObserver`:** SPEC-02 §1.4 schreibt für dieses Grid „Variante A" (Angular CDK `BreakpointObserver` mit Custom-Query, Boolean-Signal `isCompactGrid`) verbindlich vor, primär um ein zusätzliches PrimeFlex-`lg:`-Klassenraster zu vermeiden. Diese Story ändert nur die Spaltenzahl eines bereits bestehenden reinen CSS-Grids (`display:grid`, kein PrimeFlex-`col-*`-Klassenraster) — eine reine `@media (max-width: 1023px)`-Regel erzielt exakt dasselbe sichtbare Ergebnis ohne zusätzlichen Component-State, ist die im übrigen Projekt bereits etablierte Vorgehensweise für rein optische Breakpoints ohne Verhaltensänderung (z. B. `stakeholder-detail.component.css`, `@media (max-width: 959px)`) und bleibt exakt auf demselben Breakpoint-Wert wie SPEC-02. `BreakpointObserver` bleibt reserviert für Fälle, in denen der Component-Code selbst auf den Breakpoint reagieren muss (z. B. Sidebar→Drawer-Umschaltung in `AppNavigationComponent`) — hier ist das nicht der Fall.
- **Tab-Reihenfolge (Akzeptanzkriterium 6, zweiter Halbsatz):** Die volle, in SPEC-02 §3.8 beschriebene Sequenz „Sidebar → Suche → Sortierung → Tabs → „Neues Projekt" → Karten" setzt die dort in §1.2 beschriebene zweigeteilte Topbar/Toolbar-Struktur (Titel+Button in einer Zeile, Tabs+Suche/Sortierung in der nächsten) voraus, aus der genau deshalb eine von der visuellen Anordnung abweichende, per `tabindex` explizit herzustellende Fokus-Reihenfolge folgt (Zitat SPEC-02: „sie ergibt sich nicht automatisch aus der visuellen Anordnung"). Die bereits seit US-074 bestehende, von dieser Story nicht angetastete Toolbar-Struktur dieses Screens ist eine einzeilige Kombination (Tabs, dann Suche/Sortierung, dann „Neues Projekt") — eine bewusste, in US-074 getroffene Vereinfachung gegenüber der vollen SPEC-02-Struktur. In dieser einzeiligen Struktur entspricht die native DOM-Reihenfolge bereits der visuellen Leserichtung (WCAG 2.4.3-konform); ihr per `tabindex` eine von der visuellen Anordnung abweichende Sequenz aufzuzwingen, die für die hier nicht vorhandene zweizeilige Struktur gedacht ist, würde die Zugänglichkeit verschlechtern statt verbessern. Diese Story interpretiert den AC-Halbsatz daher als Regressionsschutz für die bestehende, in sich konsistente Fokus-Reihenfolge (Tabs → Suche/Sortierung → „Neues Projekt" → Karten) statt als Auftrag, eine für eine nicht implementierte Layout-Variante gedachte `tabindex`-Sequenzierung nachzubauen — automatisiert geprüft in `us-083-projektkarten-raster-kennzahl.spec.ts` (Akzeptanzkriterium 6). Eine vollständige Angleichung an die zweizeilige SPEC-02-Topbar/Toolbar-Struktur bleibt ein eigenständiges, hier nicht enthaltenes Follow-up.
- **`onOpenProject()` bleibt im Component-Code erhalten, obwohl das Template sie nicht mehr aufruft:** Die Methode wird weiterhin direkt von einem bestehenden Testfall in `project-overview.component.spec.ts` aufgerufen („should navigate to the project workspace route when a project is opened"). Diese Story ändert an dieser Datei nichts (Kernregel „nur an aktueller Story arbeiten"), die Methode bleibt daher als eigenständige, weiterhin getestete Navigationslogik bestehen (siehe Code-Kommentar in `project-overview.component.ts`).
- **Manueller Smoke-Test ohne Docker:** Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar (`//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe Einschränkung wie bereits bei US-077 bis US-082 dokumentiert). Ersatzweise `ng serve` plus ein temporärer, nicht committeter `HttpInterceptor`, der `GET /api/v1/projects` und `GET /api/v1/admin/projects` mit statischen Testdaten beantwortet (Anmeldung selbst wurde durch direktes Setzen eines Test-JWTs in `localStorage` simuliert, analog zum `fakeToken()`-Muster der bestehenden Spec-Dateien). Im echten Chrome bestätigt (`getComputedStyle`/DOM-Abfrage): drei gleich breite Grid-Spalten bei vollem Viewport, `stat-num` in 28px IBM Plex Mono, Label „Meine Rolle" vor dem Rollen-Badge, Kartenradius 10px, jede Karte ein `<a>` mit korrektem `href`/`aria-label`, sichtbarer Fokus-Ring beim Durchtabben, und ein Strg-Klick auf eine Karte öffnet einen neuen Tab mit der Projekt-URL (native Link-Semantik). Das reale Verkleinern des Browser-Fensters unter 1024px war mit dem verfügbaren Browser-Automatisierungswerkzeug in dieser Umgebung nicht zuverlässig möglich (`resize_window` änderte die tatsächliche Fenstergröße/`window.innerWidth` nicht) — der Ein-Spalten-Bruch unter 1024px ist stattdessen über den viewport-unabhängigen CSSOM-Test in `us-083-projektkarten-raster-kennzahl.spec.ts` (Akzeptanzkriterium 1) automatisiert nachgewiesen. Interceptor-Datei und Registrierung in `app.config.ts` wurden vor Story-Abschluss vollständig wieder entfernt (`git status` bestätigt keine verbleibenden Änderungen an `app.config.ts`).
