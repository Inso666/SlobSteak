# Backlog — SlobSteak MVP

Diese Datei ist der maßgebliche Index aller User Stories, abgeleitet aus `PRD-SlobSteak.md`.
Die Reihenfolge entspricht der strikten technischen/logischen Abhängigkeit: Shared Kernel → Identity & Access → Project Management → Stakeholder-Domäne (Stammdaten → Assessments → Map) → Communication-Domäne (Katalog → Zuordnung → Verteilerlisten).

Jede Story ist so geschnitten, dass sie in einem einzigen fokussierten Entwicklungsdurchlauf eines autonomen Coding-Agenten umsetzbar ist. Vertikale Schnitte (Domain → Application → API → Frontend) werden dort verwendet, wo eine Story direkt nutzerseitig sichtbares Verhalten liefert; rein strukturelle Grundlagen (Domain-Modell, Datenbankschema) sind bewusst als eigene, vorgelagerte Stories geschnitten, da sie von mehreren nachfolgenden Stories geteilt werden.

## Bounded Contexts

| Bounded Context | Beschreibung | PRD-Bezug |
|---|---|---|
| **Shared Kernel** | Wiederverwendete Value Objects, Enums, Infrastruktur-Grundgerüst | Abschnitt 1.5, 4.1 |
| **IdentityAccess** | Nutzerkonten, Authentifizierung, Passwort-Handling, Autorisierung | F6, F5.1 |
| **ProjectManagement** | Projekte, Projekt-Mitgliedschaften/Rollen | F5.2 |
| **StakeholderManagement** | Stakeholder-Stammdaten inkl. Soft-Delete | F1 |
| **StakeholderAssessment** | Rollenspezifische Einfluss-/Interesse-Bewertungen | F2 |
| **StakeholderMap** | Quadranten-Visualisierung, Vergleichsmodus, Drag & Drop | F3 |
| **CommunicationCatalog** | Instanzweiter Katalog der Kommunikationsarten (Admin) | F5.3 |
| **StakeholderCommunication** | n:m-Zuordnung Stakeholder ↔ Kommunikationsart | F4.2 |
| **DistributionList** | Gefilterte Empfängerlisten, Copy/CSV-Export | F4.1 |
| **Frontend-Shell** | App-weite UI-Infrastruktur (Navigation, Session-/Fehler-Handling, Formular-Interaktionsmuster) quer zu allen fachlichen Contexts | Abschnitt 6 (UI-Architektur), CLAUDE.md 3.7 |

## Umsetzungsreihenfolge

### Phase 0 — Shared Kernel & Infrastructure

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-001 | Projekt-Grundgerüst & Architektur-Setup | Shared Kernel / Infrastructure | Keine | [US-001-projekt-setup.md](US-001-projekt-setup.md) | fertig (18.08.2026) |
| US-002 | Zentrale Value Objects (Email, Rolle, Score, Enums) | Shared Kernel | US-001 | [US-002-value-objects.md](US-002-value-objects.md) | fertig (18.08.2026) |
| US-003 | Datenbankschema & Migrationen für alle Aggregate | Shared Kernel / Infrastructure | US-001, US-002 | [US-003-datenbankschema.md](US-003-datenbankschema.md) | fertig (18.08.2026) |

### Phase 1 — Identity & Access (Auth)

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-004 | User-Aggregate (Domain Model) | IdentityAccess | US-002, US-003 | [US-004-user-aggregate.md](US-004-user-aggregate.md) | fertig (19.08.2026) |
| US-005 | Seed-Admin-Bootstrap beim Erststart | IdentityAccess | US-004 | [US-005-seed-admin.md](US-005-seed-admin.md) | fertig (19.08.2026) |
| US-006 | Login-API mit Session/Token-Ausstellung | IdentityAccess | US-004 | [US-006-login-api.md](US-006-login-api.md) | fertig (19.08.2026) |
| US-007 | Rollenbasierte Authorization-Middleware | IdentityAccess | US-006, US-011 | [US-007-authorization-middleware.md](US-007-authorization-middleware.md) | fertig (19.08.2026) |
| US-008 | Erzwungene Passwortänderung nach Erst-Login | IdentityAccess | US-006 | [US-008-passwort-aenderung-erzwingen.md](US-008-passwort-aenderung-erzwingen.md) | fertig (19.08.2026) |
| US-009 | Login-Screen UI (S1) | IdentityAccess | US-006, US-008 | [US-009-login-ui.md](US-009-login-ui.md) | fertig (19.08.2026) |

### Phase 2 — Project Management & Admin-Verwaltung

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-010 | Project-Aggregate (Domain Model) | ProjectManagement | US-002, US-003 | [US-010-project-aggregate.md](US-010-project-aggregate.md) | fertig (19.08.2026) |
| US-011 | ProjectMembership-Entity mit Rollen-Invariante | ProjectManagement | US-004, US-010 | [US-011-project-membership.md](US-011-project-membership.md) | fertig (19.08.2026) |
| US-012 | Admin-API: Nutzer anlegen | IdentityAccess | US-004, US-007 | [US-012-admin-nutzer-anlegen.md](US-012-admin-nutzer-anlegen.md) | fertig (19.08.2026) |
| US-013 | Admin-API: Passwort-Reset für Nutzer | IdentityAccess | US-012 | [US-013-admin-passwort-reset.md](US-013-admin-passwort-reset.md) | fertig (19.08.2026) |
| US-014 | Admin-API: Projekt anlegen | ProjectManagement | US-010, US-007 | [US-014-admin-projekt-anlegen.md](US-014-admin-projekt-anlegen.md) | fertig (19.08.2026) |
| US-015 | Admin-API: Nutzer-Projekt-Zuweisung mit Rolle | ProjectManagement | US-011, US-012, US-014 | [US-015-admin-nutzer-zuweisung.md](US-015-admin-nutzer-zuweisung.md) | fertig (19.08.2026) |
| US-016 | Admin-Bereich UI: Nutzerverwaltung | IdentityAccess | US-012, US-013 | [US-016-admin-ui-nutzerverwaltung.md](US-016-admin-ui-nutzerverwaltung.md) | fertig (19.08.2026) |
| US-017 | Admin-Bereich UI: Projektverwaltung & Mitgliederzuweisung | ProjectManagement | US-014, US-015, US-016 | [US-017-admin-ui-projektverwaltung.md](US-017-admin-ui-projektverwaltung.md) | fertig (19.08.2026) |
| US-018 | Projektübersicht-Screen (S2) | ProjectManagement | US-010, US-011, US-017 | [US-018-projektuebersicht-ui.md](US-018-projektuebersicht-ui.md) | fertig (19.08.2026) |
| US-019 | Projekt-Workspace-Shell mit Tab-Navigation (S3) | ProjectManagement | US-018 | [US-019-projekt-workspace-shell.md](US-019-projekt-workspace-shell.md) | fertig (19.08.2026) |

### Phase 3 — Stakeholder Management (Stammdaten)

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-020 | Stakeholder-Aggregate (Domain Model, Invarianten) | StakeholderManagement | US-002, US-003, US-010 | [US-020-stakeholder-aggregate.md](US-020-stakeholder-aggregate.md) | fertig (19.08.2026) |
| US-021 | Stakeholder anlegen: API + Formular-UI | StakeholderManagement | US-020, US-007, US-019 | [US-021-stakeholder-anlegen.md](US-021-stakeholder-anlegen.md) | fertig (19.08.2026) |
| US-022 | Stakeholder-Stammdaten bearbeiten: API + UI inkl. Änderungsverlauf | StakeholderManagement | US-021 | [US-022-stakeholder-bearbeiten.md](US-022-stakeholder-bearbeiten.md) | fertig (19.08.2026) |
| US-023 | Stakeholder Soft-Delete: API + UI | StakeholderManagement | US-020, US-022 | [US-023-stakeholder-soft-delete.md](US-023-stakeholder-soft-delete.md) | fertig (19.08.2026) |
| US-024 | Stakeholder Wiederherstellen & Papierkorb-Ansicht: API + UI (S3.x) | StakeholderManagement | US-023, US-025 | [US-024-stakeholder-wiederherstellen.md](US-024-stakeholder-wiederherstellen.md) | fertig (19.08.2026) |
| US-025 | Stakeholder-Liste mit Suche/Filter: API + UI inkl. Rollen-Sichtbarkeitsregel | StakeholderManagement | US-020, US-019 | [US-025-stakeholder-liste.md](US-025-stakeholder-liste.md) | fertig (19.08.2026) |
| US-026 | Stakeholder-Detailseite Shell (S4) | StakeholderManagement | US-022, US-025 | [US-026-stakeholder-detail-shell.md](US-026-stakeholder-detail-shell.md) | fertig (19.08.2026) |

### Phase 4 — Stakeholder Assessment (Perspektiven)

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-027 | StakeholderAssessment-Aggregate (Domain Model, Invarianten) | StakeholderAssessment | US-002, US-003, US-020 | [US-027-assessment-aggregate.md](US-027-assessment-aggregate.md) | fertig (19.08.2026) |
| US-028 | Assessment erstellen/aktualisieren API inkl. Optimistic-Locking-Konfliktregel | StakeholderAssessment | US-027, US-007, US-011 | [US-028-assessment-api.md](US-028-assessment-api.md) | fertig (19.08.2026) |
| US-029 | Assessment-Tabs UI auf Stakeholder-Detailseite inkl. „zuletzt geändert von/am“ | StakeholderAssessment | US-028, US-026 | [US-029-assessment-ui.md](US-029-assessment-ui.md) | fertig (19.08.2026) |
| US-030 | Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten) | StakeholderAssessment | US-028, US-029 | [US-030-assessment-sichtbarkeit-user.md](US-030-assessment-sichtbarkeit-user.md) | fertig (24.08.2026) |

### Phase 5 — Stakeholder Map

| ID | Titel | Bounded Context | Abhängigkeiten | Datei |
|---|---|---|---|---|
| US-031 | Map-Query-API je Perspektive | StakeholderMap | US-027, US-030 | [US-031-map-query-api.md](US-031-map-query-api.md) |
| US-032 | Map-UI Quadranten-Diagramm mit Perspektiv-Dropdown | StakeholderMap | US-031, US-019 | [US-032-map-ui.md](US-032-map-ui.md) |
| US-033 | Vergleichsmodus-Query-API (zwei Perspektiven) | StakeholderMap | US-031 | [US-033-map-vergleich-api.md](US-033-map-vergleich-api.md) |
| US-034 | Vergleichsmodus-UI (zwei Punkte, Verbindungslinie, Legende, Diff) | StakeholderMap | US-033, US-032 | [US-034-map-vergleich-ui.md](US-034-map-vergleich-ui.md) |
| US-035 | Drag & Drop Update-API mit Konfliktregel | StakeholderMap | US-028 | [US-035-map-dragdrop-api.md](US-035-map-dragdrop-api.md) |
| US-036 | Drag & Drop UI inkl. Zoom/Pan | StakeholderMap | US-035, US-034 | [US-036-map-dragdrop-ui.md](US-036-map-dragdrop-ui.md) |

### Phase 6 — Communication Catalog (Admin)

| ID | Titel | Bounded Context | Abhängigkeiten | Datei |
|---|---|---|---|---|
| US-037 | CommunicationType-Aggregate & Admin-Katalog-API | CommunicationCatalog | US-002, US-003, US-007 | [US-037-communication-type-katalog-api.md](US-037-communication-type-katalog-api.md) |
| US-038 | Kommunikationsarten-Katalog Admin-UI | CommunicationCatalog | US-037, US-017 | [US-038-communication-type-katalog-ui.md](US-038-communication-type-katalog-ui.md) |

### Phase 7 — Stakeholder Communication Assignment

| ID | Titel | Bounded Context | Abhängigkeiten | Datei |
|---|---|---|---|---|
| US-039 | StakeholderCommunicationAssignment-Entity (n:m, Invarianten) | StakeholderCommunication | US-020, US-037 | [US-039-communication-assignment-entity.md](US-039-communication-assignment-entity.md) |
| US-040 | Kommunikationszuordnung API + UI auf Stakeholder-Detailseite | StakeholderCommunication | US-039, US-026, US-038 | [US-040-communication-assignment-ui.md](US-040-communication-assignment-ui.md) |

### Phase 8 — Distribution Lists (Verteilerlisten)

| ID | Titel | Bounded Context | Abhängigkeiten | Datei |
|---|---|---|---|---|
| US-041 | Verteilerlisten-Filter-Query-API inkl. Berechtigungsregel | DistributionList | US-039, US-025, US-007 | [US-041-distribution-list-api.md](US-041-distribution-list-api.md) |
| US-042 | Verteilerlisten-UI: Filter, Tabelle, Copy-E-Mails, CSV-Export | DistributionList | US-041, US-019 | [US-042-distribution-list-ui.md](US-042-distribution-list-ui.md) |

### Phase 9 — Frontend UX-Härtung (Cross-Cutting)

Ergebnis eines UX-Reviews vom 23.08.2026 (Fokus: Feedback bei Operationen >0,5s, korrekte Weiterleitung nach Login/Aktionen). Alle vier Stories sind fachlich unabhängig von den Phasen 5–8 (Map, Communication, Distribution) und können parallel dazu bearbeitet werden — ihre Abhängigkeiten reichen ausschließlich in die bereits abgeschlossenen Phasen 1–4 zurück.

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-043 | Einheitliches Verarbeitungs-Feedback & Doppel-Submit-Schutz auf allen Formularen/Aktions-Buttons | Frontend-Shell | US-009, US-016, US-017, US-021, US-022, US-023, US-024, US-029 | [US-043-formular-feedback-doppelsubmit-schutz.md](US-043-formular-feedback-doppelsubmit-schutz.md) | fertig (23.08.2026) |
| US-044 | Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung | Frontend-Shell | US-006, US-009, US-018, US-019 | [US-044-globales-http-error-handling.md](US-044-globales-http-error-handling.md) | fertig (23.08.2026) |
| US-045 | Globale Navigation (Shell) inkl. Abmelden-Funktion | Frontend-Shell | US-006, US-009, US-018 | [US-045-globale-navigation-abmelden.md](US-045-globale-navigation-abmelden.md) | fertig (23.08.2026) |
| US-046 | Admin-Bereich über globale Navigation erreichbar machen | Frontend-Shell | US-016, US-017, US-045 | [US-046-globale-navigation-admin-eintrag.md](US-046-globale-navigation-admin-eintrag.md) | fertig (23.08.2026) |
| US-047 | Bestehendes Frontend auf das in CLAUDE.md definierte Design-System migrieren | Frontend-Shell | US-009, US-016, US-017, US-018, US-019, US-021, US-022, US-023, US-024, US-025, US-026, US-029, US-043, US-044, US-045, US-046 | [US-047-frontend-design-migration.md](US-047-frontend-design-migration.md) | fertig (24.08.2026) |
| US-048 | PrimeNG-Lizenzschlüssel serverseitig verwalten statt im Frontend-Bundle auszuliefern | Frontend-Shell | US-047 | [US-048-primeng-lizenzschluessel-serverseitig.md](US-048-primeng-lizenzschluessel-serverseitig.md) | offen |

**Hinweis zu US-047:** Zusätzliche Definition-of-Ready-Voraussetzung über das übliche Schema hinaus — das in `CLAUDE.md` zu hinterlegende Design-Konzept (Farben inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, Komponentenmuster) muss vollständig vorliegen, bevor diese Story begonnen wird (wird separat vom Projektverantwortlichen ausgearbeitet, siehe Story-Datei Abschnitt 5).

### Phase 10 — Bugfixing (aus `docs/bugs/bugs.md`, PO-Review vom 24.08.2026)

Vom Projektverantwortlichen gemeldete Bugs (`docs/bugs/bugs.md`), vom Product Owner verifiziert (Code-/Spec-Abgleich) und zu acht Stories gruppiert/geschnitten. US-049–US-052 sind funktionale Bugs, US-053–US-056 Design-Abweichungen von den `docs/specs/SPEC-*`-Dateien bzw. dem in US-047 umgesetzten Design-System. Reihenfolge innerhalb der Phase spiegelt die dokumentierten Abhängigkeiten wider (z. B. US-053 vor US-054, US-055 vor US-056).

| ID | Titel | Bounded Context | Abhängigkeiten | Datei | Status |
|---|---|---|---|---|---|
| US-049 | Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart | Shared Kernel / Infrastructure | US-001, US-006, US-009 | [US-049-kaltstart-performance-erster-request.md](US-049-kaltstart-performance-erster-request.md) | fertig (28.08.2026) |
| US-050 | Verlässlicher Lade-Zustand statt fälschlicher Leer-/Stale-Darstellung auf Listen-/Übersichtsseiten | Frontend-Shell | US-016, US-017, US-018, US-044 | [US-050-verlaesslicher-lade-zustand-listen.md](US-050-verlaesslicher-lade-zustand-listen.md) | fertig (25.08.2026) |
| US-051 | „Passwort zurücksetzen“ in der Nutzerverwaltung schließt zuverlässig ab | IdentityAccess | US-013, US-016, US-043 | [US-051-passwort-reset-abschliessen.md](US-051-passwort-reset-abschliessen.md) | fertig (28.08.2026) |
| US-052 | Stakeholderverwaltung nach Projektauswahl zuverlässig anzeigen | ProjectManagement / StakeholderManagement | US-019, US-025, US-026, US-044 | [US-052-stakeholderverwaltung-nach-projektklick.md](US-052-stakeholderverwaltung-nach-projektklick.md) | fertig (28.08.2026) |
| US-053 | App-Identität im Browser (Tab-Titel, Favicon, Marken-Icon) | Frontend-Shell | US-001, US-047 | [US-053-app-identitaet-browser.md](US-053-app-identitaet-browser.md) | fertig (29.08.2026) |
| US-054 | Login- und Passwort-Änderungs-Masken gemäß SPEC-01 angleichen | IdentityAccess | US-008, US-009, US-047, US-053 | [US-054-login-passwortaendern-spec01-angleichen.md](US-054-login-passwortaendern-spec01-angleichen.md) | fertig (29.08.2026) |
| US-055 | Globale Navigation als vertikale Sidebar statt horizontaler Kopfleiste | Frontend-Shell | US-045, US-046, US-047 | [US-055-vertikale-navigation-sidebar.md](US-055-vertikale-navigation-sidebar.md) | fertig (29.08.2026) |
| US-056 | Admin-Bereich gemäß SPEC-07 angleichen (Tab-Host mit Dialog-Formularen) | IdentityAccess / ProjectManagement | US-016, US-017, US-046, US-047, US-055 | [US-056-admin-bereich-spec07-angleichen.md](US-056-admin-bereich-spec07-angleichen.md) | fertig (29.08.2026) |
| US-057 | Login-Flow bleibt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen | Frontend-Shell | US-009, US-043, US-050 | [US-057-login-haengt-nach-erfolgreicher-anmeldung.md](US-057-login-haengt-nach-erfolgreicher-anmeldung.md) | fertig (25.08.2026) |
| US-058 | Zoneless-Reaktivität systematisch nachziehen (fehlendes `markForCheck()` in weiteren `subscribe()`-Callbacks) | Frontend-Shell | US-050, US-057 | [US-058-zoneless-reaktivitaet-systematisch-nachziehen.md](US-058-zoneless-reaktivitaet-systematisch-nachziehen.md) | fertig (29.08.2026) |

**Hinweis zur Gruppierung:** Der ursprüngliche Bug-Report enthielt 15 Einzelbefunde. Fünf funktional identische „Liste erscheint erst nach unabhängiger Interaktion“-Befunde (Projektübersicht, Nutzerverwaltung, Projektverwaltung, Mitgliederverwaltung ×2) wurden zu US-050 zusammengefasst, da Code-Review dieselbe strukturelle Ursache (fehlender diskreter Lade-Zustand gemäß `SPEC-00-Design-System.md` §3) an allen fünf Stellen bestätigt. Drei Icon-/Titel-Befunde wurden zu US-053 zusammengefasst. Details und Einzelbegründungen je Bug stehen jeweils unter „Anmerkungen des Product Owners“ in den einzelnen Story-Dateien.

**Hinweis zu US-057:** Kein Befund aus dem ursprünglichen Bug-Report, sondern während der QA-Verifikation von US-050 neu entdeckt (Login hängt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand, gleiche Root Cause wie US-050 — fehlendes `ChangeDetectorRef.markForCheck()` im zoneless Frontend). Als eigene, hochpriorisierte Story angelegt statt nachträglich in US-050 eingemischt, da `LoginPageComponent` nicht zu den dort benannten Fundstellen gehörte.

## Hinweise zur Nutzung durch den Dev-Agenten

Jede Story wird in genau einer isolierten Iteration umgesetzt. Vor Beginn einer Story müssen alle in „Abhängigkeiten“ genannten Stories bereits abgeschlossen und deren Akzeptanzkriterien grün sein. Die Reihenfolge innerhalb einer Phase ist ebenfalls verbindlich, da spätere Stories einer Phase häufig auf den unmittelbar vorangehenden aufbauen (z. B. US-023 Soft-Delete vor US-024 Restore). Domain-Invarianten aus Abschnitt 4.3 des PRD (`stakeholder_assessments` max. 1 je Rolle, `project_memberships` max. 1 je Nutzer, Rollen-Schreibrechte, `deleted_at`-Filterung, Sichtbarkeitsregel für Rolle User) sind kontextübergreifend gültig und werden in mehreren Stories wiederholt referenziert — sie dürfen in keiner Story verletzt werden, auch wenn eine einzelne Story sie nicht explizit als Akzeptanzkriterium führt.

---
*Erzeugt aus `PRD-SlobSteak.md`, Version 1.0 (18.08.2026). Technischer Stack: C#/.NET (ASP.NET Core, EF Core, PostgreSQL) im Backend, Angular im Frontend.*