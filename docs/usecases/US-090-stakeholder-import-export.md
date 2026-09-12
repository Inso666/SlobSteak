**ID:** US-090
**Titel:** Stakeholder-Stammdaten importieren und exportieren (CSV/JSON)
**Bounded Context / Domain:** StakeholderManagement (Domain → Application → API → Frontend)
**Abhängigkeiten:** US-020, US-021, US-025, US-080, US-085
**Status:** offen

---

### 1. User Story

Als **Projektleiter** möchte ich vorhandene Stakeholder aus einer Datei in ein Projekt importieren und den Bestand wieder exportieren können, damit ich einen bestehenden Datenbestand nicht Zeile für Zeile von Hand nacherfassen muss.

### 2. Fachlicher & Technischer Kontext

- **Herkunft:** [Issue #117](https://github.com/Inso666/SlobSteak/issues/117), Feature-Wunsch des Projektverantwortlichen: „I do have my Stakeholders managed in a Excel Sheet at the moment. […] I dont mind transforming my data to fit the interface, but i dont want to manually add all my stakeholders. csv, xml or json (or all of them) would be great."
- **Abgrenzung zum PRD:** Das PRD kennt bislang nur den CSV-**Export** der Verteilerliste (F4.1, umgesetzt in US-042). Ein Import von Stakeholder-Stammdaten ist im MVP-Scope nicht vorgesehen. Diese Story ist damit eine bewusste, vom Projektverantwortlichen angefragte **Erweiterung** über den PRD-Scope hinaus und keine Nachbesserung — sie ist entsprechend nachrangig zu allen Design- und Kontrast-Stories dieser Phasen eingeplant.
- **Bewusste Einschränkung des Umfangs:** Import und Export decken ausschließlich **Stammdaten** ab (Name, Typ, Organisation, Position, E-Mail, Telefon, Standort/Abteilung, Beschreibung). Assessments (rollenspezifische Bewertungen) und Kommunikationszuordnungen bleiben außen vor: Assessments sind laut PRD 4.3 an die schreibende Rolle des jeweiligen Nutzers gebunden, ein Massenimport würde diese Invariante umgehen. Ein späterer Ausbau bleibt möglich.
- **Format-Entscheidung:** Der Issue nennt CSV, XML oder JSON. Umgesetzt werden **CSV** (Excel-nah, entspricht dem geschilderten Ausgangsformat) und **JSON** (verlustfrei, maschinenfreundlich). XML entfällt — kein zusätzlicher Nutzen gegenüber JSON bei zusätzlichem Pflegeaufwand; die Auslassung ist hiermit dokumentiert statt stillschweigend.

### 3. Akzeptanzkriterien

**Export**

- [ ] Aus der Stakeholder-Liste eines Projekts lässt sich der aktuelle (gefilterte) Bestand als CSV und als JSON herunterladen.
- [ ] Der Export enthält alle Stammdatenfelder; die CSV-Spaltenüberschriften entsprechen exakt den beim Import erwarteten Feldnamen, sodass Export und Import ohne Nachbearbeitung zusammenpassen.
- [ ] Gelöschte Stakeholder (`deleted_at` gesetzt) sind nicht enthalten.
- [ ] Die CSV nutzt UTF-8 mit BOM und trennt mit Semikolon, damit sie in deutschsprachigem Excel ohne Zwischenschritt korrekt öffnet — analog zur bestehenden Verteiler-CSV aus US-042 (dort geprüfte Konvention übernehmen, nicht neu erfinden).

**Import**

- [ ] Über die Stakeholder-Liste lässt sich eine CSV- oder JSON-Datei hochladen; die Zuordnung erfolgt über die Spalten-/Feldnamen, die Reihenfolge ist unerheblich.
- [ ] Vor dem Schreiben zeigt eine Vorschau, wie viele Datensätze angelegt würden, wie viele wegen Fehlern übersprungen werden und welche Fehler das sind (Zeilennummer plus lesbare Meldung).
- [ ] Der Import wird erst nach ausdrücklicher Bestätigung geschrieben und läuft als Ganzes durch oder gar nicht (eine Transaktion) — kein halb importierter Bestand.
- [ ] Datensätze verletzen dieselben Invarianten wie beim manuellen Anlegen (US-020/US-021): Pflichtfeld Name, gültiger Typ (`Person`/`Organization`), gültiges E-Mail-Format falls gesetzt. Verletzungen führen zu einer benannten Fehlermeldung, nicht zu einem stillen Überspringen.
- [ ] Der Import legt ausschließlich neue Stakeholder an; er aktualisiert oder löscht keine bestehenden. Ein Datensatz, dessen Name im Projekt bereits existiert, wird als Warnung in der Vorschau gemeldet und beim Import **übersprungen** (nicht angelegt) — siehe Abschnitt 5 für die Begründung.
- [ ] Import ist ausschließlich für Rollen mit Schreibrecht auf Stakeholder-Stammdaten verfügbar (dieselbe Regel wie „Stakeholder anlegen", US-021/US-007); Rolle `User` sieht die Aktion nicht.
- [ ] Die hochgeladene Datei wird nicht dauerhaft gespeichert; sie wird nur für die Dauer der Verarbeitung gehalten. Eine Größenbegrenzung von **5 MB** ist gesetzt und liefert bei Überschreitung eine lesbare Fehlermeldung.

**Übergreifend**

- [ ] Backend-Tests (xUnit) belegen: erfolgreicher Import, Abbruch bei fehlerhafter Zeile ohne Teilschreibung, Berechtigungsregel, Export-Inhalt und -Format.
- [ ] Frontend-Tests (Angular `TestBed`) belegen: Vorschau mit Fehlerliste, Bestätigungsschritt, Sichtbarkeit je Rolle.
- [ ] `.github/workflows/pr-checks.yml` wird erweitert, falls die Story ein neues Testprojekt einführt (CLAUDE.md Abschnitt 5.1).
- [ ] Manueller Smoke-Test gegen `docker compose up`: Export eines Projekts, Änderung der Datei, Re-Import in ein leeres Projekt — Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Voraussichtlich betroffene Dateien:**
- `src/SlobSteak.Application/Stakeholders/**` (Import-/Export-Service inklusive Validierung und Vorschau)
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (neue Endpunkte unterhalb `/api/v1/projects/{projectId}/stakeholders`)
- `frontend/src/app/features/stakeholders/**`
- `tests/**`

**Wichtige Invarianten:**
- PRD 4.3: `deleted_at`-Filterung, Rollen-Schreibrechte und die Zugehörigkeit eines Stakeholders zu genau einem Projekt gelten unverändert. Ein Import darf keine Stakeholder projektübergreifend anlegen.
- Keine EF-Core-Migration erwartet — es entstehen keine neuen Felder.

### 5. Anmerkungen des Product Owners

Diese Story ist die einzige der aus den offenen Issues abgeleiteten Stories, die neue Fachlichkeit einführt statt eine Abweichung zu beheben. Sie ist deshalb bewusst als eigene Phase ans Ende gestellt: Sie ist unabhängig von allen Design-Stories und kann verschoben oder gestrichen werden, ohne eine andere Story zu blockieren.

**Fachliche Festlegungen (bestätigt durch den Projektverantwortlichen am 13.09.2026):**

- **Duplikat-Verhalten: Überspringen.** Ein Datensatz, dessen Name im Projekt bereits existiert, wird beim Import nicht angelegt, sondern nur als Warnung in der Vorschau gemeldet. Begründung: passt zum bewusst konservativen Charakter des Imports („legt ausschließlich neue Stakeholder an, aktualisiert/löscht nichts Bestehendes") und verhindert versehentliche Doppel-Stakeholder bei wiederholten oder sich überschneidenden Imports — ein Nutzer, der einen Datensatz wirklich doppelt anlegen will, kann das weiterhin manuell tun.
- **Größenbegrenzung: 5 MB** je Upload. Begründung: deutlicher Puffer über dem für reine Stammdaten (ohne Assessments/Kommunikationszuordnungen) realistisch zu erwartenden Volumen, ohne unnötig groß gewählt zu sein.
