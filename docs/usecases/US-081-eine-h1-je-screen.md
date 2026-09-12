**ID:** US-081
**Titel:** Genau eine Hauptüberschrift je Screen (Projektname statt zusätzlicher Bereichsüberschrift)
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-075, US-080
**Status:** offen

---

### 1. User Story

Als **Nutzer mit Screenreader** möchte ich auf jedem Screen genau einen Seitentitel vorfinden, damit die Dokumentstruktur eindeutig ist und ich nicht zwei gleichrangige Überschriften ohne Hierarchie vorgelesen bekomme.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #125](https://github.com/Inso666/SlobSteak/issues/125), QA-Design-Abgleich vom 04.09.2026.
- **Ist-Zustand:** Jede Projekt-Unterseite rendert zwei `<h1>`:

```
/projects/<id>/stakeholders   H1: "ERP-Einführung Rewe"   H1: "Stakeholder"
/projects/<id>/map            H1: "ERP-Einführung Rewe"   H1: "Map"
/projects/<id>/distribution   H1: "ERP-Einführung Rewe"   H1: "Verteiler"
```

- **Design-Vorgabe:** `docs/design/StakeholderList.dc.html`, `Map.dc.html`, `Verteiler.dc.html` und `Detail.dc.html` zeigen je Screen genau eine Überschrift — den Projektnamen (`.page-title`, 24px) plus Rollen-Badge. Welcher Bereich aktiv ist, sagt ausschließlich der markierte Unterpunkt in der Sidebar (die Navigation aus US-075).
- **Nebenwirkung im Ist-Zustand:** Zwischen Projekttitel und Inhalt entsteht ein rund 50px breiter Leerraum, den das Design nicht vorsieht; der Bereichsname wiederholt redundant, was die Sidebar bereits markiert.
- **Ergänzend:** Die App-`h1` rendert mit 28px; `docs/design` gibt für den Projekt-Screen-Titel 24px vor und `--app-font-size-display` steht auf 26px (1,625rem). Die Größenangleichung gehört in dieselbe Änderung.

### 3. Akzeptanzkriterien

- [ ] Auf jedem Screen existiert genau ein `<h1>`. Auf Projekt-Unterseiten ist das der Projektname.
- [ ] Die bisherigen Bereichsüberschriften „Stakeholder", „Map", „Verteiler" entfallen als `<h1>`. Bleibt ein sichtbares Bereichslabel gewünscht, wird es als `<h2>` oder als nicht-überschriftliches Element umgesetzt und erhält den im Design vorgesehenen Abstand.
- [ ] Der Leerraum zwischen Projekttitel und erstem Inhaltselement entspricht dem Design (`.main{gap:20px}` in `Verteiler.dc.html`).
- [ ] Die Schriftgröße des Seitentitels folgt `--app-font-size-display`; abweichende lokale Werte werden entfernt.
- [ ] Die Zugänglichkeit bleibt erhalten: Für Screens, deren `<h1>` nur den Projektnamen trägt, benennt ein `aria-label` oder eine visuell versteckte Ergänzung weiterhin den aktiven Bereich, damit die Seite ohne Sidebar-Kontext identifizierbar bleibt.
- [ ] Automatisierter Test (Angular `TestBed`) belegt je Route: genau ein `<h1>`, Inhalt = Projektname.
- [ ] Manueller Smoke-Test gegen `docker compose up` über alle drei Projekt-Unterseiten und die Stakeholder-Detailseite — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-019, US-025, US-042, US-063, US-075).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/workspace/**` (Projekt-Workspace-Layout mit dem Projekttitel)
- `frontend/src/app/features/stakeholders/**`, `frontend/src/app/features/map/**`, `frontend/src/app/features/distribution/**` (jeweils die zweite `<h1>`)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Kein Verlust an Orientierung: Wenn der Bereichsname aus dem sichtbaren Bereich verschwindet, muss die Sidebar-Markierung eindeutig sein (US-075) — sonst bleibt ein `<h2>` stehen.
- Keine Backend-Änderung, keine Migration.
