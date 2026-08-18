**ID:** US-005
**Titel:** Seed-Admin-Bootstrap beim Erststart
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-004

---

### 1. User Story

Als **Betreiber** möchte ich **beim ersten Start der Anwendung automatisch ein initiales Admin-Konto anhand von Umgebungsvariablen anlegen lassen**, damit **ich die Instanz ohne manuellen Datenbankzugriff produktiv nehmen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 3, F6.1
- **Relevant für DDD:** Application Service `SeedAdminService` (IdentityAccess Context), nutzt Aggregate `User`

### 3. Akzeptanzkriterien

- [ ] Beim Anwendungsstart prüft ein `SeedAdminService`, ob mindestens ein `User`-Datensatz existiert; existiert keiner, wird ein Admin-Konto aus `SEED_ADMIN_EMAIL` und `SEED_ADMIN_PASSWORD` angelegt.
- [ ] Das erzeugte Admin-Konto hat `is_system_admin = true` und `must_change_password = true`.
- [ ] Fehlen `SEED_ADMIN_EMAIL` oder `SEED_ADMIN_PASSWORD` beim Erststart ohne existierende Nutzer, bricht der Start mit einer klaren Fehlermeldung im Log ab (kein stiller Fehlschlag).
- [ ] Existiert bereits mindestens ein Nutzer, wird der Seed-Vorgang übersprungen (kein Duplikat, kein Fehler) — Integrationstest deckt Start bei bereits vorhandenen Nutzern ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Identity/SeedAdminService.cs`
- Startup-Hook, z. B. `src/SlobSteak.Api/Bootstrap/SeedAdminHostedService.cs`
- Integrationstest `tests/SlobSteak.Application.Tests/Identity/SeedAdminServiceTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Seed läuft ausschließlich, wenn die `users`-Tabelle leer ist.
- Erzeugtes Admin-Konto erzwingt beim ersten Login eine Passwortänderung (siehe US-008).

### Anmerkungen des Dev-Agenten

- `IUserRepository` (US-004) um `AnyAsync()` erweitert — für die Existenzprüfung "mindestens ein
  Nutzer vorhanden" gab es keine passende bestehende Methode (`ExistsByEmailAsync` benötigt eine
  konkrete E-Mail). Rein additive Erweiterung, keine bestehende Signatur verändert.
- `User` (US-004) um `CreateSystemAdmin(name, email, plainPassword)` erweitert (analog zu
  `Create`, zusätzlich `IsSystemAdmin = true`) — notwendig, damit das Passwort-Hashing vollständig
  in der Domain gekapselt bleibt, statt dass `SeedAdminService` (Application-Schicht) selbst hashen
  oder den rohen `User`-Konstruktor mit einem extern erzeugten Hash aufrufen müsste.
- `SeedAdminHostedService` wird bewusst **nicht** in der Hosting-Umgebung `"Testing"` registriert
  (siehe Kommentar in `Program.cs`): mehrere bestehende Tests (u. a. der DB-lose Health-Check-Test
  aus US-001) laufen ohne echte Datenbank; ein zwingend an jedem Hoststart hängender DB-Zugriff
  hätte diese Tests gebrochen (CLAUDE.md Abschnitt 3.2: bestehende Tests dürfen nicht brechen). Der
  Story-Test ruft stattdessen `SeedAdminService.SeedAsync()` direkt über die DI-Registrierung der
  Factory auf — fachlich deckungsgleich mit dem, was der Hosted Service beim echten Start auslöst.
- `docker-compose.yml` um `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (mit Dev-Defaults) ergänzt und
  per manuellem Smoke-Test verifiziert: Erststart legt das Admin-Konto an (Log-Nachweis), ein
  Neustart mit bereits vorhandenem Nutzer überspringt den Seed-Vorgang fehlerfrei.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-005-seed-admin`), Auto-Merge
gemäß ADR-0003 aktiviert.
