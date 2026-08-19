**ID:** US-020
**Titel:** Stakeholder-Aggregate (Domain Model, Invarianten)
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-002, US-003, US-010

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **das `Stakeholder`-Aggregate mit allen Stammdatenfeldern, Soft-Delete-Zustand und Änderungsverlauf implementieren**, damit **alle nachfolgenden Stammdaten-, Assessment- und Kommunikations-Stories auf einem konsistenten, validierten Domain-Modell aufsetzen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entität `stakeholders`), F1.1–F1.3
- **Relevant für DDD:** Aggregate Root `Stakeholder` (StakeholderManagement Context)

### 3. Akzeptanzkriterien

- [ ] `Stakeholder.Create(projectId, type, name, ...optionaleFelder, createdBy)` wirft `StakeholderNameRequiredError`, wenn `name` leer ist.
- [ ] `Stakeholder.Create` wirft `InvalidEmailFormatError` (Wiederverwendung `Email`-VO), wenn `email` gesetzt, aber ungültig formatiert ist; leeres `email`-Feld ist zulässig (nullable).
- [ ] `type = Organization` erlaubt `position` weiterhin als optionales Feld (keine Domain-Restriktion, rein UI-seitig ausblendbar gemäß Edge-Case in F1.1).
- [ ] `Stakeholder.UpdateDetails(fields, updatedBy)` aktualisiert `updated_by`/`updated_at` bei jeder Änderung.
- [ ] `Stakeholder.SoftDelete(deletedBy)` setzt `deleted_at`/`deleted_by`; erneuter Aufruf auf einem bereits gelöschten Stakeholder ist idempotent und ändert `deleted_at` nicht (Unit-Test).
- [ ] `Stakeholder.Restore()` setzt `deleted_at`/`deleted_by` auf `null` zurück.
- [ ] `Stakeholder.IsDeleted()` gibt `true` zurück, wenn `deleted_at` gesetzt ist.
- [ ] Repository-Interface `StakeholderRepository` mit `FindById` (inkl. gelöschter, optional per Flag), `FindActiveByProject`, `FindDeletedByProject`, `Save`, `ExistsSimilarNameInProject` ist definiert und durch eine SQL-Implementierung erfüllt.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Stakeholders/Stakeholder.cs`
- `src/SlobSteak.Domain/Stakeholders/IStakeholderRepository.cs`
- `src/SlobSteak.Infrastructure/Persistence/Stakeholders/StakeholderRepository.cs`
- Unit-Tests `tests/SlobSteak.Domain.Tests/Stakeholders/StakeholderTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Ein Stakeholder gehört zu genau einem Projekt (`project_id` unveränderlich nach Erstellung).
- `name` ist Pflichtfeld; `type` ist Pflichtfeld mit Werten `Person`/`Organization`.
- Soft-Delete ist idempotent: mehrfacher Aufruf ändert `deleted_at` nicht erneut (Abschnitt F1.3 Edge Case).

### Anmerkungen des Dev-Agenten

- `Stakeholder.Create`/`UpdateDetails` nehmen `email` als rohen, optionalen `string?` entgegen
  (nicht direkt das `Email`-Value-Object) und konstruieren `Email` intern nur bei nicht-leerem
  Wert — analog zu `User.Create` aus US-004. Das erfüllt Akzeptanzkriterium 2 wörtlich
  ("leeres email-Feld ist zulässig").
- `ExistsSimilarNameInProjectAsync` implementiert „ähnlich“ als case-insensitiven Exakt-Vergleich
  (nicht Fuzzy-/Levenshtein-Matching) — die PRD-Textstelle (Abschnitt 4.3) beschreibt nur den
  Hinweistext-Anwendungsfall, keine konkrete Ähnlichkeitsmetrik; die einfachste, am wenigsten
  überraschende Interpretation wurde gewählt (CLAUDE.md Abschnitt 4). Schließt bewusst
  soft-gelöschte Datensätze mit ein (PRD: Hinweis auf bereits gelöschten, ähnlich benannten
  Stakeholder).
- Kein neuer API-Endpoint und keine UI in dieser Story (reines Domain-Modell + Repository) — die
  lokale Verifizierbarkeit (CLAUDE.md Kernregel 4) beschränkt sich daher auf einen Smoke-Check,
  dass `docker-compose up` weiterhin fehlerfrei startet (keine Migrations-/Schema-Regression); ein
  Klickpfad entsteht erst mit US-021.
- Keine neue EF-Core-Migration nötig — das Schema wurde bereits in US-003 als Skeleton angelegt
  (`docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md`).

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-020-stakeholder-aggregate`), Auto-Merge gemäß ADR-0003 aktiviert.
