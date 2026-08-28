**ID:** US-058
**Titel:** Zoneless-Reaktivität systematisch nachziehen (fehlendes `markForCheck()` in weiteren `subscribe()`-Callbacks)
**Bounded Context / Domain:** Frontend-Shell (cross-cutting, analog zu US-043/US-044/US-050/US-057)
**Abhängigkeiten:** US-050, US-057

**Status:** offen

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

- [ ] Alle fünf verbleibenden (Punkt 1–5) oben unter Punkt 2 gelisteten Komponenten injizieren `ChangeDetectorRef` (soweit nicht bereits vorhanden) und rufen `changeDetectorRef.markForCheck()` in jedem `next`- und `error`-Zweig der genannten `subscribe()`-Aufrufe auf — analog zum bereits etablierten Muster in `loadUsers()`/`loadProjects()`/`loadMemberships()`/`LoginPageComponent.onSubmit()`.
- [ ] Für jede der fünf Komponenten belegt ein automatisierter Test (Angular `TestBed` + `HttpTestingController`, Antwort ausschließlich per `flush()` nach dem ursprünglichen Aufruf, danach ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ohne zusätzliche simulierte Interaktion) den korrekten Endzustand nach Erfolg **und** nach Fehler.
- [ ] Bestehende Tests aller fünf betroffenen Komponenten (inkl. `us-050-*`/`us-057-*`/`us-051-*`/`us-052-*`-Story-Tests) bleiben grün bzw. werden dort ergänzt, wo sie den jetzt gefixten Zustand bereits (unbewusst) mitgeprüft haben.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention (`us-058*.spec.ts`, ggf. mehrere Dateien nahe den betroffenen Komponenten, siehe qa.md Abschnitt 1 zu mehrteiligen Frontend-Stories), ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Kein bestehender Test wird gebrochen; `ng test` bleibt grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:** siehe die fünf verbleibenden Fundstellen (Punkt 1–5) in Abschnitt 2, Punkt „Bereits per Code-Review konkret bestätigte Fundstellen“ — dort jeweils mit exakter Methode/Zeile benannt. Punkt 6 (`project-workspace-layout.component.ts`) ist bereits erledigt (siehe dort).

**Wichtige Invarianten:**
- Reine Presentation-/Reaktivitäts-Änderung, kein neues Ladezustands-Muster — `isCreatingUser`/`isCreatingProject`/`isAssigning`/`changingRoleUserIds`/`removingMemberUserIds`/`ViewState` (US-043/US-050) bleiben unverändert in ihrer Bedeutung, es wird ausschließlich die fehlende Change-Detection-Markierung ergänzt.
- Keine Änderung an `AdminUsersService`/`AdminProjectsService`/`StakeholdersService`/`AuthService`/`ProjectsService` oder deren Endpunkten.

**Nicht Teil dieser Story (bewusst separat zu behandeln, siehe US-057 „Anmerkungen des QA-Agenten“):** Der dort dokumentierte PrimeNG-`Password`-Feld-Sync-Befund (Feld zeigt nach fehlgeschlagenem Login weiterhin das alte Passwort an) hat eine andere technische Ursache (`ControlValueAccessor`-Sync, keine fehlende Change-Detection) und gehört nicht in diese Story.

### Anmerkungen des Product Owners

Wird während der Bearbeitung von US-051 angelegt (siehe dortige „Anmerkungen des Agenten“), da beim Gegenlesen aller in US-050/US-057 bereits vermuteten Stellen zwei zusätzliche, bis dahin nicht benannte Komponenten (`project-workspace-layout.component.ts`, `stakeholder-list.component.ts`) mit demselben Muster gefunden wurden. Bewusst als eigene Sammelstory statt Mit-Fix in US-051 (CLAUDE.md Abschnitt 3: „nur an aktueller Story arbeiten“).
