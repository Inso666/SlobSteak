**ID:** US-031
**Titel:** Map-Query-API je Perspektive
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-027, US-030

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **über einen API-Endpoint alle Stakeholder eines Projekts mit ihrem Einfluss-/Interesse-Wert für eine gewählte Perspektive abrufen**, damit **diese Daten als Grundlage für die Quadranten-Visualisierung dienen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.1
- **Relevant für DDD:** Query `StakeholderMapQuery` (StakeholderMap Context, Read-Modell über `Stakeholder` + `StakeholderAssessment`)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/projects/{projectId}/map?perspective={PL|Coreteam|Architect}` liefert ausschließlich aktive Stakeholder (`deleted_at IS NULL`), die in der gewählten Perspektive ein Assessment besitzen, jeweils mit `stakeholderId`, `name`, `influence`, `interest`.
- [ ] Stakeholder ohne Assessment in der gewählten Perspektive sind **nicht** im Ergebnis enthalten.
- [ ] Endpoint liefert `403 Forbidden` für Rolle `User` (Konsistenz mit US-030).
- [ ] Fehlt der `perspective`-Query-Parameter, liefert der Endpoint `400 Bad Request`.
- [ ] Integrationstest deckt: Stakeholder mit/ohne Assessment in der Perspektive, gelöschter Stakeholder erscheint nicht.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Map/StakeholderMapQuery.cs`
- `src/SlobSteak.Api/Controllers/MapController.cs` (`GET /api/v1/projects/{projectId}/map`)
- Integrationstest `tests/SlobSteak.Api.Tests/Map/MapControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nur aktive (nicht soft-gelöschte) Stakeholder erscheinen in der Map (Abschnitt 4.3 Punkt 5).
- Rolle `User` hat keinen Zugriff (Berechtigungsmatrix, F3.1).
