**ID:** US-027
**Titel:** StakeholderAssessment-Aggregate (Domain Model, Invarianten)
**Bounded Context / Domain:** StakeholderAssessment
**Abhängigkeiten:** US-002, US-003, US-020

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **das `StakeholderAssessment`-Aggregate mit rollenbezogenem Einfluss-/Interesse-Wert implementieren, inklusive der Regel „höchstens ein Assessment je Stakeholder+Rolle“**, damit **die fachlich zentrale Perspektivitäts-Logik des Produkts (Abschnitt 1.3 USP) korrekt und testbar im Domain-Modell abgebildet ist**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entität `stakeholder_assessments`), F2 Datenmodell-Grundprinzip
- **Relevant für DDD:** Aggregate Root `StakeholderAssessment` (StakeholderAssessment Context, referenziert `Stakeholder` per ID)

### 3. Akzeptanzkriterien

- [ ] `StakeholderAssessment.Create(stakeholderId, role, influence, interest, notes, updatedBy)` akzeptiert für `role` ausschließlich `PL`, `Coreteam`, `Architect` (nicht `User`); ein anderer Wert wirft `InvalidAssessmentRoleError`.
- [ ] `influence` und `interest` sind `Score`-Value-Objects (0–100, Wiederverwendung US-002); ungültige Werte werfen `InvalidScoreRangeError`.
- [ ] `StakeholderAssessment.Update(influence, interest, notes, updatedBy, expectedVersion)` aktualisiert die Werte sowie `updated_by`/`updated_at` und erhöht eine interne Versionsnummer für optimistisches Locking.
- [ ] `StakeholderAssessment.Update` wirft `StaleAssessmentError`, wenn `expectedVersion` nicht der aktuell persistierten Version entspricht (Grundlage für Konfliktwarnung in US-028).
- [ ] Repository-Interface `StakeholderAssessmentRepository` mit `FindByStakeholderAndRole`, `FindAllByStakeholder`, `Save` ist definiert; SQL-Implementierung erfüllt Unique Constraint (`stakeholder_id`, `role`) aus US-003.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Assessments/StakeholderAssessment.cs`
- `src/SlobSteak.Domain/Assessments/IStakeholderAssessmentRepository.cs`
- `src/SlobSteak.Infrastructure/Persistence/Assessments/StakeholderAssessmentRepository.cs`
- Unit-Tests `tests/SlobSteak.Domain.Tests/Assessments/StakeholderAssessmentTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Höchstens ein Assessment je (`stakeholder_id`, `role`) (Abschnitt 4.3 Punkt 1).
- `role` ist stets eine perspektiv-tragende Rolle — niemals `User` (Abschnitt 2.1).
- Ein Assessment gehört fachlich der Rolle im Projekt, nicht einem einzelnen Nutzer (F2 Grundprinzip).

### Anmerkungen des Dev-Agenten

- `IStakeholderAssessmentRepository`-Methoden tragen konsequent das `Async`-Suffix (z. B.
  `FindByStakeholderAndRoleAsync` statt `FindByStakeholderAndRole`), abweichend von der in
  Akzeptanzkriterium 5 genannten Kurzform — konsistent mit jedem anderen Repository-Interface im
  Projekt (z. B. `IStakeholderRepository`).
- Die Invariante „höchstens ein Assessment je Stakeholder+Rolle“ wird bewusst nicht innerhalb von
  `StakeholderAssessment.Create` geprüft (ein Aggregate kennt seine Geschwister nicht), sondern
  über den seit US-003 bestehenden Unique-Index auf DB-Ebene durchgesetzt — die
  Application-Schicht (US-028) prüft zusätzlich vorab, analog zum bestehenden
  Namensduplikat-Hinweis bei `Stakeholder.Create` (US-021).
- `Version` ist bereits seit US-003/ADR-0002 als EF-Core-`IsConcurrencyToken()` konfiguriert. Das
  bleibt unverändert bestehen und wirkt als zusätzliche DB-seitige Absicherung für den seltenen
  Fall zweier nahezu gleichzeitiger `SaveChanges`-Aufrufe innerhalb desselben Requests — die hier
  neu hinzugekommene `expectedVersion`-Prüfung in `Update` ist die primäre, fachlich sichtbare
  Optimistic-Concurrency-Regel (Grundlage der Konfliktwarnung in US-028) und greift bereits, bevor
  überhaupt gespeichert wird, da der Aufrufer stets eine frisch aus der Datenbank geladene Instanz
  aktualisiert.
- Reine Domain-Story ohne API-/UI-Anteil (wie US-020) — kein Exception-Mapping in
  `SlobSteak.Api` für `InvalidAssessmentRoleError`/`StaleAssessmentError` in dieser Story; das
  folgt mit dem eigentlichen Endpoint in US-028.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-027-assessment-aggregate`),
Auto-Merge gemäß ADR-0003 aktiviert.
