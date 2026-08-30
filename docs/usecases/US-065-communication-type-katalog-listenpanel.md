**ID:** US-065
**Titel:** Kommunikationsarten-Katalog Admin-UI als kompaktes Listen-Panel statt Einzelkarten
**Bounded Context / Domain:** CommunicationCatalog (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-038

---

### 1. User Story

Als **Systemadmin** möchte ich den Kommunikationsarten-Katalog als kompaktes Listen-Panel mit einer schmalen Zeile je Eintrag sehen, damit die Darstellung der verbindlichen Design-Vorgabe entspricht und der Katalog auch bei vielen Einträgen übersichtlich bleibt, statt durch mehrere freistehende Karten zu scrollen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #80](https://github.com/Inso666/SlobSteak/issues/80), Design-Abgleich gegen `docs/design/S2-Projektuebersicht-Wireframe.html`, Artboard `AdminCatalogs.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.html` Zeilen 7 und 11–35):** Jeder Eintrag rendert als eigenständige `<article class="communication-type-card">` mit eigenem Rahmen/Padding. Jede Karte zeigt zwei dauerhaft sichtbare Text-Buttons („Umbenennen“, „Aktivieren“/„Deaktivieren“). Eine neue Kommunikationsart wird über einen Button „Kommunikationsart anlegen“ oben auf der Seite angelegt, der einen modalen Dialog mit einem Textfeld öffnet.
- **Soll-Zustand (Issue #80 / `AdminCatalogs.dc.html`):** Alle Einträge liegen als kompakte `.catalog-row`-Zeilen in **einem** gemeinsamen, umrandeten Panel, getrennt durch eine dünne Trennlinie. Jede Zeile zeigt Name, Status-Pill („Aktiv“/„Deaktiviert“) und ein einzelnes Stift-/Bearbeiten-Icon. Eine neue Kommunikationsart wird über eine inline „Kommunikationsart hinzufügen“-Zeile am Ende desselben Panels angelegt, kein separater Button/Dialog außerhalb des Panels.
- **PO-Entscheidung zur bereits in US-038 dokumentierten Abweichung:** US-038 „Anmerkungen des Agenten“ begründet zwei getrennte Zeilenaktionen sowie das Kartenlisten-Layout ausschließlich mit einem Abgleich gegen `docs/specs/SPEC-07-Admin.md` bzw. das Konsistenzmuster der bestehenden Admin-Tabs — `docs/design/AdminCatalogs.dc.html` existierte zu diesem Zeitpunkt bereits (Commit `de23df9`, 2026-08-23), wurde aber nicht konsultiert. Da `docs/design` gemäß Projektkonvention die verbindliche, gegenüber Spec-Pseudocode vorrangige Design-Quelle ist, gilt für diese Story: **`docs/design/AdminCatalogs.dc.html` ist bindend.** Diese Story ersetzt damit den Layout-Teil von US-038 Akzeptanzkriterium 3 („zwei getrennte Aktionen“) durch ein einzelnes Bearbeiten-Icon je Zeile, das Name **und** Aktiv-Status in einem gemeinsamen Dialog editierbar macht (siehe Akzeptanzkriterium 3 unten) — inhaltlich deckungsgleich mit dem ursprünglichen `SPEC-07`-Pseudocode, den US-038 bereits als naheliegende Variante beschrieben hatte.
- **Kein Konflikt mit Akzeptanzkriterien 1/2/4 aus US-038** (Liste mit Status, `POST`, Duplikat-Fehler inline, Sichtbarkeit nur für Systemadmins) — diese bleiben unverändert gültig.
- **Relevant für DDD:** Reine Presentation-Schicht. `AdminCommunicationTypesService` sowie die Backend-Endpunkte (US-037) bleiben unverändert; `renameCommunicationType`/`setActive` können bei Bedarf sequenziell aus demselben Dialog aufgerufen werden.

### 3. Akzeptanzkriterien

- [ ] Alle Katalog-Einträge werden als kompakte Zeilen in einem gemeinsamen, umrandeten Panel dargestellt (kein eigenständiger Rahmen/keine eigenständige Card je Eintrag) — Zeilen sind durch eine dünne Trennlinie voneinander abgesetzt.
- [ ] Jede Zeile zeigt Name und Status-Pill (bestehender `.status-tag`/`.status-tag--archived`-Baustein bleibt unverändert wiederverwendet).
- [ ] Jede Zeile hat genau **ein** Bearbeiten-Icon (kein permanent sichtbarer Text-Button mehr). Das Icon öffnet einen Dialog mit Namensfeld **und** Aktiv-Toggle; Speichern übernimmt geänderten Namen und/oder geänderten Aktiv-Status (bestehende `renameCommunicationType`/`setActive`-Aufrufe dürfen dafür sequenziell genutzt werden, kein Backend-Contract-Wechsel nötig).
- [ ] Eine neue Kommunikationsart wird über eine inline „Kommunikationsart hinzufügen“-Zeile am Ende desselben Panels angelegt (Eingabefeld + Bestätigen-Aktion in der Zeile selbst) statt über einen separaten Button außerhalb des Panels mit modalem Dialog.
- [ ] Bestehende fachliche Funktionen bleiben unverändert erhalten: Duplikat-Fehler wird weiterhin inline am Namensfeld angezeigt (US-038 Akzeptanzkriterium 2), deaktivierte Einträge bleiben sichtbar (US-038 „Wichtige Invarianten“), Bereich bleibt ausschließlich für Systemadmins erreichbar (US-038 Akzeptanzkriterium 4).
- [ ] Automatisierter Test (Angular `TestBed`) belegt: gemeinsames Panel-Containerelement statt Einzelkarten, genau ein Bearbeiten-Icon je Zeile, inline Add-Zeile statt separatem Anlegen-Button/-Dialog.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Layout entspricht optisch `docs/design/AdminCatalogs.dc.html` (kompaktes Panel, ein Icon pro Zeile, inline Add-Zeile) — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `CommunicationTypesAdminComponent` (inkl. `us-038-communication-type-katalog-ui.spec.ts`) bleiben grün bzw. werden ans neue Markup angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.html`
- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.css`
- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.ts` (Dialog-/Formular-State für den kombinierten Bearbeiten-Dialog sowie die inline Add-Zeile)
- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.spec.ts`, `frontend/src/app/features/admin/us-038-communication-type-katalog-ui.spec.ts` (Anpassung an neues Markup)

**Wichtige Invarianten:**
- Kein neues, frei erfundenes Farb-/Abstands-Token — Panel-/Zeilen-Styling nutzt bestehende SPEC-00-Tokens (`--app-color-border`, `--app-color-surface`, `--app-space-*`, analog zu bereits vorhandenen Listen-/Panel-Mustern im Repo, z. B. `.status-tag`).
- Kein Backend-Contract-Wechsel: `AdminCommunicationTypesService` (`createCommunicationType`/`renameCommunicationType`/`setActive`) bleibt unverändert; der kombinierte Dialog orchestriert bestehende Methoden.

### Anmerkungen des Product Owners

Diese Story deckt Issue #80 vollständig ab und korrigiert dabei bewusst den Layout-/Interaktionsteil von US-038 Akzeptanzkriterium 3 (siehe Abschnitt 2) — `docs/design` ist die maßgebliche, gegenüber Spec-Pseudocode vorrangige Quelle für Screen-Layouts in diesem Projekt. Die übrigen US-038-Akzeptanzkriterien (1, 2, 4) sind von dieser Korrektur nicht betroffen.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
