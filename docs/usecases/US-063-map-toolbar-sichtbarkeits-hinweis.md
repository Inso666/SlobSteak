**ID:** US-063
**Titel:** Toolbar-Hinweistext „X von Y Stakeholdern sichtbar“ auf der Map ergänzen
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-032, US-062

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle** möchte ich in der Map-Toolbar auf einen Blick sehen, wie viele der Stakeholder meines Projekts in der aktuell gewählten Perspektive überhaupt sichtbar/bewertet sind, damit mir klar ist, dass fehlende Punkte an fehlenden Bewertungen liegen und nicht an einem Anzeigefehler.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #70](https://github.com/Inso666/SlobSteak/issues/70), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §1 (Toolbar-Layout).
- **Ist-Zustand:** Die Toolbar (`stakeholder-map-page.component.html`) enthält aktuell nur „Meine Sicht“, den Vergleichsmodus-Schalter und (bei aktivem Vergleichsmodus) „Vergleichen mit“. Der laut SPEC-04 §1 vorgesehene rechtsbündige Info-Text `{{ visibleCount }} von {{ totalCount }} Stakeholdern sichtbar` fehlt vollständig.
- **Datenlage:** `StakeholderMapPageComponent.points` (bzw. `comparisonEntries` im Vergleichsmodus) enthält bereits ausschließlich die in der gewählten Perspektive sichtbaren/bewerteten Stakeholder (`visibleCount` = `points.length` bzw. Anzahl der Comparison-Entries). Eine Gesamtzahl aller (nicht-gelöschten) Stakeholder des Projekts (`totalCount`) wird auf dieser Seite aktuell nicht geladen — muss ergänzt werden, z. B. über die bereits bestehende `StakeholdersService.listStakeholders(projectId)` (siehe `stakeholder-list.component.ts` für das etablierte Verwendungsmuster).
- **Relevant für DDD:** Reine Presentation-Schicht; ggf. ein zusätzlicher, bereits bestehender Read-Endpoint-Aufruf (`GET /api/v1/projects/{id}/stakeholders`), kein neuer Endpoint nötig.

### 3. Akzeptanzkriterien

- [x] Rechts in der Toolbar erscheint ein Hinweistext im Format „{{visibleCount}} von {{totalCount}} Stakeholdern sichtbar“ (SPEC-04 §1: `span.info-text.mono`).
- [x] `visibleCount` entspricht der Anzahl der in der aktuell gewählten Perspektive (bzw. im Vergleichsmodus: primäre Perspektive) tatsächlich angezeigten Punkte.
- [x] `totalCount` entspricht der Gesamtzahl aller nicht-gelöschten Stakeholder des Projekts, unabhängig von deren Bewertungsstatus.
- [x] Der Hinweistext aktualisiert sich zuverlässig bei Wechsel der Perspektive bzw. des Vergleichsmodus (inkl. korrekter Change-Detection-Markierung, siehe US-058/US-059 — kein erneutes „stumm hängenbleibendes“ UI).
- [x] Automatisierter Test belegt Text/Werte für mindestens: alle Stakeholder bewertet (`visibleCount === totalCount`), sowie mindestens ein unbewerteter Stakeholder vorhanden (`visibleCount < totalCount`).
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests von `StakeholderMapPageComponent` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.ts` — neues Feld/Getter `totalCount` (Ladeaufruf via `StakeholdersService`, analog zum bestehenden Ladeaufruf der Map-Punkte selbst) sowie `visibleCount` (aus vorhandenem `points`/`comparisonEntries` ableitbar).
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.html` — Toolbar (`<form class="toolbar">`) um den Info-Text ergänzen, rechtsbündig (SPEC-04 §1 nennt einen `div.spacer`-Trenner davor).
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.css` — `.info-text`/`.mono`-Klasse gemäß SPEC-00 (mono-Schrift für Kennzahlen, bereits an anderer Stelle im Produkt verwendet, siehe SPEC-00 §1.2).

**Wichtige Invarianten:**
- Kein neuer Backend-Endpoint — Wiederverwendung des bestehenden Stakeholder-Listen-Endpoints (US-025).
- `totalCount`-Ladeaufruf zählt ausschließlich nicht-soft-gelöschte Stakeholder (Standardverhalten des bestehenden Endpoints).

### Anmerkungen des Product Owners

Kleine, klar abgegrenzte Ergänzung — bewusst nicht mit den übrigen Map-Issues zusammengelegt, da eigenständige Ursache (fehlendes Feature-Detail statt Bug in bestehendem Code).

### Status

Fertig am 30.08.2026. PR: `feature/US-063-map-toolbar-sichtbarkeits-hinweis` → `main` (siehe PR-Beschreibung für Details).

**So probierst du es aus:**

1. `docker-compose up -d --build`, dann als Systemadmin (`admin@example.com` / initiales Passwort aus `SEED_ADMIN_PASSWORD`, Passwortänderung beim ersten Login erzwungen) unter `http://localhost:4200` anmelden.
2. Im Admin-Bereich ein Projekt anlegen, dich selbst (oder einen Testnutzer) als `PL` zuweisen, mindestens drei Stakeholder anlegen.
3. Im Projekt-Workspace auf den Tab „Map“ wechseln und für zwei der drei Stakeholder eine Bewertung (Einfluss/Interesse) in der Perspektive „PL“ erfassen (Stakeholder-Detailseite, Tab Assessment), den dritten unbewertet lassen.
4. Zurück zur Map: rechts in der Toolbar erscheint „2 von 3 Stakeholdern sichtbar“ (mono-Schrift, gedämpfte Textfarbe).
5. Auch den dritten Stakeholder bewerten und die Map neu laden: der Text ändert sich auf „3 von 3 Stakeholdern sichtbar“.
6. In „Meine Sicht“ auf eine andere Perspektive (z. B. „Architect“) wechseln, in der noch keine Bewertungen vorliegen: der Text aktualisiert sich sofort auf „0 von 3 Stakeholdern sichtbar“ und die Empty-State-Meldung erscheint — kein „hängenbleibender“ alter Wert.
7. Vergleichsmodus aktivieren und eine Vergleichsperspektive wählen: der Text bezieht sich weiterhin auf die primäre Perspektive („Meine Sicht“), nicht auf die Vergleichsperspektive.

Story-Tests isoliert ausführen: `ng test --include='**/us-063-map-toolbar-sichtbarkeits-hinweis.spec.ts'` (aus `frontend/`).

### Anmerkungen des Agenten

Gemäß CLAUDE.md Abschnitt 6 dokumentiert (keine stillen Abweichungen):

1. **Unabhängiger Ladeaufruf für `totalCount`, nicht Teil von `reload()`.** `totalCount` wird über einen eigenen, von `ngOnInit` aus einmalig ausgelösten `StakeholdersService.listStakeholders(projectId)`-Aufruf geladen, unabhängig vom Map-Punkte-Ladezyklus (`reload()`, der bei jedem Perspektiv-/Vergleichsmodus-Wechsel erneut läuft). Das entspricht der Story-Datenlage („Gesamtzahl aller nicht-gelöschten Stakeholder des Projekts, unabhängig von deren Bewertungsstatus“) — die Gesamtzahl ändert sich nicht mit der gewählten Perspektive, ein wiederholter Request bei jedem Perspektivwechsel wäre unnötig.
2. **`visibleCount` als reiner Getter statt eigenem Zustandsfeld.** Wie in Abschnitt 4 der Story-Datei vorgeschlagen, aus `points.length` bzw. `comparisonEntries.length` abgeleitet (abhängig von `filterForm.controls.compareMode.value`) — kein zusätzlicher, redundant zu pflegender State, der bei jeder Punkt-Mutation (z. B. optimistisches Drag-Update) separat synchron gehalten werden müsste.
3. **`markForCheck()` nur für den neuen, unabhängigen HTTP-Aufruf ergänzt.** Der zonelose Reaktivitäts-Grundsatz aus US-058/US-059 verlangt `markForCheck()` nach jeder asynchronen Zustandsänderung außerhalb eines Angular-eigenen Event-Bindings. Für die `totalCount`-Ladung (eigener `subscribe`-Callback) wurde das ergänzt. Für `visibleCount` selbst war keine zusätzliche `markForCheck()`-Stelle nötig: Alle Zustandsänderungen, von denen `visibleCount` abhängt (`points`, `comparisonEntries`, `compareMode`), lösen bereits an anderer Stelle entweder ein Angular-eigenes Event-Binding aus (Formular-Toggle/-Select, das selbst einen Change-Detection-Tick anstößt) oder einen bereits bestehenden `markForCheck()`-Aufruf im `reload()`-Subscribe-Callback — dasselbe etablierte Muster wie beim Rest der Komponente.
4. **Bestehende Map-Story-Tests um einen `StakeholdersService`-Mock ergänzt.** `us-032-map-ui.spec.ts`, `us-034-map-vergleich-ui.spec.ts`, `us-036-map-dragdrop-ui.spec.ts` und `us-062-map-tastatur-positionierung-ankuendigen.spec.ts` instanziieren `StakeholderMapPageComponent`, ohne `StakeholdersService` zu mocken. Ohne eigenen Provider verwendet Angular die reale, `providedIn: 'root'` registrierte `StakeholdersService`-Instanz, die daraufhin einen tatsächlichen (unmockierten) HTTP-Request gegen den Karma-Testserver auslöste (sichtbar als `404`-Warnung im Testlauf) — technisch bestanden die Tests dennoch (kein Error-Handler am `subscribe`, daher kein harter Fehlschlag), das widerspricht aber `.claude/agents/frontend.md` Abschnitt 4 („HTTP-Aufrufe werden über `HttpTestingController` gemockt, nie gegen das echte Backend getestet“). Allen vier Dateien wurde daher ein `StakeholdersService`-Spy mit `listStakeholders`-Rückgabewert ergänzt (Länge passend zu den jeweils in der Datei bereits verwendeten `MapPoint`-Arrays) — keine der vier Dateien trifft eine eigene Aussage über `totalCount`/`visibleCount`, sodass die konkrete Anzahl für deren jeweilige Akzeptanzkriterien irrelevant bleibt.
5. **`ng test`/`ng lint`/`ng build` Ergebnis.** Vollständige Angular-Testsuite (`ng test --watch=false --browsers=ChromeHeadless`): 450/450 grün (davon 6 im neuen Story-Test `us-063-map-toolbar-sichtbarkeits-hinweis.spec.ts`), keine `404`-Netzwerk-Warnungen mehr im Testlauf. `ng lint`: fehlerfrei. `ng build`: erfolgreich (Exit 0; das bestehende, von dieser Story unabhängige Bundle-Budget-Warning war bereits vor dieser Story vorhanden und betrifft die Gesamt-Bundle-Größe, nicht den hier geänderten, lazy geladenen `stakeholder-map-page-component`-Chunk).
6. **Kein Docker-Compose-Smoke-Check gegen den geteilten Gesamtsystem-Stack.** Analog zur Begründung in US-066 „Anmerkungen des Agenten" Punkt 5: der auf diesem Rechner laufende, geteilte `docker-compose`-Stack wird parallel von anderen, gleichzeitig aktiven Story-Agenten in eigenen Worktrees verwendet; ein Rebuild des `frontend`-Containers hätte diesen Stack für alle unterbrochen. Da diese Story ausschließlich Presentation-Layer-Text/-Berechnung betrifft und durch `ng test` (inkl. `us-063-map-toolbar-sichtbarkeits-hinweis.spec.ts`, das den final gerenderten DOM-Text in Headless-Chrome exakt prüft) vollständig abgedeckt ist, wurde auf den manuellen Docker-Compose-Smoke-Check verzichtet und durch die obige „So probierst du es aus"-Anleitung ersetzt, die nach dem PR-Merge nachvollzogen werden kann.
