**ID:** US-029
**Titel:** Assessment-Tabs UI auf Stakeholder-Detailseite inkl. „zuletzt geändert von/am“
**Bounded Context / Domain:** StakeholderAssessment
**Abhängigkeiten:** US-028, US-026

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **auf der Stakeholder-Detailseite je Rolle einen eigenen Tab mit Einfluss-/Interesse-Slidern und Notizfeld sehen und meinen eigenen Tab bearbeiten**, damit **ich meine Einschätzung eintragen kann, während ich die Einschätzungen anderer Rollen zur Orientierung mitlesen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F2.1, F2.2, Abschnitt 6.2 (S4 Assessment-Tabs)
- **Relevant für DDD:** Presentation-Schicht (StakeholderAssessment Context)

### 3. Akzeptanzkriterien

- [ ] Detailseite zeigt drei Tabs „PL-Sicht“, „Coreteam-Sicht“, „Architect-Sicht“, gespeist aus `GET .../assessments`.
- [ ] Jeder Tab enthält Slider „Einfluss“ (0–100), Slider „Interesse“ (0–100) und ein Freitext-Notizfeld sowie „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“.
- [ ] Nur der Tab der eigenen Projekt-Rolle des angemeldeten Nutzers ist editierbar (Speichern ruft `PUT .../assessments/{eigeneRolle}` mit `expectedVersion` auf); die übrigen Tabs sind read-only, jedoch sichtbar.
- [ ] Zeigt der Server bei Speichern `409 ASSESSMENT_MODIFIED`, erscheint der Hinweis „Diese Bewertung wurde zwischenzeitlich von [Name] aktualisiert. Trotzdem speichern?“ mit den Optionen „Trotzdem speichern“ (erneuter Request ohne `expectedVersion`) und „Abbrechen“ (Neuladen der aktuellen Werte).
- [ ] Zeigt der Server `status: "NOT_ASSESSED"` für eine Rolle, erscheint „Noch nicht bewertet“ mit Call-to-Action „Jetzt bewerten“ (nur klickbar, wenn es die eigene Rolle ist).
- [ ] Zeigt der Server `status: "NO_ROLE_ASSIGNED"`, erscheint „Keine Rolle zugewiesen“ ohne jegliche Eingabemöglichkeit.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts`
- `frontend/src/app/features/assessments/assessment-conflict-dialog/assessment-conflict-dialog.component.ts`
- `frontend/src/app/features/assessments/assessments.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Nur die eigene Rolle ist editierbar — UI-seitige Durchsetzung ergänzt die serverseitige aus US-028, ersetzt sie nicht.
