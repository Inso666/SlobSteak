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
