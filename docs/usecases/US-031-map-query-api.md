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

- [x] `GET /api/v1/projects/{projectId}/map?perspective={PL|Coreteam|Architect}` liefert ausschließlich aktive Stakeholder (`deleted_at IS NULL`), die in der gewählten Perspektive ein Assessment besitzen, jeweils mit `stakeholderId`, `name`, `influence`, `interest`.
- [x] Stakeholder ohne Assessment in der gewählten Perspektive sind **nicht** im Ergebnis enthalten.
- [x] Endpoint liefert `403 Forbidden` für Rolle `User` (Konsistenz mit US-030).
- [x] Fehlt der `perspective`-Query-Parameter, liefert der Endpoint `400 Bad Request`.
- [x] Integrationstest deckt: Stakeholder mit/ohne Assessment in der Perspektive, gelöschter Stakeholder erscheint nicht.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Map/StakeholderMapQuery.cs`
- `src/SlobSteak.Api/Controllers/MapController.cs` (`GET /api/v1/projects/{projectId}/map`)
- Integrationstest `tests/SlobSteak.Api.Tests/Map/MapControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Nur aktive (nicht soft-gelöschte) Stakeholder erscheinen in der Map (Abschnitt 4.3 Punkt 5).
- Rolle `User` hat keinen Zugriff (Berechtigungsmatrix, F3.1).

---

### 5. Status

**Fertig am 29.08.2026.** Umgesetzt in `feature/US-031-map-query-api`, siehe zugehöriger PR.

### 6. Anmerkungen des Agenten

- `perspective=User` ist syntaktisch ein gültiger `ProjectRole`-Enum-Wert, fachlich aber keine
  Perspektive (nur `PL`/`Coreteam`/`Architect` tragen laut Akzeptanzkriterium 1 ein Assessment,
  siehe Story-Query-Parameter-Aufzählung `{PL|Coreteam|Architect}`). Interpretation: `perspective=User`
  wird wie ein ungültiger Wert behandelt und liefert `400 Bad Request`, nicht `200` mit leerer Liste
  — PRD-konformste, am wenigsten überraschende Lesart, keine stille Erweiterung des Wertebereichs.
- Der Query-Layer (`StakeholderMapQuery`) lädt Assessments je aktivem Stakeholder einzeln über
  `IStakeholderAssessmentRepository.FindByStakeholderAndRoleAsync` (analog zum bestehenden Muster aus
  `GetStakeholderAssessmentsQuery`, US-028) statt über einen direkten EF-Core-Join zwischen den
  Tabellen `stakeholders` und `stakeholder_assessments` — konsistent mit der in `backend.md`
  geforderten Trennung der Aggregate-Grenzen StakeholderManagement/StakeholderAssessment. Bei sehr
  großen Projekten (viele hundert Stakeholder) ist das ein bewusster N+1-Kompromiss zugunsten der
  Architektur-Grenze; sollte dies performancerelevant werden, wäre eine dedizierte
  Read-Model-Projektion ein sinnvoller Folge-Schritt (kein Blocker für den MVP-Umfang dieser Story).
- Schließt den in `docs/usecases/US-030-assessment-sichtbarkeit-user.md` als "bekannten offenen
  Punkt" dokumentierten Nachtrag ab: der Map-Query-Endpoint sperrt Rolle `User` nun serverseitig mit
  `403 Forbidden` (Akzeptanzkriterium 3 dieser Story).
- Kein ADR nötig: keine neue architekturrelevante Grundsatzentscheidung, sondern Wiederverwendung
  bestehender Muster (`RequireProjectRoleAttribute`/`ProjectRoleAuthorizationHandler` aus US-007,
  Application-Query-Orchestrierung aus US-028).
