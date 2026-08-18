**ID:** US-006
**Titel:** Login-API mit Session/Token-Ausstellung
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-004

---

### 1. User Story

Als **Nutzer** möchte ich **mich über einen API-Endpoint mit E-Mail und Passwort anmelden**, damit **ich nach erfolgreicher Authentifizierung auf die für mich freigegebenen Bereiche der Anwendung zugreifen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F6.2
- **Relevant für DDD:** Application Service `LoginService` (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/auth/login` mit gültigen Zugangsdaten liefert `200 OK` mit einem Session-Token (JWT oder serverseitige Session-ID) sowie `must_change_password`-Flag im Response-Body.
- [ ] `POST /api/v1/auth/login` mit unbekannter E-Mail oder falschem Passwort liefert `401 Unauthorized` mit generischer Fehlermeldung `INVALID_CREDENTIALS` (kein Hinweis, ob E-Mail oder Passwort falsch war).
- [ ] `POST /api/v1/auth/login` mit fehlenden Pflichtfeldern liefert `400 Bad Request`.
- [ ] Ausgestelltes Token/Session enthält `user_id` und `is_system_admin`, jedoch **keine** projektbezogenen Rollen (diese werden pro Request aus `project_memberships` nachgeladen, siehe US-007).
- [ ] Integrationstest deckt: gültiger Login, falsches Passwort, unbekannte E-Mail, leerer Request-Body.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Identity/LoginService.cs`
- `src/SlobSteak.Api/Controllers/AuthController.cs` (`POST /api/v1/auth/login`)
- Integrationstest `tests/SlobSteak.Api.Tests/Auth/AuthControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Keine Selbstregistrierung — es existiert kein `POST /api/v1/auth/register`-Endpoint.
- Fehlermeldungen bei Login-Fehlschlag verraten nicht, ob die E-Mail existiert (Schutz vor User-Enumeration).

### Anmerkungen des Dev-Agenten

- Entscheidung JWT (statt serverseitiger Session) inkl. Begründung/Trade-offs in
  `docs/adr/0005-jwt-bearer-statt-server-session.md` dokumentiert — durch die in US-007 bereits
  vorgesehenen JWT-Claims im Backlog weitgehend vorgezeichnet.
- Wire-Contract der Response ist camelCase (`token`, `mustChangePassword`) gemäß CLAUDE.md Abschnitt
  3.1, nicht das in der Story-Prosa verwendete `must_change_password` (das bezieht sich auf die
  DB-Spalte, nicht den JSON-Contract).
- `IJwtTokenGenerator` als Port in `SlobSteak.Application.Identity` definiert, Implementierung
  (`JwtTokenGenerator`) bewusst in `SlobSteak.Api` (Composition Root) statt in
  `SlobSteak.Infrastructure`, da Infrastructure laut CLAUDE.md Abschnitt 3.1 nicht auf Application
  referenzieren darf.
- Authentication-Middleware zur Validierung eingehender Tokens (`401` bei fehlendem/ungültigem JWT)
  ist bewusst nicht Teil dieser Story — das ist explizit Akzeptanzkriterium 4 von US-007.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-006-login-api`), Auto-Merge
gemäß ADR-0003 aktiviert.
