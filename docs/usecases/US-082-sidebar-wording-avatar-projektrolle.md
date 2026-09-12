**ID:** US-082
**Titel:** Sidebar: Wording „Admin-Bereich", zweibuchstabige Avatar-Initialen und Projektrolle in der Nutzerkarte
**Bounded Context / Domain:** Frontend-Shell (globale Navigation)
**Abhängigkeiten:** US-074, US-075, US-081
**Status:** offen

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

- [ ] Der Navigationspunkt heißt „Admin-Bereich".
- [ ] Der Avatar zeigt zwei Initialen, abgeleitet aus Vor- und Nachname des angemeldeten Nutzers; bei einteiligem Namen die ersten beiden Buchstaben. Größe und Rahmen entsprechen dem Design (34px, `--app-color-surface-hover` auf `--app-color-border`).
- [ ] Befindet sich der Nutzer im Projektkontext, zeigt die zweite Zeile der Nutzerkarte die eigene Projektrolle im Muster „<Rolle> in diesem Projekt". Außerhalb des Projektkontexts steht dort die instanzweite Rolle („System-Admin" bzw. nichts, wenn der Nutzer kein Systemadmin ist).
- [ ] Für Rolle `User` (keine perspektiv-tragende Rolle, PRD 2.2) wird die Zeile ebenfalls korrekt angezeigt und nicht mit einer Rollenfarbe versehen (SPEC-00 §4: Rolle „User" erhält bewusst keinen Badge).
- [ ] Sidebar-Breite und Innenabstand entsprechen den Design-Werten.
- [ ] Automatisierter Test (Angular `TestBed`) belegt: Wording, zweibuchstabige Initialen, projektabhängige zweite Zeile inklusive Wechsel beim Verlassen des Projektkontexts.
- [ ] Manueller Smoke-Test gegen `docker compose up` in beiden Kontexten — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-045, US-046, US-055, US-074, US-075).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html`/`.ts`/`.css`
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Keine neue Backend-Route: Die Projektrolle stammt aus bereits geladenen Projektdaten bzw. dem Auth-Zustand.
- Kein Rückschritt bei der Sichtbarkeitsregel — der Admin-Eintrag bleibt ausschließlich für Systemadmins sichtbar (US-046).
- Keine Backend-Änderung, keine Migration.
