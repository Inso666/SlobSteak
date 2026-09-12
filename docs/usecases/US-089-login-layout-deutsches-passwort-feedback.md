**ID:** US-089
**Titel:** Login: zentrierte Karte, durchgehende Anmelde-Schaltfläche, Design-Typografie und deutschsprachiges Passwort-Feedback
**Bounded Context / Domain:** IdentityAccess (Presentation-Schicht)
**Abhängigkeiten:** US-054, US-077, US-079
**Status:** offen

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

- [ ] Die Login-Karte ist horizontal und vertikal im Viewport zentriert.
- [ ] Kartenbreite, Radius, Innenabstand und Schatten entsprechen den Design-Werten; die Werte werden über die vorhandenen Tokens ausgedrückt, wo eine passende Stufe existiert, sonst als bewusst benannte Ergänzung in `styles.css`.
- [ ] Die Schaltfläche „Anmelden" nimmt die volle Kartenbreite ein und trägt die Design-Maße (Innenabstand, Schriftgröße, Fettung 600).
- [ ] Feld-Labels, Eingabefelder, Markenschriftzug und Tagline entsprechen den Design-Größen.
- [ ] Der Stärke-Meter im Passwort-Dialog zeigt entweder deutschsprachige Texte (`promptLabel`, `weakLabel`, `mediumLabel`, `strongLabel`) oder wird — passend zum Wireframe — mit `[feedback]="false"` deaktiviert und durch den Platzhalter „Mindestens 10 Zeichen" ersetzt. Die gewählte Variante wird in der Story-Datei begründet.
- [ ] Angemeldete Nutzer, die `/login` oder `/` aufrufen, werden auf `/projects` weitergeleitet; es erscheint kein leerer Inhaltsbereich innerhalb der App-Shell.
- [ ] Die Login-Seite rendert im abgemeldeten Zustand weiterhin ohne Sidebar.
- [ ] Automatisierte Tests (Angular `TestBed` bzw. Routing-Test) belegen: Zentrierung und Button-Breite über die geprüften CSS-Klassen, deutschsprachiges bzw. deaktiviertes Passwort-Feedback, Weiterleitung angemeldeter Nutzer.
- [ ] Manueller Smoke-Test gegen `docker compose up` nach `docker compose down -v`: Login mit `admin@example.com` / `ChangeMe123!`, anschließender Passwort-Dialog, danach Aufruf von `/login` im angemeldeten Zustand — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-009, US-053, US-054, US-057).

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
