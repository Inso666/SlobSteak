# / (login)
- Die allererste Anmeldung dauert sehr lange. Finde den Grund heraus und schlage Lösungsansätze vor.

# /projects
- Die Projekte denen ich zugewiesen bin tauchen erst in der Anzeige auf, nachdem ich zu "Alle Projekte" gewechselt habe.

# /admin/users
- Die Liste der Benutzer ist leer, obwohl bereits ein Benutzer existiert. Diese wird erst angezeigt, wenn ich im Feld "Name" etwas eintrage. Die Liste sollte beim Laden der Seite bereits gefüllt sein.
- Bei Klick auf "Passwort zurücksetzen" passiert nichts, außer das der Button in eine Warteschleife geht.

# /admin/projects
- Die Liste in der Projektverwaltung ist leer, obwohl bereits ein Projekt existiert. Diese wird erst angezeigt, wenn ich im Feld "Name" etwas eintrage. Die Liste sollte beim Laden der Seite bereits gefüllt sein.
- Bei Klick auf "Mitglieder verwalten" auf einem Projekt ist die Liste mit potentiellen Nutzern leer. Die Liste wird erst gefüllt, wenn ich sie erneut auswähle. Die Liste sollte bereits initial gefüllt sein.
- Wähle ich einen Nutzer und eine Rolle aus und klicke auf "Hinzufügen", passiert nichts. Erst nach bei der nächsten Interaktion wird die Liste der Mitglieder aktualisiert. Dies sollte bereits bei klick auf "hinzufügen" passieren.

# /projects/:id/stakeholders
- Bei Klick auf ein Proekt in der Projektübersicht komme ich zu einer leeren Seite. Sollte die Stakeholderverwaltung bereits implementiert sein, würde ich diese hier erwarten.

# Design
- Die Anmeldemaske entspricht nicht dem Wireframe.
- Das Icon für die App fehlt.
- Der Tabname ist nicht vergeben, sondern immernoch "Frontend"
- Das Navicon ist noch das Standard-Icon für Angular.
- Die Maske zum Passwort ändern entspricht nicht dem Wireframe.
- Die Navigationsleiste ist horizontal am Kopf der Seite. Sie sollte vertikal an der linken Seite der Applikation sein.
- Der Admin Bereich entspricht nicht den Wireframes.

# /projects/:id/map (Design-Abgleich Phase 5, 29.08.2026)

QA-Design-Abgleich der abgeschlossenen Phase 5 (Stakeholder Map, US-031–US-036) gegen
`docs/specs/SPEC-04-Stakeholder-Map.md` und `docs/specs/SPEC-00-Design-System.md`. Bereits in den
Story-Dateien (US-032/US-034/US-036, Abschnitt „Anmerkungen des Agenten“) dokumentierte und
begründete Abweichungen (z. B. `role="group"` statt `role="img"`, Legende nur im Vergleichsmodus
sichtbar, `p-toast` durch Inline-Fehleranzeige ersetzt, feste Perspektiv-Optionsliste, natives
`<select>` statt `p-select`, `comparePerspective` ohne die eigene Rolle, Opacity `0.72` für den
Vergleichspunkt) wurden nicht erneut gemeldet. Neu gefundene, bisher nicht dokumentierte
Abweichungen:

- Die drei Zoom-Cluster-Buttons („Vergrößern“/„Verkleinern“/„Ansicht zurücksetzen“, SPEC-04 §1) sind
  zwar im DOM vorhanden und funktional klickbar, rendern aber ohne sichtbares PrimeNG-Icon und nur
  22×14px groß — für Maus-Nutzer:innen faktisch unsichtbar/nicht auffindbar.
  → [Issue #67](https://github.com/Inso666/SlobSteak/issues/67) (Major)
- Die Zoom-Funktion vergrößert die Punkt-Marker selbst unverhältnismäßig mit (von ca. 20px auf bis
  zu 70px Durchmesser nach 5 Zoom-Schritten) statt nur die Abstände im Koordinatensystem zu
  skalieren; weiter entfernte Punkte werden dabei aus dem sichtbaren Bereich der Zeichenfläche
  herausgeschoben und verschwinden ersatzlos. Widerspricht dem in SPEC-04 §3.4 beschriebenen Zweck
  von Zoom/Pan (dicht beieinanderliegende Punkte eindeutig trennbar machen).
  → [Issue #68](https://github.com/Inso666/SlobSteak/issues/68) (Major)
- Es gibt keine Tastatur-Alternative zum Maus-Drag&Drop: Pfeiltasten auf einem fokussierten,
  eigenen Punkt verändern dessen Position nicht, und der in SPEC-04 §2.3 als robustere Alternative
  vorgeschlagene „Position bearbeiten“-Dialog existiert nicht. Verstößt gegen das WCAG-2.1-AA-
  Akzeptanzkriterium aus SPEC-04 §4.
  → [Issue #69](https://github.com/Inso666/SlobSteak/issues/69) (Major)
- Der in SPEC-04 §1 vorgesehene Toolbar-Hinweistext „{{visibleCount}} von {{totalCount}}
  Stakeholdern sichtbar“ fehlt vollständig.
  → [Issue #70](https://github.com/Inso666/SlobSteak/issues/70) (Minor)
- Uneinheitliche, nicht tokenisierte Opacity-Werte für gesperrte („nicht ziehbare“) Punkte: `0.72`
  für den Vergleichs-Diamant, aber `0.55` für einen eigenen Punkt in einer nicht selbst innegehabten
  Rolle (z. B. PL-Nutzer betrachtet „Meine Sicht: Coreteam“) — keiner der beiden Werte ist als
  SPEC-00-Token dokumentiert, und der zweite Wert taucht in keiner Story-Datei auf.
  → [Issue #71](https://github.com/Inso666/SlobSteak/issues/71) (Minor)

**Unklar, bitte PO-Entscheidung (kein Issue angelegt):** SPEC-04 §1/§3.3 sieht neben dem
Hover-Tooltip an der Verbindungslinie zusätzlich ein bleibendes Panel „Ausgewählte Verbindung“ in
der Legenden-Spalte vor, das nach einem Klick auf die Linie mit PL-/Vergleichswerten und
Delta-Tags je Achse gefüllt bleibt. Die aktuelle Umsetzung (US-034) zeigt bei Hover **und** Klick
denselben `ConnectionLineTooltipComponent`-Hinweis direkt an der Linie, aber kein separat
verbleibendes Panel. Die eigene Akzeptanzkriterium-Formulierung von US-034 („Tooltip/Popover“)
deckt das ab, SPEC-04 beschreibt aber ausdrücklich zwei getrennte UI-Elemente — ob das eine
akzeptierte Vereinfachung oder eine nachzuziehende Abweichung ist, sollte der Projektverantwortliche
entscheiden.

Alle übrigen geprüften Zustände (Default-Ansicht, Vergleichsmodus mit beidseitigen/einseitigen
Bewertungen, Legende, Rollenfarben/-formen, Fokus-Ring, Drag&Drop-Persistenz, Rollen-Sichtbarkeit
für `User` inkl. Route-Guard-Redirect auf „Kein Zugriff“) entsprachen SPEC-04/SPEC-00 bzw. den
bereits dokumentierten Abweichungen.

# Design-Abgleich Phase 6–8: Kommunikationsarten-Katalog, Kommunikationszuordnung, Verteiler (30.08.2026)

QA-Design-Abgleich der Phase-6–8-Stories US-038 (Kommunikationsarten-Katalog Admin-UI,
`/admin/communication-types`), US-040 (Kommunikationszuordnung auf der Stakeholder-Detailseite,
`StakeholderDetailComponent`) und US-042 (Verteilerlisten-UI, Tab „Verteiler“ im
Projekt-Workspace) gegen `docs/design` — ausdrücklich **nicht** gegen `docs/specs/SPEC-*`
(Vorgabe des Product Owners für diesen Audit).

**Zum Umfang von `docs/design`:** Der Ordner enthält aktuell nur eine Datei,
`S2-Projektuebersicht-Wireframe.html`. Der Dateiname legt nahe, dass sie ausschließlich die
Projektübersicht (S2) betrifft — tatsächlich ist es ein mehrseitiger Design-Canvas-Export mit
zwölf eingebetteten Artboards (u. a. `Detail.dc.html`, `Verteiler.dc.html`, `Admin.dc.html`,
`AdminCatalogs.dc.html`), die als ein einziger, JSON-escapter ~2,3-MB-String in einem
`<script id="appifact-doc">`-Block liegen. Damit enthält `docs/design` entgegen der Erwartung aus
der Aufgabenstellung doch einschlägige Vorgaben für **alle drei** geprüften Features — sie sind
nur wegen des irreführenden Dateinamens und der stark verschachtelten Kodierung leicht zu
übersehen. Der Commit, der diese Datei einführt (`de23df9`, 2026-08-23), liegt vor dem Abschluss
aller drei geprüften Stories; die Vorgaben waren also verfügbar, scheinen aber bei keiner der drei
Stories konsultiert worden zu sein (die jeweiligen „Anmerkungen des Agenten“ vergleichen
ausschließlich gegen `docs/specs/SPEC-*`).

## /admin/communication-types (US-038)

- Kartenlisten-Layout mit zwei dauerhaft sichtbaren Text-Buttons („Umbenennen“/
  „Aktivieren“|„Deaktivieren“) je Eintrag statt eines kompakten, gemeinsamen Listen-Panels mit
  einem einzelnen Bearbeiten-Icon pro Zeile (`docs/design`-Artboard `AdminCatalogs.dc.html`).
  Anlegen erfolgt über einen Button + modalen Dialog außerhalb der Liste statt über eine inline
  „hinzufügen“-Zeile im selben Panel.
  → [Issue #80](https://github.com/Inso666/SlobSteak/issues/80) (Major)

## Stakeholder-Detailseite / Kommunikationszuordnungen (US-040)

- **Blocker, gefunden vor dem eigentlichen Design-Abgleich:** Die gesamte Stakeholder-Detailseite
  (`/projects/:id/stakeholders/:stakeholderId`) rendert leer — weder Stammdaten- noch
  Kommunikationszuordnungen- noch Assessment-Panel erscheinen, obwohl `GET
  /api/v1/stakeholders/{id}` serverseitig `200` mit vollständigen Daten liefert und keine
  Konsolenfehler auftreten. Vermutliche Ursache: Die Anwendung läuft ohne `zone.js` (zoneless,
  `window.Zone === undefined`), `StakeholderDetailComponent` mutiert aber reine Klassenfelder in
  einem `.subscribe()`-Callback statt Signals zu verwenden, wodurch nach Eintreffen der
  asynchronen Antwort offenbar kein Render-Zyklus mehr angestoßen wird.
  → [Issue #81](https://github.com/Inso666/SlobSteak/issues/81) (Blocker/Critical)
- **Design-Abgleich des Kommunikationszuordnungen-Panels (`docs/design`-Artboard `Detail.dc.html`)
  konnte wegen des obigen Blockers nicht durchgeführt werden** — das Panel ist über die laufende
  Anwendung nicht erreichbar. Nach Behebung von #81 nachzuholen.

## Tab „Verteiler“ (US-042)

Für den Funktionstest wurden Kommunikationszuordnungen direkt über die API angelegt (UI-Weg über
die Stakeholder-Detailseite war durch den obigen Blocker versperrt).

- Fußzeile zeigt „N Einträge in der Verteilerliste · M mit E-Mail-Adresse (K ohne
  E-Mail-Adresse)“ statt der in `docs/design`-Artboard `Verteiler.dc.html` vorgegebenen Formel
  „N von **M-gesamt** Stakeholdern entsprechen dem Filter · …“ — die unfilterte Gesamtzahl fehlt.
  → [Issue #82](https://github.com/Inso666/SlobSteak/issues/82) (Minor)
- Spalte „Kommunikationsart“ zeigt reinen Fließtext statt der im Design vorgesehenen
  Chip-/Pillen-Darstellung (`.chip`, eigener Hintergrund + Rahmen).
  → [Issue #83](https://github.com/Inso666/SlobSteak/issues/83) (Minor)
- Hinweis „keine E-Mail hinterlegt“ ist komplett (Icon **und** Text) in der Attention-Farbe
  gehalten; im Design trägt nur das Icon die Signalfarbe, der Text ist gedämpft/kursiv.
  → [Issue #84](https://github.com/Inso666/SlobSteak/issues/84) (Minor)

Übereinstimmend mit `docs/design/Verteiler.dc.html`: Reihenfolge/Beschriftung der Filterleiste
(Kommunikationsart/Frequenz/Kanal/Typ + „Filter zurücksetzen“), Tabellenspalten (Name,
Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal), Button-Reihenfolge und -Hierarchie
(„E-Mails kopieren“ als sekundärer Outline-Button vor „CSV exportieren“ als primärem Button) sowie
Icon, Überschrift und Beschreibungstext des Leerzustands-Panels („Keine Stakeholder entsprechen
diesem Filter“ / „Ändere die Filterkombination oder setze sie zurück, um Stakeholder zu sehen.“).

# Design-Abgleich Phase 0–12 (Gesamtaudit, 30.08.2026)

Vollständiger QA-Design-Abgleich aller Screens/Bereiche der zum 30.08.2026 fertiggestellten
Stories (US-001 bis US-068) gegen die verbindliche Design-Quelle
`docs/design/S2-Projektuebersicht-Wireframe.html`. Trotz des irreführenden Dateinamens ist dies ein
mehrseitiger Design-Canvas-Export mit **zwölf** eingebetteten Artboards (`Main.dc.html`,
`States.dc.html`, `Mobile.dc.html`, `Components.dc.html`, `Detail.dc.html`, `DetailStates.dc.html`,
`Map.dc.html`, `Login.dc.html`, `StakeholderList.dc.html`, `Verteiler.dc.html`, `Admin.dc.html`,
`AdminCatalogs.dc.html`), als ein einziger JSON-escapter String in einem
`<script type="application/json" id="appifact-doc">`-Block extrahiert und einzeln geprüft.

**Vorgehen:** Isolierter `docker-compose`-Stack auf eigenen Ports (55000/54200/55432, Compose-
Projekt `qa_audit`), Testdaten (Projekt, vier Nutzer in den Rollen PL/Coreteam/Architect/User,
fünf Stakeholder, Assessments über mehrere Rollen, fünf Kommunikationsarten inkl. einer
deaktivierten, Kommunikationszuordnungen, ein soft-gelöschter Stakeholder) über die REST-API
angelegt, alle Screens per `claude-in-chrome` mit Systemadmin- und PL-Testnutzer durchlaufen.

**Geprüft:** Login (S1), Projektübersicht (S2) inkl. Karten-/Toolbar-Details, Projekt-Workspace
inkl. Navigation, Stakeholder-Liste inkl. Papierkorb, Stakeholder-Detail (Stammdaten,
Kommunikationszuordnungen, Assessment-Tabs aller drei Rollen), Admin-Bereich (Nutzer, Projekte inkl.
Mitgliederverwaltung, Kommunikationsarten-Katalog), Verteiler-Tab. Stichprobenartig gegengeprüft
(bereits mehrfach in Phase 5/11/6–8/12 geprüft): Stakeholder-Map (Zoom-Buttons, Toolbar-Hinweistext,
Quadranten-Labels — Phase-11-Fixes entsprechen dem Design), Kommunikationsarten-Katalog
(kompaktes Listen-Panel mit Status-Pille + einzelnem Bearbeiten-Icon — US-065-Fix entspricht
`AdminCatalogs.dc.html`), Verteiler-Tab (Chip-Darstellung, gedämpfter Hinweistext, Fußzeile mit
Gesamtzahl — US-066–068-Fixes entsprechen `Verteiler.dc.html`). **Nicht geprüft:** `Components.dc.html`
(reine Komponenten-Musterbibliothek ohne eigenen Screen), `Mobile.dc.html` (responsive/mobile
Darstellung — PRD nennt keine explizite Mobile-Anforderung, daher als außerhalb des Scopes dieses
Audits eingestuft) sowie `States.dc.html`/`DetailStates.dc.html` nur so weit, wie die entsprechenden
Lade-/Leer-/Fehler-/Konflikt-Zustände beim regulären Durchlauf tatsächlich auftraten (kein gezieltes
Erzwingen jedes Einzelzustands, z. B. kein Server-Fehler simuliert).

Neu gefundene, bisher nicht dokumentierte Abweichungen:

- **App-weit:** Das in allen zwölf Artboards identische Marken-SVG (stilisiertes gegrilltes Steak,
  brauner Farbverlauf) fehlt komplett — Login-Screen, Sidebar-Brand-Zeile und Favicon zeigen
  stattdessen ein bei US-053 bewusst ohne Rücksprache mit `docs/design` eingeführtes, unabhängiges
  Drei-Kreise-Icon.
  → [Issue #98](https://github.com/Inso666/SlobSteak/issues/98) (Major)
- **Projektübersicht (S2):** Weicht in praktisch jedem Detail von `Main.dc.html` ab — Sidebar ohne
  jegliche Icons/Nutzer-Avatar-Karte, Projekt-Karten nur als nackter Name/Rolle/Stakeholder-Zahl-
  Text ohne Rollen-Badge-Pille, Bewertungsfortschritts-Ringe je Rolle, „X unbewertet“-Hinweisbanner
  oder Footer-Meta/Chevron; Suchfeld und Sortier-Dropdown fehlen vollständig.
  → [Issue #99](https://github.com/Inso666/SlobSteak/issues/99) (Major)
- **Stakeholder-Liste, Admin-Nutzerverwaltung, Admin-Projektliste:** Karten-Raster statt der in
  `StakeholderList.dc.html`/`Admin.dc.html` spezifizierten Tabellen-Listen; in der Stakeholder-Liste
  fehlen zusätzlich die Spalten „Kommunikation“ (Chips) und „Meine Bewertung“ sowie die
  Zeilenzahl-Zusammenfassung, „Gelöschte anzeigen“ ersetzt die aktive Liste statt sie um ein
  zusätzliches Papierkorb-Panel zu ergänzen; in der Admin-Nutzerliste fehlen die Spalten „Status“ und
  „Erstellt am“.
  → [Issue #100](https://github.com/Inso666/SlobSteak/issues/100) (Major)
- **Projekt-Kontext-Navigation:** Liegt als horizontale Tab-Leiste im Hauptbereich statt (wie in
  `Detail.dc.html`/`Map.dc.html`/`StakeholderList.dc.html`/`Verteiler.dc.html` übereinstimmend
  gezeigt) als eingerückte Unterpunkte unterhalb des Projekt-Labels in der linken Sidebar —
  vermutlich ein Rückstand aus der ursprünglichen US-019-Tab-Navigation, den US-055 nicht auf die
  Projekt-Ebene ausgeweitet hat.
  → [Issue #101](https://github.com/Inso666/SlobSteak/issues/101) (Major)
- **Stakeholder-Detail:** Stammdaten sind reiner Lesetext, „Bearbeiten“ öffnet ein separates,
  redundantes Formular weiter unten auf derselben Seite statt die Felder (wie in `Detail.dc.html`)
  direkt inline editierbar zu machen; Seite ist einspaltig statt im spezifizierten Zwei-Spalten-
  Layout (Stammdaten/Kommunikation links, Assessment rechts); keine separate Typ-Tag-Pille neben
  dem Namen.
  → [Issue #102](https://github.com/Inso666/SlobSteak/issues/102) (Major)
- **Blocker, kein Design-Befund sondern funktionale Regression, beim Design-Abgleich der
  Stakeholder-Detailseite entdeckt:** Der Assessment-Bereich zeigt bei frischem Seitenaufruf für den
  standardmäßig aktiven Tab (eigene Rolle) trotz vorhandener und erfolgreich geladener Daten
  (`GET .../assessments` liefert `200`) überhaupt keinen Inhalt — weder Slider noch Notiz noch
  „zuletzt geändert“-Zeile. Der Inhalt erscheint erst nach einem manuellen Tab-Wechsel. Root Cause:
  `AssessmentTabsComponent.loadAssessments()` mutiert `this.roles` in einem `.subscribe()`-Callback
  ohne `ChangeDetectorRef.markForCheck()` (zoneless Change Detection) — dieselbe Fehlerklasse wie
  US-050/US-057/US-058/US-059, aber eine Fundstelle, die vom systematischen Sweep in US-058 nicht
  erfasst wurde.
  → [Issue #103](https://github.com/Inso666/SlobSteak/issues/103) (Blocker/Critical)
- **Datums-/Zeitformat:** „Zuletzt geändert von/am“- und „Gelöscht am“-Metazeilen erscheinen
  systemweit im US-Format („Aug 30, 2026, 2:52:25 PM“) statt im in mehreren Artboards explizit
  vorgegebenen deutschen Format („21.08.2026, 14:32“) — ein durchgängiger Bruch mit der ansonsten
  konsequent deutschen Lokalisierung der Anwendung.
  → [Issue #104](https://github.com/Inso666/SlobSteak/issues/104) (Major)

Alle übrigen geprüften Zustände (Login-Formularfelder/-Beschriftungen, Admin-Mitgliederverwaltung
inkl. Rollen-Dropdown/Entfernen, Kommunikationsarten-Katalog, Map-Zoom/Toolbar-Hinweis/Quadranten-
Labels, Verteiler-Tabelle/Chips/Fußzeile/Leerzustand, Soft-Delete/Wiederherstellen-Grundfunktion,
Sichtbarkeits-/Berechtigungsregeln je Rolle) entsprachen `docs/design` bzw. den bereits in früheren
Abschnitten dieser Datei dokumentierten, akzeptierten Abweichungen.