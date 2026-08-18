# Product Requirement Document: SlobSteak

**Version:** 1.0
**Datum:** 18.08.2026
**Status:** Freigegeben für Umsetzung (MVP)
**Zielgruppe dieses Dokuments:** Coding-Agenten (v0, Lovable, Bolt.new o.ä.) sowie menschliche Entwickler

---

## 1. Executive Summary & Vision

### 1.1 Problem

Projektleiter, Architekten und Kernteams verwalten Stakeholder heute überwiegend in Excel-Listen oder unstrukturierten Dokumenten. Diese Tools bilden zwei zentrale Realitäten von Stakeholder-Management nicht ab:

1. **Perspektivität**: Derselbe Stakeholder wird von unterschiedlichen Rollen unterschiedlich wahrgenommen. Ein Projektleiter schätzt den Einfluss eines Stakeholders auf das Gesamtprojekt anders ein als ein Architekt, der denselben Stakeholder nur im Hinblick auf technische Architekturentscheidungen bewertet. Excel kennt nur eine einzige Zelle pro Wert – Perspektiven gehen verloren oder werden vermischt.
2. **Handlungsfähigkeit**: Eine Liste mit Zahlen erzeugt keine Handlung. Ohne visuelle Aufbereitung (Stakeholder Map) und ohne gezielte Kommunikationssteuerung (Verteilerlisten) bleibt Stakeholder-Management ein Dokumentations-, kein Steuerungsinstrument.

### 1.2 Lösung

**SlobSteak** ist eine self-hosted Web-Anwendung (als Docker-Container betreibbar, keine Cloud-Abhängigkeit) zur Verwaltung von Stakeholdern auf Projektbasis. Sie erlaubt es, Stakeholder als strukturierte Objekte mit gemeinsamen Stammdaten anzulegen und sie gleichzeitig aus mehreren Rollen-Perspektiven (Projektleiter, Coreteam, Architekt) unabhängig voneinander zu bewerten (Einfluss, Interesse). Diese Bewertungen werden in einer interaktiven Stakeholder Map visualisiert, inklusive eines Vergleichsmodus, der Wahrnehmungsunterschiede zwischen Rollen sichtbar macht. Zusätzlich ermöglicht ein Kommunikationsarten-Katalog das gezielte Erstellen von Verteilerlisten für die Stakeholder-Kommunikation.

### 1.3 Kernwertversprechen (USP)

Nicht die Verwaltung von Stakeholdern an sich ist der Differenzierungsfaktor – das kann jede Tabelle. Der USP ist die **strukturierte Abbildung unterschiedlicher Wahrnehmungen derselben Person durch unterschiedliche Rollen**, gepaart mit einer Visualisierung, die diese Unterschiede aktiv aufzeigt statt sie zu verstecken.

### 1.4 Out of Scope für dieses MVP

Explizit nicht Teil dieser Version (siehe jeweilige Feature-Abschnitte für Details und Begründung):

- Mailversand aus der Anwendung heraus (nur Export/Copy von Empfängerlisten)
- Projektübergreifende/globale Stakeholder (jeder Stakeholder gehört zu genau einem Projekt)
- Konsolidierte/freigegebene Bewertungen (jede Rolle pflegt ihre eigene Perspektive ohne Freigabeworkflow)
- Maßnahmen-/Strategie-Tracking je Stakeholder
- SSO/OIDC-Anbindung
- Selbstregistrierung von Nutzern

### 1.5 Technologie-Rahmenbedingungen

Dieses PRD ist bewusst **technologie-neutral** gehalten und beschreibt Fachlichkeit, Datenmodell und UI unabhängig von einem konkreten Stack. Feststehende Rahmenbedingungen, die jede Umsetzung erfüllen muss:

- Vollständig **self-hosted**, lauffähig als Docker-Container bzw. docker-compose-Stack ohne Pflicht-Abhängigkeit zu externen Cloud-Diensten.
- Persistente relationale Datenhaltung (Schema-Vorschlag siehe Abschnitt 4).
- Keine externe Authentifizierungs-Pflicht (siehe Abschnitt 3.4 / 3.4.x Auth-Feature).

---

## 2. User Personas & Rollen (inkl. Berechtigungen)

### 2.1 Rollenmodell — Grundprinzip

Rollen werden **pro Nutzer und pro Projekt** vergeben, nicht global am Nutzerkonto. Ein Nutzer kann in Projekt A die Rolle "Architect" und in Projekt B die Rolle "PL" haben. Innerhalb eines Projekts hat ein Nutzer **genau eine** Rolle. Die Ausnahme ist die Rolle **Admin**, die instanzweit (nicht projektbezogen) vergeben wird und zusätzlich zu einer projektbezogenen Rolle bestehen kann.

Von den fünf Rollen tragen drei eine eigene fachliche Bewertungsperspektive ("perspektiv-tragende Rollen"): **PL, Coreteam, Architect**. Die Rolle **User** ist reine Leseperspektive ohne eigenes Assessment. Die Rolle **Admin** ist eine Systemrolle ohne fachlichen Projektbezug.

### 2.2 Personas

**Anna, Projektleiterin (Rolle: PL)**
Verantwortet das Gesamtprojekt. Legt Stakeholder an, pflegt deren Stammdaten und ihre eigene Einschätzung von Einfluss und Interesse aus Projektsicht. Nutzt die Stakeholder Map wöchentlich zur Vorbereitung von Steuerungsgesprächen und die Verteilerliste, um Statusberichte gezielt zu versenden.

**Tom, Architekt (Rolle: Architect)**
Ist an mehreren Projekten beteiligt, in unterschiedlichen Rollen. Bewertet Stakeholder ausschließlich hinsichtlich ihres Einflusses auf Architekturentscheidungen — unabhängig von Annas projektweiter Einschätzung. Nutzt den Vergleichsmodus der Map, um zu sehen, wo seine Einschätzung von der des PL abweicht.

**Sara, Coreteam-Mitglied (Rolle: Coreteam)**
Pflegt operative Stammdaten (Kontaktinfos, Kommunikationsarten) und bringt ihre eigene Team-Perspektive in die Bewertung ein.

**Max, Mitleser (Rolle: User)**
Hat Leserecht auf ein Projekt, z. B. als Teil eines Lenkungsausschusses. Sieht Stammdaten und aggregierte Ansichten, aber keine einzelnen Rollen-Assessments im Detail (siehe Berechtigungsmatrix).

**Petra, Administratorin (Rolle: Admin)**
Betreibt die Instanz. Legt Nutzerkonten und Projekte an, weist Nutzer Projekten mit einer Rolle zu, pflegt den instanzweiten Kommunikationsarten-Katalog. Hat keinen fachlichen Zugriff auf Bewertungsinhalte, sofern sie sich nicht zusätzlich selbst einem Projekt zuweist.

### 2.3 Berechtigungsmatrix

| Aktion | Admin | PL | Coreteam | Architect | User |
|---|---|---|---|---|---|
| Nutzer anlegen/verwalten | ✅ | ❌ | ❌ | ❌ | ❌ |
| Projekt anlegen | ✅ | ❌ | ❌ | ❌ | ❌ |
| Nutzer einem Projekt zuweisen (inkl. Rolle) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kommunikationsarten-Katalog pflegen | ✅ | ❌ | ❌ | ❌ | ❌ |
| Stakeholder anlegen/bearbeiten (Stammdaten) | ✅* | ✅ | ✅ | ✅ | ❌ |
| Stakeholder löschen | ✅* | ✅ | ❌ | ❌ | ❌ |
| Eigenes Rollen-Assessment bearbeiten (PL) | ✅* | ✅ | ❌ | ❌ | ❌ |
| Eigenes Rollen-Assessment bearbeiten (Coreteam) | ✅* | ❌ | ✅ | ❌ | ❌ |
| Eigenes Rollen-Assessment bearbeiten (Architect) | ✅* | ❌ | ❌ | ✅ | ❌ |
| Alle Assessments eines Stakeholders lesen | ✅* | ✅ | ✅ | ✅ | ❌ |
| Stammdaten lesen | ✅* | ✅ | ✅ | ✅ | ✅ |
| Stakeholder Map ansehen (eigene Perspektive) | ✅* | ✅ | ✅ | ✅ | ❌ |
| Stakeholder Map: Vergleichsmodus | ✅* | ✅ | ✅ | ✅ | ❌ |
| Drag & Drop in Map (schreibt eigenes Assessment) | ✅* | ✅ | ✅ | ✅ | ❌ |
| Verteilerliste erstellen/filtern/exportieren | ✅* | ✅ | ✅ | ❌ | ❌ |

`*` Admin hat diese Rechte nur, wenn er sich zusätzlich als Projektmitglied mit entsprechender Rolle zuweist. Die reine Systemrolle Admin gewährt keinen fachlichen Zugriff auf Projektinhalte.

**Wichtig für die Umsetzung:** Die Rolle **User** sieht Stammdaten, aber **keine** Einfluss-/Interesse-Werte und keine Map. Das ist eine bewusste Sichtbarkeitsregel, kein reines Schreibrecht-Thema (siehe Akzeptanzkriterien in Abschnitt 3.1).

---

## 3. Detaillierte Feature-Spezifikation

Vier Kernfeatures bilden das MVP: (F1) Stakeholder-Verwaltung, (F2) Perspektivische Assessments, (F3) Stakeholder Map, (F4) Verteilerlisten. Ergänzt um zwei Trägerfeatures: (F5) Projekt- & Nutzerverwaltung (Admin), (F6) Authentifizierung.

### F1 — Stakeholder-Verwaltung (Stammdaten)

**User Story F1.1**
Als PL, Coreteam-Mitglied oder Architekt möchte ich einen neuen Stakeholder in meinem Projekt anlegen können, damit ich ihn bewerten und in Verteilerlisten berücksichtigen kann.

*Akzeptanzkriterien:*
- Formular erfasst: Name (Pflicht), Typ (Person | Organisation/Gremium, Pflicht), Organisation/Zugehörigkeit, Position/Funktion, E-Mail, Telefon, Standort/Abteilung, Freitext-Beschreibung.
- Ein Stakeholder gehört zu genau einem Projekt (kein projektübergreifendes Teilen). Erscheint dieselbe Person in zwei Projekten, wird sie zweimal separat angelegt — dies ist bewusstes Design für das MVP, kein Bug.
- Nach dem Anlegen ist der Stakeholder sofort für alle Projektmitglieder gemäß Berechtigungsmatrix sichtbar.
- Kommunikationsarten (siehe F4) können direkt beim Anlegen oder später zugeordnet werden.

*Edge Cases:*
- Name doppelt vorhanden im selben Projekt → kein Blocker, nur ein nicht-blockierender Hinweis ("Ähnlicher Stakeholder existiert bereits: [Name]").
- E-Mail-Format ungültig → Inline-Validierung, Speichern blockiert bis korrigiert oder Feld geleert.
- Stakeholder-Typ "Organisation" → Felder wie "Position/Funktion" sind optional/ausblendbar, da sie primär für Personen relevant sind.

**User Story F1.2**
Als PL oder Coreteam-Mitglied möchte ich Stammdaten eines bestehenden Stakeholders bearbeiten können, damit die Daten aktuell bleiben.

*Akzeptanzkriterien:*
- Alle Rollen mit Schreibrecht auf Stammdaten (PL, Coreteam, Architect) können jedes Feld ändern.
- Änderungen sind sofort für alle sichtbar (kein Freigabeprozess).
- Ein Änderungsverlauf ("zuletzt geändert von / am") wird auf Stakeholder-Ebene angezeigt.

**User Story F1.3**
Als PL möchte ich einen Stakeholder löschen können, wenn er fälschlich angelegt wurde oder nicht mehr relevant ist, ohne dass die Daten dabei unwiederbringlich verloren gehen.

*Akzeptanzkriterien:*
- Löschen ist nur für PL (und Admin mit PL-Zuweisung) verfügbar, nicht für Coreteam/Architect/User.
- Löschen erfordert eine explizite Bestätigung (zeigt Anzahl betroffener Assessments und Kommunikationszuordnungen an).
- Löschen ist ein **Soft-Delete**: Der Stakeholder-Datensatz wird mit `deleted_at`/`deleted_by` markiert, nicht physisch entfernt. Zugehörige Assessments (F2) und Kommunikationszuordnungen (F4.2) bleiben unverändert in der Datenbank erhalten.
- Ein soft-gelöschter Stakeholder verschwindet sofort aus der Standard-Stakeholder-Liste (F1.4), der Map (F3) und allen Verteilerlisten-Filterergebnissen (F4.1) — für alle Rollen, ausnahmslos.
- Auf der Stakeholder-Liste (F1.4) existiert ein Filter/Umschalter "Gelöschte anzeigen" (Standard: aus), sichtbar für PL und Admin (mit PL-Zuweisung). Darüber gelistete gelöschte Stakeholder sind visuell klar als gelöscht markiert (z. B. ausgegraut, Badge "Gelöscht am [Datum] von [Name]").
- Aus dieser gefilterten Ansicht heraus kann PL/Admin einen Stakeholder wiederherstellen ("Wiederherstellen"-Aktion setzt `deleted_at`/`deleted_by` zurück auf null). Er erscheint danach wieder überall wie zuvor, inkl. aller unverändert erhaltenen Assessments und Kommunikationszuordnungen.
- Ein endgültiges (hartes) Löschen ist explizit **nicht** Teil des MVP — Papierkorb-Bereinigung ist ein möglicher Post-MVP-Nachtrag.

*Edge Cases:*
- Stakeholder ist Teil einer gespeicherten Verteilerliste-Filterkombination → nach dem Löschen verschwindet er automatisch aus zukünftigen Filterergebnissen; nach Wiederherstellung taucht er automatisch wieder auf.
- Ein bereits gelöschter Stakeholder wird erneut gelöscht (z. B. Doppel-Klick/Race Condition) → Aktion ist idempotent, kein Fehler, `deleted_at` bleibt beim ursprünglichen Zeitpunkt.
- Name-Duplikatsprüfung beim Anlegen neuer Stakeholder (F1.1) berücksichtigt auch soft-gelöschte Datensätze im Hinweistext ("Ähnlicher, bereits gelöschter Stakeholder existiert: [Name] — wiederherstellen statt neu anlegen?").

**User Story F1.4**
Als beliebiger Projekt-Nutzer (inkl. User-Rolle) möchte ich eine durchsuchbare, filterbare Liste aller Stakeholder meines Projekts sehen.

*Akzeptanzkriterien:*
- Listenansicht mit Volltextsuche über Name/Organisation und Filter nach Typ und zugeordneten Kommunikationsarten.
- User-Rolle sieht Stammdaten-Spalten, aber keine Einfluss-/Interesse-Spalten (siehe Berechtigungsmatrix).

---

### F2 — Perspektivische Assessments

Dies ist das architektonisch wichtigste Feature und muss exakt wie folgt umgesetzt werden.

**Datenmodell-Grundprinzip:** Zu jedem Stakeholder existieren 0 bis 3 Assessment-Datensätze — höchstens einer je perspektiv-tragender Rolle (PL, Coreteam, Architect). Ein Assessment wird **nicht** von einem einzelnen Nutzer, sondern **gemeinsam von allen Nutzern mit dieser Rolle im jeweiligen Projekt** bearbeitet (ein Datensatz pro Rolle, nicht pro Nutzer).

**User Story F2.1**
Als Nutzer mit einer perspektiv-tragenden Rolle möchte ich für einen Stakeholder meine rollenspezifische Einschätzung von Einfluss und Interesse eintragen, ohne die Einschätzung anderer Rollen zu beeinflussen.

*Akzeptanzkriterien:*
- Auf der Stakeholder-Detailseite existiert je perspektiv-tragender Rolle ein eigener Tab/Bereich: "PL-Sicht", "Coreteam-Sicht", "Architect-Sicht".
- Jeder Bereich enthält: Einfluss (Slider, 0–100), Interesse (Slider, 0–100), Notiz (Freitext).
- Ein Nutzer kann **nur** den Bereich seiner eigenen Projekt-Rolle bearbeiten. Die Bereiche der anderen Rollen sind sichtbar (lesbar), aber nicht editierbar — außer für die Rolle User, die gar keine Werte sieht (siehe F2.3).
- Existiert noch kein Assessment für eine Rolle, wird der Bereich als "Noch nicht bewertet" mit einem Call-to-Action zum Erstellen angezeigt.

*Edge Cases:*
- Zwei Nutzer derselben Rolle (z. B. zwei Architects) bearbeiten gleichzeitig dasselbe Assessment → Last-Write-Wins beim Speichern, aber die Anwendung zeigt vor dem Überschreiben einen Hinweis, wenn sich der Datensatz seit dem Laden der Seite geändert hat ("Diese Bewertung wurde zwischenzeitlich von [Name] aktualisiert. Trotzdem speichern?").
- Ein Projekt hat aktuell keinen Nutzer mit Rolle "Architect" → der Architect-Bereich bleibt sichtbar, aber als "Keine Rolle zugewiesen" markiert; niemand kann ihn befüllen, bis ein Nutzer zugewiesen wird.

**User Story F2.2**
Als Nutzer möchte ich sehen, wer eine Bewertung zuletzt geändert hat, um die Aktualität einschätzen zu können.

*Akzeptanzkriterien:*
- Jeder Assessment-Bereich zeigt "Zuletzt geändert von [Name] am [Datum/Uhrzeit]" an.

**User Story F2.3 (Sichtbarkeitsregel für Rolle User)**
Als Nutzer mit Rolle User möchte ich Stakeholder-Stammdaten einsehen können, aber keine sensiblen Bewertungsdaten, da diese nicht für meine Rolle bestimmt sind.

*Akzeptanzkriterien:*
- Für Nutzer mit Rolle User sind auf der Stakeholder-Detailseite die Assessment-Tabs (PL/Coreteam/Architect-Sicht) vollständig ausgeblendet, nicht nur gesperrt/read-only. Dies ist eine Feldsichtbarkeits-Regel, keine reine UI-Deaktivierung — die zugrundeliegende API darf Assessment-Daten an Nutzer mit Rolle User serverseitig gar nicht erst ausliefern.

---

### F3 — Stakeholder Map

**User Story F3.1**
Als Nutzer mit perspektiv-tragender Rolle möchte ich meine Stakeholder als Quadranten-Diagramm (Einfluss × Interesse) sehen, um Prioritäten auf einen Blick zu erkennen.

*Akzeptanzkriterien:*
- X-Achse: Einfluss (0–100), Y-Achse: Interesse (0–100). Vier Standard-Quadranten werden bei 50/50 visuell getrennt und beschriftet (z. B. "Eng betreuen", "Zufriedenstellen", "Informiert halten", "Beobachten" — klassische Stakeholder-Matrix-Begriffe).
- Ein Dropdown/Umschalter wählt die anzuzeigende Perspektive (PL / Coreteam / Architect). Standardmäßig vorausgewählt ist die eigene Rolle des angemeldeten Nutzers.
- Jeder Punkt repräsentiert einen Stakeholder mit einem Assessment in der gewählten Perspektive. Stakeholder ohne Assessment in dieser Perspektive erscheinen nicht auf der Map (oder optional gesammelt am Rand als "unbewertet" — Umsetzungsdetail, kein hartes Kriterium).
- Klick auf einen Punkt öffnet die Stakeholder-Detailseite.
- Rolle User hat keinen Zugriff auf diese Ansicht (Navigationseintrag ausgeblendet, Route serverseitig geschützt).

**User Story F3.2 — Vergleichsmodus**
Als Nutzer möchte ich zwei Perspektiven gleichzeitig auf der Map sehen, um Wahrnehmungsunterschiede zwischen Rollen zu erkennen.

*Akzeptanzkriterien:*
- Ein zweiter Dropdown aktiviert eine Vergleichsperspektive.
- Für jeden Stakeholder, der in **beiden** gewählten Perspektiven ein Assessment hat, werden zwei Punkte (visuell unterschieden, z. B. durch Form oder Farbe je Rolle) sowie eine Verbindungslinie zwischen ihnen angezeigt.
- Stakeholder mit Assessment nur in einer der beiden Perspektiven werden mit nur einem Punkt angezeigt (keine Linie).
- Eine Legende erklärt die Farb-/Formcodierung je Rolle.
- Hover/Klick auf eine Verbindungslinie zeigt die konkrete Differenz (z. B. "Einfluss: PL 30 vs. Architect 75").

**User Story F3.3 — Drag & Drop**
Als Nutzer mit perspektiv-tragender Rolle möchte ich einen Stakeholder-Punkt direkt in der Map verschieben können, um meine Einschätzung schnell anzupassen, ohne ein Formular zu öffnen.

*Akzeptanzkriterien:*
- Ein Drag & Drop ist **nur** für Punkte der **eigenen** Rollen-Perspektive des angemeldeten Nutzers aktiv. Punkte anderer Perspektiven (auch im Vergleichsmodus) sind nicht verschiebbar (visuell erkennbar z. B. durch reduzierte Deckkraft oder gesperrten Cursor).
- Die neue Position wird in Echtzeit (während des Ziehens) in Einfluss-/Interesse-Werte umgerechnet und nach Loslassen als Update auf das entsprechende Rollen-Assessment gespeichert (identische Schreiblogik wie F2.1, inkl. "zuletzt geändert von/am").
- Wird der zugrundeliegende Assessment-Datensatz zwischen dem Laden der Map und dem Loslassen von einem anderen Nutzer derselben Rolle geändert, greift dieselbe Konfliktregel wie in F2.1 (Hinweis vor dem Überschreiben).
- Im Vergleichsmodus ist nur die als "primäre" Perspektive gewählte Rolle (erster Dropdown) draggable, sofern sie der eigenen Rolle entspricht; die Vergleichsperspektive (zweiter Dropdown) ist nie draggable, auch wenn sie zufällig der eigenen Rolle entspricht — Verwechslungsgefahr beim gleichzeitigen Anzeigen zweier eigener Punkte wird so vermieden.

*Edge Cases:*
- Nutzer mit Rolle Coreteam betrachtet die Map in Perspektive "Architect" (nicht die eigene) → Drag & Drop ist deaktiviert, auch wenn technisch ein Coreteam-Assessment existiert.
- Sehr nah beieinanderliegende Punkte (z. B. beide bei Einfluss 50/Interesse 50) → Map erlaubt Zoom/Pan, um präzises Draggen zu ermöglichen.

---

### F4 — Verteilerlisten

**User Story F4.1**
Als PL oder Coreteam-Mitglied möchte ich Stakeholder nach Kommunikationsart filtern, um eine Empfängerliste für eine bestimmte Kommunikation (z. B. Newsletter) zu erhalten.

*Akzeptanzkriterien:*
- Filter-UI erlaubt Kombination von: Kommunikationsart (aus dem Admin-Katalog), Frequenz, Kanal, sowie optional Stakeholder-Typ.
- Ergebnis ist eine Liste mit Name, E-Mail, zugeordneter Kommunikationsart/Frequenz/Kanal.
- Ein Button kopiert alle E-Mail-Adressen der gefilterten Liste kommasepariert in die Zwischenablage.
- Ein weiterer Button exportiert die gefilterte Liste als CSV-Datei (Spalten: Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal).
- Kein Mailversand aus der Anwendung — dies ist bewusst außerhalb des MVP-Scopes, um keine SMTP-Konfiguration und keine Zustellungs-/Datenschutz-Komplexität in die self-hosted Instanz einzuführen. Nutzer fügen die kopierte Liste manuell in ihr eigenes Mail-Programm ein.

*Edge Cases:*
- Gefilterte Liste enthält Stakeholder ohne hinterlegte E-Mail-Adresse → diese erscheinen in der Liste mit einem Hinweis-Icon, werden aber vom "Copy E-Mails"-Button ausgeschlossen.
- Leeres Filterergebnis → klare Leerzustand-Meldung statt leerer Tabelle.

**User Story F4.2**
Als Nutzer möchte ich einem Stakeholder eine oder mehrere Kommunikationsarten mit Frequenz und Kanal zuordnen.

*Akzeptanzkriterien:*
- Auf der Stakeholder-Detailseite können beliebig viele Kommunikationsarten aus dem instanzweiten Katalog zugeordnet werden (n:m-Beziehung).
- Je Zuordnung wird eine Frequenz (z. B. wöchentlich / monatlich / quartalsweise / anlassbezogen) und ein Kanal (z. B. E-Mail / Meeting / Report) gewählt.
- Rolle Architect hat laut Berechtigungsmatrix kein Recht, Verteilerlisten zu erstellen/filtern (F4.1), darf aber Kommunikationszuordnungen am Stakeholder pflegen, da dies Teil der Stammdatenpflege ist (F1).

---

### F5 — Projekt- & Nutzerverwaltung (Admin-Bereich)

**User Story F5.1**
Als Admin möchte ich Nutzerkonten anlegen, um neuen Teammitgliedern Zugriff zu geben.

*Akzeptanzkriterien:*
- Admin legt Nutzer mit Name, E-Mail und initialem Passwort an (siehe F6 für Auth-Details).
- Keine Selbstregistrierung möglich — der einzige Weg, ein Konto zu erhalten, ist die Anlage durch einen Admin.

**User Story F5.2**
Als Admin möchte ich Projekte anlegen und Nutzer mit einer Rolle zuweisen.

*Akzeptanzkriterien:*
- Projekt hat mindestens: Name, Beschreibung, Status (aktiv/archiviert).
- Zuweisung eines Nutzers zu einem Projekt erfordert die Wahl genau einer Rolle (Admin/PL/Coreteam/Architect/User) für dieses Projekt.
- Ein Nutzer kann zu mehreren Projekten mit jeweils unterschiedlicher Rolle zugewiesen werden.
- Entzug einer Projektzuweisung entfernt den Zugriff sofort, lässt aber bereits erfasste Assessments der zugehörigen Rolle unangetastet (sie gehören der Rolle im Projekt, nicht dem einzelnen Nutzer).

**User Story F5.3**
Als Admin möchte ich den instanzweiten Kommunikationsarten-Katalog pflegen (anlegen/umbenennen/deaktivieren), damit alle Projekte konsistente Kommunikationsarten nutzen.

*Akzeptanzkriterien:*
- Katalogeinträge bestehen mindestens aus einem Namen (z. B. "Newsletter", "Statusbericht", "Jour Fixe", "Lenkungsausschuss").
- Deaktivierte Katalogeinträge bleiben an bereits zugeordneten Stakeholdern sichtbar (historisch), stehen aber bei neuen Zuordnungen nicht mehr zur Auswahl.

---

### F6 — Authentifizierung

**User Story F6.1**
Als Betreiber möchte ich die Instanz mit einem initialen Admin-Konto starten, ohne manuell in die Datenbank eingreifen zu müssen.

*Akzeptanzkriterien:*
- Beim ersten Start der Anwendung wird ein Admin-Konto anhand von Umgebungsvariablen (z. B. `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) automatisch angelegt, sofern noch kein Nutzer existiert.
- Beim ersten Login mit diesem Konto wird eine Passwort-Änderung erzwungen.

**User Story F6.2**
Als Nutzer möchte ich mich mit E-Mail und Passwort anmelden.

*Akzeptanzkriterien:*
- Standard-Login-Formular, sitzungsbasiert oder tokenbasiert (Umsetzungsdetail).
- Keine Selbstregistrierung, kein "Passwort vergessen"-Self-Service im MVP (Admin kann Passwort für einen Nutzer zurücksetzen).
- Nach Login landet der Nutzer auf einer Projektübersicht, gefiltert auf die ihm zugewiesenen Projekte (Admin sieht zusätzlich alle Projekte in einer separaten Admin-Übersicht).

---

## 4. Vorgeschlagenes Datenmodell

Relationales Schema (z. B. für PostgreSQL/Supabase oder jede andere relationale DB), technologieneutral beschrieben.

### 4.1 Entitäten

**users**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| name | text | |
| email | text (unique) | |
| password_hash | text | |
| is_system_admin | boolean | Instanzweite Admin-Rolle, unabhängig von Projektzuweisungen |
| must_change_password | boolean | true nach Seed/Reset |
| created_at | timestamp | |

**projects**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| name | text | |
| description | text | |
| status | enum(active, archived) | |
| created_at | timestamp | |

**project_memberships**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| project_id | UUID (FK → projects) | |
| user_id | UUID (FK → users) | |
| role | enum(PL, Coreteam, Architect, User) | Genau eine Rolle je Nutzer+Projekt. Unique constraint auf (project_id, user_id) |

*Hinweis: `Admin` ist keine Zeile in project_memberships, sondern `users.is_system_admin`. Ein Admin, der fachlich an einem Projekt mitarbeiten will, erhält zusätzlich eine reguläre project_membership.*

**stakeholders**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| project_id | UUID (FK → projects) | Stakeholder gehört zu genau einem Projekt |
| type | enum(person, organization) | |
| name | text | Pflicht |
| organization | text | nullable |
| position | text | nullable, primär für type=person relevant |
| email | text | nullable, validiertes Format |
| phone | text | nullable |
| location_department | text | nullable |
| description | text | nullable, Freitext |
| created_by | UUID (FK → users) | |
| created_at | timestamp | |
| updated_by | UUID (FK → users) | |
| updated_at | timestamp | |
| deleted_at | timestamp, nullable | Soft-Delete-Marker. `null` = aktiv |
| deleted_by | UUID (FK → users), nullable | |

**stakeholder_assessments**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| stakeholder_id | UUID (FK → stakeholders) | |
| role | enum(PL, Coreteam, Architect) | Nur perspektiv-tragende Rollen |
| influence | integer (0–100) | |
| interest | integer (0–100) | |
| notes | text | nullable |
| updated_by | UUID (FK → users) | Letzter Bearbeiter, für "zuletzt geändert von/am" |
| updated_at | timestamp | |
| Unique constraint | (stakeholder_id, role) | max. ein Assessment je Stakeholder+Rolle |

**communication_types** (instanzweiter Admin-Katalog)
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| name | text (unique) | z.B. "Newsletter" |
| is_active | boolean | |
| created_at | timestamp | |

**stakeholder_communication_assignments**
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID (PK) | |
| stakeholder_id | UUID (FK → stakeholders) | |
| communication_type_id | UUID (FK → communication_types) | |
| frequency | enum(weekly, monthly, quarterly, ad_hoc) | |
| channel | enum(email, meeting, report) | |
| Unique constraint | (stakeholder_id, communication_type_id) | eine Zuordnung je Kombination |

### 4.2 Beziehungsübersicht

```
users ──< project_memberships >── projects
                                      │
                                      │ 1:n
                                      ▼
                                 stakeholders
                                  │        │
                          1:n     │        │ n:m (über assignments)
                                  ▼        ▼
                    stakeholder_    stakeholder_communication_
                    assessments     assignments ── communication_types
                    (max 1 je Rolle)
```

### 4.3 Zentrale Invarianten (müssen serverseitig durchgesetzt werden)

1. `stakeholder_assessments`: höchstens ein Datensatz je (`stakeholder_id`, `role`).
2. `project_memberships`: höchstens ein Datensatz je (`project_id`, `user_id`) — eine Rolle pro Nutzer und Projekt.
3. Ein Assessment mit `role = X` darf nur von Nutzern geschrieben werden, die eine `project_membership` mit `role = X` im selben Projekt wie der Stakeholder haben.
4. Nutzer mit `project_memberships.role = User` dürfen `stakeholder_assessments` über die API nicht lesen (nicht nur UI-seitig verbergen).
5. Alle Standard-Leseabfragen auf `stakeholders` (Liste, Map, Verteilerliste, Detailseite über die reguläre Route) filtern serverseitig `deleted_at IS NULL`. Soft-gelöschte Datensätze werden ausschließlich über die dedizierte "Gelöschte anzeigen"-Abfrage (F1.3) zurückgegeben, und auch dort nur an Nutzer mit Rolle PL oder Admin (mit PL-Zuweisung).

---

## 5. Externe Integrationen & APIs

Bewusst minimal für das MVP:

- **Keine** E-Mail-/SMTP-Integration (siehe F4, Begründung: Konfigurationsaufwand und Datenschutzfragen in einer self-hosted Instanz werden vermieden; Export/Copy deckt den Bedarf).
- **Keine** externe Auth-/SSO-Integration (siehe F6, Begründung: einfache lokale Konten reichen für interne Docker-Instanzen; OIDC ist ein sinnvoller Post-MVP-Kandidat, sobald mehrere Instanzen/Teams zentral verwaltet werden sollen).
- **Keine** Zahlungsintegration (kein Abo-/Billing-Modell in dieser Version).
- CSV-Export (F4.1) ist eine reine Server-/Client-seitige Dateigenerierung, keine externe Abhängigkeit.

---

## 6. UI-Architektur

### 6.1 Design-Richtung

Dashboard-lastig und visuell: Kennzahlen-Karten und die Stakeholder Map stehen im Zentrum der Ansichten, nicht reine Tabellen. Klare Kartenstruktur, eine kräftige Akzentfarbe zur Hervorhebung von Handlungsbedarf (z. B. Stakeholder ohne Assessment), großzügiger Weißraum.

### 6.2 Screen-Liste

**S1 — Login**
- E-Mail-/Passwort-Formular
- Erzwungene Passwort-Änderung nach Erst-Login (Komponente: Passwort-Änderungs-Modal)

**S2 — Projektübersicht** (Startseite nach Login)
- Kartenraster der Projekte, denen der Nutzer zugewiesen ist (Name, eigene Rolle im Projekt, Stakeholder-Anzahl)
- Admin sieht zusätzlichen Tab/Bereich "Alle Projekte"
- CTA "Neues Projekt" nur für Admin sichtbar

**S3 — Projekt-Workspace** (nach Auswahl eines Projekts, mit Tab-Navigation)
- Header mit Projektname, Rollen-Badge des aktuellen Nutzers
- Tab **Stakeholder-Liste** (Standard-Landingtab): Suchfeld, Filter (Typ, Kommunikationsart), Tabelle/Kartenliste, CTA "Stakeholder anlegen"
- Tab **Map**: Quadranten-Chart-Komponente, Perspektiv-Dropdown, Vergleichsmodus-Toggle mit zweitem Dropdown, Legende, Zoom/Pan-Steuerung — ausgeblendet für Rolle User
- Tab **Verteiler**: Filterleiste (Kommunikationsart, Frequenz, Kanal, Typ), Ergebnistabelle, Buttons "E-Mails kopieren" / "CSV exportieren" — nur sichtbar für PL/Coreteam (nicht Architect, nicht User)

**S3.x — Stakeholder-Liste: Papierkorb-Ansicht** (Teil des Tabs "Stakeholder-Liste", nicht eigene Route)
- Umschalter "Gelöschte anzeigen" (nur PL/Admin sichtbar), zeigt soft-gelöschte Stakeholder ausgegraut mit Löschdatum/-nutzer und "Wiederherstellen"-Aktion

**S4 — Stakeholder-Detail** (Modal oder eigene Route)
- Kopfbereich: Name, Typ, Organisation, "zuletzt geändert von/am"
- Bereich Stammdaten (editierbar für PL/Coreteam/Architect): alle Felder aus F1.1
- Bereich Kommunikationszuordnungen: Liste + "Kommunikationsart hinzufügen"-Auswahl (Katalog-Dropdown + Frequenz + Kanal)
- Assessment-Tabs "PL-Sicht" / "Coreteam-Sicht" / "Architect-Sicht": je Tab Slider Einfluss, Slider Interesse, Notizfeld, "zuletzt geändert von/am"; nur der Tab der eigenen Rolle ist editierbar, andere sind read-only; alle Tabs ausgeblendet für Rolle User
- CTA "Löschen" nur für PL/Admin(mit PL-Zuweisung) sichtbar

**S5 — Admin-Bereich** (nur für `is_system_admin`)
- Sub-Bereich **Nutzer**: Liste, "Nutzer anlegen"-Formular (Name, E-Mail, initiales Passwort), Passwort-Reset-Aktion je Nutzer
- Sub-Bereich **Projekte**: Liste, "Projekt anlegen"-Formular, je Projekt eine Mitgliederverwaltung (Nutzer hinzufügen/entfernen, Rolle wählen/ändern)
- Sub-Bereich **Kommunikationsarten-Katalog**: Liste, Anlegen/Umbenennen/Aktivieren-Deaktivieren

### 6.3 Navigationsstruktur

```
Sidebar (global):
  - Projektübersicht
  - [Aktuelles Projekt] → Stakeholder / Map / Verteiler   (Sub-Navigation, sobald ein Projekt geöffnet ist)
  - Admin  (nur is_system_admin)
  - Abmelden
```

---

*Ende des Dokuments.*
