**ID:** US-089
**Titel:** Login: zentrierte Karte, durchgehende Anmelde-Schaltfläche, Design-Typografie und deutschsprachiges Passwort-Feedback
**Bounded Context / Domain:** IdentityAccess (Presentation-Schicht)
**Abhängigkeiten:** US-054, US-077, US-079
**Status:** fertig am 2026-09-13 (Branch `feature/US-089-login-layout-deutsches-passwort-feedback`, PR siehe unten)

---

### 1. User Story

Als **Nutzer** möchte ich beim Anmelden eine mittig platzierte Karte mit einer klar erkennbaren, durchgehenden Anmelde-Schaltfläche und deutschsprachigen Hinweisen vorfinden, damit der erste Kontakt mit der Anwendung fertig wirkt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #131](https://github.com/Inso666/SlobSteak/issues/131) und [Issue #132](https://github.com/Inso666/SlobSteak/issues/132), QA-Design-Abgleich vom 04.09.2026, gegen `docs/design/Login.dc.html`.
- **Gruppierung:** Beide Issues betreffen denselben Screen und dieselben zwei Komponenten (`login-page`, `password-change-modal`); getrennt umgesetzt würden sie dieselben Dateien nacheinander anfassen.

**Befund 1 — Layout und Typografie**

| Punkt | Design | App (`login-page.component.css`) |
|---|---|---|
| Vertikale Position | `.scene{align-items:center;justify-content:center;}` — mittig im Viewport | `.login{margin: var(--app-space-xl) auto;}` → Karte klebt oben (gemessen `y = 36px`) |
| Kartenbreite | 380px | `max-width: 26rem` (416px) |
| Radius / Innenabstand / Schatten | `border-radius:14px; padding:32px;` plus `box-shadow:0 20px 50px rgba(0,0,0,.35)` | `padding: var(--app-space-lg)` (20px), kein Schatten |
| „Anmelden"-Schaltfläche | `width:100%; padding:12px; font-size:14px; font-weight:600` | Breite 87px (auto), `padding: 6px 10px`, `font-weight: 500` |
| Feld-Label | 12px / 600 | 14px / 400 |
| Eingabefeld | 13px, Fläche `--surface-2` | 14px, Fläche `--surface` |
| Markenschriftzug | 19px | `--app-font-size-card-title` (16px) |
| Tagline | 12,5px | `--app-font-size-body` (14px) |

Der auffälligste Effekt ist die nicht durchgehende Schaltfläche: Die Hauptaktion des Screens ist ein 87px breiter Knopf am linken Rand einer 416px breiten Karte.

**Befund 2 — englischsprachiges Passwort-Feedback.** Im erzwungenen Passwort-Änderungs-Dialog blendet `<p-password>` beim Fokussieren ein Stärke-Overlay mit dem englischen Text „Enter a password" ein. Die übrige Oberfläche ist durchgängig deutschsprachig; `docs/design/Login.dc.html` sieht an dieser Stelle keinen Stärke-Meter vor, sondern nur den Platzhalter „Mindestens 10 Zeichen".

**Nebenbefund.** `/login` bleibt für angemeldete Nutzer erreichbar (`{ path: '', redirectTo: 'login' }` in `app.routes.ts`) und rendert dann einen leeren Inhaltsbereich innerhalb der angemeldeten App-Shell inklusive Sidebar.

### 3. Akzeptanzkriterien

- [x] Die Login-Karte ist horizontal und vertikal im Viewport zentriert.
- [x] Kartenbreite, Radius, Innenabstand und Schatten entsprechen den Design-Werten; die Werte werden über die vorhandenen Tokens ausgedrückt, wo eine passende Stufe existiert, sonst als bewusst benannte Ergänzung in `styles.css`.
- [x] Die Schaltfläche „Anmelden" nimmt die volle Kartenbreite ein und trägt die Design-Maße (Innenabstand, Schriftgröße, Fettung 600).
- [x] Markenschriftzug und Tagline entsprechen den Design-Größen. **Feld-Labels und Eingabefelder bewusst unverändert belassen** — siehe „Anmerkungen des Agenten" (dokumentierte Abweichung nach CLAUDE.md Abschnitt 6: SPEC-00 §2 schreibt für diese beiden Elemente eine screen-übergreifend einheitliche Optik vor, die Login namentlich einschließt; ein Login-spezifischer Abweichwert hätte diese Invariante gebrochen).
- [x] Der Stärke-Meter im Passwort-Dialog zeigt entweder deutschsprachige Texte (`promptLabel`, `weakLabel`, `mediumLabel`, `strongLabel`) oder wird — passend zum Wireframe — mit `[feedback]="false"` deaktiviert und durch den Platzhalter „Mindestens 10 Zeichen" ersetzt. Die gewählte Variante wird in der Story-Datei begründet. → **Variante 1 (deutsche Texte)**, siehe „Anmerkungen des Agenten".
- [x] Angemeldete Nutzer, die `/login` oder `/` aufrufen, werden auf `/projects` weitergeleitet; es erscheint kein leerer Inhaltsbereich innerhalb der App-Shell.
- [x] Die Login-Seite rendert im abgemeldeten Zustand weiterhin ohne Sidebar.
- [x] Automatisierte Tests (Angular `TestBed` bzw. Routing-Test) belegen: Zentrierung und Button-Breite über die geprüften CSS-Klassen, deutschsprachiges bzw. deaktiviertes Passwort-Feedback, Weiterleitung angemeldeter Nutzer.
- [x] Manueller Smoke-Test — siehe Anmerkungen des Agenten (Docker in dieser Umgebung nicht erreichbar, Ersatznachweis per `ng serve`) — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-009, US-053, US-054, US-057).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/auth/login-page/login-page.component.css`/`.html`
- `frontend/src/app/features/auth/password-change-modal/**`
- `frontend/src/app/app.routes.ts` (Weiterleitung für angemeldete Nutzer)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- PRD Abschnitt 1.4: Kein Self-Service-Zugang — der Hinweis „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein." bleibt erhalten, ebenso das Fehlen eines „Passwort vergessen"-Links.
- US-008: Der erzwungene Passwort-Dialog bleibt nicht überspringbar und nicht schließbar.
- Die Fußnote nutzt in der App bewusst `--app-color-text-muted` statt des im Wireframe verwendeten `text-faint`; dieser Kontrastvorteil bleibt erhalten (siehe US-078).
- Keine Backend-Änderung, keine Migration.

### Anmerkungen des Agenten

- **`docs/design/Login.dc.html` nicht im Repository vorhanden** (CLAUDE.md Abschnitt 6, dieselbe
  Einschränkung wie bereits bei US-081/US-082 dokumentiert): `docs/design/` enthält aktuell
  ausschließlich `S2-Projektuebersicht-Wireframe.html`. Umsetzung basiert daher auf der wörtlichen
  Ist-/Soll-Tabelle in Abschnitt 2 dieser Story-Datei (380px/14px-Radius/32px-Innenabstand/Schatten,
  Button-Maße, Marken-/Tagline-Größen) — der PRD-/Spec-konformsten, am wenigsten überraschenden
  Interpretation.
- **Neue, bewusst benannte Design-Tokens statt Ad-hoc-Werten** (Akzeptanzkriterium 2, explizit von
  der Story selbst als Lösungsweg vorgegeben): SPEC-00 §1.2 kennt weder eine Breiten- noch eine
  Schatten-Skala und keine 14px-Radius-, 32px- oder 12px-Abstandsstufe. `styles.css` erhält daher
  `--app-login-card-width` (380px), `--app-radius-xl` (14px), `--app-space-2xl` (32px),
  `--app-shadow-card` sowie `--app-button-padding-cta` (12px) — ausschließlich für die Login-Karte
  bzw. ihre primäre CTA-Schaltfläche im Einsatz, kein Ersatz für die bestehenden, app-weit
  verwendeten Stufen. Radius/Schatten/Innenabstand werden dabei nicht per `::ng-deep`, sondern über
  die offiziellen PrimeNG-v18-Design-Token-CSS-Variablen (`--p-card-border-radius`,
  `--p-card-shadow`, `--p-card-body-padding`; analog `--p-button-padding-x/-y`,
  `--p-button-font-size`, `--p-button-label-font-weight` für den Button) direkt auf dem jeweiligen
  Host-Element gesetzt — diese kaskadieren als reguläre CSS-Custom-Properties zu den intern von
  PrimeNG gerenderten Elementen, ganz ohne Deep-Selector (frontend.md Abschnitt 3).
- **Dokumentierte, bewusste Teil-Abweichung bei Akzeptanzkriterium 4** (CLAUDE.md Abschnitt 6):
  Feld-Labels (12px/600 laut Befund-Tabelle) und Eingabefelder (13px, abweichende Feldfläche) werden
  NICHT auf die in der Story zitierten Wireframe-Werte geändert. Grund: `SPEC-00-Design-System.md`
  §2 legt für „jedes Formularfeld in jedem Screen (**Login**, Stakeholder anlegen/bearbeiten,
  Assessment-Formular, Admin-Formulare)" ausdrücklich ein einziges, screen-übergreifendes
  Label-/Feld-Muster fest (`color.surface`-Feldfläche, Body-Schriftgröße als die eine kanonische
  Stufe — siehe deren Token-Kommentar „obere Spec-Spanne 13–14px", bereits app-weit auf 14px
  festgelegt). Ein Login-spezifischer Abweichwert hätte exakt die von SPEC-00 selbst geforderte
  Einheitlichkeit gebrochen (frontend.md Abschnitt 1: „Weicht eine Story-Anforderung von einer
  bestehenden Spec ab, gilt die Spec, bis sie im Rahmen der Story oder durch UX/UI ausdrücklich
  angepasst wird"). Markenschriftzug und Tagline sind dagegen reine, nur auf dem Login-Screen
  sichtbare Dekorationselemente ohne einen solchen SPEC-00-Anspruch (die App-Sidebar verwendet für
  denselben Schriftzug bereits bewusst eine andere, kompaktere Größe) und wurden daher regulär auf
  die Design-Maße gebracht.
- **Variantenwahl Akzeptanzkriterium 5 (Passwort-Feedback):** Variante 1 — deutschsprachige
  `promptLabel`/`weakLabel`/`mediumLabel`/`strongLabel` statt Deaktivierung. `SPEC-01-Login.md`
  §1.3/§2.3 legt für exakt dieses Feld bereits bewusst `[feedback]="true"` fest („Stärkeanzeige beim
  Neuanlegen sinnvoll") — eine bestehende, begründete Spec-Entscheidung, die laut frontend.md
  Abschnitt 1 gilt, bis sie ausdrücklich geändert wird. Diese Story ändert daher nur die Sprache des
  Overlays, nicht die zugrunde liegende SPEC-01-Entscheidung, ob überhaupt ein Stärke-Meter gezeigt
  wird.
- **Manueller Smoke-Test ohne Docker:** Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar
  (`//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe Einschränkung wie bereits bei
  US-077 bis US-082 dokumentiert). Ersatzweise `ng serve` (Port 4321) plus echtem Chrome: die
  Login-Karte rendert zentriert mit Radius/Schatten/voller Button-Breite (Screenshot im PR); der
  erzwungene Passwort-Dialog wurde durch direktes Setzen von `mustChangePassword = true` an der
  Komponenteninstanz (`window.ng.getComponent`) ohne Backend ausgelöst und zeigt beim Fokussieren
  von „Neues Passwort" das deutsche Overlay („Passwort eingeben" leer, „Schwach" nach einem
  Zeichen) statt „Enter a password"/„Weak"; der Redirect wurde durch Setzen eines Fake-Tokens in
  `localStorage` (`slobsteak_token`) und erneutem Aufruf von `/login` nachgewiesen — die Adresszeile
  wechselt sofort zu `/projects` (der dortige Ladefehler ist erwartet, da kein echtes Backend läuft).
  Kein echter Login-Roundtrip mit `admin@example.com`/`ChangeMe123!` möglich, da kein Backend
  erreichbar war — dieser Teil des Smoke-Tests bleibt ein offener Punkt für eine Umgebung mit
  funktionierendem `docker compose up`.
