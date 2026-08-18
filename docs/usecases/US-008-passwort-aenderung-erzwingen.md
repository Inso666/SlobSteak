**ID:** US-008
**Titel:** Erzwungene Passwortänderung nach Erst-Login
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-006

---

### 1. User Story

Als **Nutzer mit `must_change_password = true`** möchte ich **nach dem ersten Login zur Änderung meines Passworts aufgefordert werden, bevor ich andere Bereiche der Anwendung nutzen kann**, damit **das initiale bzw. zurückgesetzte Passwort nicht dauerhaft in Gebrauch bleibt**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F6.1, S1 (Passwort-Änderungs-Modal)
- **Relevant für DDD:** Application Service `ChangePasswordService` (IdentityAccess Context), nutzt `User.ChangePassword`

### 3. Akzeptanzkriterien

- [ ] `PATCH /api/v1/auth/password` mit gültigem neuem Passwort (≥ 8 Zeichen) setzt `must_change_password` auf `false` und liefert `200 OK`.
- [ ] Jeder authentifizierte API-Request eines Nutzers mit `must_change_password = true` gegen einen Endpoint außerhalb `/api/v1/auth/*` liefert `403 Forbidden` mit `{"error":"PASSWORD_CHANGE_REQUIRED"}`.
- [ ] Frontend zeigt nach Login mit `must_change_password = true` unmittelbar ein blockierendes Passwort-Änderungs-Modal (Komponente aus S1); die restliche Anwendung ist erst nach erfolgreicher Änderung erreichbar.
- [ ] Integrationstest: Login mit `must_change_password = true` → Zugriff auf `GET /api/v1/projects` liefert `403`; nach `PATCH /api/v1/auth/password` liefert derselbe Request `200`.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Identity/ChangePasswordService.cs`
- `src/SlobSteak.Api/Controllers/AuthController.cs` (`PATCH /api/v1/auth/password`)
- `src/SlobSteak.Api/Authorization/ProjectRoleAuthorizationHandler.cs` (Erweiterung um Password-Change-Guard)
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Solange `must_change_password = true`, sind ausschließlich Auth-Endpunkte erreichbar.
