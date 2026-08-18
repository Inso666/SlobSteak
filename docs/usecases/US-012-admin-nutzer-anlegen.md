**ID:** US-012
**Titel:** Admin-API: Nutzer anlegen
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-004, US-007

---

### 1. User Story

Als **Admin** möchte ich **über einen API-Endpoint ein neues Nutzerkonto mit Name, E-Mail und initialem Passwort anlegen**, damit **ich neuen Teammitgliedern Zugriff auf die Anwendung geben kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F5.1
- **Relevant für DDD:** Application Service `CreateUserService` (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/admin/users` mit `name`, `email`, `initialPassword` liefert für Systemadmins `201 Created` mit dem neu angelegten Nutzer (ohne `password_hash` im Response-Body).
- [ ] Erzeugter Nutzer hat `must_change_password = true`.
- [ ] `POST /api/v1/admin/users` mit bereits vergebener E-Mail liefert `409 Conflict` mit `{"error":"EMAIL_ALREADY_IN_USE"}`.
- [ ] `POST /api/v1/admin/users` von einem Nicht-Admin liefert `403 Forbidden` (durchgesetzt durch `requireSystemAdmin()` aus US-007).
- [ ] Integrationstest deckt: erfolgreiche Anlage, Duplikat-E-Mail, Zugriff ohne Admin-Rolle.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Identity/CreateUserService.cs`
- `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs` (`POST /api/v1/admin/users`)
- Integrationstest `tests/SlobSteak.Api.Tests/Admin/AdminUserControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Keine Selbstregistrierung — Nutzeranlage ist ausschließlich über diesen Admin-Endpoint möglich (Abschnitt 1.4, F5.1).
