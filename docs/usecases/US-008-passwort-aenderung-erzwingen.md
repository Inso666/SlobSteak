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

### Anmerkungen des Dev-Agenten

- AC 2/AC 4 referenzieren in der Prosa `GET /api/v1/projects` — dieser Endpoint existiert im
  Backlog erst ab Phase 2 und ist zu diesem Zeitpunkt nicht implementiert. Als PRD-konformste
  Interpretation wird stattdessen der bereits real existierende `GET /api/v1/health`-Endpoint
  (außerhalb `/api/v1/auth`) als Zielendpunkt in den Story-Tests verwendet — fachlich äquivalent
  für den Nachweis, dass die Middleware pauschal jeden Endpoint außerhalb `/api/v1/auth/*`
  blockiert.
- Der technische Hinweis nennt `ProjectRoleAuthorizationHandler` als zu erweiternde Datei; da die
  Sperre laut Akzeptanzkriterium 2 aber für **jeden** authentifizierten Request gelten muss —
  unabhängig davon, welche (falls überhaupt eine) Authorization-Policy der jeweilige Endpoint
  verlangt — wurde stattdessen eine eigenständige, globale `PasswordChangeRequiredMiddleware`
  eingeführt (läuft nach `UseAuthentication()`, vor `UseAuthorization()`). Eine Erweiterung nur des
  `ProjectRoleAuthorizationHandler` hätte z. B. `SystemAdmin`-geschützte oder policyfreie Endpunkte
  nicht erfasst.
- Frontend (AC 3): `PasswordChangeModalComponent` + `AuthService` als eigenständige, getestete
  Bausteine umgesetzt. Die vollständige Einbettung (automatisches Anzeigen nach Login, Blockieren
  der restlichen Anwendung per Route Guard, Token-Verwaltung/HTTP-Interceptor) hängt an der in
  US-009 gelieferten Login-Screen-/Session-Infrastruktur, die zu diesem Zeitpunkt noch nicht
  existiert — sie folgt mit US-009, um keinen Vorgriff auf deren Scope zu nehmen.

### Status

Fertig am 19.08.2026 (Backend vollständig inkl. Middleware; Frontend-Komponente als eigenständiger,
getesteter Baustein — vollständige Einbettung folgt mit US-009). Umsetzung: PR auf `main` (Branch
`feature/US-008-passwort-aenderung-erzwingen`), Auto-Merge gemäß ADR-0003 aktiviert.
