**ID:** US-013
**Titel:** Admin-API: Passwort-Reset für Nutzer
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-012

---

### 1. User Story

Als **Admin** möchte ich **das Passwort eines bestehenden Nutzers zurücksetzen**, damit **ich Nutzern helfen kann, die ihr Passwort vergessen haben, da kein Self-Service-Reset existiert**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F6.2 (Admin kann Passwort zurücksetzen)
- **Relevant für DDD:** Application Service `ResetPasswordService` (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/admin/users/{userId}/reset-password` mit neuem temporärem Passwort liefert `200 OK` und setzt `must_change_password = true` für den Zielnutzer.
- [ ] Endpoint liefert `404 Not Found`, wenn `userId` nicht existiert.
- [ ] Endpoint ist ausschließlich für Systemadmins erreichbar (`403` sonst).
- [ ] Integrationstest deckt erfolgreichen Reset und anschließenden erzwungenen Passwortwechsel beim nächsten Login des betroffenen Nutzers ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Identity/ResetPasswordService.cs`
- `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs` (Erweiterung um `POST .../reset-password`)

**Wichtige Invarianten & Validierungsregeln:**

- Kein Self-Service-Passwort-Reset im MVP — ausschließlich Admin-getriggert (Abschnitt 1.4, F6.2).
