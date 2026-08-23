# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier je User Story dokumentiert.

## [Unreleased]

### US-044 — Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung

- Neuer `httpErrorInterceptor` (`frontend/src/app/core/interceptors/http-error.interceptor.ts`),
  registriert in `app.config.ts` nach `authInterceptor` (Reihenfolge über die neue Konstante
  `HTTP_INTERCEPTORS_ORDER` dediziert testbar).
- Bei `401 Unauthorized`: Token wird über `TokenStorageService.clearToken()` gelöscht und der
  Nutzer (sofern nicht bereits auf `/login`) automatisch dorthin weitergeleitet, inkl. sichtbarem
  Hinweistext „Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.“ — transportiert über den
  neuen `SessionNoticeService` (Begründung: `docs/adr/0008-session-notice-service-statt-query-param.md`).
- Bei `403 Forbidden`: kein automatischer Redirect (fachlich gültiger, dauerhafter Zustand), aber
  zentrales `console.error`-Logging mit Request-URL und Status als Ansatzpunkt für künftiges
  Client-seitiges Logging. Alle anderen Fehler (inkl. generischer `5xx`) werden unverändert
  durchgereicht.
- Bislang fehlende `error`-Handler bei lesenden (`GET`) Requests ergänzt in
  `stakeholder-list.component.ts`, `project-overview.component.ts`,
  `project-workspace-layout.component.ts`, `users-admin.component.ts`,
  `projects-admin.component.ts` — jeweils mit der konsistenten Fehlermeldung „Daten konnten nicht
  geladen werden. Bitte versuche es erneut.“ statt einer stumm leeren/eingefrorenen Ansicht. Beide
  Wortlaute zentral in `core/messages/http-error-messages.ts`, gemeinsame Anzeige-Klasse
  `.load-error` in `src/styles.css`.
- Tests: `http-error.interceptor.spec.ts` (401/403/5xx isoliert über `HttpTestingController`),
  Story-Test `us-044-http-error-handling.spec.ts` (alle fünf Akzeptanzkriterien in Reihenfolge,
  inkl. End-to-End-Test Interceptor+`ProjectWorkspaceLayoutComponent`), sowie ergänzte
  Fehlerfall-Tests in den fünf betroffenen `*.component.spec.ts`-Dateien und
  `login-page.component.spec.ts`. Gesamter Workspace (`ng test`) grün, `ng lint` fehlerfrei.
- Reiner Frontend-Anteil, kein Backend-Code — `dotnet test` unverändert.

### US-029 — Assessment-Tabs UI auf Stakeholder-Detailseite inkl. „zuletzt geändert von/am“

- Neue `AssessmentTabsComponent` (Frontend) — drei Tabs „PL-Sicht“/„Coreteam-Sicht“/
  „Architect-Sicht“ auf der Stakeholder-Detailseite (US-026), gespeist aus `GET .../assessments`
  (US-028). Jeder Tab zeigt Einfluss-/Interesse-Slider, Notizfeld und „zuletzt geändert von/am“.
  Nur der Tab der eigenen Projekt-Rolle ist editierbar (`form.enable()`/`disable()`), übrige Tabs
  bleiben sichtbar, aber read-only.
- `status: "NOT_ASSESSED"` zeigt „Noch nicht bewertet“ mit „Jetzt bewerten“-CTA (nur für die
  eigene Rolle klickbar); `status: "NO_ROLE_ASSIGNED"` zeigt „Keine Rolle zugewiesen“ ganz ohne
  Eingabemöglichkeit.
- Neue `AssessmentConflictDialogComponent`: erscheint bei `409 ASSESSMENT_MODIFIED` beim
  Speichern, mit „Trotzdem speichern“ (erneuter Request ohne `expectedVersion`) und „Abbrechen“
  (Neuladen der aktuellen Werte).
- Neuer `AssessmentsService` (Frontend); `StakeholderDetailComponent` (US-026) reicht
  `currentUserRole` durch und befüllt den bisherigen Assessment-Platzhalter-Slot.
- Tests: `assessment-tabs.component.spec.ts` (7 Fälle, deckt alle 6 Akzeptanzkriterien),
  `assessment-conflict-dialog.component.spec.ts`, erweiterte `stakeholder-detail.component.spec.ts`.
- Reiner Frontend-Anteil, kein Backend-Code — `dotnet test` unverändert grün.
- **Anmerkung zum Smoke-Test**: API-seitig End-to-End über curl verifiziert (Erstanlage,
  Konflikt-Response, `NO_ROLE_ASSIGNED`). Ein visueller Browser-Smoke-Test über die
  `claude-in-chrome`-Erweiterung zeigte für *jede* Angular-`HttpClient`-gespeiste Ansicht (auch
  bereits bestehende, unveränderte Seiten wie `/admin/users`) leere Listen, obwohl Netzwerk-Log
  und ein manueller `fetch()` im selben Seitenkontext mit demselben Token korrekte Daten lieferten
  — reproduziert identisch auf dem unveränderten, bereits gemergten US-028-Stand. Das deutet auf
  eine Interaktion der Browser-Erweiterung mit Angulars zone.js-gepatchten `HttpClient`-Requests
  hin, nicht auf einen echten Anwendungsfehler; siehe „Anmerkungen des Dev-Agenten“ in der
  Story-Datei.

### US-028 — Assessment erstellen/aktualisieren API inkl. Optimistic-Locking-Konfliktregel

- `PUT /api/v1/stakeholders/{id}/assessments/{role}` (neu): legt ein Assessment an oder
  aktualisiert es; `201 Created` bzw. `200 OK` mit `influence`/`interest`/`notes`/
  `updatedByName`/`updatedAt`/`version`. Ausschließlich für den Nutzer mit exakt dieser Rolle im
  Projekt erreichbar (`403 FORBIDDEN` bei fremder Rolle) — die Prüfung erfolgt manuell über die
  bestehende `ProjectRolePolicy`, da das deklarative `RequireProjectRole`-Attribut eine vom
  URL-Segment abhängige Rolle nicht ausdrücken kann.
- Optionales `expectedVersion` im Request: weicht es von der aktuellen Version ab, liefert die API
  `409 Conflict` mit `{"error":"ASSESSMENT_MODIFIED","modifiedBy":"...","modifiedAt":"..."}` statt
  zu überschreiben; fehlt `expectedVersion`, wird ohne Konfliktprüfung gespeichert (Last-Write-Wins).
- `GET /api/v1/stakeholders/{id}/assessments` (neu): liefert je perspektiv-tragender Rolle
  (`PL`/`Coreteam`/`Architect`) einen Eintrag — `status: "ASSESSED"` inkl. Werten, `"NOT_ASSESSED"`
  bei zugewiesener aber noch nicht bewertender Rolle, `"NO_ROLE_ASSIGNED"` bei aktuell keinem
  zugewiesenen Nutzer dieser Rolle im Projekt. Rolle `User` erhält (noch) keine eingeschränkte
  Sicht — das folgt erst mit US-030.
- Neue Application Services `UpsertStakeholderAssessmentService`, `GetStakeholderAssessmentsQuery`.
- Tests: dedizierter Story-Test `US028_AssessmentApiTests` (7 Facts, Testcontainers-PostgreSQL),
  `UpsertStakeholderAssessmentServiceTests`/`GetStakeholderAssessmentsQueryTests` (Application).
- Smoke-Test: isolierter `docker compose up --build` — Erstanlage, fremde Rolle (`403`), veraltete
  Version (`409`), `GET` mit `NO_ROLE_ASSIGNED` — End-to-End über die REST-API verifiziert.

### US-027 — StakeholderAssessment-Aggregate (Domain Model, Invarianten)

- `StakeholderAssessment.Create(stakeholderId, role, influence, interest, notes, updatedBy)` neu:
  akzeptiert für `role` ausschließlich `PL`/`Coreteam`/`Architect` (`InvalidAssessmentRoleError`
  bei `User`); `influence`/`interest` werden intern als `Score`-Value-Objects (0–100,
  Wiederverwendung US-002) validiert (`InvalidScoreRangeError`).
- `StakeholderAssessment.Update(influence, interest, notes, updatedBy, expectedVersion)` neu:
  aktualisiert Werte + `updated_by`/`updated_at`, erhöht `Version` (optimistisches Locking) —
  wirft `StaleAssessmentError`, wenn `expectedVersion` nicht der aktuellen `Version` entspricht
  (Grundlage für die Konfliktwarnung in US-028).
- Neues Repository-Interface `IStakeholderAssessmentRepository`
  (`FindByStakeholderAndRoleAsync`/`FindAllByStakeholderAsync`/`SaveAsync`) + EF-Core-
  Implementierung; der Unique-Index (`stakeholder_id`, `role`) aus US-003 wird von einem
  Integrationstest gegen eine echte Testcontainers-PostgreSQL-Instanz verifiziert.
- Domain-only Story (kein API-/UI-Anteil) — `Version` als EF-Core-`IsConcurrencyToken()` (seit
  US-003/ADR-0002) bleibt als zusätzliche DB-seitige Absicherung neben der domain-eigenen
  `expectedVersion`-Prüfung bestehen.
- Tests: dedizierter Story-Test `US027_AssessmentAggregateTests`, erweiterte
  `StakeholderAssessmentTests` (Domain).
- Smoke-Test: `dotnet test` (gesamte Solution) grün; isolierter `docker compose up` verifiziert,
  dass die neue DI-Registrierung den API-Start nicht bricht.

### US-026 — Stakeholder-Detailseite Shell (S4)

- `GET /api/v1/stakeholders/{id}` (neu) liefert einen einzelnen Stakeholder für alle vier
  Projektrollen (Lesezugriff, Bearbeiten bleibt unverändert über den seit US-022 rollen-
  beschränkten `PATCH`-Endpoint) — `404`, wenn nicht vorhanden oder soft-gelöscht (konsistent mit
  US-022/US-023).
- Neuer Application Service `GetStakeholderService`.
- **Frontend**: neue Route `/projects/:id/stakeholders/:stakeholderId` mit
  `StakeholderDetailComponent` — Kopfbereich (Name, Typ, Organisation, „zuletzt geändert von/am“),
  Stammdaten-Bereich mit allen F1.1-Feldern (editierbar nur für `PL`/`Coreteam`/`Architect` über
  die bestehende `EditStakeholderFormComponent` aus US-022, sonst read-only), CTA „Löschen“ nur
  für `PL` über die bestehende `DeleteStakeholderDialogComponent` aus US-023 (navigiert nach
  Erfolg zurück zur Liste), sowie Platzhalter-Slots für „Kommunikationszuordnungen“ (US-040) und
  „Assessment“ (US-029). Ein `404` zeigt eine „Nicht gefunden“-Ansicht. `StakeholderListComponent`
  verlinkt den Namen jedes aktiven Eintrags auf die Detailseite.
- Tests: dedizierter Story-Test `US026_StakeholderDetailShellTests` (Testcontainers-PostgreSQL),
  `GetStakeholderServiceTests` (Application), neue `stakeholder-detail.component.spec.ts`.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Detailseite laden,
  soft-löschen, erneuter Aufruf liefert `404` — End-to-End über die REST-API verifiziert.

### US-024 — Stakeholder Wiederherstellen & Papierkorb-Ansicht: API + UI (S3.x)

- `GET /api/v1/projects/{projectId}/stakeholders?deleted=true` liefert ausschließlich
  soft-gelöschte Stakeholder inkl. `deletedAt`/`deletedByName` — derselbe Endpoint wie die
  Standardliste (US-025), zusätzlich ausschließlich für Rolle `PL` erreichbar (sonst `403`); eine
  query-parameterabhängige Rolleneinschränkung kann das deklarative `RequireProjectRole`-Attribut
  nicht ausdrücken, daher eine zusätzliche manuelle Prüfung über die framework-freie
  `ProjectRolePolicy` direkt im Controller.
- `POST /api/v1/stakeholders/{id}/restore` (nur Rolle `PL`, idempotent) setzt `deleted_at`/
  `deleted_by` zurück auf `null` — nutzt die bereits seit US-020 vorhandene
  `Stakeholder.Restore()`-Domainmethode.
- Neue Application Services `RestoreStakeholderService` und `DeletedStakeholdersQuery` (letzterer
  nutzt bewusst direkt `IStakeholderRepository.FindDeletedByProjectAsync` statt eines eigenen
  Domain-/Infrastructure-Read-Modell-Ports — die Abfrage ist ein einfacher Filter, den das
  bestehende Repository-Interface bereits abdeckt).
- `StakeholderResponse` um `deletedAt`/`deletedByName` erweitert (bei aktiven Stakeholdern stets
  `null`) — derselbe einheitliche Response-Contract wie Anlegen/Bearbeiten/Liste (US-025).
- **Frontend**: `StakeholderListComponent` erhält einen Umschalter „Gelöschte anzeigen“
  (ausschließlich für Rolle `PL` sichtbar), der bei Aktivierung die Papierkorb-Ansicht lädt —
  Zeilen ausgegraut mit Badge „Gelöscht am [Datum] von [Name]“ und „Wiederherstellen“-Button statt
  Bearbeiten/Löschen; Anlage-Formular ist in diesem Modus ausgeblendet. Restore aktualisiert die
  Liste ohne vollständigen Reload.
- Tests: dedizierter Story-Test `US024_StakeholderWiederherstellenTests` (Testcontainers-
  PostgreSQL), `RestoreStakeholderServiceTests`/`DeletedStakeholdersQueryTests` (Application),
  erweiterte `stakeholder-list.component.spec.ts` (Toggle-Sichtbarkeit, Restore-Aufruf).
- **Anmerkung**: Akzeptanzkriterium 5 (Wiederauftauchen in einer gespeicherten
  Verteilerlisten-Filterkombination) referenziert US-041, das noch nicht existiert (weit spätere
  Phase) — analog zur bereits in US-023 dokumentierten Abweichung nur die Standardliste geprüft;
  der US-041-Teil wird erneut verifiziert, sobald diese Story entsteht.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, löschen, Papierkorb-
  Ansicht (nur PL, `403` für Rolle `User`), Wiederherstellen, erneutes Erscheinen in der
  Standardliste — alle end-to-end über die REST-API verifiziert.

### US-025 — Stakeholder-Liste mit Suche/Filter: API + UI inkl. Rollen-Sichtbarkeitsregel

- `GET /api/v1/projects/{projectId}/stakeholders` (bereits seit US-023 vorhanden) um
  `search`/`type`/`communicationTypeId`-Query-Parameter erweitert. `search` filtert
  case-insensitiv über Name und Organisation; `type` schränkt auf `Person`/`Organization` ein
  (ungültiger Wert wird ignoriert statt `400`); `communicationTypeId` joint gegen
  `stakeholder_communication_assignments` (Backend bereits vollständig, UI-Optionsliste folgt
  erst mit US-037, siehe Anmerkungen).
- Neues Read-Modell `IStakeholderListQuery` (`SlobSteak.Domain.Stakeholders`, EF-Core-
  Implementierung in `SlobSteak.Infrastructure`).
- Response-Contract der Liste vereinheitlicht: liefert jetzt denselben `StakeholderResponse` wie
  Anlegen/Bearbeiten (inkl. aufgelöstem `updatedByName`) statt eines eigenen schlankeren DTOs.
- **Frontend-Refactor**: `CreateStakeholderFormComponent` (US-021) ist jetzt ein reines
  Anlage-Formular (`@Output() created`, kein eigener session-lokaler Listenzustand mehr). Neue
  `StakeholderListComponent` — Standard-Landingtab-Inhalt der Workspace-Shell (US-019, löst
  `CreateStakeholderFormComponent` als direkten Tab-Inhalt ab) — lädt die Liste serverseitig mit
  Such-/Typ-Filter, bettet das Anlage-Formular sowie `EditStakeholderFormComponent`/
  `DeleteStakeholderDialogComponent` (US-022/US-023) ein und lädt nach jeder Änderung neu.
- Tests: dedizierter Story-Test `US025_StakeholderListeTests` (4 Facts über echte
  Testcontainers-PostgreSQL), erweiterte `ListStakeholdersServiceTests` (3 Fälle),
  `stakeholder-list.component.spec.ts` (8 Fälle), `create-stakeholder-form.component.spec.ts`
  neu geschrieben für das vereinfachte Formular (9 Fälle).
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Suche nach
  Teilstring, Typ-Filter, leeres Suchergebnis — alle end-to-end verifiziert; `/projects/:id/
  stakeholders` liefert die neue Listenansicht über den nginx-Proxy.

### US-023 — Stakeholder Soft-Delete: API + UI

- Neue Endpunkte `DELETE /api/v1/stakeholders/{id}` (nur Rolle `PL`, idempotent — erneutes
  `DELETE` auf einen bereits gelöschten Stakeholder liefert weiterhin `200 OK` ohne
  `deleted_at` zu ändern) und `GET /api/v1/stakeholders/{id}/deletion-impact` (Anzahl betroffener
  Assessments/Kommunikationszuordnungen für den Bestätigungsdialog).
- Neue Endpoint `GET /api/v1/projects/{projectId}/stakeholders` (Standardliste, alle vier
  Projektrollen) — bisher fehlte diese Liste; notwendige Infrastruktur, damit AC4 (gelöschte
  Stakeholder verschwinden aus Standardansichten) prüfbar ist. Map-Query (US-031) und
  Verteilerlisten-Filter (US-041) existieren noch nicht und werden dort nachgezogen (siehe
  Anmerkungen der Story-Datei).
- Neue `SoftDeleteStakeholderService`/`ListStakeholdersService`; `IStakeholderRepository` um
  `GetDeletionImpactAsync` ergänzt (zählt `stakeholder_assessments`/
  `stakeholder_communication_assignments`, reines Read-Modell wie bei früheren
  Skeleton-Tabellen-Zugriffen).
- `DELETE`/`deletion-impact` nutzen denselben `StakeholderProjectRoleAuthorizationHandler` aus
  US-022 — keine neue Authorization-Infrastruktur nötig.
- Neue Angular-Komponente `DeleteStakeholderDialogComponent` — „Löschen“-Aktion je Zeile der
  session-lokalen Liste, lädt beim Öffnen die Impact-Zahlen und zeigt sie im
  Bestätigungsdialog an.
- Tests: `SoftDeleteStakeholderServiceTests`/`ListStakeholdersServiceTests` (Application.Tests,
  9 Fälle), dedizierter Story-Test `US023_StakeholderSoftDeleteTests` (8 Facts/Theories über
  echte Testcontainers-PostgreSQL, inkl. physischer Integritätsprüfung der Assessment-/
  Kommunikationszuordnungs-Zeilen), ergänzend `StakeholderController_DeleteTests` (4 Fälle),
  `delete-stakeholder-dialog.component.spec.ts` (6 Fälle), 3 ergänzende Fälle in
  `create-stakeholder-form.component.spec.ts`.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, Impact-Check (`200`,
  Zählwerte), Löschen (`200`), Standardliste zeigt ihn danach nicht mehr, erneutes Löschen
  bleibt idempotent (`200`).

### US-022 — Stakeholder-Stammdaten bearbeiten: API + UI inkl. Änderungsverlauf

- Neuer Endpoint `PATCH /api/v1/stakeholders/{id}` — nur für `PL`/`Coreteam`/`Architect`, `403`
  für `User`, `404` für nicht existierende oder bereits soft-gelöschte Stakeholder. Änderungen
  sind ohne Freigabeprozess sofort persistiert (kein Draft-/Approval-Zustand).
- Neuer `UpdateStakeholderDetailsService`; `StakeholderResponse` um `updatedByName`/`updatedAt`
  erweitert (auch `CreateStakeholderService` aus US-021 löst den anlegenden Nutzer jetzt für
  einen konsistenten Response-Contract auf).
- Neuer `StakeholderProjectRoleAuthorizationHandler` — zweiter Handler für dieselbe
  `ProjectRoleRequirement` aus US-007, löst das Projekt über die Stakeholder-Id statt eines
  `projectId`-Routensegments auf (siehe ADR-0007). `IStakeholderRepository`-Zugriff bewusst mit
  `includeDeleted: true`, damit autorisierte Nutzer für gelöschte Stakeholder den korrekten `404`
  aus der Application-Schicht erhalten statt eines irreführenden `403`.
- Neue Angular-Komponente `EditStakeholderFormComponent` — „Bearbeiten“-Aktion je Zeile der
  session-lokalen Liste aus US-021, zeigt „Zuletzt geändert von [Name] am [Datum]“ im Kopfbereich
  (Stakeholder-Detailseite mit derselben Anzeige folgt erst mit US-026).
- Tests: `UpdateStakeholderDetailsServiceTests` (Application.Tests, 4 Fälle), dedizierter
  Story-Test `US022_StakeholderBearbeitenTests` (8 Facts/Theories über echte
  Testcontainers-PostgreSQL), `edit-stakeholder-form.component.spec.ts` (7 Fälle), 3 ergänzende
  Fälle in `create-stakeholder-form.component.spec.ts` für die Bearbeiten-Integration.
- Smoke-Test: isolierter `docker compose up --build` — Stakeholder anlegen, per `PATCH`
  aktualisieren (`200`, `updatedByName`/`updatedAt` korrekt), Rolle `User` erhält `403`.

### US-021 — Stakeholder anlegen: API + Formular-UI

- Neuer Endpoint `POST /api/v1/projects/{projectId}/stakeholders` — nur für Rollen `PL`,
  `Coreteam`, `Architect` erreichbar (`RequireProjectRoleAttribute`, erster echter Einsatz seit
  US-007), `403` für Rolle `User`. `400` mit `{"error":"NAME_REQUIRED"}`/
  `{"error":"INVALID_EMAIL_FORMAT"}`/`{"error":"INVALID_TYPE"}` bei ungültigen Eingaben.
  Namensduplikat im Projekt blockiert nicht, liefert aber zusätzlich
  `similarStakeholderWarning` mit Name/ID des Treffers (F1.1 Edge Case).
- Neuer `CreateStakeholderService` (Application) sowie `IStakeholderRepository.
  FindSimilarNameInProjectAsync` (ergänzt US-020; `ExistsSimilarNameInProjectAsync` delegiert
  jetzt intern daran).
- Neue Angular-Seite `CreateStakeholderFormComponent` — ersetzt den bisherigen Platzhalter im
  Standard-Landingtab „Stakeholder-Liste“ der Projekt-Workspace-Shell (US-019). Formular mit allen
  Stammdatenfeldern, Speichern-Button bei ungültigem E-Mail-Format deaktiviert, `position`
  ausgeblendet bei `type = Organization`; neu angelegte Stakeholder erscheinen sofort in einer
  session-lokalen Liste unterhalb des Formulars (eine serverseitig geladene Liste mit
  Suche/Filter folgt erst mit US-025).
- Tests: `CreateStakeholderServiceTests` (Application.Tests, 4 Fälle), dedizierter Story-Test
  `US021_StakeholderAnlegenTests` (8 Facts/Theories über echte Testcontainers-PostgreSQL),
  ergänzend `StakeholderController_CreateTests` (5 Fälle, Response-Contract/Randfälle),
  `create-stakeholder-form.component.spec.ts` (7 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Stakeholder als PL
  anlegen (201), Namensduplikat liefert Warnung, Rolle `User` erhält 403;
  `/projects/:id/stakeholders` wird von der SPA ausgeliefert.

### US-020 — Stakeholder-Aggregate (Domain Model, Invarianten)

- `Stakeholder` (Domain-Skeleton seit US-003) um die volle Aggregate-Logik erweitert: `Create`
  (wirft `StakeholderNameRequiredError` bei leerem Namen, `InvalidEmailFormatError` bei
  ungültigem, aber gesetztem `email`), `UpdateDetails`, `SoftDelete` (idempotent — mehrfacher
  Aufruf ändert `deleted_at` nicht erneut), `Restore`, `IsDeleted`. Neue Exception
  `StakeholderNameRequiredError`.
- Neues Repository-Interface `IStakeholderRepository`
  (`FindByIdAsync`/`FindActiveByProjectAsync`/`FindDeletedByProjectAsync`/`SaveAsync`/
  `ExistsSimilarNameInProjectAsync`) mit EF-Core-Implementierung gegen die seit US-003 migrierte
  `stakeholders`-Tabelle — keine neue Migration nötig.
  `ExistsSimilarNameInProjectAsync` vergleicht case-insensitiv und bezieht bewusst
  soft-gelöschte Datensätze mit ein (PRD Abschnitt 4.3: Hinweis auf bereits gelöschten, ähnlich
  benannten Stakeholder beim Anlegen).
- Tests: `StakeholderTests` (Domain.Tests, 13 Fälle), dedizierter Story-Test
  `US020_StakeholderAggregateTests` (8 Facts, davon AC8 als Integrationstest gegen echte
  Testcontainers-PostgreSQL).
- Reine Domain-/Infrastructure-Story ohne neuen API-Endpoint oder UI — Smoke-Test beschränkt sich
  auf die Regressionsprüfung, dass `docker-compose up` weiterhin fehlerfrei startet.

### US-019 — Projekt-Workspace-Shell mit Tab-Navigation (S3)

- Neuer Endpoint `GET /api/v1/projects/{projectId}` (im bestehenden `ProjectController` aus
  US-018) liefert Projektname und eigene Rolle für Header/Rollen-Badge; `404` ohne eigene
  Mitgliedschaft (auch für Systemadmins ohne eigene Zuweisung, PRD Abschnitt 2.3).
- Neue Angular-Seite `ProjectWorkspaceLayoutComponent` (`/projects/:id`): Header mit Projektname
  und Rollen-Badge, Tab-Navigation Stakeholder-Liste (Standard-Landingtab, alle Rollen) / Map
  (ausgeblendet für `User`) / Verteiler (nur `PL`/`Coreteam`) — mit Platzhalter-Inhalten, bis die
  jeweiligen Feature-Stories (US-025/US-032/US-042) landen.
- Neue Guard-Fabrik `roleGuard(allowedRoles)` (`frontend/src/app/core/guards/role.guard.ts`):
  sperrt sowohl die Mitgliedschaftsprüfung auf `/projects/:id` selbst als auch die engeren
  Tab-Routen; leitet bei fehlender Berechtigung oder fehlender Mitgliedschaft auf eine neue
  „Kein Zugriff“-Ansicht um (`AccessDeniedComponent`).
- Tests: dedizierter Story-Test `US019_ProjektWorkspaceShellTests` (2 Fälle, echte
  Testcontainers-PostgreSQL, deckt das neue Backend-Fundament ab), `role.guard.spec.ts`
  (5 Fälle), `project-workspace-layout.component.spec.ts` (6 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Projekt anlegen,
  sich selbst mit Rolle `User` zuweisen, `GET /api/v1/projects/{id}` liefert Name/Rolle korrekt;
  `/projects/:id` wird von der SPA ausgeliefert.

### US-018 — Projektübersicht-Screen (S2)

- Neuer Endpoint `GET /api/v1/projects` (jeder angemeldete Nutzer, nicht nur Systemadmins)
  liefert ausschließlich Projekte mit eigener `ProjectMembership`, jeweils mit `role` und
  `stakeholderCount`. Implementiert als reines Read-Modell (`IProjectOverviewQuery` in
  `SlobSteak.Domain.Projects`, EF-Core-Query-Implementierung in `SlobSteak.Infrastructure`) statt
  über `IProjectRepository` — die Stakeholder-Zählung liest direkt (und ohne eigenes Repository)
  aus dem seit US-003 migrierten `Stakeholders`-DbSet (`DeletedAt == null`).
- Neue Angular-Seite `ProjectOverviewComponent` (`/projects`, geschützt durch neuen `authGuard`
  statt `adminGuard` — jede gültige Session reicht): Kartenübersicht der eigenen Projekte mit
  Rolle und Stakeholder-Anzahl; für Systemadmins zusätzlich Tab „Alle Projekte“ (fragt das
  bestehende `GET /api/v1/admin/projects` aus US-017 ab) und CTA „Neues Projekt“ (navigiert zur
  bestehenden Projektanlage `/admin/projects`); Leerzustand-Meldung ohne Projektzuweisung.
- Tests: dedizierter Story-Test `US018_ProjektuebersichtUiTests` (3 Fälle, echte
  Testcontainers-PostgreSQL), `auth.guard.spec.ts` (2 Fälle),
  `project-overview.component.spec.ts` (6 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports — Login,
  Passwortänderung, Projekt anlegen, sich selbst zuweisen, `GET /api/v1/projects` liefert Name,
  Rolle und Stakeholder-Anzahl; `/projects` wird korrekt von der SPA ausgeliefert.

### US-017 — Admin-Bereich UI: Projektverwaltung & Mitgliederzuweisung

- Neuer Endpoint `GET /api/v1/admin/projects` (nur `SystemAdmin`-Policy) liefert Name, Status und
  Mitgliederzahl je Projekt — ergänzt `ListProjectsService`; `IProjectRepository.FindAllAsync`
  lädt jetzt zusätzlich `Include(p => p.Memberships)`, sonst wäre `memberCount` immer `0` gewesen.
- Neuer Endpoint `GET /api/v1/admin/projects/{projectId}/memberships` liefert die Mitgliedschaften
  eines Projekts inklusive aufgelöstem Nutzernamen/E-Mail — ergänzt `ListProjectMembershipsService`
  (führt `Project.Memberships` und `IUserRepository` ausschließlich in der Application-Schicht
  zusammen, kein Cross-Aggregate-EF-Join).
- Neue Angular-Seite `ProjectsAdminComponent` (`/admin/projects`, geschützt durch `adminGuard`):
  Projektliste mit Name/Status/Mitgliederzahl, Formular „Projekt anlegen“. Ausgelagerte
  `ProjectMembershipManagerComponent` je ausgewähltem Projekt: Dropdown zur Auswahl eines noch
  nicht zugewiesenen Nutzers + Rollen-Select zum Hinzufügen, Rollen-Select je Zeile zur Änderung,
  „Entfernen“-Aktion mit Bestätigungsdialog.
- Tests: `ListProjectsServiceTests`/`ListProjectMembershipsServiceTests` (Application.Tests,
  gemockt), dedizierter Story-Test `US017_AdminUiProjektverwaltungTests` (5 Fälle, echte
  Testcontainers-PostgreSQL), `projects-admin.component.spec.ts` (4 Fälle),
  `project-membership-manager.component.spec.ts` (7 Fälle).
- Smoke-Test: isolierter `docker compose up --build` auf alternativen Ports (5433/5001/4201, um
  die parallel laufende lokale Entwicklungsumgebung nicht zu stören) → Login, Passwortänderung,
  Projekt anlegen, Nutzer anlegen, Mitgliedschaft zuweisen/ändern/entfernen — alle Akzeptanz-
  kriterien end-to-end gegen die echten Endpunkte verifiziert; `/admin/projects` wird korrekt von
  der SPA ausgeliefert.

### Chore — Fix: `docker-compose.ghcr.yml` fehlten SEED_ADMIN_*/JWT_SIGNING_KEY

- `docker-compose.ghcr.yml` (GHCR-Image-Variante, siehe US-003-Changelog-Eintrag) erhielt nie die
  in US-005 (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) und US-006 (`JWT_SIGNING_KEY`) zu
  `docker-compose.yml` hinzugefügten Umgebungsvariablen — dadurch stürzte der `api`-Container beim
  allerersten Start (leere `users`-Tabelle) mit einer unbehandelten
  `SeedAdminConfigurationMissingException` ab. Beide Compose-Dateien sind jetzt wieder identisch
  konfiguriert (gleiche Dev-Defaults).
- Gefunden durch manuellen Nutzertest von US-016 gegen `docker-compose.ghcr.yml`.

### US-016 — Admin-Bereich UI: Nutzerverwaltung

- Neuer Endpoint `GET /api/v1/admin/users` (nur `SystemAdmin`-Policy) — Voraussetzung für die
  Nutzerliste, ergänzt `IUserRepository.FindAllAsync` und `ListUsersService`.
- Neue Angular-Seite `UsersAdminComponent` (`/admin/users`, geschützt durch neuen `adminGuard`):
  Nutzerliste, Formular „Nutzer anlegen“ (Inline-Fehler bei `409 EMAIL_ALREADY_IN_USE`),
  „Passwort zurücksetzen“-Aktion je Zeile mit Erfolgsbestätigung.
- `TokenStorageService.getClaims()` liest `isSystemAdmin` aus dem gespeicherten JWT für die
  clientseitige Sichtbarkeitssteuerung (rein UX, serverseitige `SystemAdmin`-Policy bleibt
  maßgeblich).
- Tests: `users-admin.component.spec.ts` (5 Fälle), `admin.guard.spec.ts` (3 Fälle), Backend-Tests
  für den neuen `GET`-Endpoint.
- Smoke-Test: `docker compose up --build db api frontend` → Login über den nginx-Proxy →
  `GET /api/v1/admin/users` liefert die Nutzerliste; `/admin/users` wird von der SPA ausgeliefert.

### US-015 — Admin-API: Nutzer-Projekt-Zuweisung mit Rolle

- Neue Endpunkte am `AdminProjectMembershipController`
  (`api/v1/admin/projects/{projectId}/memberships`): `POST` (Zuweisung, `201`, `409` bei
  Duplikat mit `{"error":"MEMBERSHIP_ALREADY_EXISTS"}`), `PATCH .../{userId}` (Rollenwechsel,
  `200`), `DELETE .../{userId}` (Entzug, `204`) — alle nur für Systemadmins.
- Neuer `AssignProjectMembershipService` orchestriert `Project.AssignMember`/`ChangeMemberRole`/
  `RemoveMember` (US-011).
- Tests: `AssignProjectMembershipServiceTests` (Application.Tests, gemockt), dedizierter
  Story-Test `US015_AdminNutzerZuweisungTests` (inkl. Nachweis, dass `stakeholder_assessments`
  beim Entzug einer Mitgliedschaft unverändert bleiben).
- Smoke-Test: `docker compose up --build db api` → Projekt + Nutzer anlegen → Zuweisen (`201`) →
  Rolle ändern (`200`) → Entziehen (`204`).

### US-014 — Admin-API: Projekt anlegen

- Neuer Endpoint `POST /api/v1/admin/projects` (`AdminProjectController`, nur `SystemAdmin`-Policy):
  legt über den neuen `CreateProjectService` ein Projekt mit Status `active` an.
- `400 Bad Request` bei leerem/nur-Leerzeichen-Namen (DTO-Validierung + Domain-Fallback via
  `ProjectNameRequiredError`).
- Tests: `CreateProjectServiceTests` (Application.Tests, gemockt), dedizierter Story-Test
  `US014_AdminProjektAnlegenTests`.
- Smoke-Test: `docker compose up --build db api` → Projekt anlegen (`201`, `status: "Active"`) →
  leerer Name liefert `400`.

### US-013 — Admin-API: Passwort-Reset für Nutzer

- Neuer Endpoint `POST /api/v1/admin/users/{userId}/reset-password` (`AdminUserController`, nur
  `SystemAdmin`-Policy): setzt über den neuen `ResetPasswordService` ein temporäres Passwort und
  `must_change_password = true`. `404` bei unbekannter `userId`.
- Neue Domain-Methode `User.ResetPassword(...)` — im Unterschied zu `ChangePassword` (US-004)
  erzwingt sie einen Passwortwechsel beim nächsten Login, statt ihn aufzuheben.
- Tests: `UserResetPasswordTests` (Domain.Tests), `ResetPasswordServiceTests` (Application.Tests,
  gemockt), dedizierter Story-Test `US013_AdminPasswortResetTests` (inkl. Nachweis, dass der
  betroffene Nutzer beim nächsten Login `mustChangePassword: true` erhält).
- Smoke-Test: `docker compose up --build db api` → Nutzer anlegen → Passwort zurücksetzen (`200`)
  → Login mit temporärem Passwort liefert `mustChangePassword: true` → Reset für unbekannte
  `userId` liefert `404`.

### US-012 — Admin-API: Nutzer anlegen

- Neuer Endpoint `POST /api/v1/admin/users` (`AdminUserController`, nur `SystemAdmin`-Policy):
  legt über den neuen `CreateUserService` ein Nutzerkonto an (`must_change_password = true`),
  liefert `201 Created` ohne Passwort-Hash im Response-Body.
- `409 Conflict` mit `{"error":"EMAIL_ALREADY_IN_USE"}` bei bereits vergebener E-Mail — sowohl
  proaktiv (`ExistsByEmailAsync`) als auch bei parallelem Zugriff über eine neue
  Unique-Constraint-Übersetzung in `UserRepository.SaveAsync` (analog zu `ProjectRepository`,
  ADR-0006).
- Tests: `CreateUserServiceTests` (Application.Tests, gemockt), `AdminUserControllerTests`
  (Response-Contract/Validierung) sowie dedizierter Story-Test `US012_AdminNutzerAnlegenTests`.
- Smoke-Test: `docker compose up --build db api` → Login, Passwort ändern, Nutzer anlegen (`201`),
  Duplikat-E-Mail (`409`) — alle wie erwartet.

### US-009 — Login-Screen UI (S1)

- Neuer Login-Screen (`LoginPageComponent`, standalone, reaktives Formular): E-Mail/Passwort,
  Submit deaktiviert solange eines der Felder leer ist, nicht-blockierende Fehlermeldung „E-Mail
  oder Passwort ist falsch.“ bei `401` (Passwortfeld wird geleert).
- Bei erfolgreichem Login mit `mustChangePassword` navigiert die Seite zunächst zum in US-008
  gebauten `PasswordChangeModalComponent`; danach bzw. sonst direkt zu `/projects` (Zielscreen
  folgt mit US-018).
- Neue Infrastruktur: `app.routes.ts` + `provideRouter`, `TokenStorageService` (Session-Token in
  `localStorage`), `authInterceptor` (hängt das Token an jeden Request an). `AuthService.login(...)`
  ergänzt.
- `frontend/nginx.conf`: Reverse-Proxy `/api/` → `api`-Container ergänzt, damit die relativen
  `/api/v1/...`-Aufrufe des Frontends in docker-compose tatsächlich das Backend erreichen (nicht
  von der SPA-Fallback-Route verschluckt werden).
- Tests: `login-page.component.spec.ts` (6 Fälle inkl. Erfolg, Fehlerfall, Modal-Übergabe),
  `app.spec.ts` angepasst (Router-Provider für `<router-outlet>`).
- Smoke-Test: `docker compose up --build db api frontend` → Login über
  `http://localhost:4200/api/v1/auth/login` liefert `200` (Proxy funktioniert).

### US-008 — Erzwungene Passwortänderung nach Erst-Login

- Neuer Endpoint `PATCH /api/v1/auth/password` (`AuthController`, authentifiziert): ändert das
  Passwort über den neuen Application Service `ChangePasswordService` und setzt
  `must_change_password` auf `false`.
- Neue globale `PasswordChangeRequiredMiddleware`: liefert `403` mit
  `{"error":"PASSWORD_CHANGE_REQUIRED"}` für jeden authentifizierten Request außerhalb
  `/api/v1/auth/*`, solange `must_change_password = true` — läuft nach Authentication, vor
  Authorization, unabhängig von der jeweiligen Endpoint-Policy.
- Frontend: `AuthService.changePassword(...)` und standalone `PasswordChangeModalComponent`
  (`frontend/src/app/features/auth/`), reaktives Formular mit Mindestlänge 8; `provideHttpClient()`
  in `app.config.ts` ergänzt. Vollständige Einbettung folgt mit US-009 (siehe Anmerkungen in der
  Story-Datei).
- Tests: `ChangePasswordServiceTests` (Application.Tests, gemockt), dedizierter Story-Test
  `US008_PasswortAenderungErzwingenTests` (Api.Tests, gegen echte Testcontainers-PostgreSQL-
  Instanz) sowie `password-change-modal.component.spec.ts` (Karma/Jasmine).
- Smoke-Test: `docker compose up --build db api` → Login (`mustChangePassword:true`) → `GET
  /api/v1/health` mit Token liefert `403 PASSWORD_CHANGE_REQUIRED` → `PATCH .../password` liefert
  `200` → derselbe Health-Request liefert danach wieder `200`.

### US-007 — Rollenbasierte Authorization-Middleware

- JWT-Bearer-Authentication registriert (`AddAuthentication().AddJwtBearer(...)`, `MapInboundClaims
  = false`); Requests ohne gültiges Token liefern jetzt `401 Unauthorized`, bevor Authorization
  greift.
- Zwei Policies: `AuthorizationPolicies.SystemAdmin` (`SystemAdminRequirement`/
  `SystemAdminAuthorizationHandler`, prüft Claim `isSystemAdmin`) und die pro Action
  parametrisierte `ProjectRole`-Policy (`ProjectRoleRequirement`/`ProjectRoleAuthorizationHandler`,
  prüft `ProjectMembership.Role` — frisch aus der DB geladen, nicht aus dem Token, daher wirkt ein
  Rollenwechsel ohne Re-Login sofort). Deklaratives Binden über das neue
  `[RequireProjectRole(params ProjectRole[])]`-Attribut (`IAuthorizationRequirementData`, .NET 8).
- Neue framework-freie Regel-Engine `ProjectRolePolicy` (Application-Schicht).
- `JsonAuthorizationMiddlewareResultHandler`: formt 403-Antworten auf `{"error":"FORBIDDEN"}` um.
- Tests: `ProjectRolePolicyTests` (Application.Tests), `ProjectRoleAuthorizationHandlerTests`,
  `SystemAdminAuthorizationHandlerTests`, `RequireProjectRoleAttributeTests` (Api.Tests/
  Authorization) sowie dedizierter Story-Test `US007_AuthorizationMiddlewareTests` (eigenständiger
  `TestServer` mit zwei Test-Endpunkten, verifiziert 401/403 inkl. Body end-to-end über HTTP).
- `JwtSettings` (Api/Auth) fasst Issuer/Audience/Claim-Namen/Signierschlüssel-Konfigurationsschlüssel
  zusammen — von Token-Ausstellung (US-006) und -Validierung gemeinsam genutzt.

### US-011 — ProjectMembership-Entity mit Rollen-Invariante

- `Project` um Mitgliederverwaltung erweitert: `AssignMember(userId, role)`,
  `ChangeMemberRole(userId, newRole)`, `RemoveMember(userId)` sowie die neue Navigation
  `Project.Memberships` (Intra-Aggregate-EF-Navigation, siehe Anmerkungen in der Story-Datei).
- Neue domänenspezifische Exceptions `MembershipAlreadyExistsError`, `MembershipNotFoundError`.
- `ProjectMembershipConfiguration`: `OnDelete(DeleteBehavior.ClientCascade)` für die
  Project-Beziehung (statt `Restrict`) — Details und Begründung in `docs/adr/0006-*.md`.
- `ProjectRepository`: `FindByIdAsync` lädt jetzt inkl. `Memberships`; `SaveAsync` reconciled neue/
  entfernte Mitgliedschaften explizit (EF-Core-Workaround für client-generierte Guid-Schlüssel,
  siehe ADR-0006) und übersetzt eine Unique-Constraint-Verletzung bei parallelem Zugriff in
  `MembershipAlreadyExistsError`.
- Tests: `ProjectMembershipTests` (Domain.Tests) sowie dedizierter Story-Test
  `US011_ProjectMembershipTests` (Api.Tests, inkl. Integrationstests für Rollenwechsel,
  Unberührtheit von `stakeholder_assessments` bei Removal, und Unique-Constraint-Konflikt bei
  parallelem Insert über zwei unabhängige `DbContext`-Instanzen).
- Keine neue Migration nötig — die Navigation ist eine reine EF-seitige Mapping-Änderung, das
  Datenbankschema (inkl. `ON DELETE`-Klausel) bleibt unverändert.

### US-010 — Project-Aggregate (Domain Model)

- `Project`-Aggregate (`SlobSteak.Domain.Projects`) um DDD-Reichhaltigkeit erweitert:
  `Create(name, description)` (Status `Active`), `Archive()`, `Reactivate()`.
- Neue domänenspezifische Exception `ProjectNameRequiredError`.
- Repository-Interface `IProjectRepository` (`FindByIdAsync`, `SaveAsync`, `FindAllAsync`,
  `FindByMemberUserIdAsync`) in der Domain definiert; EF-Core-Implementierung `ProjectRepository`
  in `SlobSteak.Infrastructure/Persistence/Projects/`, per DI registriert.
- Tests: `ProjectTests` (Domain.Tests) sowie dedizierter Story-Test
  `US010_ProjectAggregateTests` (Api.Tests, inkl. Integrationstest gegen echte
  Testcontainers-PostgreSQL-Instanz für das Repository).
- Reihenfolge-Anmerkung: vorgezogen gegenüber der Phase-1-Story US-007, die transitiv von
  US-010/US-011 abhängt — Details in der Story-Datei unter „Anmerkungen des Dev-Agenten“.
- Keine Schemaänderung/neue Migration nötig — `projects`-Tabelle existiert bereits seit US-003.

### US-006 — Login-API mit Session/Token-Ausstellung

- Neuer Endpoint `POST /api/v1/auth/login` (`AuthController`): prüft E-Mail/Passwort über den
  neuen Application Service `LoginService` und stellt bei Erfolg ein JWT (HMAC-SHA256, Claims
  `sub`/`isSystemAdmin`, 8 Stunden gültig) aus. Wire-Contract camelCase: `{"token": "...",
  "mustChangePassword": true}`.
- Falsches Passwort oder unbekannte E-Mail liefern identisch `401 Unauthorized` mit
  `{"error":"INVALID_CREDENTIALS"}` (kein Hinweis, ob die E-Mail existiert); fehlende Pflichtfelder
  liefern `400 Bad Request` (Validierung über `LoginRequest`-DTO mit Data Annotations).
- Neuer Port `IJwtTokenGenerator` (`SlobSteak.Application.Identity`), Implementierung
  `JwtTokenGenerator` in der Composition Root `SlobSteak.Api` (`System.IdentityModel.Tokens.Jwt`) —
  Begründung für JWT statt serverseitiger Session in `docs/adr/0005-*.md`.
- `docker-compose.yml`: `JWT_SIGNING_KEY` mit Dev-Default ergänzt; Login-Endpoint per manuellem
  Smoke-Test verifiziert (`curl` gegen `docker compose up --build db api`).
- Tests: `LoginServiceTests` (Application.Tests, gemockt), `AuthControllerTests` (Api.Tests,
  Token-Claims/JSON-Casing) sowie dedizierter Story-Test `US006_LoginApiTests`.
- `src/SlobSteak.Api/SlobSteak.Api.http` von der `dotnet new webapi`-Platzhalterdatei auf reale
  Health-Check-/Login-Beispiele aktualisiert.

### US-005 — Seed-Admin-Bootstrap beim Erststart

- Neuer Application Service `SeedAdminService` (`SlobSteak.Application.Identity`): legt beim
  Hoststart ein initiales System-Administrator-Konto aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
  an, sofern die `users`-Tabelle noch leer ist; überspringt den Vorgang fehlerfrei, sobald
  mindestens ein Nutzer existiert; bricht mit `SeedAdminConfigurationMissingException` (klar
  geloggt) ab, wenn beide Variablen bei leerer Tabelle fehlen.
- Startup-Hook `SeedAdminHostedService` (`SlobSteak.Api.Bootstrap`, `IHostedService`) ruft den
  Service beim echten Hoststart auf — registriert für Development/Production, bewusst nicht in der
  Testing-Hosting-Umgebung (siehe Anmerkungen in der Story-Datei).
- `User`-Aggregate um `CreateSystemAdmin(...)` erweitert (setzt `IsSystemAdmin = true`, analog zu
  `Create`); `IUserRepository` um `AnyAsync()` erweitert.
- `docker-compose.yml`: `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` mit Dev-Defaults ergänzt; per
  manuellem Smoke-Test verifiziert (Erststart erzeugt Admin, Neustart überspringt fehlerfrei).
- Tests: `SeedAdminServiceTests` (Application.Tests, gemocktes Repository) sowie dedizierter
  Story-Test `US005_SeedAdminTests` (Api.Tests, je Akzeptanzkriterium eine eigene, isolierte
  Testcontainers-PostgreSQL-Instanz).

### US-004 — User-Aggregate (Domain Model)

- `User`-Aggregate (`SlobSteak.Domain.Identity`) um DDD-Reichhaltigkeit erweitert: statische
  Factory-Methode `Create(name, email, plainPassword)` (gehashtes Passwort, `MustChangePassword =
  true`, `IsSystemAdmin = false`), `ChangePassword(newPlainPassword)`, `VerifyPassword(plainPassword)`.
- Neue domänenspezifische Exception `PasswordTooShortError` (Mindestlänge 8 Zeichen), Wiederverwendung
  von `InvalidEmailFormatError` aus US-002 für die E-Mail-Validierung in `Create`.
- Passwort-Hashing über PBKDF2-HMACSHA256 (.NET-BCL, keine neue NuGet-Abhängigkeit) in der intern
  gekapselten Hilfsklasse `PasswordHasher` — siehe `docs/adr/0004-passwort-hashing-pbkdf2.md` für die
  Begründung der Algorithmuswahl.
- Repository-Interface `IUserRepository` (`FindByIdAsync`, `FindByEmailAsync`, `SaveAsync`,
  `ExistsByEmailAsync`) in der Domain definiert; EF-Core-Implementierung `UserRepository` in
  `SlobSteak.Infrastructure/Persistence/Identity/` gegen die `users`-Tabelle, per DI registriert.
- Unit-Tests (`tests/SlobSteak.Domain.Tests/Identity/UserTests.cs`) sowie dedizierter Story-Test
  (`tests/SlobSteak.Api.Tests/UserStories/US004_UserAggregateTests.cs`, ein Fact je Akzeptanzkriterium,
  inkl. Integrationstest des Repositorys gegen eine echte Testcontainers-PostgreSQL-Instanz) ergänzt.
- Keine Schemaänderung/neue Migration nötig — `users`-Tabelle und `password_hash`-Spalte existieren
  bereits seit US-003.

### Chore — CI/CD: GitHub Auto-Merge für Story-PRs (ADR-0003)

- `main` erhält eine Branch-Protection-Regel mit den sechs `pr-checks.yml`-Jobs als Required
  Status Checks (strict) sowie `enforce_admins`, `allow_force_pushes: false`,
  `allow_deletions: false` — Voraussetzung dafür, dass Auto-Merge tatsächlich auf grüne CI wartet.
- CLAUDE.md Abschnitt 3.5 ergänzt eine verbindliche Auto-Merge-Regel: Story-PRs werden mit
  aktiviertem GitHub-Auto-Merge (Squash) erstellt und mergen automatisch, sobald alle sechs
  Required Status Checks grün sind — die bisherige „Merge erfolgt nicht automatisch“-Klausel
  entfällt; die DoD-Checkliste (Abschnitt 3.3) markiert die Story bereits mit PR-Eröffnung als
  abgeschlossen.
- README.md „PR-Checks / Required Status Checks“ aktualisiert: Branch-Protection ist jetzt
  tatsächlich konfiguriert, nicht mehr nur empfohlen.
- Siehe `docs/adr/0003-github-auto-merge-fuer-story-prs.md` für Kontext, Entscheidung und
  bewusst in Kauf genommenen Trade-off (kein menschliches Review mehr als Merge-Voraussetzung).

### Chore — CI: automatische Pull-Request-Prüfpipeline

- Neuer GitHub-Actions-Workflow `.github/workflows/pr-checks.yml`: läuft bei jedem Pull Request
  auf `main`/`master` und bildet den aktuellen Technologiestack als sechs eigenständige,
  klar benannte Jobs ab — `Backend: Build (Release)`, `Backend: Tests (dotnet test)`,
  `Backend: Code-Format (dotnet format)`, `Frontend: Build`, `Frontend: Lint (ng lint)`,
  `Frontend: Tests (ng test)` — geeignet als „Required Status Checks“ in den Branch-Protection-
  Regeln.
- Backend-Jobs: .NET 8 SDK, `dotnet restore`/`build --configuration Release`, `dotnet test`
  gegen die gesamte Solution (inkl. Testcontainers-PostgreSQL-Integrationstests) mit
  TRX-Testreport (`dorny/test-reporter`) und Artefakt-Upload, `dotnet format --verify-no-changes`.
- Frontend-Jobs: Node 22, `npm ci`, `ng build`, `ng lint` (ESLint/angular-eslint),
  `ng test --watch=false --browsers=ChromeHeadlessCI` (Karma/Jasmine) mit Coverage-Artefakt.
- Erweiterungsregel in `CLAUDE.md` (Abschnitt 3.3, Definition of Done) verankert: Neue
  Testarten/Komponenten (weitere Testprojekte, E2E/Playwright/Selenium, Migrationen) müssen im
  selben PR, der sie einführt, in `pr-checks.yml` mitberücksichtigt werden.

### US-003 — Datenbankschema & Migrationen für alle Aggregate

- Minimale Domain-Entity-Skeletons für alle sieben Aggregate/Entities angelegt (`User`, `Project`
  + `ProjectStatus`, `ProjectMembership`, `Stakeholder`, `StakeholderCommunicationAssignment`,
  `StakeholderAssessment`, `CommunicationType`), an den Pfaden, die die späteren Aggregate-Stories
  (US-004/010/011/020/027/037/039) erweitern werden — Details siehe `docs/adr/0001-*.md`.
- `SlobSteakDbContext` (EF Core, PostgreSQL via Npgsql) mit `DbSet`s für alle sieben Aggregate
  sowie sieben `IEntityTypeConfiguration<T>`-Klassen (Fluent API, keine Data Annotations) unter
  `src/SlobSteak.Infrastructure/Persistence/Configurations/`.
- Snake-case-Tabellen-/Spaltennamen über `EFCore.NamingConventions`
  (`UseSnakeCaseNamingConvention()`), Wiederverwendung der Value Objects `Email`/`Score` aus
  US-002 via `HasConversion`.
- Drei zentrale Unique-Indizes gemäß PRD Abschnitt 4.3: `project_memberships`
  (`project_id`,`user_id`), `stakeholder_assessments` (`stakeholder_id`,`role`),
  `stakeholder_communication_assignments` (`stakeholder_id`,`communication_type_id`) — plus
  `users.email` und `communication_types.name`.
- `StakeholderAssessment.Version` als explizites Optimistic-Concurrency-Feld (siehe
  `docs/adr/0002-*.md`), als EF-Concurrency-Token konfiguriert.
- Initiale Migration `InitialCreate` erzeugt; manuell gegen echte PostgreSQL verifiziert
  (`dotnet ef database update` und vollständiger Rollback `dotnet ef database update 0`).
- `Program.cs` wendet ausstehende Migrationen im Development-Environment beim Start automatisch an
  (`dbContext.Database.Migrate()`); per `docker compose up --build db api` + Health-Check-Smoke-Test
  verifiziert.
- Integrationstests gegen eine echte Testcontainers-PostgreSQL-Instanz: `SchemaConstraintsTests`
  (3 Unique-Constraint-Verletzungen → `DbUpdateException`) und dedizierter Story-Test
  `tests/SlobSteak.Api.Tests/UserStories/US003_DatenbankschemaTests.cs` (ein Fact je
  Akzeptanzkriterium). Gemeinsame Test-Factory `SlobSteakApiFactory` (Hosting-Umgebung
  `"Testing"`) eingeführt, um den neuen automatischen Migrations-Aufruf nicht ungewollt in
  DB-losen Tests (z. B. dem bestehenden Health-Check-Test aus US-001) auszulösen.

### Chore — Docker-Compose-Variante für GHCR-Images

- Neue `docker-compose.ghcr.yml` ergänzt: startet `api`/`frontend` aus den zuletzt bei einem
  gemergten Pull Request auf `main` veröffentlichten `ghcr.io`-Images (`:latest`) statt aus
  lokalem Quellcode zu bauen, damit der aktuelle `main`-Stand jederzeit ohne Build getestet werden
  kann (`docker compose -f docker-compose.ghcr.yml up --pull always`). Das bestehende
  `docker-compose.yml` (lokaler Build) bleibt unverändert Grundlage der aktiven Storyentwicklung.

### US-002 — Zentrale Value Objects (Email, Rolle, Score, Enums)

- Value Object `Email` (`SlobSteak.Domain.Shared.ValueObjects`) mit Formatvalidierung; ungültige
  Werte werfen die neue domänenspezifische Exception `InvalidEmailFormatError`.
- Value Object `Score` (`readonly record struct`, Bereich 0–100 inklusive); Werte außerhalb des
  Bereichs werfen die neue domänenspezifische Exception `InvalidScoreRangeError`.
- Gemeinsame abstrakte Basisklasse `DomainException` für alle fachlichen Domain-Exceptions
  (`SlobSteak.Domain.Shared.Exceptions`) als Grundlage für eine spätere zentrale
  Exception-Middleware.
- Enums `ProjectRole` (PL, Coreteam, Architect, User — bewusst ohne `Admin`), `StakeholderType`,
  `CommunicationFrequency`, `CommunicationChannel` unter `SlobSteak.Domain.Shared.Enums`.
- Unit-Tests (`EmailTests`, `ScoreTests`, `EnumsTests`) und dedizierter Story-Test
  (`tests/SlobSteak.Domain.Tests/UserStories/US002_ValueObjectsTests.cs`, ein Fact/Theory je
  Akzeptanzkriterium) ergänzt.

### US-001 — Projekt-Grundgerüst & Architektur-Setup

- .NET-Solution `SlobSteak.sln` mit DDD-Schichtenarchitektur angelegt: `SlobSteak.Domain`,
  `SlobSteak.Application`, `SlobSteak.Infrastructure`, `SlobSteak.Api` sowie die zugehörigen
  xUnit-Testprojekte `SlobSteak.Domain.Tests`, `SlobSteak.Application.Tests`,
  `SlobSteak.Api.Tests`, mit Projektreferenzen gemäß Dependency Rule (Domain → nichts,
  Application → Domain, Infrastructure → Domain, Api → Application + Infrastructure).
- Health-Check-Endpoint `GET /api/v1/health` (ASP.NET Core Health Checks Middleware, JSON-Antwort
  `{"status":"ok"}`) implementiert und per Integrationstest (`HealthCheckTests`) abgesichert.
- Angular-Standalone-Workspace `frontend/` erzeugt, inkl. Platzhalterseite, Jasmine/Karma-Testsetup
  (`@angular/build:karma`) und `angular-eslint`.
- `docker-compose.yml` mit Services `api`, `frontend`, `db` (PostgreSQL 16) sowie Multi-Stage-
  `Dockerfile`s für `api` (.NET SDK/ASP.NET-Runtime) und `frontend` (Node-Build + nginx) ergänzt.
- GitHub-Actions-Workflow `.github/workflows/docker-publish.yml` für den Build und Publish beider
  Images nach GitHub Container Registry bei gemergten Pull Requests auf `main` angelegt.
- `README.md` mit lokaler Setup-/Start-Anleitung für Backend, Frontend und Docker Compose ergänzt.
