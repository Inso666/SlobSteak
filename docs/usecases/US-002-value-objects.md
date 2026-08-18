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

- [ ] Value Object `Email` lehnt ungültige Formate mit einer domänenspezifischen Exception `InvalidEmailFormatError` ab; Unit-Test deckt mindestens 3 gültige und 3 ungültige Beispiele ab.
- [ ] Value Object `Score` akzeptiert ausschließlich Ganzzahlen im Bereich 0–100 (inklusive); Werte außerhalb des Bereichs werfen `InvalidScoreRangeError`; Unit-Test prüft Grenzwerte 0, 100, -1, 101.
- [ ] Enum `ProjectRole` definiert exakt die Werte `PL`, `Coreteam`, `Architect`, `User` (Admin ist bewusst **kein** Wert dieses Enums, siehe Abschnitt 2.1/4.1).
- [ ] Enum `StakeholderType` definiert `Person`, `Organization`.
- [ ] Enum `CommunicationFrequency` definiert `Weekly`, `Monthly`, `Quarterly`, `AdHoc`.
- [ ] Enum `CommunicationChannel` definiert `Email`, `Meeting`, `Report`.
- [ ] Alle Value Objects sind als C#-`record`/`readonly struct` implementiert (unveränderlich, strukturelle Gleichheit `==` kommt dadurch automatisch von der Sprache); Unit-Test prüft `new Email("a@b.de") == new Email("a@b.de")`.

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
