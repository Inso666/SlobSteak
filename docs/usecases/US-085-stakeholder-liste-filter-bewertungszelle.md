**ID:** US-085
**Titel:** Stakeholder-Liste: Kommunikationsart-Filter, Umschalter für Gelöschte und rollenfarbige Bewertungszelle
**Bounded Context / Domain:** StakeholderManagement (Presentation-Schicht, bestehende Query-API)
**Abhängigkeiten:** US-080, US-084
**Status:** offen

---

### 1. User Story

Als **Projektleiter** möchte ich die Stakeholder-Liste zusätzlich nach Kommunikationsart filtern und meine eigene Bewertung in der Rollenfarbe erkennen, damit ich in einer langen Liste schnell die für einen Kommunikationsanlass relevanten Stakeholder finde.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #126](https://github.com/Inso666/SlobSteak/issues/126), QA-Design-Abgleich vom 04.09.2026, gegen `docs/design/StakeholderList.dc.html`.

| Punkt | Design | App |
|---|---|---|
| Filter | Suchfeld plus zwei Chip-Dropdowns: „Typ: Alle", „Kommunikationsart: Alle" | Suchfeld plus „Typ"; Kommunikationsart fehlt vollständig |
| Filter-Labels | als Präfix im Chip | als eigene Zeile über dem Feld gestapelt („Suche" / „Typ") |
| „Gelöschte anzeigen" | Umschalter (Toggle) | einfache Checkbox |
| Zelle „Meine Bewertung" | `E 88 · I 82` mit dem Einfluss-Wert in der Rollenfarbe, darunter das kleine Rollenkürzel | vollständig in `--app-color-text`, daneben ein Rollen-Badge |
| Zeilenhöhe | kompakt (etwa 34px) | 63px |

- **Design-Begründung (Annotation zum Artboard):** „‚Meine Bewertung' ist eine bewusste Ergänzung zum PRD: zeigt die eigene Rollenperspektive direkt in der Liste, farblich konsistent zu Radar/Map."
- **Datenverfügbarkeit:** Die Kommunikationszuordnungen je Stakeholder werden in der Liste bereits als Chips angezeigt (US-040/US-067) — die Filterung kann client-seitig auf denselben Daten erfolgen, sofern die Listen-Response sie vollständig liefert. Ist das nicht der Fall, wird der Filter serverseitig an der bestehenden Query aus US-025/US-041 ergänzt; die Entscheidung ist in der Story-Datei zu begründen.
- **Gefilterte Anzahl** in der Fußzeile ist Teil von US-080 und nicht Gegenstand dieser Story.

### 3. Akzeptanzkriterien

- [ ] Die Filterzeile bietet zusätzlich „Kommunikationsart" mit den Werten „Alle" plus allen im Projekt tatsächlich zugeordneten Kommunikationsarten.
- [ ] Der Filter wirkt kumulativ mit Suche, Typ und „Gelöschte anzeigen".
- [ ] Filter-Labels stehen als Präfix im Control (Muster aus US-084), nicht als eigene Zeile darüber; die `<label>`-Zuordnung für Screenreader bleibt erhalten.
- [ ] „Gelöschte anzeigen" ist ein Umschalter mit klar unterscheidbarem Ein-/Aus-Zustand (Zustandsfarbe, nicht nur Knopfposition) und bleibt weiterhin ausschließlich für PL/Admin sichtbar (US-024).
- [ ] In der Spalte „Meine Bewertung" wird der Einfluss-Wert in der Farbe der eigenen Rolle dargestellt; darunter steht das Rollenkürzel in der Design-Gestaltung. Der Kontrast der Rollenfarbe gegen den Zeilenhintergrund beträgt mindestens 4,5:1 (Werte aus US-078).
- [ ] Für Rolle `User` (keine eigene Perspektive) bleibt die Spalte leer bzw. zeigt den bestehenden Hinweis — kein Rollen-Farbcode ohne Rolle.
- [ ] Die Zeilenhöhe folgt dem kompakten Design-Maß; Icons und Chips bleiben vollständig sichtbar.
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: Filter vorhanden und wirksam, kumulative Filterung, Rollenfarbe in der Bewertungszelle, Verhalten für Rolle `User`.
- [ ] Backend-Test (xUnit) nur falls der Filter serverseitig ergänzt wird.
- [ ] Manueller Smoke-Test gegen `docker compose up` — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-024, US-025, US-030, US-067, US-072).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/stakeholders/**` (Listen-Komponente inkl. CSS und Service-Typen)
- ggf. `src/SlobSteak.Api/Controllers/StakeholderController.cs` und die zugehörige Query, falls serverseitig gefiltert wird
- zugehörige `.spec.ts`- bzw. Test-Dateien

**Wichtige Invarianten:**
- PRD 4.3: Die Sichtbarkeitsregel für Rolle `User` (keine fremden Assessment-Werte) gilt unverändert (US-030) — der neue Filter darf keine Assessment-Daten über einen Umweg offenlegen.
- `deleted_at`-Filterung bleibt serverseitig verbindlich; der Umschalter ändert nur die Anfrage, nicht die Berechtigung.
