**ID:** US-051
**Titel:** „Passwort zurücksetzen“ in der Nutzerverwaltung schließt zuverlässig ab
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-013, US-016, US-043

**Status:** fertig (28.08.2026), PR siehe unten

---

### 1. User Story

Als **Systemadministrator** möchte ich, dass ein Klick auf „Passwort zurücksetzen“ in der Nutzerverwaltung zuverlässig abschließt und mir das neue temporäre Passwort anzeigt, statt dass der Button dauerhaft im Verarbeitungs-Zustand hängen bleibt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt `/admin/users`: „Bei Klick auf ‚Passwort zurücksetzen‘ passiert nichts, außer dass der Button in eine Warteschleife geht.“
- **Verifikation durch PO (Code-Review):** `users-admin.component.ts#onResetPassword` ist clientseitig korrekt implementiert — sowohl der `next`- als auch der `error`-Handler des `subscribe()` entfernen die User-ID zuverlässig aus `resettingUserIds` (wodurch `app-processing-button` seinen „Wird zurückgesetzt…“-Zustand beenden würde) und setzen eine Erfolgs- bzw. Fehlermeldung. Ein dauerhaftes Hängen des Buttons ohne jede Endzustands-Meldung ist mit diesem Code **nur** erklärbar, wenn der zugrunde liegende HTTP-Request selbst nie mit `next` oder `error` terminiert (z. B. ein hängender Request/Deadlock im Backend, ein fehlender Response oder ein clientseitig unbehandelter Ausnahmefall vor dem `subscribe()`).
- Relevante Backend-Dateien (gefunden, aber im Rahmen dieser PO-Verifikation nicht im Detail geprüft): `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs`, `src/SlobSteak.Application/Identity/ResetPasswordService.cs`. Die eigentliche Ursachenanalyse ist Aufgabe des Backend-Agenten im Rahmen dieser Story.
- **Relevant für DDD:** Backend-Fix voraussichtlich in `SlobSteak.Application`/`SlobSteak.Api` (Identity-Kontext), ggf. ergänzt um ein Frontend-seitiges Timeout/Fehlerverhalten, falls der Request grundsätzlich lange dauern kann und das kein Bug, sondern ein fehlendes Timeout ist.

### 3. Akzeptanzkriterien

- [x] Die tatsächliche Ursache ist ermittelt und im PR dokumentiert (z. B. per Reproduktion gegen einen lokal laufenden `docker-compose`-Stack: Request-Log, HTTP-Statuscode, Antwortzeit).
- [x] `POST /api/v1/admin/users/{id}/reset-password` liefert bei einer gültigen Anfrage zuverlässig eine erfolgreiche Response innerhalb einer für den Endpoint angemessenen Zeit (kein Hängen/Timeout).
- [x] Nach Klick auf „Passwort zurücksetzen“ zeigt die UI zuverlässig entweder die Erfolgsmeldung mit temporärem Passwort oder eine Fehlermeldung — nie einen dauerhaft hängenden Verarbeitungs-Zustand.
- [x] Ein automatisierter Backend-Test (xUnit) deckt den Erfolgsfall des Reset-Endpoints ab; ein automatisierter Frontend-Test deckt ab, dass `resettingUserIds` nach Abschluss des Requests (Erfolg **und** Fehler) wieder leer ist.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen diese Akzeptanzkriterien.
- [x] Kein bestehender Test wird gebrochen; `dotnet test` und `ng test` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu prüfende Dateien:**
- `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs`
- `src/SlobSteak.Application/Identity/ResetPasswordService.cs`
- `frontend/src/app/features/admin/admin-users.service.ts`
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts`

**Wichtige Invarianten:**
- Das bestehende Verhalten aus US-013 (Berechtigungsprüfung, temporäres Passwort erzwingt erneute Änderung bei nächstem Login) darf durch den Fix nicht verändert werden — ausschließlich der beschriebene Fehlerfall wird behoben.

### Anmerkungen des Product Owners

Die genaue technische Ursache konnte im Rahmen dieser Bug-Verifikation nicht abschließend bestimmt werden (kein laufender Stack zur Reproduktion verfügbar) — der Frontend-Code ist nach Review korrekt; der Fehler liegt mit hoher Wahrscheinlichkeit serverseitig oder in der Netzwerkkommunikation. Der Dev-Agent beginnt daher mit einer Reproduktion gegen einen laufenden `docker-compose`-Stack, bevor er einen Fix ansetzt.

### Anmerkungen des Agenten

**Ursachenanalyse (Akzeptanzkriterium 1):** Backend-seitig ist der Reset-Endpoint unauffällig — `ResetPasswordService`/`User.ResetPassword` führen ausschließlich PBKDF2-Hashing (100.000 Iterationen SHA-256, ca. 10–50 ms) und einen einzelnen EF-Core-`SaveChangesAsync`-Aufruf aus, kein Deadlock, kein unbegrenztes Warten. Ein Backend-Story-Test (`US051_PasswortResetAbschliessenTests.AC2_ValidReset_RespondsSuccessfullyWithinReasonableTime`) belegt eine reale Antwortzeit deutlich unter der 5-Sekunden-Toleranzgrenze über einen echten HTTP-Roundtrip gegen eine Testcontainers-PostgreSQL-Instanz — der PO-Verdacht eines serverseitigen Hängers hat sich damit **nicht** bestätigt.

Die tatsächliche Ursache liegt clientseitig, im selben Fehlermuster wie bereits in US-050 und US-057 dokumentiert: `UsersAdminComponent.onResetPassword` (`users-admin.component.ts`) rief in seinem `subscribe()` weder im `next`- noch im `error`-Zweig `changeDetectorRef.markForCheck()` auf. Da das Frontend ohne `zone.js` läuft (zoneless), markiert eine reine Feldzuweisung/`Set`-Mutation in einem asynchronen `subscribe()`-Callback die Komponente nicht automatisch für die nächste Change-Detection-Runde. `resettingUserIds` war nach Abschluss des Requests intern bereits korrekt geleert, die Ansicht (und damit `app-processing-button`) wurde aber nicht neu gerendert — der Button blieb optisch dauerhaft im Verarbeitungs-Zustand hängen, bis eine unabhängige Interaktion an anderer Stelle eine Change-Detection-Runde auslöste. Behoben durch Ergänzung von `changeDetectorRef.markForCheck()` in beiden `subscribe()`-Zweigen, analog zum bereits etablierten Muster in `loadUsers()` derselben Komponente.

**Verwandte, aber nicht in dieser Story behobene Beobachtung:** Beim Gegenlesen der bereits in US-050/US-057 dokumentierten Verdachtsstellen zeigte sich, dass exakt dasselbe fehlende `markForCheck()`-Muster noch an mehreren weiteren Stellen besteht (`onCreateUser`-Fehlerzweig, `onCreateProject`, `onAssignMember`/`onChangeRole`/`onRemoveMember`, `project-workspace-layout.component.ts`, `stakeholder-list.component.ts`, `password-change-modal.component.ts`). Da dies außerhalb des in dieser Story beschriebenen Akzeptanzkriteriums (Passwort-Reset-Button) liegt, wurde dafür — wie von PO/Dev-/QA-Agent in US-057 bereits empfohlen — die Sammel-Folge-Story [`US-058-zoneless-reaktivitaet-systematisch-nachziehen.md`](US-058-zoneless-reaktivitaet-systematisch-nachziehen.md) im Backlog angelegt, statt es hier stillschweigend mitzufixen (CLAUDE.md Abschnitt 3: „Ändere während einer Story nur Code, der direkt zu dieser gehört“).

**Verifikation der Testwirksamkeit (Mutationstest):** Vor dem finalen Commit wurden beide `markForCheck()`-Aufrufe testweise wieder entfernt und `ng test --include='**/us-051*.spec.ts'` erneut ausgeführt — 2 von 3 Testfällen (Erfolgs- und Fehlerfall-DOM-Zustand) schlagen ohne den Fix zuverlässig fehl; der dritte (reine `resettingUserIds`-Zustandsprüfung, unabhängig von Change Detection) bleibt erwartungsgemäß grün. Nach Wiederherstellung des Fixes sind alle 3 wieder grün. Bestätigt, dass der Story-Test den Bug tatsächlich reproduziert.

**Tests:** Backend `dotnet test` (gesamte Solution) 169/169 grün. Frontend `ng test` (gesamter Workspace) 213/213 grün (vorher 210/210, +3 neue Tests). `ng lint` fehlerfrei. `ng build` erfolgreich (einzige Auffälligkeit: vorbestehende, unveränderte Bundle-Budget-Warnung „Initial exceeded maximum budget … 276.16 kB“, Budget 900 kB — kein neuer Regressionsbefund, identisch zum Stand vor dieser Story). `dotnet format --verify-no-changes` fehlerfrei.

**Manueller Smoke-Test gegen `docker-compose up` (isolierter Stack, Projektname `us051smoke`, eigene Ports 4251/5051/5551, nicht der gemeinsam genutzte Container-Stack):**
- Backend direkt per `curl`: `POST /api/v1/admin/users/{id}/reset-password` mit gültigem Zieluser → `200 OK` in `33 ms` (Roundtrip inkl. PBKDF2-Hashing + EF-Core-Save) — kein Hängen, bestätigt Akzeptanzkriterium 2 auch außerhalb der automatisierten Tests.
- UI per Browser-Automatisierung: Login als Seed-Admin, Klick auf „Passwort zurücksetzen“ für einen eigens angelegten Testnutzer → ohne jede weitere Interaktion erscheint die Erfolgsmeldung „Passwort für Smoke Test User wurde zurückgesetzt. Temporäres Passwort: temp-…“ und der Button kehrt zuverlässig in seinen Normalzustand zurück — kein Hängenbleiben mehr reproduzierbar (Screenshot-verifiziert).
- Stack nach Abschluss vollständig abgebaut (`docker compose down -v`), keine verbleibenden Container/Volumes/Netzwerke.

**„So probierst du es aus“:** `docker-compose up`, `http://localhost:4200/admin/users` öffnen, mit Seed-Admin anmelden, bei einem Nutzer auf „Passwort zurücksetzen“ klicken → Erfolgsmeldung mit temporärem Passwort erscheint sofort, kein hängender Button mehr.

**Isolierter Story-Test-Befehl:** Backend `dotnet test --filter "FullyQualifiedName~US051"`; Frontend `ng test --include='**/us-051*.spec.ts'`.

**Neue/geänderte Dateien:**
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` (Fix: `markForCheck()` in `onResetPassword`)
- `frontend/src/app/features/admin/users-admin/us-051-passwort-reset-abschliessen.spec.ts` (neu, Frontend-Story-Test, 3 Testfälle)
- `tests/SlobSteak.Api.Tests/UserStories/US051_PasswortResetAbschliessenTests.cs` (neu, Backend-Story-Test, 3 Testfälle)
- `docs/usecases/US-051-passwort-reset-abschliessen.md` (diese Datei)
- `docs/usecases/US-058-zoneless-reaktivitaet-systematisch-nachziehen.md` (neu, Folge-Story für verwandte, außerhalb des Scopes liegende Fundstellen)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
