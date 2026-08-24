**ID:** US-030
**Titel:** Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten)
**Bounded Context / Domain:** StakeholderAssessment
**Abhängigkeiten:** US-028, US-029

---

### 1. User Story

Als **Nutzer mit Rolle User** möchte ich **Stakeholder-Stammdaten einsehen können, aber keinerlei Zugriff auf Assessment-Daten haben — weder sichtbar noch über die API abrufbar**, damit **sensible Bewertungsdaten nicht an Rollen ausgeliefert werden, für die sie nicht bestimmt sind**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F2.3
- **Relevant für DDD:** Application-Schicht Policy-Erweiterung auf `AssessmentController` (StakeholderAssessment Context)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/stakeholders/{id}/assessments` liefert für Nutzer mit `project_membership.role = User` `403 Forbidden`, nicht etwa eine leere oder maskierte Liste.
- [ ] Integrationstest ruft den Endpoint direkt (unter Umgehung der UI) mit einem User-Rolle-Token auf und verifiziert `403` sowie das Fehlen jeglicher Assessment-Felder im Response-Body.
- [ ] Auf der Stakeholder-Detailseite sind für Rolle `User` die Assessment-Tabs vollständig aus dem DOM entfernt (nicht nur per CSS versteckt) — Komponententest (Angular `TestBed`) prüft, dass `fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))` `null` liefert, z. B. über ein `*ngIf` auf Basis der vom Backend gelieferten Rolle, nicht über eine reine CSS-Klasse.
- [ ] Die Map-Navigation (US-032) und der Map-Query-Endpoint (US-031) sind für Rolle `User` ebenfalls serverseitig gesperrt (Cross-Check-Test, da Map auf denselben Assessment-Daten basiert).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Api/Controllers/AssessmentController.cs` (Policy-Erweiterung)
- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts` (bedingtes Rendering)
- Integrationstest `tests/SlobSteak.Api.Tests/Assessments/AssessmentController_UserRoleTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nutzer mit `project_memberships.role = User` dürfen `stakeholder_assessments` über die API nicht lesen — dies ist eine Feldsichtbarkeits-Regel, keine UI-Deaktivierung (Abschnitt 4.3 Punkt 4, F2.3).

### Anmerkungen des Dev-Agenten (Backend)

- Akzeptanzkriterium 4 fordert zusätzlich einen Cross-Check, dass die Map-Navigation (US-032) und
  der Map-Query-Endpoint (US-031) für Rolle `User` ebenfalls serverseitig gesperrt sind. Beide
  Stories sind laut `docs/usecases/BACKLOG.md` noch nicht umgesetzt — es existiert schlicht noch
  kein Map-Query-Endpoint, den man testen oder sperren könnte. Ihn jetzt vorwegzunehmen wäre ein
  Vorgriff auf eine noch nicht begonnene Story (CLAUDE.md Abschnitt 3, „Doing"). Präzedenzfall:
  US-023 hat den analogen Fall (Verweis auf US-031/US-041) identisch gehandhabt. Empfehlung: die
  serverseitige Sperre für Rolle `User` wird als Nachtrag direkt in US-031 mitgebaut (dort entsteht
  der Endpoint erstmals), inkl. eigenem Story-Test-Fall für diesen Cross-Check — nicht rückwirkend
  in US-030 nachgezogen.
- Backend-Umsetzung: `GET /api/v1/stakeholders/{id}/assessments` nutzt weiterhin die bestehende
  deklarative `[RequireProjectRole(...)]`-Infrastruktur aus US-007/US-022 (ADR-0007) — `ProjectRole.User`
  wurde schlicht aus der Liste der für diese Action erlaubten Rollen entfernt. Keine neue
  Authorization-Infrastruktur nötig; das ist die am wenigsten überraschende, mit dem bestehenden
  Code konsistenteste Lösung (der `StakeholderProjectRoleAuthorizationHandler` löst das Projekt
  weiterhin über die Stakeholder-Id auf und liefert bei fehlender erlaubter Rolle automatisch
  `403 {"error":"FORBIDDEN"}` ohne jegliche Assessment-Felder im Body, siehe
  `JsonAuthorizationMiddlewareResultHandler`).
- Akzeptanzkriterium 3 (Angular-Komponententest, Assessment-Tabs vollständig aus dem DOM entfernt)
  ist Frontend-Scope und liegt nicht im Backend-Story-Test.
