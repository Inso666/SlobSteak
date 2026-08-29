**ID:** US-041
**Titel:** Verteilerlisten-Filter-Query-API inkl. Berechtigungsregel
**Bounded Context / Domain:** DistributionList
**Abhängigkeiten:** US-039, US-025, US-007

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich **über die API Stakeholder nach Kommunikationsart, Frequenz, Kanal und Typ filtern, um eine Empfängerliste zu erhalten**, damit **ich gezielt Empfänger für eine bestimmte Kommunikation (z. B. Newsletter) identifizieren kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F4.1
- **Relevant für DDD:** Query `DistributionListQuery` (DistributionList Context, Read-Modell über `Stakeholder` + `StakeholderCommunicationAssignment`)

### 3. Akzeptanzkriterien

- [x] `GET /api/v1/projects/{projectId}/distribution-list?communicationTypeId=&frequency=&channel=&stakeholderType=` liefert eine Liste aktiver Stakeholder mit Name, E-Mail, zugeordneter Kommunikationsart/Frequenz/Kanal, gefiltert nach den übergebenen Kriterien (beliebige Kombination, alle optional).
- [x] Endpoint ist ausschließlich für `PL`/`Coreteam` erreichbar; für `Architect` und `User` liefert er `403 Forbidden` (Berechtigungsmatrix Abschnitt 2.3, F4.2 Abgrenzung).
- [x] Soft-gelöschte Stakeholder erscheinen nie im Ergebnis, auch nicht kurz nach dem Löschen (Konsistenz mit Abschnitt 4.3 Punkt 5) — Integrationstest verifiziert Verschwinden nach Löschen und Wiederauftauchen nach Wiederherstellung (Kette zu US-023/US-024).
- [x] Stakeholder ohne hinterlegte E-Mail-Adresse sind im Ergebnis enthalten, mit explizitem Feld `hasEmail: false`.
- [x] Leeres Filterergebnis liefert `200 OK` mit leerem Array (kein `404`), damit das Frontend eine Leerzustand-Meldung zeigen kann.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/DistributionLists/DistributionListQuery.cs`
- `src/SlobSteak.Api/Controllers/DistributionListController.cs`
- Integrationstest `tests/SlobSteak.Api.Tests/DistributionLists/DistributionListControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nur `PL`/`Coreteam` dürfen Verteilerlisten abfragen (F4.1/F4.2 — `Architect` explizit ausgeschlossen).
- Gelöschte Stakeholder sind serverseitig aus dem Ergebnis gefiltert (Abschnitt 4.3 Punkt 5).

---

### Status

Fertig am 30.08.2026. PR: `feature/US-041-distribution-list-api` → `main` (siehe PR-Beschreibung für Details).

### Anmerkungen des Agenten

- **Zeilengranularität des Ergebnisses (Interpretation, CLAUDE.md Abschnitt 6):** Die Story spricht von einer „Liste aktiver Stakeholder … mit … zugeordneter Kommunikationsart/Frequenz/Kanal" und definiert das Read-Modell selbst als „Stakeholder + StakeholderCommunicationAssignment" (Abschnitt 2). Ein Stakeholder kann mehrere Kommunikationszuordnungen haben (US-039); die Story sagt nicht explizit, ob pro Stakeholder eine Zeile mit einer (welcher?) Zuordnung oder eine Zeile je Zuordnung zurückkommt. Gewählt wurde die zweite, am wenigsten überraschende Interpretation: **ein Ergebniseintrag pro (aktivem Stakeholder × passender Kommunikationszuordnung)** — konsistent mit dem PRD-Zweck von F4.1 („Empfängerliste für eine bestimmte Kommunikation, z. B. Newsletter identifizieren") und mit dem als Read-Modell explizit genannten Join über beide Entitäten. Konsequenz: ein Stakeholder ohne (zum Filter passende) Kommunikationszuordnung erscheint nicht im Ergebnis — er ist für keine konkrete Kommunikation ein Empfänger. Ein Stakeholder mit mehreren passenden Zuordnungen erzeugt entsprechend mehrere Zeilen. Diese Entscheidung betrifft nur die Response-Form der Query, keine zentrale PRD-Invariante aus Abschnitt 4.3 — daher hier dokumentiert statt eskaliert.
- **Ungültige Filterwerte:** Ein ungültiger `frequency`/`channel`/`stakeholderType`-Wert wird ignoriert (Filter nicht angewendet) statt mit `400` abgelehnt — analog zum bestehenden Verhalten von `GET .../stakeholders?type=` (US-025), damit eine fehlerhafte Filter-Query die Liste nicht blockiert.
- **Keine neue Infrastructure-Query nötig:** Wie im Auftrag vermutet, ließ sich die Query rein in der Application-Schicht über die bestehenden Repositories (`IStakeholderRepository`, `ICommunicationTypeRepository`) zusammensetzen — kein neues Domain-Port-Interface, keine neue EF-Core-Query in `SlobSteak.Infrastructure`. Einzige Infrastructure-Änderung: `StakeholderRepository.FindActiveByProjectAsync` lädt jetzt zusätzlich `CommunicationAssignments` per `Include` (analog zu `FindByIdAsync`), da die Application-Schicht sie für dieses Read-Modell benötigt und das Aggregate dadurch konsistent vollständig geladen wird.
