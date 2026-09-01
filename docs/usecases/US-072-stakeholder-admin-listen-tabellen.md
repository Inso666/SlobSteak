**ID:** US-072
**Titel:** Stakeholder-Liste & Admin-Listen als Tabellen mit vollständiger Informationsdichte statt Karten-Raster
**Bounded Context / Domain:** StakeholderManagement (+ punktuelle Erweiterung StakeholderCommunication/StakeholderAssessment für Read-Modelle), IdentityAccess, ProjectManagement (Frontend, Presentation-Schicht; kleine additive Backend-Erweiterung für die Stakeholder-Liste)
**Abhängigkeiten:** US-071
**Status:** fertig (01.09.2026), PR siehe Feature-Branch `feature/US-072-stakeholder-admin-listen-tabellen`

---

### 1. User Story

Als **Nutzer** möchte ich die Stakeholder-Liste sowie die Admin-Übersichten für Nutzer und Projekte als kompakte, informationsdichte Tabellen sehen — inklusive der laut Design vorgesehenen zusätzlichen Spalten und eines gleichzeitigen Blicks auf aktive und gelöschte Stakeholder — statt als Karten-Raster mit reduzierter Information.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #100](https://github.com/Inso666/SlobSteak/issues/100), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026, gegen `docs/design/StakeholderList.dc.html` und `docs/design/Admin.dc.html`.
- **Ist-Zustand:** Stakeholder-Liste (`frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.html`), Admin-Nutzerverwaltung (`frontend/src/app/features/admin/users-admin/users-admin.component.html`) und Admin-Projektliste (`projects-admin.component.html`) rendern alle drei als Karten-Raster. Details siehe Issue #100 „Abweichungen im Detail“ 1–6.
- **Datenverfügbarkeit geprüft (PO-Analyse):**
  - Admin-Nutzerliste: `UserResponse` (`AdminUserController.cs`) führt bereits `MustChangePassword` und `CreatedAt` — **kein Backend-Fix nötig**, reine Frontend-Darstellung der bereits vorhandenen Felder.
  - Stakeholder-Liste, Spalte „Kommunikation“ (Chips) und „Meine Bewertung“ (Einfluss/Interesse der eigenen Rolle): `StakeholderResponse`/`StakeholderListItem` (US-025) führt diese Daten **nicht**. Eine Wiederverwendung des bestehenden Verteilerlisten-Endpunkts (`GET .../distribution-list`) scheidet aus, da dieser laut `DistributionListController` bewusst nur für `PL`/`Coreteam` erreichbar ist (nicht `Architect`/`User`), während die Stakeholder-Liste selbst für alle vier Rollen sichtbar ist (US-025) — eine Wiederverwendung würde die in US-040 etablierte Sichtbarkeitsgrenze für Kommunikationsdaten unterlaufen.
- **PO-Entscheidung zur Datenbeschaffung (siehe Akzeptanzkriterien 3/8 unten):**
  1. **„Kommunikation“-Spalte:** `StakeholderListItem`/`StakeholderResponse` (nur für den Listen-Endpunkt, US-025) wird um eine zusätzliche, additive Property `communicationTypeNames: string[]` erweitert, serverseitig **nur befüllt für Rollen `PL`/`Coreteam`/`Architect`** (identische Rollengrenze wie US-040, die einzige bestehende Stelle, an der Kommunikationszuordnungen einsehbar sind) — für Rolle `User` bleibt das Feld ein leeres Array, die Spalte zeigt dort konsequent keine Chips (kein Datenleck über eine bislang rollenoffene Liste).
  2. **„Meine Bewertung“-Spalte:** Wird **ausschließlich für perspektiv-tragende Rollen (`PL`/`Coreteam`/`Architect`)** angezeigt (Rolle `User` hat laut PRD ohnehin keine eigene Perspektive/Bewertung, analog zur bestehenden Sichtbarkeitsregel aus US-030/Map-API). Frontend ruft dafür client-seitig die bereits bestehende Map-Query-API (`GET .../map?perspective={eigeneRolle}`, US-031) ab und joint das Ergebnis über `stakeholderId` in die Tabelle — kein weiterer Backend-Contract-Wechsel nötig, da die Sichtbarkeits-/Rollenregel dort bereits korrekt serverseitig durchgesetzt ist.
- **Relevant für DDD:** Punkt 1 ist eine additive Erweiterung des bestehenden Read-Modells `ListStakeholdersService`/`StakeholderListItem` (StakeholderManagement-Kontext liest zusätzlich `Stakeholder.CommunicationAssignments`, bereits vom Aggregate geladen, siehe `DistributionListQuery`-Vorbild) — keine neue Aggregate-Grenze, kein direkter EF-Core-Join über Bounded-Context-Grenzen. Punkt 2 erfordert keine Backend-Änderung.

### 3. Akzeptanzkriterien

**Stakeholder-Liste (`docs/design/StakeholderList.dc.html`):**
- [x] Liste rendert als Tabelle mit Spalten Name (inkl. Typ-Icon/-Kennzeichnung), Organisation, **Kommunikation** (Chips der zugeordneten Kommunikationsarten, leer für Rolle `User`), **Meine Bewertung** (Einfluss/Interesse-Werte der eigenen Rolle inline, oder „– noch nicht bewertet“; Spalte entfällt/leer für Rolle `User`), Aktualisiert (relative Zeit).
- [x] Zeilen sind klickbar und führen zur Detailseite; keine Bearbeiten-/Löschen-Buttons direkt in der Tabellenzeile mehr (Bearbeiten/Löschen bleibt über die Detailseite erreichbar, US-022/US-023).
- [x] Eine Zeilenzahl-Anzeige „N Stakeholder insgesamt · M angezeigt (gefiltert)“ ergänzt die Liste.
- [x] „Gelöschte anzeigen“ ist ein Toggle-Schalter, der einen zusätzlichen, gestrichelt umrandeten Papierkorb-Bereich **unterhalb** der aktiven Liste einblendet (beide gleichzeitig sichtbar, kein gegenseitiges Ausblenden mehr), mit „Wiederherstellen“-Button je Zeile (US-024 Funktionalität bleibt unverändert).
- [x] „Stakeholder anlegen“ wird über einen Toolbar-Button aufgerufen (Dialog analog zum in US-038/US-065 etablierten Muster), statt als dauerhaft sichtbares, langes Formular unterhalb der Liste eingebettet zu sein.
- [x] `communicationTypeNames` in `StakeholderResponse`/`StakeholderListItem` ist für Rolle `User` immer ein leeres Array (Sichtbarkeitsgrenze aus US-040 bleibt gewahrt).

**Admin-Nutzerverwaltung (`docs/design/Admin.dc.html`):**
- [x] Liste rendert als Tabelle mit Spalten Name, E-Mail, Status (Badge „Muss Passwort ändern“ sofern `mustChangePassword`, sonst kein Badge/„Aktiv“), Erstellt am, sowie einem Aktionslink „Passwort zurücksetzen“ je Zeile (bestehende Funktionalität aus US-013/US-016 unverändert).
- [x] Bestehendes „Nutzer anlegen“-Dialogmuster (US-016, im Einklang mit dem in US-056 etablierten Tab-Host+Dialog-Muster) bleibt unverändert — siehe PO-Entscheidung unten zur bewussten Abgrenzung von `Admin.dc.html`s permanentem Formular-Panel.

**Admin-Projektliste:**
- [x] Liste rendert als Tabelle statt Karten-Raster, mit denselben, bereits heute in der Karten-Ansicht verfügbaren Feldern (kein neuer Datenbedarf) — bestehende Funktionalität aus US-014/US-015/US-017 (Anlegen, Mitgliederzuweisung) bleibt unverändert erreichbar.

**Übergreifend:**
- [x] Automatisierter Test (Angular `TestBed` + `HttpTestingController`) belegt je Screen: Tabellen-Struktur, korrekte Spaltenwerte, rollenabhängige Sichtbarkeit von „Kommunikation“/„Meine Bewertung“ (Stakeholder-Liste), gleichzeitige Anzeige von aktiver Liste und Papierkorb-Panel.
- [x] Backend-Test (xUnit) belegt: `communicationTypeNames` korrekt befüllt für `PL`/`Coreteam`/`Architect`, leeres Array für `User`.
- [x] Manueller Smoke-Test gegen `docker-compose up`: alle drei Screens entsprechen optisch `docs/design` — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests (inkl. Story-Tests aus US-013, US-014, US-015, US-016, US-017, US-023, US-024, US-025, US-056) bleiben grün bzw. werden ans neue Markup angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien (Backend):**
- `src/SlobSteak.Application/Stakeholders/StakeholderListItem.cs`, `ListStakeholdersService.cs` — `CommunicationTypeNames` ergänzen, rollenabhängig befüllt (Aufrufer/Controller übergibt die aktuelle `ProjectRole`, analog zum bereits bestehenden Rollen-Handling in `DistributionListController`).
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` — `StakeholderResponse` um `IReadOnlyList<string> CommunicationTypeNames` erweitern (nur im `FromListItem`-Zweig befüllt, bei `FromCreateResult`/`FromUpdateResult`/`FromDeletedItem` leeres Array, da dort nicht relevant).

**Zu ändernde Dateien (Frontend):**
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.html`/`.ts`/`.css` (Tabellen-Umbau, Zeilenzahl, paralleles Papierkorb-Panel, Toolbar-Anlegen-Dialog, Map-API-Join für „Meine Bewertung“)
- `frontend/src/app/features/admin/users-admin/users-admin.component.html`/`.ts`/`.css` (Tabellen-Umbau, Status-Badge, Erstellt-am-Spalte)
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.html`/`.ts`/`.css` (Tabellen-Umbau)
- Zugehörige `.spec.ts`-Dateien sowie betroffene Story-Test-Dateien

**Wichtige Invarianten:**
- `communicationTypeNames` darf für Rolle `User` niemals befüllt werden (Sichtbarkeitsgrenze US-040) — Backend-Test muss dies explizit gegen alle vier Rollen verifizieren.
- Kein neuer, unautorisierter Aufruf des Verteilerlisten-Endpunkts aus der Stakeholder-Liste heraus.
- „Meine Bewertung“ nutzt ausschließlich die bestehende, bereits rollenkorrekte Map-Query-API — kein neuer Endpunkt.

### Anmerkungen des Product Owners

Vierte Story dieser Phase (nach [US-069](US-069-assessment-tabs-markforcheck.md), [US-070](US-070-zeitstempel-deutsches-format.md), [US-071](US-071-stakeholder-detail-zwei-spalten-layout.md)) — sequenziell danach eingeplant, da `stakeholder-list.component.html` bereits von US-070 (Datumszeile im Papierkorb) berührt wurde.

**Bewusste Abgrenzung beim Admin-Nutzerverwaltungs-Formular:** `docs/design/Admin.dc.html` zeigt „Nutzer anlegen“ laut Issue #100 als permanent sichtbares Formular-Panel statt Dialog. US-056 hat den Admin-Bereich jedoch erst kürzlich bewusst auf ein Tab-Host+Dialog-Muster gemäß `SPEC-07-Admin.md` ausgerichtet (als eigene, verifizierte PO-Entscheidung). Diese Story kehrt dieses erst kürzlich etablierte Muster **nicht** erneut um — eine zweite Umkehrung des Anlegen-Flusses innerhalb kurzer Zeit ohne triftigen neuen Grund wäre selbst eine Form von Inkonsistenz. Der Dialog bleibt bestehen; nur das Karten-→-Tabellen-Layout der Liste selbst wird korrigiert. Sollte der Projektverantwortliche das Formular-Panel-Muster aus `Admin.dc.html` dennoch für verbindlich erklären, ist das Gegenstand einer eigenen, gezielten Folge-Story.

### Anmerkungen des Agenten

**Umsetzung:**
- Backend: `StakeholderListItem`/`ListStakeholdersService` um `CommunicationTypeNames` erweitert, ausschließlich befüllt für `PL`/`Coreteam`/`Architect` (identische Rollengrenze wie US-040); `StakeholderResponse.FromListItem` reicht das Feld durch, `FromCreateResult`/`FromUpdateResult`/`FromDeletedItem` liefern konsequent ein leeres Array. Rollenabhängigkeit datengetrieben getestet (`ListStakeholdersServiceTests`, `[InlineData(ProjectRole.Coreteam, true)]`/`Architect`/`PL`/`User`).
- Frontend Stakeholder-Liste: Tabellen-Umbau abgeschlossen — Spalten Name/Organisation/Kommunikation/Meine Bewertung/Aktualisiert, Zeilenzahl-Anzeige (`{{totalStakeholderCount}} Stakeholder insgesamt` + optional `· {{stakeholders.length}} angezeigt (gefiltert)` nur bei aktivem Filter), Papierkorb als paralleles Panel unterhalb der aktiven Liste (kein gegenseitiges Ausblenden mehr), „Stakeholder anlegen“ als Toolbar-Button mit Dialog (PrimeNG `p-dialog`, analog US-038/US-065). „Meine Bewertung“ wird client-seitig per bestehender Map-Query-API (`GET .../map?perspective={eigeneRolle}`) nachgeladen und über `stakeholderId` gejoint — kein neuer Endpoint.
- Frontend Admin: `users-admin`/`projects-admin` von Karten-Raster auf Tabellen umgebaut, bestehende Funktionalität (Nutzer/Projekt anlegen als Dialog, Passwort zurücksetzen, Mitglieder verwalten) unverändert erreichbar.
- **Im manuellen Smoke-Test gefundener und behobener Fix (nicht ursprünglich Teil der Story-ACs, aber notwendige Korrektur derselben Story):** Nach „Wiederherstellen“ eines Stakeholders zeigte die Spalte „Meine Bewertung“ fälschlich „– noch nicht bewertet“, obwohl ein Assessment existierte — Ursache: die Map-Query-API (US-031) liefert nur aktive Stakeholder, `assessmentByStakeholderId` enthielt den gerade wiederhergestellten Stakeholder daher nicht mehr. `onRestore()` lädt jetzt zusätzlich `loadAssessments()` neu. Bestehender US-058-Story-Test (`restoreStakeholder-Erfolgsfall`) entsprechend um die zusätzliche erwartete HTTP-Anfrage ergänzt.

**Manueller Smoke-Test (gegen isolierten `docker-compose`-Stack `us072smoke`, Ports 4200/5000/5432):**
- Rolle `User`: Stakeholder-Liste zeigt nur Name/Organisation/Aktualisiert, keine „Kommunikation“-/„Meine Bewertung“-Spalte, „Stakeholder anlegen“-Button vorhanden, kein Papierkorb-Toggle sichtbar. Screenshot: `stakeholder-list-role-user.jpg`.
- Rolle `PL`: Kommunikation-Chips („Statusbericht“) und „Meine Bewertung“ (`E 71 · I 76` + Rollen-Badge, bzw. „– noch nicht bewertet“) korrekt angezeigt; „Gelöschte anzeigen“ blendet Papierkorb-Panel **parallel** unterhalb der aktiven Liste ein (nicht anstelle). Screenshot: `stakeholder-list-role-pl-mit-papierkorb.jpg`.
- „Stakeholder anlegen“: Toolbar-Button öffnet Dialog mit vollständigem Formular (kein eingebettetes Langformular mehr). Screenshot: `stakeholder-anlegen-dialog.jpg`.
- Admin-Nutzerverwaltung: Tabelle mit Name/E-Mail/Status (Badge „MUSS PASSWORT ÄNDERN“ nur bei `mustChangePassword`, sonst „Aktiv“ ohne Badge)/Erstellt am/„Passwort zurücksetzen“. Screenshot: `admin-nutzerverwaltung-tabelle.jpg`.
- Admin-Projektliste: Tabelle mit Name/Status/Mitglieder/„Mitglieder verwalten“. Screenshot: `admin-projektliste-tabelle.jpg`.
- Rollen `Coreteam`/`Architect` nicht zusätzlich manuell durchgeklickt (kein Unterschied zur bereits manuell verifizierten `PL`-Darstellung zu erwarten, da identische Rollengruppe „perspektiv-tragend“) — stattdessen durch den bereits bestehenden, datengetriebenen Backend-Test (`ListStakeholdersServiceTests`) sowie Frontend-Story-Test abgedeckt.

**Testergebnis:** Backend `dotnet test` 465/465 grün. Frontend `ng test` 475/475 grün (nach Anpassung des US-058-Story-Tests, siehe oben), `ng lint` fehlerfrei.

Keine Abweichung von PRD/Story-Vorgaben, keine Eskalation nach CLAUDE.md Abschnitt 6 nötig — die einzige während der Umsetzung getroffene Interpretation (bewusste Beibehaltung des Dialog-Musters für „Nutzer anlegen“ statt `Admin.dc.html`s Formular-Panel) war bereits vom PO in Abschnitt „Anmerkungen des Product Owners“ vorgegeben.
