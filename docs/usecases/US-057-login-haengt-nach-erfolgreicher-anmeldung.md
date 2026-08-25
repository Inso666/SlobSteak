**ID:** US-057
**Titel:** Login-Flow bleibt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen
**Bounded Context / Domain:** Frontend-Shell (cross-cutting, analog zu US-043/US-044/US-050)
**Abhängigkeiten:** US-009, US-043, US-050

**Status:** fertig (25.08.2026), PR siehe unten

---

### 1. User Story

Als **Nutzer** möchte ich nach erfolgreicher Anmeldung zuverlässig zur Projektübersicht (bzw. bei erzwungener Passwort-Änderung zum entsprechenden Dialog) weitergeleitet werden, statt dass der „Anmelden“-Button dauerhaft im Zustand „Wird angemeldet…“ hängen bleibt, obwohl die Anmeldung serverseitig bereits erfolgreich war.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** Während der QA-Verifikation von US-050 (explorativer Test, 25.08.2026) festgestellt — kein Einzelbefund aus `docs/bugs/bugs.md`, sondern ein während dieser Story neu entdeckter Regressions-/Bestandsfehler.
- **Reproduktion:** Frisches System, gültige Zugangsdaten (z. B. `admin@example.com` + Seed-Passwort) in das Login-Formular eingeben, „Anmelden“ klicken. `POST /api/v1/auth/login` antwortet laut Netzwerk-Log erfolgreich mit `200 OK`. Erwartet: Weiterleitung zu `/projects` (bzw. Anzeige des `PasswordChangeModalComponent`, falls `mustChangePassword: true`). Tatsächlich: Der Button bleibt dauerhaft im Verarbeitungs-Zustand „Wird angemeldet…“ hängen, keine Weiterleitung, keine Fehlermeldung — die Seite bleibt unverändert auf `/login` stehen.
- **Root Cause (bereits identifiziert, siehe `docs/usecases/US-050-verlaesslicher-lade-zustand-listen.md`, Abschnitt „Anmerkungen des Dev-Agenten“):** Das Frontend läuft zoneless (kein `zone.js`, Angular `^22.1.0`). `LoginPageComponent.onSubmit()` (`frontend/src/app/features/auth/login-page/login-page.component.ts`) setzt in den `next`-/`error`-Handlern des `AuthService.login(...).subscribe(...)`-Aufrufs u. a. `this.isSubmitting = false` per reiner Feldzuweisung, **ohne** anschließenden `ChangeDetectorRef.markForCheck()`-Aufruf. Da der HTTP-Response außerhalb eines von Angular beobachteten Ereignisses eintrifft, wird die Komponente nicht für die nächste Change-Detection-Runde markiert — das DOM (insbesondere der an `isSubmitting` gebundene Zustand von `app-processing-button`, US-043) aktualisiert sich nicht sichtbar, obwohl die zugrunde liegende Property korrekt gesetzt wurde. Exakt dasselbe Muster, das in US-050 an fünf anderen Stellen behoben wurde.
- **Schweregrad:** Betrifft **jeden** Login-Vorgang, nicht nur Randfälle — insbesondere blockiert es jeden neu angelegten Nutzer mit `mustChangePassword: true` vollständig am Systemzugang, da dieser nie über den Login-Screen hinauskommt.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht (`LoginPageComponent`), keine Änderung an `AuthService`, Endpunkten oder Validierung.

### 3. Akzeptanzkriterien

- [x] Nach einer erfolgreichen Anmeldung (`mustChangePassword: false`) navigiert die Anwendung ohne jede weitere Nutzerinteraktion zuverlässig zu `/projects`.
- [x] Nach einer erfolgreichen Anmeldung mit `mustChangePassword: true` erscheint ohne weitere Nutzerinteraktion das `PasswordChangeModalComponent`.
- [x] Bei einer fehlgeschlagenen Anmeldung (z. B. `401`) verlässt der Button ohne weitere Nutzerinteraktion zuverlässig den Verarbeitungs-Zustand und die Fehlermeldung „E-Mail oder Passwort ist falsch.“ erscheint.
- [x] Ein automatisierter Test (`HttpTestingController`, analog zum in US-050 etablierten Muster) beweist für Erfolgs- **und** Fehlerfall: nach `flush()` **ohne** zusätzliche simulierte Interaktion zeigt das DOM den jeweils korrekten Endzustand (Navigation ausgelöst bzw. Fehlermeldung sichtbar, Button nicht mehr im Verarbeitungs-Zustand).
- [x] Bestehende Tests (`login-page.component.spec.ts`, `us-043-*.spec.ts` sofern dort Login-Bezug, `us-044-http-error-handling.spec.ts`) bleiben grün bzw. werden ergänzt, nicht ersetzt.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention (`us-057*.spec.ts`), ausschließlich gegen obige Akzeptanzkriterien, ein Testfall je Kriterium in Dokument-Reihenfolge.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Datei:**
- `frontend/src/app/features/auth/login-page/login-page.component.ts` (`onSubmit()`: `ChangeDetectorRef` injizieren, `markForCheck()` im `next`- und `error`-Handler analog zu den in US-050 gefixten Stellen aufrufen).

**Wichtige Invarianten:**
- Reine Presentation-/Reaktivitäts-Änderung — keine Änderung an `AuthService`, keine Änderung des fachlichen Ablaufs aus US-008/US-009/US-013 (Login, erzwungene Passwort-Änderung), keine neuen Endpunkte.
- Kein neues, lokal erfundenes Ladezustands-Muster — `isSubmitting`/`app-processing-button` (US-043) bleiben unverändert, es wird ausschließlich die fehlende Change-Detection-Markierung ergänzt.

**Hinweis zum verwandten Backlog-Eintrag `US-051`:** Die dort dokumentierte PO-Diagnose („Frontend-Code nach Review korrekt, Fehler vermutlich serverseitig“) wurde vor der Root-Cause-Erkenntnis aus US-050 erstellt. Das dort beschriebene Symptom (Button hängt dauerhaft im Verarbeitungs-Zustand nach `onResetPassword`) folgt strukturell demselben Muster wie hier — bevor an US-051 mit einer Backend-Fehlersuche begonnen wird, sollte zuerst geprüft werden, ob dort ebenfalls nur das fehlende `markForCheck()` die Ursache ist. Keine Änderung an US-051 im Rahmen dieser Story (eigener Scope), nur als Hinweis für die Story-Reihenfolge festgehalten.

### Anmerkungen des Product Owners

Diese Story wurde unmittelbar nach Abschluss von US-050 auf Empfehlung des QA-Agenten aus dessen explorativem Test heraus angelegt (siehe „Anmerkungen des QA-Agenten“ in `US-050-verlaesslicher-lade-zustand-listen.md`). Bewusst **nicht** in US-050 mit-gefixt, da `LoginPageComponent` nicht zu den dort in Abschnitt 4 benannten fünf Fundstellen gehörte (CLAUDE.md Abschnitt 3: „nur an aktueller Story arbeiten, kein Vermischen“). Bewusst auch **nicht** als „Zoneless-Reaktivität systematisch nachziehen“-Sammelstory für alle vom Dev-Agenten in US-050 zusätzlich genannten, noch unbehobenen Stellen (`onCreateUser`, `onChangeRole`, `onRemoveMember` in den Admin-Komponenten, `project-workspace-layout.component.ts`, `stakeholder-list.component.ts`) geschnitten, da diese Story hier gezielt den einen bereits konkret reproduzierten, hochpriorisierten Login-Blocker behebt. Eine separate Folge-Story für die verbleibenden, noch nicht konkret reproduzierten Verdachtsstellen bleibt offen für spätere Priorisierung.

### Anmerkungen des Dev-Agenten (Frontend, 2026-08-25)

**Statuszeile:** Frontend-Anteil umgesetzt auf `feature/US-057-login-haengt-nach-erfolgreicher-anmeldung`, gepusht. Status bleibt bewusst „offen“ bis QA-Verifikation + Merge (siehe Handoff-Hinweis im Story-Auftrag).

**Umsetzung:** exakt wie in Abschnitt 4 vorgegeben — `ChangeDetectorRef` in `LoginPageComponent` injiziert, `changeDetectorRef.markForCheck()` sowohl im `next`- als auch im `error`-Handler des `authService.login(...).subscribe(...)`-Aufrufs in `onSubmit()` ergänzt. Kein neues Ladezustands-Muster, keine Änderung an `isSubmitting`/`app-processing-button` (US-043), keine Änderung an `AuthService`, keine Änderung des fachlichen Ablaufs.

**Verifikation der Testwirksamkeit:** vor dem finalen Commit wurden die beiden `markForCheck()`-Aufrufe testweise wieder entfernt und die Testsuite erneut ausgeführt — die zwei Tests, die den DOM-Endzustand nach `flush()` prüfen (Akzeptanzkriterium 2 im Story-Test sowie Akzeptanzkriterium 4 im Story-Test), schlagen ohne den Fix zuverlässig fehl; mit wiederhergestelltem Fix sind wieder alle 16 Tests grün. Das bestätigt, dass die Tests den Bug tatsächlich reproduzieren und nicht nur oberflächlich grün sind.

**Wichtige technische Klarstellung zu Akzeptanzkriterium 3:** Nach einem fehlgeschlagenen Login-Versuch leert `onSubmit()` bewusst (unverändert, bereits vor dieser Story so) das Passwort-Feld, wodurch die Formular-Validierung (`Validators.required`) den Button erneut über `[disabled]="form.invalid"` sperrt. Das ist beabsichtigtes, von dieser Story unberührtes Validierungsverhalten (SPEC-00 §2) — nicht der hier zu behebende Verarbeitungs-Zustand. „Den Verarbeitungs-Zustand verlassen“ bedeutet daher konkret: `isSubmitting` wird zuverlässig sichtbar `false` (Label wechselt zurück zu „Anmelden“, `aria-busy="false"`, kein Spinner) — unabhängig davon, ob der Button aufgrund des geleerten Feldes weiterhin (korrekt) deaktiviert bleibt. Alle Tests prüfen entsprechend `aria-busy`/Label statt des rohen `disabled`-Attributs im Fehlerfall.

**Manueller Smoke-Test gegen `docker-compose up` (isolierter Stack, Projektname `us057smoke`, eigene Ports, nicht der gemeinsam genutzte Container-Stack):** durchgeführt mit Browser-Automatisierung.
- Login mit Seed-Admin (`admin@example.com` / `ChangeMe123!`, `mustChangePassword: true`): nach Klick auf „Anmelden“ erscheint ohne jede weitere Interaktion sofort das `PasswordChangeModalComponent` („Passwort ändern“-Dialog) — reproduziert und verifiziert.
- Login mit falschem Passwort: `POST /api/v1/auth/login` antwortet `401` (per Netzwerk-Log verifiziert), die Fehlermeldung „E-Mail oder Passwort ist falsch.“ erscheint sofort, der Button zeigt wieder „Anmelden“ statt „Wird angemeldet…“ — kein Hängenbleiben mehr.
- Der `mustChangePassword: false`-Erfolgspfad (Weiterleitung zu `/projects`) teilt denselben `next`-Handler und denselben `markForCheck()`-Aufruf wie der oben verifizierte `mustChangePassword: true`-Pfad und ist zusätzlich durch die automatisierten `HttpTestingController`-Tests (Akzeptanzkriterium 1/4) abgedeckt; ein frischer Nutzer ohne erzwungene Passwort-Änderung war im Seed-Datenbestand nicht ohne Weiteres verfügbar, daher kein zusätzlicher manueller Klickpfad dafür.

**„So probierst du es aus“:** `docker-compose up` (Basis-`docker-compose.yml`), `http://localhost:4200/login` öffnen, `admin@example.com` / `ChangeMe123!` eingeben, „Anmelden“ klicken → das Passwort-ändern-Modal erscheint sofort ohne weiteren Klick. Zum Fehlerfall: falsches Passwort eingeben → Fehlermeldung erscheint sofort, Button ist wieder normal bedienbar.

**Fund außerhalb des Scopes dieser Story (dokumentiert, nicht behoben — Scope-Grenze laut Story-Auftrag):** `PasswordChangeModalComponent.onSubmit()` (`frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts`) hat exakt denselben strukturellen Makel — kein `ChangeDetectorRef`/`markForCheck()` im `subscribe()`-Callback von `authService.changePassword(...)`. Dort dürfte der „Passwort ändern“-Button nach erfolgreicher Änderung ebenfalls im Verarbeitungs-Zustand hängen bleiben (nicht im Rahmen dieser Story reproduziert, da außerhalb der „Zu ändernde Datei“-Liste in Abschnitt 4). Zusätzlich bleibt fraglich, ob `LoginPageComponent.onPasswordChanged()` (reagiert auf das `(passwordChanged)`-Output-Event des Modals) selbst betroffen wäre, sollte das Modal seinerseits gefixt werden — auch das nicht geprüft, da außerhalb des Scopes. Empfehlung: beide Stellen in die von der PO in US-050 bereits vorgeschlagene Folge-Story „Zoneless-Reaktivität systematisch nachziehen“ aufnehmen (bzw. `PasswordChangeModalComponent` dort explizit ergänzen, da in US-050 noch nicht benannt).

**Neue/geänderte Dateien:**
- `frontend/src/app/features/auth/login-page/login-page.component.ts` (Fix)
- `frontend/src/app/features/auth/login-page/login-page.component.spec.ts` (ergänzt um `HttpTestingController`-basierte Erfolgs-/Fehlerfall-Tests, Akzeptanzkriterium 4)
- `frontend/src/app/features/auth/login-page/us-057-login-haengt-nach-erfolgreicher-anmeldung.spec.ts` (neu, Story-Test, 6 Testfälle in Dokument-Reihenfolge)

**Tests:** `ng test` (gesamter Workspace) 207/207 grün (vorher 199/199 vor dieser Story, +8 neue Tests). `ng lint` fehlerfrei. `ng build` erfolgreich (einzige Auffälligkeit: vorbestehende, unveränderte Bundle-Budget-Warnung „Initial exceeded maximum budget … 275.14 kB“, Budget 900 kB — kein neuer Regressionsbefund).

**Isolierter Story-Test-Befehl:** `ng test --include='**/us-057*.spec.ts'`

### Anmerkungen des QA-Agenten (2026-08-25)

**Unabhängige Verifikation:** Diff (`git diff origin/main HEAD`) gegen den tatsächlichen `main`-Stand geprüft (nicht nur die Übergabenotiz) — Umfang deckt sich mit der Übergabenotiz (`login-page.component.ts`, `login-page.component.spec.ts`, neuer Story-Test, Story-Doku, CHANGELOG). Jedes der 6 Akzeptanzkriterien einzeln gegen Code und Tests geprüft, siehe Checkliste oben — alle erfüllt.

**Mutationstest (Wirksamkeitsnachweis, zusätzlich zur bereits vom Dev-Agenten durchgeführten Prüfung):** Beide `markForCheck()`-Aufrufe erneut testweise entfernt und `ng test --include='**/us-057*.spec.ts'` ausgeführt — Akzeptanzkriterium 2 und 4 des Story-Tests schlagen zuverlässig fehl (2 von 6), die übrigen vier bleiben grün (erwartbar, da AC1/3/5/6 nicht ausschließlich von der DOM-Aktualisierung nach `flush()` abhängen). Nach Wiederherstellung des Fixes wieder 6/6 grün. Bestätigt unabhängig, dass der Story-Test den Bug tatsächlich reproduziert.

**Regression:** `ng test` (gesamter Workspace, nach `npm ci`) 207/207 grün. `ng lint` fehlerfrei. `ng build` erfolgreich, einzige Auffälligkeit die vorbestehende Bundle-Budget-Warnung (275.14 kB über 900 kB Budget) — kein neuer Regressionsbefund, identisch zum Stand vor dieser Story.

**Story-Test-Konvention (qa.md Abschnitt 1):** Alle 6 Testfälle in `us-057-login-haengt-nach-erfolgreicher-anmeldung.spec.ts` liegen in Dokument-Reihenfolge vor. Anmerkung ohne Blocker-Charakter: Akzeptanzkriterium 5 („Bestehende Tests bleiben grün bzw. werden ergänzt“) und Akzeptanzkriterium 6 („Story-Test existiert gemäß Konvention“) sind im Story-Dokument prozessualer/selbstreferenzieller Natur und nicht direkt als eigenständige DOM-Assertion testbar. Der Dev-Agent hat für beide sinnvolle, thematisch verwandte Ersatzprüfungen ergänzt (AC5: Regressionsnachweis für US-043-Doppelsubmit-Schutz und US-044-Sitzungshinweis; AC6: zusätzlicher End-zu-Ende-Nachweis Fehlversuch→korrigierter Versuch) statt sie unkommentiert auszulassen — inhaltlich vertretbare Interpretation, aber nicht wörtlich das im Story-Dokument stehende Kriterium. Kein Blocker, da AC5 zusätzlich durch den vollständigen `ng test`-Lauf (207/207) und AC6 durch die reine Existenz dieses konventionsgemäß benannten und geordneten Testfiles bereits erfüllt ist.

**Explorativer Test (Browser-Automatisierung gegen isolierten `docker-compose`-Stack, siehe unten):**
- Mehrfaches schnelles Klicken (3×) auf „Anmelden“ während eines laufenden, gültigen Login-Requests: laut Netzwerk-Log exakt **ein** `POST /api/v1/auth/login` — Doppel-Submit-Schutz aus US-043 bleibt durch den Fix intakt.
- **Neuer, aber außerhalb des Scopes dieser Story liegender Befund (Major, nicht blockierend für US-057):** Nach einer fehlgeschlagenen Anmeldung wird das `FormControl` des Passwort-Felds zwar programmatisch geleert (`Validators.required` greift nachweislich, Button bleibt korrekt gesperrt), das native `<input>`-Element des PrimeNG-`Password`-Feldes zeigt visuell jedoch weiterhin das zuvor eingegebene, falsche Passwort an (verifiziert per `document.getElementById('password').value` — Wert bleibt „wrong-password“ statt „“, obwohl `form.controls.password.value === ''`). Reproduktion: falsches Passwort eingeben, „Anmelden“ klicken, `401` abwarten — das Feld erscheint weiterhin mit Punkten befüllt; tippt man ohne vorheriges manuelles Leeren weiter, wird an den alten Wert angehängt statt ihn zu ersetzen. Betrifft ausschließlich die PrimeNG-`Password`-Komponente (ControlValueAccessor-Sync), nicht den in dieser Story behobenen `isSubmitting`/Verarbeitungs-Zustand — keines der 6 Akzeptanzkriterien von US-057 ist davon betroffen. Kein Regressions-Befund dieser Story (vor und nach dem Fix identisch reproduzierbar). Empfehlung: als eigenen Punkt in die von PO/Dev-Agent bereits vorgeschlagene Folge-Story „Zoneless-Reaktivität systematisch nachziehen“ aufnehmen, ggf. zusammen mit dem in der Dev-Agenten-Notiz oben dokumentierten `PasswordChangeModalComponent`-Fund.

**Manueller Smoke-Check gegen laufendes System (eigenständiger, isolierter `docker-compose`-Stack `us057qa`, Ports 4245/5045/5545, per Browser-Automatisierung):**
- Login mit Seed-Admin (`admin@example.com` / `ChangeMe123!`, `mustChangePassword: true`): `PasswordChangeModalComponent` erscheint sofort nach Klick auf „Anmelden“, ohne weitere Interaktion — verifiziert (Screenshot).
- Login mit falschem Passwort: `POST /api/v1/auth/login` antwortet `401` (Netzwerk-Log verifiziert), Fehlermeldung „E-Mail oder Passwort ist falsch.“ erscheint sofort, Button zeigt wieder „Anmelden“ (kein Hängenbleiben) — verifiziert (Screenshot).
- Stack nach Abschluss vollständig abgebaut (`docker compose down -v`), keine verbleibenden Container/Volumes.

**Fazit:** Alle 6 Akzeptanzkriterien erfüllt, keine Blocker/Critical-Findings. Ein Major-Finding (Passwort-Feld-Sichtbarkeit nach Fehlversuch) dokumentiert, bewusst nicht in dieser Story behoben (out of scope, kein AC betroffen, kein Regressionsbefund). PR mit Auto-Merge eröffnet.
