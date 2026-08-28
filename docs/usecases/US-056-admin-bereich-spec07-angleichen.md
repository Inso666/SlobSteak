**ID:** US-056
**Titel:** Admin-Bereich gemäß SPEC-07 angleichen (Tab-Host mit Dialog-Formularen)
**Bounded Context / Domain:** IdentityAccess / ProjectManagement (Presentation)
**Abhängigkeiten:** US-016, US-017, US-046, US-047, US-055

**Status:** fertig (29.08.2026), PR siehe unten

---

### 1. User Story

Als **Systemadministrator** möchte ich den Admin-Bereich (Nutzer- und Projektverwaltung) in der im Wireframe/Spec vorgesehenen Form nutzen — als einen zusammenhängenden Bereich mit Tabs und Dialog-Formularen zum Anlegen/Zuweisen —, statt als zwei separate Seiten mit dauerhaft sichtbaren Inline-Formularen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“: „Der Admin Bereich entspricht nicht den Wireframes.“
- **Verifikation durch PO (Abgleich `SPEC-07-Admin.md` gegen aktuellen Code):**
  - **Struktur:** SPEC-07 §1.2 definiert einen einzigen **Tab-Host** (`admin-page.component.html`) mit `<p-tabs>`, dessen Tabs „Nutzer“, „Projekte“ und „Kommunikationsarten“ sind. Die aktuelle Umsetzung hat stattdessen **zwei getrennte Routen** (`/admin/users`, `/admin/projects`) mit einer eigens gebauten Pill-Navigation (`AdminSubNavComponent`, native `<a routerLink>`-Elemente) statt der spezifizierten `<p-tabs>`-Komponente. (Der dritte Tab „Kommunikationsarten“ existiert erwartungsgemäß noch nicht — das zugehörige Feature US-037/US-038 ist laut `BACKLOG.md` noch nicht umgesetzt und ist **kein** Bestandteil dieses Bugs.)
  - **Formulare:** SPEC-07 §1.3/§1.4/§2.1–2.3 spezifiziert die Formulare „Nutzer anlegen“, „Projekt anlegen“ und „Mitglied zuweisen“ jeweils als **Dialog** (`p-dialog`, per Button geöffnet). Die aktuelle Umsetzung zeigt alle drei Formulare **dauerhaft inline** unterhalb der jeweiligen Liste (`users-admin.component.html` Zeile 34 ff. `<h2>Nutzer anlegen</h2><form …>`, analog `projects-admin.component.html` und `project-membership-manager.component.html`) — nicht als auf Wunsch einblendbaren Dialog.
  - **Passwort-Reset:** SPEC-07 §2.5 „Passwort zurücksetzen — kein Formular“ (Bestätigungs-Interaktion direkt am Listen-Eintrag) — das entspricht bereits weitgehend der aktuellen Umsetzung (Button je Zeile ohne eigenes Formular), hier besteht kein wesentlicher Delta.
- **Abgrenzung zu anderen Stories:** Das Kartenlayout der Listen selbst (statt Tabellen) wurde bereits in US-047 umgesetzt und entspricht dem Design-System — diese Story ändert daran nichts, sondern ausschließlich die Rahmenstruktur (Tab-Host statt getrennter Routen) und die Formular-Darstellung (Dialog statt Inline).
- **Relevant für DDD:** Reine Presentation-Schicht. Ein Wechsel von zwei Routen auf einen Tab-Host innerhalb einer Route berührt `app.routes.ts` (`adminGuard`), aber keine Backend-Contracts.

### 3. Akzeptanzkriterien

- [x] Nutzerverwaltung und Projektverwaltung sind über einen gemeinsamen Tab-Host mit `<p-tabs>` erreichbar, konsistent mit SPEC-07 §1.2 (finale Routing-Entscheidung — eine Route mit clientseitigem Tab-State vs. zwei Routen mit `<p-tabs>` als Navigationsdarstellung — wird vom Dev-Agenten getroffen und im PR begründet, sofern SPEC-07 dazu keine eindeutige Aussage über die URL-Struktur trifft). *Umgesetzt als zwei bookmarkbare Kind-Routen unter gemeinsamer `/admin`-Elternroute mit `AdminPageComponent` als Tab-Host, siehe Anmerkungen des Agenten.*
- [x] „Nutzer anlegen“, „Projekt anlegen“ und „Mitglied zuweisen“ öffnen jeweils als `p-dialog` über einen Button, statt dauerhaft sichtbar zu sein — Formularinhalt/Validierung/Verhalten bleiben aus US-012/US-014/US-015/US-016/US-017 unverändert erhalten, nur die Präsentation ändert sich.
- [x] Kein Akzeptanzkriterium aus US-016/US-017 wird durch die Umstrukturierung verletzt (Liste, Passwort-Reset, Mitgliederverwaltung bleiben vollständig funktionsfähig).
- [x] `AdminSubNavComponent` wird durch die spezifizierte `<p-tabs>`-Struktur abgelöst oder — falls der Dev-Agent aus triftigem Grund bei einer eigenen Pill-Navigation bleibt — die Abweichung wird gemäß CLAUDE.md Abschnitt 6 explizit begründet und dokumentiert. *`AdminSubNavComponent` gelöscht, bewusst KEIN `<p-tabs>` — Begründung siehe Anmerkungen des Agenten.*
- [x] Alle betroffenen Bestandteile nutzen ausschließlich SPEC-00-Tokens/-Bausteine (keine neuen hartkodierten Werte).
- [x] Bestehende Tests zu US-016/US-017/US-046 (`users-admin.component.spec.ts`, `projects-admin.component.spec.ts`, `project-membership-manager.component.spec.ts`, `admin-sub-nav.component.spec.ts`, `us-046-admin-navigation.spec.ts`) bleiben grün bzw. werden an die neue Struktur angepasst (nicht entfernt). *`admin-sub-nav.component.spec.ts` wurde als Datei entfernt (die getestete Komponente existiert nicht mehr), ihre Verhaltensabdeckung ist in `us-046-admin-navigation.spec.ts` konsolidiert — siehe Anmerkungen des Agenten.*
- [x] `ng test`/`ng lint`/`ng build` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/admin-sub-nav/` (ggf. obsolet, siehe Akzeptanzkriterium 4)
- `frontend/src/app/app.routes.ts` (falls Routing-Struktur sich ändert)

**Wichtige Invarianten:**
- Keine Änderung an `admin-users.service.ts`/`admin-projects.service.ts` oder deren API-Verträgen.
- Die dritte Tab-Spalte „Kommunikationsarten“ (SPEC-07 §1.5) wird **nicht** vorgezogen gebaut — sie gehört zu US-037/US-038 und liegt außerhalb dieser Story (kein Vorgriff, CLAUDE.md Abschnitt 3).

### Anmerkungen des Product Owners

Diese Story ist bewusst nach US-055 (vertikale Sidebar) einsortiert, da SPEC-07 §1.1 den Admin-Bereich explizit im Kontext derselben App-Shell beschreibt („Sidebar zeigt beim Routing auf den Admin-Bereich keinen Projekt-Kontext/-Switcher“) — eine Umsetzung vor der Sidebar-Migration würde denselben Navigationskontext zweimal anfassen.

### Anmerkungen des Agenten

**Routing-Entscheidung (Akzeptanzkriterium 1, CLAUDE.md Abschnitt 6):** SPEC-07 §1.2 selbst räumt ein, dass die URL-Struktur nicht eindeutig vorgegeben ist. Umgesetzt wurde eine gemeinsame `/admin`-Elternroute (`AdminPageComponent`, `adminGuard` einmalig hier statt dupliziert) mit zwei weiterhin eigenständigen, bookmarkbaren Kind-Routen `/admin/users`/`/admin/projects` — exakt dasselbe, bereits etablierte und getestete Strukturmuster wie `ProjectWorkspaceLayoutComponent` (Elternroute mit gemeinsamem Header/Tab-Nav, `<router-outlet>` für den Kind-Inhalt). Eine Konsolidierung auf eine einzige Route mit rein clientseitigem Tab-State (SPEC-07s `[(value)]="activeTab"`-Beispiel) hätte bestehende Guards/Tests unnötig invasiv angefasst, ohne fachlichen Mehrwert.

**Bewusst KEIN `<p-tabs>` (Akzeptanzkriterium 4, „triftiger Grund“ gemäß Story-AC):** Jede bisherige Tab-artige Navigation dieser Anwendung (Projekt-Workspace-Tabs aus US-019, Admin-Sub-Nav aus US-046) verwendet durchgängig dasselbe handgebaute `.tab-pills`/`.tab-pill`-Muster (SPEC-00 §1.3) mit `routerLink`-Ankern statt PrimeNGs `<p-tabs>`-Komponente. Ein Wechsel zu `<p-tabs>` ausschließlich hier hätte eine bereits mehrfach gemergte Navigations-Konvention gebrochen und wäre optisch/im Tastatur-/Fokus-Verhalten von jeder anderen Tab-Navigation der App abgewichen. `AdminSubNavComponent` selbst wurde vollständig entfernt — die Sub-Navigation lebt jetzt einmalig in `AdminPageComponent` statt dupliziert in beiden Admin-Unterseiten.

**Abweichung von Akzeptanzkriterium 6 (wörtlich „nicht entfernt“, CLAUDE.md Abschnitt 6):** `admin-sub-nav.component.spec.ts` wurde gelöscht statt angepasst, da die getestete Komponente (`AdminSubNavComponent`) selbst ersatzlos entfernt wurde (Akzeptanzkriterium 4 erlaubt dies explizit bei triftigem Grund) — eine Spec-Datei für eine nicht mehr existierende Komponente „anzupassen“ ist kein sinnvoller Zustand. Die dort geprüften Verhaltens-Assertions (Sub-Nav-Links vorhanden, aktive Hervorhebung) wurden in die bereits zuständige Story-Spec `us-046-admin-navigation.spec.ts` verschoben und dort auf `AdminPageComponent` umgestellt — keine Abdeckung ging verloren, sie liegt nur konsolidiert an der laut CLAUDE.md Kernregel 3 eigentlich zuständigen Stelle statt verstreut in einer Implementierungs-Detail-Spec. Ausführlich dokumentiert im Doc-Kommentar von `admin-page.component.ts`.

**Scope-Abgrenzung gegenüber SPEC-07 (bewusst, kein Vorgriff):** SPEC-07 beschreibt zusätzlich `<p-table>` statt Kartenlayout, `<p-toast>`/`<p-confirmdialog>` statt der bestehenden inline Erfolgs-/Fehlermeldungen bzw. `confirm()`, sowie einen dritten Tab „Kommunikationsarten“. Keiner dieser Punkte ist Bestandteil der Akzeptanzkriterien dieser Story (die Story grenzt das Kartenlayout explizit als bereits durch US-047 erledigt ab, „Kommunikationsarten“ explizit als US-037/US-038-Vorgriff) — nicht umgesetzt, um nicht stillschweigend über den Story-Scope hinauszugehen.

**Verifikation:** `ng test` (gesamter Workspace) 243/243 grün (234/234 nach US-055-Merge als Basis, +9 neue Tests im Story-Test `us-056-admin-bereich-spec07-angleichen.spec.ts`; die angepassten Bestandstests in `us-050-verlaesslicher-lade-zustand-listen.spec.ts`, `project-membership-manager.component.spec.ts` und `us-046-admin-navigation.spec.ts` bleiben grün). `ng lint` fehlerfrei. `ng build` erfolgreich (Bundle-Budget-Warnung unverändert vorbestehend, kein neuer Fehler). `dotnet test` unverändert grün (kein Backend-Anteil). Zusätzlich manuell in einem isolierten `docker-compose`-Stack (eigener `-p`-Projektname/-Ports, danach `down -v`) end-to-end verifiziert: Login als Seed-Admin, `/admin` zeigt Tab-Host mit „Nutzer“/„Projekte“, alle drei Dialoge („Nutzer anlegen“, „Projekt anlegen“, „Mitglied zuweisen“) öffnen/schließen korrekt und legen Nutzer/Projekt/Mitgliedschaft tatsächlich an.

**„So probierst du es aus":** `docker-compose up`, mit Seed-Admin anmelden, Sidebar-Link „Admin“ → Tab-Host mit „Nutzer“/„Projekte“ oben; „Nutzer anlegen“ bzw. „Projekt anlegen“ (rechts oben) öffnen jeweils einen Dialog statt eines dauerhaft sichtbaren Formulars; bei „Projekte“ → „Mitglieder verwalten“ öffnet „Mitglied hinzufügen“ ebenfalls einen Dialog.

**Neue/geänderte Dateien:**
- `frontend/src/app/features/admin/admin-page/admin-page.component.ts` / `.html` / `.css` (neu, Tab-Host)
- `frontend/src/app/app.routes.ts` (`/admin`-Elternroute mit `AdminPageComponent` + Kind-Routen)
- `frontend/src/app/features/admin/users-admin/`, `projects-admin/`, `projects-admin/project-membership-manager.component.*` (Dialog-Konvertierung, Sub-Nav/eigene Überschrift entfernt)
- `frontend/src/app/features/admin/admin-sub-nav/` (gelöscht)
- `frontend/src/app/features/admin/admin-nav-items.ts` (Doc-Kommentar aktualisiert)
- `frontend/src/app/features/admin/us-046-admin-navigation.spec.ts` (AC4/5 auf `AdminPageComponent` umgestellt)
- `frontend/src/app/shared/view-state/us-050-verlaesslicher-lade-zustand-listen.spec.ts`, `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.spec.ts` (Dialog vor DOM-Selects geöffnet)
- `frontend/src/app/features/admin/us-056-admin-bereich-spec07-angleichen.spec.ts` (neu, Story-Test)
- `docs/usecases/US-056-admin-bereich-spec07-angleichen.md` (diese Datei)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
