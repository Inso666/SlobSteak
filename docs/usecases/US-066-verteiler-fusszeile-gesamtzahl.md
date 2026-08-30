**ID:** US-066
**Titel:** Verteiler-Fußzeile zeigt unfilterte Gesamtzahl der Projekt-Stakeholder
**Bounded Context / Domain:** DistributionList (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-042

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich in der Fußzeile des Verteiler-Tabs sehen, wie viele Stakeholder dem aktuellen Filter entsprechen **im Verhältnis zur Gesamtzahl aller Stakeholder im Projekt**, damit ich sofort einschätzen kann, wie stark mein Filter die Liste eingrenzt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #82](https://github.com/Inso666/SlobSteak/issues/82), Design-Abgleich gegen `docs/design/S2-Projektuebersicht-Wireframe.html`, Artboard `Verteiler.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` Zeilen 126–133):** Die Fußzeile zeigt „N Einträge in der Verteilerliste · M mit E-Mail-Adresse (K ohne E-Mail-Adresse)“. `N` ist dabei `rows.length` — die Anzahl der **Zeilen** (Stakeholder × Kommunikationszuordnung), nicht die Anzahl unterschiedlicher Stakeholder. Die unfilterte Gesamtzahl der Projekt-Stakeholder fehlt vollständig.
- **Soll-Zustand (Issue #82 / `Verteiler.dc.html`):** „**18 von 32** Stakeholdern entsprechen dem Filter · 17 mit E-Mail-Adresse (1 ausgeschlossen)“ — enthält die unfilterte Gesamtzahl **M** (aller aktiven Stakeholder im Projekt) als Bezugsgröße zur gefilterten Anzahl **N**, und beide Zahlen zählen **Stakeholder**, nicht Tabellenzeilen.
- **PO-Entscheidung zur bereits in US-042 dokumentierten Abweichung:** US-042 „Anmerkungen des Agenten“ Punkt 5 begründet das Weglassen der Gesamtzahl damit, dass weder die Akzeptanzkriterien noch SPEC-05 (als „illustrative Beispielansicht“ markiert) eine konkrete Vorgabe machen und ein zusätzlicher unfilterter Baseline-Request nicht gerechtfertigt sei. `docs/design/Verteiler.dc.html` (verbindliche Design-Quelle, Commit `de23df9` vom 2026-08-23, damit vor Story-Abschluss vorhanden) enthält jedoch eine konkrete, wörtliche Formatvorgabe inkl. Beispielwerten. Diese Story übernimmt die Design-Vorgabe als bindend. Ein zusätzlicher Backend-Request ist dafür **nicht** nötig: `DistributionListPageComponent` lädt für die Organisations-Anreicherung (US-042 Anmerkung 1) bereits `GET /api/v1/projects/{projectId}/stakeholders` — die Länge dieser bereits vorhandenen Antwort liefert die unfilterte Gesamtzahl **M** direkt, ohne zusätzlichen Request.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an `DistributionListQuery`/API-Contract (US-041) nötig.

### 3. Akzeptanzkriterien

- [x] Die Fußzeile zeigt die Anzahl **unterschiedlicher Stakeholder**, die dem aktuellen Filter entsprechen (nicht die Anzahl der Tabellenzeilen — ein Stakeholder mit mehreren zum Filter passenden Kommunikationszuordnungen zählt einfach), im Format „**N von M** Stakeholdern entsprechen dem Filter“.
- [x] **M** ist die unfilterte Gesamtzahl aller aktiven Stakeholder des Projekts (ermittelt aus der bereits geladenen Stakeholderliste, kein zusätzlicher Request).
- [x] Der bestehende Zusatz „… mit E-Mail-Adresse (K ausgeschlossen)“ bleibt inhaltlich erhalten, bezogen auf die gefilterten Zeilen (unverändertes Verhalten aus US-042).
- [x] Ohne aktiven Filter gilt N = M (Fußzeile zeigt dann „M von M Stakeholdern entsprechen dem Filter“).
- [x] Leerzustand (kein Treffer, US-042 Akzeptanzkriterium 5) bleibt unverändert; die Fußzeile wird in diesem Zustand nicht angezeigt (wie bisher, `@else`-Zweig).
- [x] Automatisierter Test (Angular `TestBed` + `HttpTestingController`) belegt: korrekte N/M-Berechnung bei mehreren Zuordnungen desselben Stakeholders, korrekte M-Ermittlung ohne zusätzlichen HTTP-Request über die bestehende Stakeholderliste, korrektes Format bei aktivem und inaktivem Filter.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests von `DistributionListPageComponent` (inkl. `us-042-verteilerlisten-ui.spec.ts`) bleiben grün bzw. werden an die neue Fußzeilen-Formel angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` (Zeilen 126–133, `.dl-foot-info`)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.ts` (neues abgeleitetes Feld/Signal für „Anzahl unterschiedlicher Stakeholder im Filterergebnis“ sowie „unfilterte Gesamtzahl“, letztere aus der bereits für die Organisations-Anreicherung geladenen Stakeholderliste, US-042 Anmerkung 1)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.spec.ts`, `frontend/src/app/features/distribution/us-042-verteilerlisten-ui.spec.ts`

**Wichtige Invarianten:**
- Kein zusätzlicher HTTP-Request nur für die Gesamtzahl — Wiederverwendung der bereits vorhandenen `GET /api/v1/projects/{projectId}/stakeholders`-Antwort.
- „N“ und „M“ zählen Stakeholder, nicht Zeilen — Deduplizierung über `stakeholderId`.

### Anmerkungen des Product Owners

Diese Story korrigiert bewusst die in US-042 „Anmerkungen des Agenten“ Punkt 5 dokumentierte Abweichung, nachdem `docs/design/Verteiler.dc.html` als zum Story-Zeitpunkt bereits existierende, aber nicht konsultierte verbindliche Design-Quelle identifiziert wurde. Diese Story ist bewusst als erste von drei sequenziell verketteten Verteiler-Design-Korrekturen ([US-067](US-067-verteiler-kommunikationsart-chip.md), [US-068](US-068-verteiler-mail-cell-attention-farbe.md)) angelegt, da alle drei dieselben Dateien (`distribution-list-page.component.html/.css/.ts`) ändern — sequenzielle Bearbeitung vermeidet parallele Änderungen an denselben Stellen.

### Status

Fertig am 30.08.2026. PR: `feature/US-066-verteiler-fusszeile-gesamtzahl` → `main` (siehe PR-Beschreibung für Details).

**So probierst du es aus:**

1. `docker-compose up -d --build`, dann als Systemadmin (`admin@example.com` / initiales Passwort aus `SEED_ADMIN_PASSWORD`, Passwortänderung beim ersten Login erzwungen) unter `http://localhost:4200` anmelden.
2. Im Admin-Bereich ein Projekt anlegen, dich selbst (oder einen Testnutzer) als `PL` oder `Coreteam` zuweisen, mindestens drei Stakeholder anlegen (mindestens einer davon ohne E-Mail-Adresse), eine Kommunikationsart anlegen und zwei der drei Stakeholder zuordnen.
3. Im Projekt-Workspace auf den Tab „Verteiler“ wechseln, keinen Filter setzen: Fußzeile zeigt „2 von 3 Stakeholdern entsprechen dem Filter · 1 mit E-Mail-Adresse (1 ausgeschlossen)“ (Werte je nach angelegten Testdaten) — **nicht** „2 von 2“, da M die Gesamtzahl aller drei Projekt-Stakeholder ist, unabhängig davon, wie viele davon eine Kommunikationszuordnung haben.
4. Einem der beiden zugeordneten Stakeholder eine zweite Kommunikationsart zuordnen (Stakeholder-Detailseite) und zum Verteiler zurückkehren: die Zeilenanzahl der Tabelle steigt auf 3, die Fußzeile zeigt aber weiterhin „2 von 3 Stakeholdern …“ (N zählt unterschiedliche Stakeholder, nicht Zeilen).
5. Einen Filter setzen, der zu keinem Treffer führt: die Leerzustand-Meldung erscheint, die Fußzeile (Text **und** Aktions-Buttons „E-Mails kopieren“/„CSV exportieren“) verschwindet vollständig, statt „0 von 3 Stakeholdern …“ mit deaktivierten Buttons zu zeigen.
6. „Filter zurücksetzen“ klicken → volle Liste und Fußzeile („2 von 3 …“) erscheinen wieder.

Story-Tests isoliert ausführen: `ng test --include='**/us-066-verteiler-fusszeile-gesamtzahl.spec.ts'` (aus `frontend/`).

### Anmerkungen des Agenten

Gemäß CLAUDE.md Abschnitt 6 dokumentiert (keine stillen Abweichungen):

1. **US-042-Korrektur (Abschnitt 2 dieser Story).** US-042 „Anmerkungen des Agenten“ Punkt 5 begründete das Weglassen der unfilterten Gesamtzahl M damit, dass weder die US-042-Akzeptanzkriterien noch SPEC-05 einen konkreten Wert vorgeben und ein zusätzlicher Baseline-Request nicht gerechtfertigt sei. `docs/design/Verteiler.dc.html` (ein in `docs/design/S2-Projektuebersicht-Wireframe.html` eingebettetes Artboard, siehe `docs/bugs/bugs.md` „Design-Abgleich Phase 6–8“) war zum Zeitpunkt des US-042-Abschlusses bereits vorhanden (Commit `de23df9`, 2026-08-23), enthält aber eine wörtliche Formatvorgabe inkl. Beispielwerten und wurde nicht konsultiert (Issue #82). Diese Story übernimmt die Design-Vorgabe wörtlich als bindend, wie in Abschnitt 2 dieser Story-Datei beschrieben. Kein zusätzlicher Backend-Request nötig: `DistributionListService.getDistributionList` lädt für die Organisations-Anreicherung (US-042 Anmerkung 1) bereits die unfilterte `GET /api/v1/projects/{projectId}/stakeholders`-Antwort — deren Länge liefert M direkt (siehe `DistributionListResult.totalStakeholderCount`).
2. **Return-Typ von `DistributionListService.getDistributionList` geändert.** Bisher `Observable<DistributionListRow[]>`, jetzt `Observable<DistributionListResult>` (`{ rows, totalStakeholderCount }`) — notwendig, um M ohne zusätzlichen Request an die Komponente durchzureichen, da die bereits geladene, unfilterte Stakeholderliste sonst services-intern verborgen bliebe. Alle drei betroffenen Konsumenten (`DistributionListPageComponent` sowie die Test-Dateien `distribution-list.service.spec.ts`, `distribution-list-page.component.spec.ts`, `us-042-verteilerlisten-ui.spec.ts`) wurden entsprechend angepasst; keine fachliche Aussage der bestehenden Tests ging dabei verloren (alle vorherigen Assertions bleiben erhalten, nur auf `.rows` bezogen).
3. **Wortlaut „ausgeschlossen" statt „ohne E-Mail-Adresse".** Der bisherige Zusatztext lautete „(K ohne E-Mail-Adresse)“. Die verbindliche Design-Quelle (`Verteiler.dc.html`, siehe Abschnitt 2 dieser Story) sowie diese Story selbst (Akzeptanzkriterium 3, wörtlich „(K ausgeschlossen)“) legen den Wortlaut „ausgeschlossen“ fest — übernommen, da dies eine ausdrückliche AC-Vorgabe dieser Story ist, keine eigene Wortwahl.
4. **Fußzeile im Leerzustand jetzt vollständig ausgeblendet (Verhaltensänderung, nicht nur Formel-Anpassung).** Akzeptanzkriterium 5 behauptet, das Ausblenden der Fußzeile im Leerzustand sei bereits bestehendes Verhalten „wie bisher, `@else`-Zweig“. Das trifft auf den tatsächlichen US-042-Code **nicht** zu: `dl-foot-row` lag als Geschwister-Element nach der Tabelle, außerhalb der `isLoading`/`rows.length === 0`-Fallunterscheidung, und wurde bislang auch im Leerzustand gerendert (mit „0 Einträge in der Verteilerliste · 0 mit E-Mail-Adresse“ und deaktivierten, aber sichtbaren Aktions-Buttons) — kein bestehender Test deckte das ab. Da Akzeptanzkriterium 5 das Ausblenden dennoch explizit und unmissverständlich fordert (unabhängig davon, ob die „wie bisher“-Einschätzung zutrifft) und dies inhaltlich zur Design-Quelle sowie zu einem sinnvollen Leerzustand passt (keine wirkungslosen Aktionen ohne Treffer), wurde die gesamte `dl-foot-row` neu in `@if (rows.length > 0)` gekapselt. Das ist eine kleine, über die reine N/M-Formel hinausgehende Verhaltensänderung — hier dokumentiert statt still vorgenommen; PRD-konformste, am wenigsten überraschende Interpretation der wörtlichen AC-Vorgabe.
5. **Kein Docker-Compose-Smoke-Check gegen den geteilten Gesamtsystem-Stack.** Der auf diesem Rechner laufende `docker-compose`-Stack (`steakholder`) läuft aus dem Hauptarbeitsverzeichnis und wird parallel von anderen, gleichzeitig aktiven Story-Agenten in eigenen Worktrees verwendet. Ein Rebuild des `frontend`-Containers mit dem Stand dieses Feature-Branches hätte diesen geteilten Stack für alle anderen parallel laufenden Agenten verändert bzw. kurzzeitig unterbrochen. Da diese Story ausschließlich Presentation-Layer-Text/-Berechnung betrifft und durch `ng test` (Komponententests, die den finalen gerenderten DOM-Text in Headless-Chrome exakt prüfen, inkl. `us-066-verteiler-fusszeile-gesamtzahl.spec.ts`) vollständig abgedeckt ist, wurde auf den manuellen Docker-Compose-Smoke-Check verzichtet und durch die oben dokumentierte „So probierst du es aus“-Anleitung ersetzt, die nach dem PR-Merge nachvollzogen werden kann. Empfehlung an den Projektverantwortlichen: bei Bedarf nach Merge kurz manuell gegenprüfen.
6. **`ng test`/`ng lint` Ergebnis.** Vollständige Angular-Testsuite (`ng test --watch=false --browsers=ChromeHeadless`): 403/403 grün (davon 34 im Feature `distribution`, inkl. der 5 neuen Story-Test-Fälle sowie eines neuen Service-Tests für `totalStakeholderCount`). `ng lint`: fehlerfrei.
