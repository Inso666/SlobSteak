**ID:** US-002
**Titel:** Zentrale Value Objects (Email, Rolle, Score, Enums)
**Bounded Context / Domain:** Shared Kernel
**Abhängigkeiten:** US-001

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **wiederverwendbare Value Objects für Email, ProjectRole, Score (0–100), StakeholderType, Frequency und Channel implementieren**, damit **fachliche Validierungsregeln zentral, konsistent und testbar an einer Stelle gekapselt sind statt in jedem Aggregate dupliziert zu werden**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entitäten, Feldtypen/Enums)
- **Relevant für DDD:** Value Objects (Shared Kernel)

### 3. Akzeptanzkriterien

- [x] Value Object `Email` lehnt ungültige Formate mit einer domänenspezifischen Exception `InvalidEmailFormatError` ab; Unit-Test deckt mindestens 3 gültige und 3 ungültige Beispiele ab.
- [x] Value Object `Score` akzeptiert ausschließlich Ganzzahlen im Bereich 0–100 (inklusive); Werte außerhalb des Bereichs werfen `InvalidScoreRangeError`; Unit-Test prüft Grenzwerte 0, 100, -1, 101.
- [x] Enum `ProjectRole` definiert exakt die Werte `PL`, `Coreteam`, `Architect`, `User` (Admin ist bewusst **kein** Wert dieses Enums, siehe Abschnitt 2.1/4.1).
- [x] Enum `StakeholderType` definiert `Person`, `Organization`.
- [x] Enum `CommunicationFrequency` definiert `Weekly`, `Monthly`, `Quarterly`, `AdHoc`.
- [x] Enum `CommunicationChannel` definiert `Email`, `Meeting`, `Report`.
- [x] Alle Value Objects sind als C#-`record`/`readonly struct` implementiert (unveränderlich, strukturelle Gleichheit `==` kommt dadurch automatisch von der Sprache); Unit-Test prüft `new Email("a@b.de") == new Email("a@b.de")`.

**Status:** fertig am 18.08.2026, Branch `feature/US-002-value-objects`, PR siehe Verlinkung in `BACKLOG.md`.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Shared/ValueObjects/Email.cs`
- `src/SlobSteak.Domain/Shared/ValueObjects/Score.cs`
- `src/SlobSteak.Domain/Shared/Enums/ProjectRole.cs`
- `src/SlobSteak.Domain/Shared/Enums/StakeholderType.cs`
- `src/SlobSteak.Domain/Shared/Enums/CommunicationFrequency.cs`
- `src/SlobSteak.Domain/Shared/Enums/CommunicationChannel.cs`
- Unit-Tests unter `tests/SlobSteak.Domain.Tests/Shared/`

**Wichtige Invarianten & Validierungsregeln:**

- `Score` ist immer ganzzahlig zwischen 0 und 100.
- `ProjectRole` enthält `Admin` nicht — Admin ist gemäß Abschnitt 2.1/4.1 eine instanzweite Systemrolle, keine projektbezogene Rolle.

### 5. Anmerkungen des Dev-Agenten

- **Domänenspezifische Exceptions:** `InvalidEmailFormatError` und `InvalidScoreRangeError` erben von einer neu eingeführten, abstrakten Basisklasse `SlobSteak.Domain.Shared.Exceptions.DomainException`. Dies ist keine Erweiterung des Story-Scopes, sondern die naheliegendste Vorbereitung auf die in CLAUDE.md Abschnitt 3.7 geforderte zentrale Exception-Middleware (`ProblemDetails`-Mapping), die ab einer späteren Story alle Domain-Exceptions einheitlich behandeln wird.
- **Story-Test-Ablageort (Abweichung von Kernregel 3):** Der dedizierte Story-Test liegt unter `tests/SlobSteak.Domain.Tests/UserStories/US002_ValueObjectsTests.cs` statt unter `tests/SlobSteak.Api.Tests/UserStories/`. US-002 liefert ausschließlich Shared-Kernel-Value-Objects/Enums ohne API- oder Frontend-Anteil; ein `WebApplicationFactory<Program>`-Integrationstest hätte keinen fachlichen Gegenstand. Dies ist die PRD-/CLAUDE.md-konformste verfügbare Interpretation der Konvention, keine stille Abweichung (siehe Abschnitt 4 der CLAUDE.md).
- **`ng test` in dieser Umgebung nicht ausführbar:** Diese Story ändert `frontend/` nicht. In der aktuellen Agenten-Umgebung ist lokal Node.js v24.13.0 installiert; die Angular-CLI verlangt ≥22.22.3/24.15/26 und verweigert den Start (bereits aus US-001 bekannte, umgebungsbedingte Einschränkung, keine durch US-002 verursachte Regression). `dotnet test` (gesamte Solution) läuft grün, siehe Abschnitt 6.

### 6. Lokale Verifizierbarkeit

```bash
# Gesamte Solution (39 Domain-Tests, davon 15 Story-Tests für US-002, plus bestehende Tests)
dotnet test

# Nur der dedizierte Story-Test für US-002
dotnet test --filter "FullyQualifiedName~US002"

# dotnet format ohne Änderungen (Formatierungskonformität)
dotnet format SlobSteak.sln --verify-no-changes
```

Diese Story hat keinen API- oder UI-Anteil; es gibt keinen manuellen Klickpfad/`curl`-Smoke-Check. Der Nachweis erfolgt ausschließlich über die grüne Testsuite.
