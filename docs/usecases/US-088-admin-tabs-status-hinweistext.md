**ID:** US-088
**Titel:** Admin-Bereich: Unterstrich-Tabs, aussagekräftige Status-Spalte, Passwort-Reset als Textlink und erklärender Hinweistext
**Bounded Context / Domain:** IdentityAccess / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-056, US-072, US-080, US-084
**Status:** offen

---

### 1. User Story

Als **System-Administrator** möchte ich in der Nutzerverwaltung erkennen, welche Konten ihr Passwort noch ändern müssen, und die Tabelle ohne optisch dominierende Aktions-Buttons lesen können, damit ich meinen Verwaltungsstand auf einen Blick erfasse.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #129](https://github.com/Inso666/SlobSteak/issues/129), QA-Design-Abgleich vom 04.09.2026, gegen `docs/design/Admin.dc.html` und `AdminCatalogs.dc.html`.

| Punkt | Design | App |
|---|---|---|
| Tabs (Nutzer / Projekte / Kommunikationsarten) | Unterstrich-Tabs, aktiver Tab mit Unterstrich, darunter durchgehende Trennlinie über die Inhaltsbreite | gefüllte Pill-Tabs |
| „Passwort zurücksetzen" | Textlink in der Zeile | gefüllter heller Button je Zeile — dominiert die Tabelle optisch stärker als der Nutzername |
| Status-Spalte | „–" bzw. Attention-Tag „Muss Passwort ändern" | „Aktiv" für alle Zeilen |
| Hinweistext | „Keine Selbstregistrierung: Der einzige Weg zu einem Konto ist die Anlage hier. Die Projektzuweisung inkl. Rolle erfolgt anschließend im Tab ‚Projekte'." | fehlt vollständig |

- **Datenverfügbarkeit:** `UserResponse` (US-012) liefert bereits `MustChangePassword`; die Status-Spalte kann ohne Backend-Änderung befüllt werden.
- **Der Hinweistext** ist die einzige Stelle im Produkt, an der begründet wird, warum es keine Selbstregistrierung gibt (PRD Abschnitt 1.4).

### 3. Akzeptanzkriterien

- [ ] Die drei Admin-Tabs sind Unterstrich-Tabs mit durchgehender Trennlinie unter der Tab-Leiste; der aktive Tab trägt den Unterstrich.
- [ ] Die Status-Spalte der Nutzerliste zeigt für Konten mit `mustChangePassword = true` einen Attention-Tag „Muss Passwort ändern" und andernfalls den neutralen Platzhalter aus dem Design.
- [ ] „Passwort zurücksetzen" wird als Textlink dargestellt statt als gefüllter Button; die Funktion inklusive Verarbeitungs-Feedback aus US-043/US-051 bleibt unverändert.
- [ ] Der erklärende Hinweistext zur fehlenden Selbstregistrierung erscheint im Tab „Nutzer" an der im Design vorgesehenen Stelle.
- [ ] Die Tabs „Projekte" und „Kommunikationsarten" folgen demselben Tab- und Panel-Muster (`AdminCatalogs.dc.html`).
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: Unterstrich-Tabs, Status-Tag abhängig von `mustChangePassword`, Textlink statt Button, Hinweistext vorhanden.
- [ ] Manueller Smoke-Test gegen `docker compose up` über alle drei Tabs, mit mindestens einem Konto im Zustand „muss Passwort ändern" — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-016, US-017, US-038, US-051, US-056, US-065, US-072).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/admin/**` (Tab-Host, Nutzerliste, Projektliste, Kommunikationsarten)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Der Admin hat laut PRD 2.2 keinen fachlichen Zugriff auf Bewertungsinhalte; der Bereich bleibt rein strukturelle Verwaltung.
- Keine Backend-Änderung, keine Migration.

### 5. Anmerkungen des Product Owners

Issue #129 empfiehlt zusätzlich, das Formular „Nutzer anlegen" als dauerhaft sichtbares Panel neben der Tabelle zu zeigen statt als Dialog. Diese Empfehlung wird bewusst **nicht** übernommen — kein stilles Weglassen, sondern eine wiederholte, dokumentierte Entscheidung: US-056 hat das Dialog-Muster gemäß `docs/specs/SPEC-07-Admin.md` etabliert, und bereits bei US-072 (Issue #100) wurde derselbe Punkt aus demselben Grund abgelehnt. Der zugrunde liegende Lesbarkeitsmangel des Dialogs ist kein Argument für das Panel, sondern wird an seiner Ursache in [US-077](US-077-overlay-komponenten-dark-theme.md) behoben. Der erklärende Hinweistext aus dem Design-Panel wird davon unabhängig übernommen und wandert in den Tab-Inhalt.
