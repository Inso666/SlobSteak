**ID:** US-004
**Titel:** User-Aggregate (Domain Model)
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-002, US-003

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **das `User`-Aggregate mit Passwort-Hashing-Logik und den Feldern aus Abschnitt 4.1 implementieren**, damit **Nutzerkonten fachlich korrekt und sicher (gehashte Passwörter) im Domain-Modell abgebildet sind, bevor Authentifizierung und Admin-Verwaltung darauf aufbauen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 4.1 (Entität `users`)
- **Relevant für DDD:** Aggregate Root `User` (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] `User.Create(name, email, plainPassword)` erzeugt eine Instanz mit gehashtem Passwort (`password_hash`); das Klartext-Passwort wird nirgends im Aggregate-Zustand gespeichert.
- [ ] `User.Create` wirft `InvalidEmailFormatError`, wenn `email` kein gültiges `Email`-Value-Object bildet (Wiederverwendung von US-002).
- [ ] `User.Create` wirft `PasswordTooShortError`, wenn das Passwort weniger als 8 Zeichen hat.
- [ ] `User.ChangePassword(newPlainPassword)` aktualisiert `password_hash` und setzt `must_change_password` auf `false`.
- [ ] `User.VerifyPassword(plainPassword)` gibt `true`/`false` zurück, ohne den gespeicherten Hash offenzulegen.
- [ ] Repository-Interface `UserRepository` (Domain) mit `FindById`, `FindByEmail`, `Save`, `ExistsByEmail` ist definiert; eine Infrastruktur-Implementierung gegen die `users`-Tabelle erfüllt das Interface (Integrationstest).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Identity/User.cs` (Aggregate Root)
- `src/SlobSteak.Domain/Identity/IUserRepository.cs` (Interface)
- `src/SlobSteak.Infrastructure/Persistence/Identity/UserRepository.cs`
- Unit-Tests `tests/SlobSteak.Domain.Tests/Identity/UserTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- E-Mail-Adressen sind instanzweit eindeutig (DB Unique Constraint aus US-003 + Domain-Check via `ExistsByEmail`).
- Passwörter werden ausschließlich gehasht persistiert (z. B. bcrypt/argon2), niemals im Klartext.

### Anmerkungen des Dev-Agenten

- Passwort-Hashing wurde mit PBKDF2-HMACSHA256 (`Rfc2898DeriveBytes.Pbkdf2` aus der .NET-BCL, 100.000
  Iterationen, zufälliges 16-Byte-Salt, konstantzeitiger Vergleich) statt eines externen
  bcrypt-/argon2-NuGet-Pakets umgesetzt — beide vom PRD nur beispielhaft genannt, nicht verbindlich
  vorgegeben. Begründung, Trade-offs und Migrationsfähigkeit siehe
  `docs/adr/0004-passwort-hashing-pbkdf2.md`.
- `User.Create` setzt `IsSystemAdmin = false` und `MustChangePassword = true` als Default (nicht
  explizit als Akzeptanzkriterium gefordert, aber notwendig für einen sinnvollen Aggregate-Zustand
  und konsistent mit dem für US-005/US-008 vorgesehenen Erst-Login-Flow). Der bestehende öffentliche
  Konstruktor bleibt für Rematerialisierung durch EF Core sowie für Seed-/Bootstrap-Code (US-005),
  der `IsSystemAdmin = true` explizit setzen muss, erhalten.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-004-user-aggregate`), Auto-Merge
gemäß ADR-0003 aktiviert.
