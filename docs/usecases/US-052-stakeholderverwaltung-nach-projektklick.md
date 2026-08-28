**ID:** US-052
**Titel:** Stakeholderverwaltung nach Projektauswahl zuverlässig anzeigen
**Bounded Context / Domain:** ProjectManagement / StakeholderManagement (Frontend-Shell-Schnittstelle)
**Abhängigkeiten:** US-019, US-025, US-026, US-044

**Status:** fertig (28.08.2026), PR siehe unten

---

### 1. User Story

Als **Projektmitglied** möchte ich nach einem Klick auf ein Projekt in der Projektübersicht zuverlässig die Stakeholderverwaltung dieses Projekts sehen — oder, falls ich fachlich keinen Zugriff habe, eine klare, verständliche Erklärung dafür, statt einer wirkungslos aussehenden, leeren Seite.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt `/projects/:id/stakeholders`: „Bei Klick auf ein Projekt in der Projektübersicht komme ich zu einer leeren Seite. Sollte die Stakeholderverwaltung bereits implementiert sein, würde ich diese hier erwarten.“
- **Verifikation durch PO (Code-Review):** Die Stakeholderverwaltung **ist** bereits vollständig implementiert (US-025/US-026, `StakeholderListComponent`) und in `app.routes.ts` korrekt unter `projects/:id/stakeholders` (Default-Redirect von `projects/:id`) eingehängt. Der berichtete leere Bildschirm ist damit kein fehlendes Feature, sondern ein konkreter, im Code nachvollziehbarer Fehlerfall:
  1. `roleGuard` (`core/guards/role.guard.ts`) prüft die Rolle des Nutzers **in diesem Projekt** per eigenem `GET`-Aufruf (`ProjectsService.getProject`). Hat der Nutzer **keine** Mitgliedschaft in diesem Projekt (z. B. ein Systemadmin, der ein Projekt über `/admin/projects` angelegt, sich selbst aber nicht als Mitglied zugewiesen hat — laut PRD Abschnitt 2.3 fachlich korrekt kein Zugriff), schlägt dieser Aufruf fehl bzw. liefert eine Rolle außerhalb der erlaubten Liste; der Guard leitet dann korrekt auf die Kind-Route `/projects/:id/access-denied` um.
  2. **Der eigentliche Fehler:** `ProjectWorkspaceLayoutComponent` (Elternroute `projects/:id`) führt in seiner eigenen `ngOnInit()` **unabhängig vom Guard einen zweiten, identischen** `getProject()`-Aufruf aus, um Titel/Rollen-Badge zu befüllen. Für denselben nicht-berechtigten Nutzer schlägt **dieser** Aufruf ebenfalls fehl → `loadError = LOAD_ERROR_MESSAGE` (Text: „Daten konnten nicht geladen werden. Bitte versuche es erneut.“) und `project` bleibt `null`.
  3. Das Template `project-workspace-layout.component.html` rendert Header, Tab-Navigation **und den `<router-outlet>`** ausschließlich innerhalb von `@if (project) { … }`. Da `project` in diesem Fall `null` bleibt, wird der gesamte Block — inklusive des `<router-outlet>`, in dem die vom Guard korrekt angesteuerte `AccessDeniedComponent` mit ihrer erklärenden Meldung („Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle in diesem Projekt.“) liegen würde — **gar nicht gerendert**. Sichtbar ist für den Nutzer ausschließlich die knappe, optisch unauffällige, generische `LOAD_ERROR_MESSAGE`-Zeile, keine Seiten-Chrome, keine Erklärung, keine Stakeholderverwaltung — exakt das vom Bug-Melder beschriebene „leere Seite“-Erlebnis.
  4. Dieselbe Doppel-Fetch-Falle greift analog auch für Nutzer, die zwar berechtigt sind, deren Requests aber (siehe US-049) beim allerersten Laden nach Systemstart ungewöhnlich lange dauern — auch dort könnte der zweite, redundante Aufruf unnötig zur wahrgenommenen Verzögerung/Fehleranfälligkeit beitragen.
- **Relevant für DDD:** Reine Presentation-Schicht (Angular Guard + Layout-Komponente), keine Backend-Änderung nötig.

### 3. Akzeptanzkriterien

- [x] Ein Projektmitglied mit gültiger Rolle sieht nach Klick auf sein Projekt zuverlässig die Stakeholderverwaltung (`StakeholderListComponent`) als Standard-Tab — keine Regression zu US-025/US-026.
- [x] Ein Nutzer ohne Mitgliedschaft im gewählten Projekt (inkl. Systemadmin ohne eigene Zuweisung) sieht die vorhandene, erklärende „Kein Zugriff“-Meldung (`AccessDeniedComponent`) — nicht die generische, nichtssagende Lade-Fehlermeldung und nicht nur eine leere/kaum sichtbare Textzeile.
- [x] `ProjectWorkspaceLayoutComponent` führt keinen redundanten, mit dem Guard doppelten `getProject()`-Aufruf mehr aus, dessen Fehlschlag das Rendering des `router-outlet` verhindert (z. B. durch Wiederverwendung des vom Guard bereits geladenen Projekts, oder durch Entkopplung: Header/Tabs-Fehler blockieren nicht mehr das Rendering des `router-outlet`).
- [x] Ein automatisierter Test bildet exakt dieses Szenario ab: Guard leitet zu `access-denied` um, `ProjectWorkspaceLayoutComponent`s eigener Ladevorgang schlägt (zeitgleich) fehl — Ergebnis: die „Kein Zugriff“-Meldung ist sichtbar im DOM, nicht `LOAD_ERROR_MESSAGE` anstelle der gesamten Seite.
- [x] Bestehende Tests zu US-019/US-025/US-026/US-044 (insbesondere der `project-workspace-layout.component.ts (ngOnInit)`-Fall in `us-044-http-error-handling.spec.ts`) bleiben grün bzw. werden präzisiert, falls sich ihr bisheriges Verhalten (kompletter `loadError`-Block statt Router-Outlet) durch den Fix ändert — CLAUDE.md Abschnitt 3 Definition of Done gilt unverändert (Test anpassen, nicht entfernen).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts` / `.html`
- `frontend/src/app/core/guards/role.guard.ts` (ggf. zur Wiederverwendung des bereits geladenen Projekts, z. B. über einen Route-`resolve`r oder einen einfachen In-Memory-Cache je Navigation, statt zwei unabhängiger Requests)
- `frontend/src/app/core/interceptors/us-044-http-error-handling.spec.ts` (betroffener Testfall, siehe oben)

**Wichtige Invarianten:**
- Die serverseitige Autorisierung (US-007) bleibt unverändert die eigentliche Sicherheitsgrenze — diese Story behebt ausschließlich die clientseitige Darstellung/Orchestrierung.
- Keine Änderung an der Sichtbarkeitsmatrix für Map-/Verteiler-Tab (US-019 Akzeptanzkriterium 3/4).

### Anmerkungen des Product Owners

Diese Story wurde bewusst **nicht** als „Stakeholderverwaltung fehlt“ formuliert (das Feature existiert bereits vollständig, siehe US-025/US-026), sondern als der tatsächlich im Code gefundene Anzeige-Fehler — CLAUDE.md Abschnitt 6: „keine stille Feature-Erweiterung, kein stilles Weglassen“. Sollte die Reproduktion beim Dev-Agenten einen anderen Auslöser als den hier beschriebenen Doppel-Fetch zeigen, ist das entsprechend zu dokumentieren.

### Anmerkungen des Agenten

**Die PO-Diagnose (Doppel-Fetch blockiert `router-outlet`) war korrekt, aber unvollständig — die tatsächlich dominante Ursache ist eine Endlosschleife aus Redirects, real reproduziert.** Bei der Live-Verifikation gegen einen echten `docker-compose`-Stack (nicht nur Unit-Tests) zeigte sich: `roleGuard` hängt auf der **Elternroute** `projects/:id`, deren eigenes Kind `access-denied` gleichzeitig das Umleitungsziel des Guards bei fehlender Berechtigung ist. Da ein von einem Guard zurückgegebener `UrlTree` eine komplett neue Navigation auslöst, wird derselbe Guard für JEDE Navigation zu einem Kind dieser Elternroute erneut ausgewertet — auch für sein eigenes Umleitungsziel. Für einen abgelehnten Nutzer bedeutet das: Guard scheitert → Redirect zu `access-denied` → neue Navigation → Guard scheitert erneut (dieselbe Anfrage liefert dasselbe Ergebnis) → Redirect zu `access-denied` → … Real reproduziert per Browser-Automatisierung gegen einen isolierten `docker-compose`-Stack: **über 1000 identische `GET /api/v1/projects/{id}`-Requests binnen weniger Sekunden**, die Seite blieb dauerhaft leer, die Browser-Adresszeile aktualisierte sich nie. Das erklärt das gemeldete Symptom sogar vollständiger als der ursprüngliche `@if(project)`-Befund: Ohne diesen Fix hätte selbst eine korrekte Entkopplung des `router-outlet` nichts genützt, da `ProjectWorkspaceLayoutComponent` in der Schleife nie zur Ruhe kommt und daher nie instanziiert wird.

**Behoben in `role.guard.ts`:** Der Guard prüft jetzt zuerst `state.url.endsWith('/access-denied')` und erlaubt die Aktivierung in diesem Fall sofort, ohne eigenen `getProject()`-Aufruf — sicher, da `AccessDeniedComponent` keine projektspezifischen Daten anzeigt und für jeden authentifizierten Nutzer uneingeschränkt erreichbar sein muss, um als Fehler-Fallback zu funktionieren. Per Mutationstest verifiziert (Fix testweise entfernt, `us-052-*`/`role.guard.spec.ts` schlagen zuverlässig fehl bzw. hängen; mit Fix wieder grün).

**Ergänzend zur ursprünglichen PO-Diagnose umgesetzt (Akzeptanzkriterium 3, „Entkopplung"-Variante):** `<router-outlet>` in `project-workspace-layout.component.html` liegt jetzt außerhalb von `@if (project)`, damit ein fehlgeschlagener eigener `getProject()`-Aufruf das Rendering der Kind-Route nicht mehr blockiert. Die generische `LOAD_ERROR_MESSAGE`-Zeile wird zusätzlich gezielt unterdrückt (`showLoadError`-Getter), wenn `router.url` bereits auf `/access-denied` zeigt — sonst würde sie redundant über der bereits erklärenden `AccessDeniedComponent` erscheinen (Akzeptanzkriterium 2: „nicht die generische … Lade-Fehlermeldung"). Der redundante `getProject()`-Aufruf selbst bleibt bewusst bestehen (keine Wiederverwendung/Resolver-Umbau, um den Diff klein und risikoarm zu halten — beide in Akzeptanzkriterium 3 explizit zugelassenen Varianten „Wiederverwendung ODER Entkopplung" sind gleichwertig).

**Zusätzlicher, bei der Live-Verifikation entdeckter Fund im selben, ohnehin geänderten `ngOnInit()`:** Für einen BERECHTIGTEN Nutzer blieben Header und Tab-Navigation gegen den echten Stack dauerhaft unsichtbar, obwohl `project` intern korrekt gesetzt wurde — exakt dasselbe aus US-050/US-057/US-051 bekannte Muster (fehlendes `changeDetectorRef.markForCheck()` im `subscribe()`-Callback, zoneless Frontend). Unit-Tests mit synchronem `of(...)` deckten das nicht auf (die ohnehin fällige erste Change-Detection-Runde erfasst eine synchron eintreffende Antwort noch); erst die reale Async-Latenz eines echten HTTP-Requests legte es offen. Da dieselbe Methode ohnehin Teil dieser Story ist (nicht nur ein zufälliger Fund in unverändertem Code), wurde `markForCheck()` hier direkt mitbehoben, statt eine weitere Folge-Story dafür anzulegen — **entsprechend aus der Fundstellen-Liste von `US-058-zoneless-reaktivitaet-systematisch-nachziehen.md` entfernt.**

**Verifikation:** `ng test` (gesamter Workspace) 218/218 grün (vorher 213/213, +5 neue Tests: 4 im neuen `us-052-*.spec.ts`, 1 in `role.guard.spec.ts`). `ng lint` fehlerfrei. `ng build` erfolgreich (einzige Auffälligkeit: vorbestehende, unveränderte Bundle-Budget-Warnung, kein neuer Regressionsbefund). `dotnet test` unverändert grün (kein Backend-Anteil in dieser Story). Bestehende `role.guard.spec.ts`/`app.routes.spec.ts`-Tests wurden präzisiert (realistisches `RouterStateSnapshot` mit `url` statt `{} as never`, das durch die neue `state.url`-Prüfung sonst zur Laufzeit fehlgeschlagen wäre) — Verhalten unverändert, nur der Test-Fake realistischer.

**Manueller Smoke-Test gegen `docker-compose up` (isolierter Stack, Projektname `us052smoke`, eigene Ports 4252/5052/5552):**
- Berechtigter Nutzer (Rolle `PL`): Projekt-Titel, Rollen-Badge und Tab-Navigation erscheinen korrekt, Stakeholder-Liste lädt als Standard-Tab — verifiziert (Screenshot).
- Nicht-berechtigter Nutzer (Systemadmin ohne Projektzuweisung): URL wechselt korrekt zu `/projects/{id}/access-denied`, „Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle in diesem Projekt." erscheint, keine generische Fehlermeldung, keine leere Seite — verifiziert (Screenshot). Netzwerk-Log bestätigt genau 2 `GET /api/v1/projects/{id}`-Aufrufe (Guard + Layout), keine Schleife mehr (vorher: >1000 binnen Sekunden).
- Stack nach Abschluss vollständig abgebaut (`docker compose down -v`), keine verbleibenden Container/Volumes.

**„So probierst du es aus":** `docker-compose up`, als Systemadmin ein neues Projekt über `/admin/projects` anlegen (ohne Mitgliedschaft), dann direkt zu `/projects/{id}` navigieren → „Kein Zugriff …"-Meldung erscheint sofort, URL landet auf `/access-denied`, keine leere Seite, kein hängender Ladezustand.

**Neue/geänderte Dateien:**
- `frontend/src/app/core/guards/role.guard.ts` (Fix: Endlosschleife)
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts` / `.html` (Fix: Entkopplung `router-outlet`, unterdrückte Doppelmeldung, `markForCheck()`)
- `frontend/src/app/core/guards/role.guard.spec.ts` (neuer Testfall + präzisierte Fakes)
- `frontend/src/app/app.routes.spec.ts` (präzisierte Fakes)
- `frontend/src/app/features/workspace/project-workspace-layout/us-052-stakeholderverwaltung-nach-projektklick.spec.ts` (neu, Story-Test, 4 Testfälle)
- `docs/usecases/US-052-stakeholderverwaltung-nach-projektklick.md` (diese Datei)
- `docs/usecases/US-058-zoneless-reaktivitaet-systematisch-nachziehen.md` (Fundstelle entfernt, siehe oben)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
