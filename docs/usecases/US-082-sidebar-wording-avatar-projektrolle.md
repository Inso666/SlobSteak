**ID:** US-082
**Titel:** Sidebar: Wording „Admin-Bereich", zweibuchstabige Avatar-Initialen und Projektrolle in der Nutzerkarte
**Bounded Context / Domain:** Frontend-Shell (globale Navigation)
**Abhängigkeiten:** US-074, US-075, US-081
**Status:** fertig (2026-09-13, PR: feature/US-082-sidebar-wording-avatar-projektrolle)

---

### 1. User Story

Als **Nutzer mit mehreren Projektrollen** möchte ich in der Sidebar erkennen, aus welcher Perspektive ich im aktuellen Projekt arbeite, damit ich Bewertungen nicht versehentlich der falschen Rolle zuordne.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #130](https://github.com/Inso666/SlobSteak/issues/130), QA-Design-Abgleich vom 04.09.2026.
- **Ist-/Soll-Vergleich gegen `docs/design/` (alle Artboards):**

| Punkt | Design | App |
|---|---|---|
| Navigationspunkt | „Admin-Bereich" | „Admin" |
| Avatar | 34px, zwei Initialen („PZ"), `--surface-2` mit `--border` | 32px, eine Initiale („S" aus „System-Administrator") |
| Nutzerkarte, zweite Zeile | im Projektkontext die Projektrolle („PL in diesem Projekt"), sonst „System-Admin" | immer nur „System-Administrator" |
| Breite | `240px` (`.sidebar{width:240px;flex:0 0 240px;}`) | 256px |
| Innenabstand | `24px 16px` | `20px 14px` |

- **Warum die Projektrolle fachlich zählt:** `Detail.dc.html`, `Map.dc.html` und `Verteiler.dc.html` zeigen die Rolle konsistent an derselben Stelle. Es ist dieselbe Information, die im Assessment-Tab und in der Map-Legende die Rollenfarbe trägt — laut PRD 4.3 entscheidet sie darüber, welche Perspektive der Nutzer überhaupt beschreiben darf.
- **Datenverfügbarkeit:** Die Projektrolle liegt im Frontend bereits vor (Rollen-Badge im Projekt-Header, `ProjectOverviewItem.Role`); es ist kein neuer Backend-Request nötig.

### 3. Akzeptanzkriterien

- [x] Der Navigationspunkt heißt „Admin-Bereich".
- [x] Der Avatar zeigt zwei Initialen, abgeleitet aus Vor- und Nachname des angemeldeten Nutzers; bei einteiligem Namen die ersten beiden Buchstaben. Größe und Rahmen entsprechen dem Design (34px, `--app-color-surface-hover` auf `--app-color-border`).
- [x] Befindet sich der Nutzer im Projektkontext, zeigt die zweite Zeile der Nutzerkarte die eigene Projektrolle im Muster „<Rolle> in diesem Projekt". Außerhalb des Projektkontexts steht dort die instanzweite Rolle („System-Admin" bzw. nichts, wenn der Nutzer kein Systemadmin ist).
- [x] Für Rolle `User` (keine perspektiv-tragende Rolle, PRD 2.2) wird die Zeile ebenfalls korrekt angezeigt und nicht mit einer Rollenfarbe versehen (SPEC-00 §4: Rolle „User" erhält bewusst keinen Badge).
- [x] Sidebar-Breite und Innenabstand entsprechen den Design-Werten.
- [x] Automatisierter Test (Angular `TestBed`) belegt: Wording, zweibuchstabige Initialen, projektabhängige zweite Zeile inklusive Wechsel beim Verlassen des Projektkontexts.
- [x] Manueller Smoke-Test — siehe Anmerkungen des Agenten (Docker in dieser Umgebung nicht erreichbar, Ersatznachweis per `ng serve`) — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-045, US-046, US-055, US-074, US-075).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html`/`.ts`/`.css`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Keine neue Backend-Route: Die Projektrolle stammt aus bereits geladenen Projektdaten bzw. dem Auth-Zustand.
- Kein Rückschritt bei der Sichtbarkeitsregel — der Admin-Eintrag bleibt ausschließlich für Systemadmins sichtbar (US-046).
- Keine Backend-Änderung, keine Migration.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **`docs/design/Detail.dc.html`/`Map.dc.html`/`Verteiler.dc.html` nicht im Repository vorhanden** (CLAUDE.md Abschnitt 6, dieselbe Einschränkung wie bereits bei US-081 dokumentiert): `docs/design/` enthält aktuell ausschließlich `S2-Projektuebersicht-Wireframe.html`. Umsetzung basiert daher auf der wörtlichen Ist-/Soll-Tabelle in Abschnitt 2 dieser Story-Datei (240px/24px 16px, 34px-Avatar, „PL in diesem Projekt") — der PRD-konformsten, am wenigsten überraschenden Interpretation.
- **Dokumentierte Abweichung von SPEC-00 §1.2** (CLAUDE.md Abschnitt 6): Der von der Story geforderte Innenabstand `24px 16px` (`.app-navigation{padding}`) deckt sich mit keiner Stufe der zentralen Abstands-Skala (`--app-space-xs/sm/md/lg/xl` = 4/8/14/20/36px). Da der Wert wörtlich aus der Story-eigenen Design-Vorgabe stammt und sich — wie die bereits zuvor akzeptierte Sidebar-Breite (US-055-Kommentar) — auf eine konkrete, nicht wiederverwendete Struktur-Dimension dieses einen Shell-Containers bezieht, wurde er als literaler `rem`-Wert übernommen statt einen neuen, singulär verwendeten globalen Token zu erfinden (Begründung im Code-Kommentar in `app-navigation.component.css`). Eine Aufnahme in die zentrale Skala bleibt ein Punkt für ein künftiges SPEC-00-Token-Audit, keine stille Erfindung.
- **Wording der Rollenzeile:** „<Rolle> in diesem Projekt" verwendet den rohen Rollen-Wert (`PL`/`Coreteam`/`Architect`/`User`) unverändert — dieselbe Darstellung, die `project.role` bereits unkommentiert an anderer Stelle zeigt (`.role-badge`-Text in `project-overview.component.html`/`project-workspace-layout.component.html`). Kein neues Wording für dieselbe Information.
- **Manueller Smoke-Test ohne Docker:** Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar (`//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe Einschränkung wie bereits bei US-077 bis US-081 dokumentiert). Ersatzweise `ng serve` plus ein temporärer, nicht committeter `HttpInterceptor`, der `POST /api/v1/auth/login` sowie `GET /api/v1/projects`, `GET /api/v1/admin/projects`, `GET /api/v1/projects/project-1` und `GET .../stakeholders` mit statischen Testdaten beantwortet (dieselbe Vorgehensweise wie bei US-079/US-080/US-081). Im echten Chrome bestätigt: Sidebar zeigt „Admin-Bereich", Avatar „PZ" (34×34px, `1px solid #262f42`-Rahmen auf `--app-color-surface-hover`), Nutzerkarte „Petra Ziegler" / „System-Admin" außerhalb eines Projekts, „PL in diesem Projekt" innerhalb `/projects/project-1/stakeholders`, Rückwechsel zu „System-Admin" beim Verlassen des Projekts über `/projects` — jeweils per `getComputedStyle` gegengeprüft (`width: 240px`, `padding: 24px`/`16px`, Avatar `34px`). Interceptor-Datei und Registrierung in `app.config.ts` wurden vor Story-Abschluss vollständig wieder entfernt (`git status` bestätigt keine verbleibenden Änderungen an `app.config.ts`).
