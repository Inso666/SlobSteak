**ID:** US-033
**Titel:** Vergleichsmodus-Query-API (zwei Perspektiven)
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-031

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **über die API die Assessment-Werte zweier Perspektiven gleichzeitig für alle Stakeholder eines Projekts abrufen**, damit **Wahrnehmungsunterschiede zwischen Rollen als Datenbasis für die Vergleichsansicht verfügbar sind**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.2
- **Relevant für DDD:** Query `StakeholderMapComparisonQuery` (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [x] `GET /api/v1/projects/{projectId}/map/compare?primary={Rolle}&secondary={Rolle}` liefert je Stakeholder mit Assessment in **mindestens einer** der beiden Rollen ein Objekt mit optionalen Feldern `primary: {influence, interest} | null` und `secondary: {influence, interest} | null`.
- [x] Ist `primary` gleich `secondary`, liefert der Endpoint `400 Bad Request`.
- [x] Stakeholder ganz ohne Assessment in beiden Perspektiven sind nicht im Ergebnis enthalten.
- [x] Endpoint liefert `403 Forbidden` für Rolle `User`.
- [x] Integrationstest deckt: Stakeholder mit Assessment in beiden Rollen, nur einer Rolle, keiner Rolle (ausgeschlossen).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Map/StakeholderMapComparisonQuery.cs`
- `src/SlobSteak.Api/Controllers/MapController.cs` (`GET .../map/compare`)

**Wichtige Invarianten & Validierungsregeln:**

- Ergebnis enthält nur Stakeholder mit mindestens einem Assessment in einer der beiden gewählten Perspektiven.

---

### 5. Status

**Fertig am 29.08.2026.** Umsetzung: `StakeholderMapComparisonQuery` (Application, orchestriert
`IStakeholderRepository`/`IStakeholderAssessmentRepository` analog zu `StakeholderMapQuery` aus
US-031) sowie Endpoint `GET /api/v1/projects/{projectId}/map/compare` in `MapController`
(zusätzlich zum bestehenden `GET .../map`). Validierung: `primary`/`secondary` müssen gültige
perspektiv-tragende Rollen sein (nicht `User`), sonst `400 Bad Request`
(`INVALID_PERSPECTIVE`); `primary == secondary` liefert ebenfalls `400 Bad Request`
(`PRIMARY_EQUALS_SECONDARY`). Rollenprüfung `403 Forbidden` für `User` über dasselbe
`RequireProjectRoleAttribute` wie beim bestehenden Map-Endpoint.

Dedizierter Story-Test: `tests/SlobSteak.Api.Tests/UserStories/US033_MapComparisonApiTests.cs`
(ein `[Fact]` je Akzeptanzkriterium, in Dokumentreihenfolge). Ergänzende Randfall-Tests in
`tests/SlobSteak.Api.Tests/Map/MapControllerTests.cs` sowie Unit-Tests gegen gemockte
Repositories in `tests/SlobSteak.Application.Tests/Map/StakeholderMapComparisonQueryTests.cs`.
Gesamte Backend-Testsuite grün (`dotnet test SlobSteak.sln`: 93 Domain + 74 Application + 192 Api
= 359 Tests), `dotnet format --verify-no-changes` ohne Beanstandungen.

Lokale Verifizierbarkeit: Story-Tests isoliert ausführen mit
`dotnet test --filter "FullyQualifiedName~US033"`. Manuelles Beispiel gegen den über
`docker-compose up` laufenden Stack:

```
curl -H "Authorization: Bearer <JWT>" \
  "http://localhost:5000/api/v1/projects/<projectId>/map/compare?primary=PL&secondary=Coreteam"
```

Erwartete Antwort (`200 OK`):

```json
[
  {
    "stakeholderId": "…",
    "name": "Bewerteter Stakeholder",
    "primary": { "influence": 40, "interest": 60 },
    "secondary": { "influence": 15, "interest": 25 }
  },
  {
    "stakeholderId": "…",
    "name": "Nur in Coreteam bewertet",
    "primary": null,
    "secondary": { "influence": 70, "interest": 30 }
  }
]
```

PR: siehe Branch `feature/US-033-map-vergleich-api`.

**Anmerkungen des Agenten:** Keine Abweichungen vom PRD. Die Story-Datei benennt `403 Forbidden`
nur explizit für die Rolle `User` als eigenes Kriterium; analog zu US-031 wird zusätzlich `400 Bad
Request` geliefert, wenn `primary`/`secondary` fehlen, syntaktisch ungültig sind oder selbst den
Wert `User` tragen (Rolle `User` trägt fachlich kein Assessment und ist daher keine gültige
Perspektive für den Vergleich) — konsistent mit der bestehenden Validierung in `GetMap` und ohne
ein Akzeptanzkriterium stillschweigend zu erweitern oder wegzulassen.
