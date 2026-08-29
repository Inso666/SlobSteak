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