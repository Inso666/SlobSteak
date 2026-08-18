# ADR 0002: Optimistic-Concurrency-Mechanismus für `StakeholderAssessment` — explizite `Version`-Spalte

**Status:** Akzeptiert
**Datum:** 2026-08-18
**Kontext-Story:** US-003 (Schema), wirksam ab US-027/US-028/US-035

## Kontext

PRD Abschnitt F2.1 fordert für `stakeholder_assessments`: "Last-Write-Wins beim Speichern, aber
die Anwendung zeigt vor dem Überschreiben einen Hinweis, wenn sich der Datensatz seit dem Laden
der Seite geändert hat". US-027 konkretisiert das als Akzeptanzkriterium:
`StakeholderAssessment.Update(influence, interest, notes, updatedBy, expectedVersion)` wirft
`StaleAssessmentError`, wenn `expectedVersion` nicht der aktuell persistierten Version entspricht.
CLAUDE.md Abschnitt 3.2/3.6 verlangt, den Konfliktmechanismus zu wählen und als ADR festzuhalten,
schlägt als Optionen "EF-Core-`[Timestamp]`/`RowVersion` bzw. eine explizite `Version`-Spalte"
vor. Die `stakeholder_assessments`-Tabelle in PRD Abschnitt 4.1 listet keine Versionsspalte
explizit, da das PRD "technologieneutral" beschrieben ist und Concurrency-Mechanik als
Implementierungsdetail offen lässt.

Optionen:

1. **PostgreSQL `xmin`-Systemspalte** (Npgsql `UseXminAsConcurrencyToken()`) — kein zusätzliches
   Feld nötig, aber als `uint`/Shadow-Property nur aus der Infrastructure-Schicht komfortabel
   lesbar; die Domain-Methode `Update(..., expectedVersion)` müsste eine Postgres-spezifische
   Wertrepräsentation als Parameter akzeptieren, was die Domain implizit an Postgres koppelt und
   dem Sinn eines DB-agnostischen Aggregates widerspricht (CLAUDE.md 3.1: Domain referenziert
   nichts).
2. **EF-Core `RowVersion`/`[Timestamp]`** (`byte[]`) — ähnliches Kopplungsproblem: ein
   `byte[]`-Vergleichswert ist für eine Domain-Methode und für die spätere API-Antwort
   ("zuletzt geändert von/am" + Konfliktwarnung) unhandlich als für den Client sichtbarer Wert.
3. **Explizite `int Version`-Spalte**, von der Domain selbst verwaltet (`StakeholderAssessment`
   erhöht sie bei jedem `Update()`) — ein einfacher, für die Domain-Methode sowie die künftige
   API-Antwort direkt verwendbarer Wert, unabhängig vom konkreten DB-Provider.

## Entscheidung

Explizite `int Version`-Spalte (Option 3), Startwert `1` bei Erzeugung, wird von der Domain in der
künftigen `Update()`-Methode (US-027) inkrementiert. Zusätzlich wird die Spalte in der
EF-Core-Konfiguration (US-003) über `.IsConcurrencyToken()` als Concurrency-Token markiert, sodass
EF Core bei einem parallelen `SaveChanges()` mit veralteter Version zusätzlich eine
`DbUpdateConcurrencyException` auf Infrastructure-Ebene wirft — als zweite Verteidigungslinie
zusätzlich zur expliziten `StaleAssessmentError`-Prüfung auf Domain-Ebene (US-027/US-028), nicht
als Ersatz dafür.

## Konsequenzen

- Domain bleibt DB-agnostisch: `Version` ist ein einfacher `int`, kein Postgres-/EF-spezifischer
  Typ.
- US-027 muss beim Hinzufügen von `Update()` sicherstellen, dass `Version` bei jedem
  erfolgreichen Update erhöht wird; US-003 legt nur die Spalte und den DB-seitigen
  Concurrency-Check anhand dieser Spalte an, keine Inkrement-Logik (die gehört zur
  Aggregate-Story, siehe [[0001-domain-entity-skeletons-vor-aggregate-stories]]).
- US-028 (API) kann `Version` unverändert im Response-Body an den Client zurückgeben und beim
  nächsten Schreibversuch als `expectedVersion` erwarten — kein weiterer Übersetzungsschritt
  nötig.
