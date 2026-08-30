**ID:** US-071
**Titel:** Stakeholder-Detailseite als Zwei-Spalten-Layout mit direkt editierbaren Stammdaten und Typ-Badge
**Bounded Context / Domain:** StakeholderManagement (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-070

---

### 1. User Story

Als **Nutzer mit Bearbeitungsrecht** möchte ich Stammdaten eines Stakeholders direkt im sichtbaren Stammdaten-Panel ändern können, ohne dass ein komplett separates, redundantes Formular mit denselben Feldern eingeblendet wird, und möchte Stammdaten/Kommunikation sowie das Assessment nebeneinander statt nacheinander sehen, damit ich beides im Blick habe, ohne zu scrollen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #102](https://github.com/Inso666/SlobSteak/issues/102), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026, gegen `docs/design/Detail.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.html`):** Einspaltiges Layout von oben nach unten (Kopfbereich → Stammdaten → Kommunikationszuordnungen → Assessment). Stammdaten werden als reine `<dl>`-Label-Wert-Paare (Zeilen 33–44) angezeigt; ein Klick auf „Bearbeiten“ ersetzt diese `<dl>“ durch `<app-edit-stakeholder-form>` (Zeile 31) — ein vollständiges, eigenständiges Formular mit eigener Überschrift „Stakeholder bearbeiten“ (`edit-stakeholder-form.component.html` Zeile 2), das **auch** Name, Typ und Organisation erneut abfragt, obwohl diese bereits im Kopfbereich sichtbar sind (redundant). Der Kopfbereich zeigt Typ/Organisation als Fließtext („Person · Rewe Group“, Zeile 12–17), keine separate Typ-Badge-Pille.
- **Soll-Zustand laut `docs/design/Detail.dc.html`:** Zwei-Spalten-Layout — linke Spalte (fixe Breite 620px): Panel „Stammdaten“ mit direkt editierbaren Eingabefeldern (kein separater Lese-/Bearbeiten-Modus-Wechsel) sowie darunter „Kommunikationszuordnungen“; rechte Spalte (flexibel): ausschließlich das „Perspektivisches Assessment“-Panel. Der Name-Header zeigt zusätzlich eine separate Typ-Badge-Pille neben dem Namen.
- **PO-Entscheidung zum Bearbeiten-Fluss:** „Direkt editierbar“ bedeutet: die Stammdatenfelder (Position, E-Mail, Telefon, Standort/Abteilung, Beschreibung — die bisherigen `<dl>`-Felder) werden für Nutzer mit Bearbeitungsrecht **immer** als Eingabefelder gerendert, nicht als Text mit Umschalt-Button. Name/Typ/Organisation bleiben im Kopfbereich editierbar (dort integriert, nicht als redundante Zweitfelder im Stammdaten-Panel) — das deckt sich mit der Design-Vorgabe, dass Name/Typ bereits im Header sitzen, und vermeidet die in Issue #102 kritisierte Dopplung. Speichern erfolgt über eine sichtbare „Speichern“-Aktion, die nur bei tatsächlicher Änderung aktiv/sichtbar wird (Doppel-Submit-Schutz gemäß US-043), Abbrechen setzt auf den zuletzt gespeicherten Stand zurück. Validierungsregeln (insb. E-Mail-Format, `NAME_REQUIRED`) bleiben unverändert wie in `EditStakeholderFormComponent` bereits implementiert.
- **Relevant für DDD:** Reine Presentation-Schicht. `StakeholderController`/`UpdateStakeholderDetailsService` (US-022) bleiben unverändert — dieselben Felder, derselbe `PATCH`/`PUT`-Contract.

### 3. Akzeptanzkriterien

- [ ] Die Stakeholder-Detailseite rendert ab einer angemessenen Mindestbreite ein Zwei-Spalten-Layout: linke Spalte enthält Stammdaten-Panel und Kommunikationszuordnungen-Panel, rechte Spalte enthält ausschließlich das Assessment-Panel. Unterhalb einer angemessenen Breite (Responsive, analog zu anderen Screens dieses Repos) fällt das Layout auf eine einspaltige Anordnung zurück.
- [ ] Für Nutzer mit Bearbeitungsrecht (`canEdit`) sind die Stammdatenfelder (Position, E-Mail, Telefon, Standort/Abteilung, Beschreibung) direkt als Eingabefelder im Stammdaten-Panel dargestellt — kein separater Lese-/Bearbeiten-Modus-Wechsel, kein zweites, redundantes Formular mit erneuten Name-/Typ-/Organisation-Feldern.
- [ ] Name und Typ bleiben im Kopfbereich editierbar (dort integriert) — nicht zusätzlich im Stammdaten-Panel dupliziert.
- [ ] Eine „Speichern“-Aktion wird nur bei tatsächlicher Änderung an mindestens einem Feld aktiv (Doppel-Submit-Schutz gemäß US-043); Validierungsregeln aus US-022 (u. a. `NAME_REQUIRED`, E-Mail-Format) bleiben unverändert erhalten.
- [ ] Der Namens-Header zeigt zusätzlich eine separate Typ-Badge-Pille (z. B. „Person“/„Organisation“) neben dem Namen, getrennt von der bisherigen Fließtext-Meta-Zeile.
- [ ] Für Nutzer ohne Bearbeitungsrecht bleiben die Stammdatenfelder als reiner, nicht editierbarer Text sichtbar (kein Rückschritt gegenüber bestehendem Verhalten für diese Rolle).
- [ ] Automatisierter Test (Angular `TestBed`) belegt: Zwei-Spalten-Struktur (Stammdaten+Kommunikation links, Assessment rechts), direkt editierbare Felder ohne Read/Edit-Toggle für berechtigte Nutzer, unveränderte Read-only-Darstellung für nicht berechtigte Nutzer, Typ-Badge im Header.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Layout entspricht optisch `docs/design/Detail.dc.html` — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `StakeholderDetailComponent`/`EditStakeholderFormComponent` (inkl. Story-Tests aus US-022, US-026, US-059) bleiben grün bzw. werden ans neue Markup angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.html` (Zeilen 10–61, Layout-Umbau, Typ-Badge im Header)
- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.css` (Zwei-Spalten-Grid, Responsive-Fallback)
- `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.html`/`.ts` — Umbau von „eigenständiges Formular mit allen Feldern inkl. Name/Typ“ zu „inline editierbare Stammdatenfelder ohne Name/Typ/Organisation-Redundanz“ (Name/Typ wandern in den Header-Bearbeitungsfluss, siehe unten)
- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.spec.ts`, `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.spec.ts`, zugehörige Story-Tests

**Wichtige Invarianten:**
- Kein Backend-Contract-Wechsel — `PUT /api/v1/stakeholders/{id}` (US-022) bleibt unverändert, weiterhin alle Stammdatenfelder inkl. Name/Typ/Organisation in einem Request.
- Name/Typ-Bearbeitung im Header darf weiterhin denselben `PUT`-Aufruf wie die übrigen Stammdatenfelder auslösen (ein gemeinsames Formular/Formular-Group über Header- und Panel-Felder hinweg ist zulässig — die Trennung betrifft nur die visuelle Anordnung, nicht zwingend getrennte HTTP-Requests).
- Kein neues Farb-/Abstands-Token — Grid-Spaltenbreiten und Badge-Styling nutzen bestehende SPEC-00-Tokens.

### Anmerkungen des Product Owners

Dritte Story dieser Phase (nach [US-069](US-069-assessment-tabs-markforcheck.md), [US-070](US-070-zeitstempel-deutsches-format.md)) — sequenziell danach eingeplant, da diese Story `stakeholder-detail.component.html` (inkl. der von US-070 bereits korrigierten Datumszeile) grundlegend umbaut. Der Bearbeiten-Fluss (Name/Typ im Header statt im separaten Formular) ist eine PO-Entscheidung zur Auflösung der in Issue #102 kritisierten Feld-Dopplung, nicht wörtlich aus `docs/design` ableitbar, aber die PRD-konformste, am wenigsten überraschende Interpretation (CLAUDE.md Abschnitt 6).

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
