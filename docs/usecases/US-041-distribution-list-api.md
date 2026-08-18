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

- [ ] `GET /api/v1/projects/{projectId}/distribution-list?communicationTypeId=&frequency=&channel=&stakeholderType=` liefert eine Liste aktiver Stakeholder mit Name, E-Mail, zugeordneter Kommunikationsart/Frequenz/Kanal, gefiltert nach den übergebenen Kriterien (beliebige Kombination, alle optional).
- [ ] Endpoint ist ausschließlich für `PL`/`Coreteam` erreichbar; für `Architect` und `User` liefert er `403 Forbidden` (Berechtigungsmatrix Abschnitt 2.3, F4.2 Abgrenzung).
- [ ] Soft-gelöschte Stakeholder erscheinen nie im Ergebnis, auch nicht kurz nach dem Löschen (Konsistenz mit Abschnitt 4.3 Punkt 5) — Integrationstest verifiziert Verschwinden nach Löschen und Wiederauftauchen nach Wiederherstellung (Kette zu US-023/US-024).
- [ ] Stakeholder ohne hinterlegte E-Mail-Adresse sind im Ergebnis enthalten, mit explizitem Feld `hasEmail: false`.
- [ ] Leeres Filterergebnis liefert `200 OK` mit leerem Array (kein `404`), damit das Frontend eine Leerzustand-Meldung zeigen kann.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/DistributionLists/DistributionListQuery.cs`
- `src/SlobSteak.Api/Controllers/DistributionListController.cs`
- Integrationstest `tests/SlobSteak.Api.Tests/DistributionLists/DistributionListControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nur `PL`/`Coreteam` dürfen Verteilerlisten abfragen (F4.1/F4.2 — `Architect` explizit ausgeschlossen).
- Gelöschte Stakeholder sind serverseitig aus dem Ergebnis gefiltert (Abschnitt 4.3 Punkt 5).
