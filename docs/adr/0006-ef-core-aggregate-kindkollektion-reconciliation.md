# ADR 0006: Explizite Reconciliation für Aggregate-Kind-Kollektionen mit client-generierten Guid-Schlüsseln

**Status:** Akzeptiert
**Datum:** 2026-08-19
**Kontext-Story:** US-011 (ProjectMembership-Entity mit Rollen-Invariante)

## Kontext

US-011 führt mit `Project.Memberships` (`ProjectMembership` als Kind-Entity innerhalb des
`Project`-Aggregates, siehe ADR-0001) die erste echte EF-Core-Navigationssammlung dieses Projekts
ein, über die ein Aggregate Root neue Kind-Entities anlegt (`AssignMember`) und bestehende entfernt
(`RemoveMember`). Beim Testen gegen eine echte PostgreSQL-Instanz zeigte sich ein reproduzierbares
Fehlverhalten von EF Core 8 (Npgsql-Provider):

1. **Neu hinzugefügte Kind-Entities wurden als `UPDATE` statt `INSERT` gespeichert** (mit
   anschließender `DbUpdateConcurrencyException`, da 0 statt 1 Zeile betroffen war). Ursache: Alle
   Entities in diesem Projekt verwenden client-generierte `Guid`-Primärschlüssel
   (`Guid.NewGuid()` im Domain-Konstruktor, nicht DB-seitig generiert). Sobald irgendein Zugriff
   auf `ChangeTracker.Entries()`/`Entry()` ein automatisches `DetectChanges()` auslöst (was praktisch
   unvermeidbar ist, sobald der Aggregate Root bereits getrackt ist), stuft EF Cores
   Relationship-Fixup-Logik ein über die Navigation neu entdecktes Kind mit bereits vollständig
   gesetztem (nicht-default) Schlüssel fälschlich als "bereits existierend, geändert" statt als
   "neu" ein.
2. **Entfernen eines Kindes aus einer geladenen Pflicht-Navigation (`OnDelete(DeleteBehavior.Restrict)`)
   wirft `InvalidOperationException`** ("association … has been severed …"), statt das Kind zu
   löschen — bei einem nicht-nullable Fremdschlüssel kann EF die Beziehung nicht durch Aushängen
   (FK auf `NULL`) auflösen.
3. **Ein naiver Abgleich "was ist aktuell in der DB vorhanden" (live-Query beim Speichern) ist bei
   parallelem Zugriff unsicher:** Ein Aggregate, das vor dem Speichern eines anderen Prozesses
   geladen wurde, sieht dessen zwischenzeitlich committete Kind-Zeile nicht in seinem eigenen
   In-Memory-Zustand — ein reiner DB-Abgleich würde diese fremde Zeile fälschlich als "entfernt"
   interpretieren und löschen, statt den in US-011 Akzeptanzkriterium 5 geforderten
   Unique-Constraint-Konflikt auszulösen.

## Entscheidung

`ProjectRepository.SaveAsync` (und jede künftige Repository-Implementierung mit einer analogen
Aggregate-Kind-Kollektion, z. B. potenziell relevante spätere Stories) reconciled den
Kind-Kollektions-Zustand explizit, statt sich auf EF Cores automatische Change-Detection zu
verlassen:

- **Neu-Erkennung:** Vor jedem `ChangeTracker`-Zugriff wird per **nicht getrackter** Abfrage
  (`AsNoTracking()`) anhand der konkreten Ids der aktuellen `project.Memberships` geprüft, welche
  bereits persistiert sind. Für jede nicht gefundene Id wird der Entity-State **unconditional**
  explizit auf `EntityState.Added` gesetzt — unabhängig davon, was eine vorherige (unvermeidbare)
  `DetectChanges`-Runde bereits (fälschlich) angenommen haben könnte, da die explizite Zuweisung
  zeitlich danach erfolgt und gewinnt.
- **Entfernt-Erkennung:** Ausschließlich anhand der von diesem `DbContext` bereits **getrackten**
  Einträge (`ChangeTracker.Entries<ProjectMembership>()`), nicht per weiterer Live-DB-Abfrage —
  das ist sicher gegen die unter Punkt 3 beschriebene Race Condition, da nur Zeilen betrachtet
  werden, die dieses Aggregate selbst (z. B. über `Include` beim Laden) tatsächlich kennt.
- **Fremdschlüssel-Verhalten:** `ProjectMembershipConfiguration` setzt für die Project-Beziehung
  `OnDelete(DeleteBehavior.ClientCascade)` statt `Restrict` — die DB-Spalte bleibt weiterhin
  `ON DELETE RESTRICT` (kein Schema-/Migrationsunterschied), aber EF Core behandelt ein aus der
  geladenen Navigation entferntes Pflicht-Kind korrekt als Löschung statt als Fehler.

## Konsequenzen

- Positiv: `AssignMember`/`ChangeMemberRole`/`RemoveMember` funktionieren korrekt gegen eine echte
  PostgreSQL-Instanz, inklusive des Unique-Constraint-Konflikts bei parallelem Zugriff
  (US-011 Akzeptanzkriterium 5) und ohne Datenverlust bei nicht geladenen, von Dritten
  zwischenzeitlich committeten Zeilen.
- Negativ/Trade-off: Der Repository-Code ist dadurch weniger "idiomatisch EF Core" (mehr expliziter
  State-Management-Code statt reiner Navigation-basierter Persistenz) und enthält einen
  zusätzlichen DB-Roundtrip (`AsNoTracking`-Existenzabfrage) je `SaveAsync`-Aufruf mit
  Mitgliedschaftsänderungen.
- **Präzedenzfall für künftige Stories:** Jedes künftige Aggregate mit einer echten
  EF-Core-Kind-Kollektion und client-generierten Guid-Schlüsseln (z. B. potenziell
  `StakeholderCommunicationAssignment` als Teil des `Stakeholder`-Aggregates, US-039) sollte dieses
  Reconciliation-Muster prüfen/übernehmen, statt sich auf EF Cores automatische Change-Detection zu
  verlassen — sonst droht dasselbe UPDATE-statt-INSERT-Fehlverhalten.
