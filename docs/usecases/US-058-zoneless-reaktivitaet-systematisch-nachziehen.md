**ID:** US-058
**Titel:** Zoneless-Reaktivität systematisch nachziehen (fehlendes `markForCheck()` in weiteren `subscribe()`-Callbacks)
**Bounded Context / Domain:** Frontend-Shell (cross-cutting, analog zu US-043/US-044/US-050/US-057)
**Abhängigkeiten:** US-050, US-057

**Status:** fertig (29.08.2026), PR siehe unten

---

### 1. User Story

Als **Nutzer** möchte ich, dass jede Aktion im Admin- und Stakeholder-Bereich (Nutzer/Projekt anlegen, Mitglied zuweisen/Rolle ändern/entfernen, Stakeholder wiederherstellen/filtern, Passwort ändern, Projekt-Workspace laden) nach Abschluss des zugehörigen Requests zuverlässig ihren Endzustand (Erfolg oder Fehler) sichtbar anzeigt, statt dass Button/Ansicht ohne fremde, unabhängige Interaktion optisch im Verarbeitungs-/Lade-Zustand hängen bleiben können.

### 2. Fachlicher & Technischer Kontext

- **Herkunft:** Kein Einzelbefund aus `docs/bugs/bugs.md`, sondern eine bereits mehrfach vorab dokumentierte, noch nicht in einer eigenen Story geschnittene Sammelbeobachtung:
  - PO-Anmerkung in `US-050-verlaesslicher-lade-zustand-listen.md`: benennt `onCreateUser`, `onChangeRole`, `onRemoveMember` in den Admin-Komponenten als noch offene Verdachtsstellen.
  - Dev-/QA-Anmerkungen in `US-057-login-haengt-nach-erfolgreicher-anmeldung.md`: ergänzen `PasswordChangeModalComponent.onSubmit()` und empfehlen ausdrücklich eine Sammelstory „Zoneless-Reaktivität systematisch nachziehen“.
  - Im Rahmen der Ursachenanalyse zu US-051 (`US-051-passwort-reset-abschliessen.md`, Abschnitt „Anmerkungen des Agenten“) wurde der Code aller verbleibenden Fundstellen tatsächlich gegengelesen (nicht nur vermutet) und um zwei zusätzliche, bis dahin nicht benannte Dateien ergänzt (`project-workspace-layout.component.ts`, `stakeholder-list.component.ts`).
- **Root Cause (bereits etabliert, siehe US-050/US-057):** Das Frontend läuft zoneless (kein `zone.js`). Eine reine Feldzuweisung bzw. Set-/Array-Mutation in einem `subscribe()`-Callback markiert die Komponente nicht automatisch für die nächste Change-Detection-Runde; ohne `ChangeDetectorRef.markForCheck()` bleibt das DOM auf dem Stand vor dem Request stehen, bis eine unabhängige Interaktion an anderer Stelle zufällig eine Change-Detection-Runde auslöst.
- **Bereits per Code-Review konkret bestätigte Fundstellen (kein Verdacht, sondern gelesener Ist-Zustand zum Zeitpunkt dieser Story-Erstellung):**
  1. `frontend/src/app/features/admin/users-admin/users-admin.component.ts` — `onCreateUser` (`error`-Zweig ohne jeden Folgeaufruf, bleibt ohne fremde Interaktion dauerhaft hängen; `next`-Zweig heilt sich aktuell nur indirekt über den darin ausgelösten `loadUsers()`-Folgerequest, dessen eigener `subscribe()` bereits `markForCheck()` aufruft — trotzdem der Konsistenz halber mitzuziehen).
  2. `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` — `onCreateProject` (`error`-Zweig; `next`-Zweig analog Punkt 1 indirekt selbstheilend).
  3. `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` — `onAssignMember`, `onChangeRole`, `onRemoveMember` (jeweils `error`-Zweig ohne Folgeaufruf; `next`-Zweig analog Punkt 1 indirekt selbstheilend über `loadMemberships()`).
  4. `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.ts` — `getProject(...).subscribe(...)`, `restoreStakeholder(...).subscribe(...)` (`next`/`error`), `listStakeholders(...).subscribe(...)` an beiden Aufrufstellen (Papierkorb-Filter und regulärer Such-/Typ-Filter, jeweils `next`/`error`); keinerlei `ChangeDetectorRef` injiziert.
  5. `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts` — `authService.changePassword(...).subscribe(...)` (`next`/`error`).
  6. ~~`frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts`~~ — **bereits behoben** im Rahmen von US-052 (`markForCheck()` im initialen `getProject(...).subscribe(...)` ergänzt), da bei dessen Live-Verifikation real reproduziert und dieselbe Methode ohnehin geändert wurde. Kein Umsetzungsbedarf mehr für diese Story.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht, keine Änderung an Application-Services, Endpunkten oder Validierungsregeln.

### 3. Akzeptanzkriterien

- [x] Alle fünf verbleibenden (Punkt 1–5) oben unter Punkt 2 gelisteten Komponenten injizieren `ChangeDetectorRef` (soweit nicht bereits vorhanden) und rufen `changeDetectorRef.markForCheck()` in jedem `next`- und `error`-Zweig der genannten `subscribe()`-Aufrufe auf — analog zum bereits etablierten Muster in `loadUsers()`/`loadProjects()`/`loadMemberships()`/`LoginPageComponent.onSubmit()`.
- [x] Für jede der fünf Komponenten belegt ein automatisierter Test (Angular `TestBed` + `HttpTestingController`, Antwort ausschließlich per `flush()` nach dem ursprünglichen Aufruf, danach ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ohne zusätzliche simulierte Interaktion) den korrekten Endzustand nach Erfolg **und** nach Fehler.
- [x] Bestehende Tests aller fünf betroffenen Komponenten (inkl. `us-050-*`/`us-057-*`/`us-051-*`/`us-052-*`-Story-Tests) bleiben grün bzw. werden dort ergänzt, wo sie den jetzt gefixten Zustand bereits (unbewusst) mitgeprüft haben.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention (`us-058*.spec.ts`, ggf. mehrere Dateien nahe den betroffenen Komponenten, siehe qa.md Abschnitt 1 zu mehrteiligen Frontend-Stories), ausschließlich gegen obige Akzeptanzkriterien. *Umgesetzt als eine gemeinsame Datei `us-058-zoneless-reaktivitaet-systematisch-nachziehen.spec.ts` mit fünf Testblöcken statt fünf separater Dateien — siehe Anmerkungen des Agenten.*
- [x] Kein bestehender Test wird gebrochen; `ng test` bleibt grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:** siehe die fünf verbleibenden Fundstellen (Punkt 1–5) in Abschnitt 2, Punkt „Bereits per Code-Review konkret bestätigte Fundstellen“ — dort jeweils mit exakter Methode/Zeile benannt. Punkt 6 (`project-workspace-layout.component.ts`) ist bereits erledigt (siehe dort).

**Wichtige Invarianten:**
- Reine Presentation-/Reaktivitäts-Änderung, kein neues Ladezustands-Muster — `isCreatingUser`/`isCreatingProject`/`isAssigning`/`changingRoleUserIds`/`removingMemberUserIds`/`ViewState` (US-043/US-050) bleiben unverändert in ihrer Bedeutung, es wird ausschließlich die fehlende Change-Detection-Markierung ergänzt.
- Keine Änderung an `AdminUsersService`/`AdminProjectsService`/`StakeholdersService`/`AuthService`/`ProjectsService` oder deren Endpunkten.

**Nicht Teil dieser Story (bewusst separat zu behandeln, siehe US-057 „Anmerkungen des QA-Agenten“):** Der dort dokumentierte PrimeNG-`Password`-Feld-Sync-Befund (Feld zeigt nach fehlgeschlagenem Login weiterhin das alte Passwort an) hat eine andere technische Ursache (`ControlValueAccessor`-Sync, keine fehlende Change-Detection) und gehört nicht in diese Story.

### Anmerkungen des Product Owners

Wird während der Bearbeitung von US-051 angelegt (siehe dortige „Anmerkungen des Agenten“), da beim Gegenlesen aller in US-050/US-057 bereits vermuteten Stellen zwei zusätzliche, bis dahin nicht benannte Komponenten (`project-workspace-layout.component.ts`, `stakeholder-list.component.ts`) mit demselben Muster gefunden wurden. Bewusst als eigene Sammelstory statt Mit-Fix in US-051 (CLAUDE.md Abschnitt 3: „nur an aktueller Story arbeiten“).

### Anmerkungen des Agenten

**Umsetzung:** Alle fünf in Abschnitt 2 gelisteten Fundstellen erhielten `changeDetectorRef.markForCheck()` in ihrem `error`-Zweig (der zuvor jeweils ohne jeden Folgeaufruf dauerhaft im Verarbeitungs-/Lade-Zustand hängen blieb); die `next`-Zweige der drei Admin-Mutationsmethoden (`onCreateUser`, `onCreateProject`, `onAssignMember`/`onChangeRole`/`onRemoveMember`) erhielten den Aufruf ebenfalls, obwohl sie sich bereits indirekt über den jeweils darin ausgelösten Listen-Reload selbst heilten (Konsistenz, wie in der Story-Beschreibung vermerkt). `stakeholder-list.component.ts` erhielt zusätzlich eine neue `ChangeDetectorRef`-Injektion (bislang keine vorhanden); `password-change-modal.component.ts` ebenso.

**Wichtiger methodischer Befund beim Schreiben der Story-Tests (Akzeptanzkriterium 2):** Ein naiv aufgebauter Test der Form „`component['xForm'].setValue(...)`, dann sofort die zu testende Methode aufrufen, dann `flush()` + `fixture.detectChanges()`“ erkennt ein fehlendes `markForCheck()` NICHT zuverlässig — Angulars Reactive-Forms-Direktiven markieren die Komponente beim Schreiben eines Formularwerts bereits selbst für die nächste Change-Detection-Runde, wodurch der nachfolgende `fixture.detectChanges()`-Aufruf die gesamte Ansicht ohnehin aktualisiert, unabhängig vom eigentlich zu prüfenden `subscribe()`-Callback. Ebenso maskiert ein gemeinsamer `fixture.detectChanges()`-Aufruf nach dem Flush **mehrerer** paralleler HTTP-Requests ein fehlendes `markForCheck()` in einem der Requests, wenn ein anderer, korrekt fixter Request denselben Aufruf teilt. Behoben durch: (1) einen zusätzlichen `fixture.detectChanges()` unmittelbar nach jedem `setValue()`, der diese Nebenwirkung „verbraucht“, bevor die eigentliche Methode aufgerufen wird; (2) bei mehreren unabhängigen Requests jeden einzeln flushen und direkt danach prüfen, statt mehrere Flushes gefolgt von einem gemeinsamen `detectChanges()` zu bündeln — außer wo (wie beim `getProject`/`listStakeholders`-Doppel-Request in `ngOnInit`) eine echte Trennung der beiden Flushes durch einen zusätzlichen `detectChanges()`-Aufruf sich als eigenständig flatterhaft (test-flaky) erwies; dort blieb bewusst die gemeinsame, stabile Flush-Reihenfolge erhalten, und die Korrektheit dieses einzelnen Falls wurde stattdessen durch Code-Review plus das an anderer Stelle bereits mutationsgetestete, identische Fix-Muster abgesichert, statt eine flatterhafte Test-Isolation zu erzwingen. Jeder der fünf Fixes wurde zusätzlich einzeln per Mutationstest verifiziert (Fix temporär entfernt → zugehöriger Test schlägt fehl → Fix wiederhergestellt → Test wieder grün), mit Ausnahme des `getProject`-Falls aus genau diesem Flakiness-Grund.

**Verifikation:** Story ursprünglich von `origin/main` vor dem noch offenen US-056-Merge abgezweigt (US-058 hängt nur von US-050/US-057 ab, nicht von US-056) und dort bereits vollständig grün (249/249, dreifach wiederholt) inkl. manueller `docker-compose`-Smoke-Verifikation (erzwungene Passwort-Änderung schließt zuverlässig ab, Admin-Bereich funktioniert). Nach Merge von US-056 in `main` auf den aktuellen Stand rebased (Konflikte: die neuen `openCreateDialog`/`openAssignDialog`-Methoden aus US-056 kollidierten an derselben Einfügestelle wie diese Storys Doc-Kommentare — rein strukturell, per Hand aufgelöst) und die drei Admin-Story-Tests entsprechend angepasst (Formular lebt seit US-056 in einem Dialog, daher `openCreateDialog()`/`openAssignDialog()` vor dem Auslösen der zu prüfenden Aktion). `ng test` (gesamter Workspace) 255/255 grün, dreifach wiederholt zur Stabilitätsprüfung. `ng lint` fehlerfrei. `ng build` erfolgreich (Bundle-Budget-Warnung unverändert vorbestehend). `dotnet test` unverändert grün (kein Backend-Anteil).

**„So probierst du es aus":** `docker-compose up`, mit Seed-Admin anmelden — die erzwungene Passwort-Änderung schließt nach Absenden zuverlässig ab (kein Hängenbleiben im Verarbeitungs-Zustand). Im Admin-Bereich sowie in der Stakeholder-Liste eines Projekts bleibt jede abgeschlossene Aktion (Anlegen, Zuweisen, Rolle ändern, Entfernen, Wiederherstellen) nach Erfolg oder Fehler zuverlässig sichtbar, ohne dass eine zusätzliche, unabhängige Interaktion nötig ist.

**Neue/geänderte Dateien:**
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` (`onCreateUser`)
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` (`onCreateProject`)
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` (`onAssignMember`/`onChangeRole`/`onRemoveMember`)
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.ts` (`ChangeDetectorRef` neu injiziert; `getProject`/`restoreStakeholder`/`listStakeholders` ×2)
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts` (`ChangeDetectorRef` neu injiziert; `onSubmit`)
- `frontend/src/app/us-058-zoneless-reaktivitaet-systematisch-nachziehen.spec.ts` (neu, Story-Test)
- `docs/usecases/US-058-zoneless-reaktivitaet-systematisch-nachziehen.md` (diese Datei)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
