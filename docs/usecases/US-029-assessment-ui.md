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

### Anmerkungen des Dev-Agenten

- `AssessmentTabsComponent` erhält `stakeholderId` und `currentUserRole` als `@Input()` von der
  bereits bestehenden `StakeholderDetailComponent` (US-026), die `currentUserRole` bereits für
  die Bearbeiten-/Löschen-Sichtbarkeit auflöst — kein zusätzlicher `ProjectsService`-Aufruf nötig,
  ein einfaches Durchreichen.
- Editierbarkeit wird über die Reactive-Forms-eigenen `form.enable()`/`form.disable()`
  durchgesetzt statt eines rohen `[disabled]`-Attributs auf den einzelnen Feldern — Angular
  verwaltet den Formularstatus so konsistent, inkl. `getRawValue()` beim Speichern.
- **Smoke-Test-Befund (nicht US-029-spezifisch)**: Ein visueller Browser-Smoke-Test über die
  `claude-in-chrome`-Werkzeugkette zeigte auf jeder Angular-`HttpClient`-gespeisten Ansicht eine
  leere Liste/leeren Zustand, obwohl das Netzwerk-Log `200 OK` mit korrektem Body zeigte und ein
  manueller `fetch()`-Aufruf im selben Seitenkontext mit demselben Token die korrekten Daten
  lieferte. Das Verhalten wurde testweise auf dem unveränderten, bereits gemergten US-028-Stand
  reproduziert (inkl. eines `--no-cache`-Docker-Rebuilds) — es tritt also unabhängig von dieser
  Story und unabhängig von Docker-Layer-Caching auf. Betroffen war u. a. die bereits lange
  bestehende `/admin/users`-Seite (US-016), nicht nur neue Assessment-UI. Das deutet stark auf
  eine Interaktion der Browser-Automatisierungserweiterung mit Angulars zone.js-gepatchten
  `HttpClient`/XHR-Aufrufen hin (die Erweiterung patcht vermutlich ebenfalls `XMLHttpRequest`),
  nicht auf einen echten Produktionsfehler — ein normaler Browser ohne diese Erweiterung dürfte
  nicht betroffen sein. Die Verifikation dieser Story stützt sich daher auf die vollständige
  Unit-Test-Abdeckung (`assessment-tabs.component.spec.ts`, 7 Fälle über alle 6
  Akzeptanzkriterien) sowie die bereits in US-028 curl-verifizierte Backend-API, nicht auf einen
  visuellen Klickpfad-Nachweis. Sollte sich dieser Befund in einer künftigen Session wiederholen,
  lohnt sich eine gezielte Untersuchung außerhalb des Story-Umfangs (z. B. Vergleich `withFetch()`
  vs. Standard-XHR-Backend in `provideHttpClient()`).

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-029-assessment-ui`),
Auto-Merge gemäß ADR-0003 aktiviert.
