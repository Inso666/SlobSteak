**ID:** US-007
**Titel:** Rollenbasierte Authorization-Middleware
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-006, US-011

---

### 1. User Story

Als **Entwickler-Agent** möchte ich **eine zentrale, richtlinienbasierte Autorisierung implementieren (ASP.NET Core Policy-based Authorization mit eigenem `IAuthorizationHandler`), die auf jeder Anfrage die Systemrolle (`IsSystemAdmin`) und die projektbezogene Rolle (`ProjectMemberships.Role`) des Nutzers ermittelt und Endpunkte serverseitig absichert**, damit **Berechtigungsregeln aus der Berechtigungsmatrix (Abschnitt 2.3) an einer zentralen Stelle konsistent durchgesetzt werden, statt in jedem Controller einzeln**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 2.3 (Berechtigungsmatrix), Abschnitt 4.3 Punkt 3–4
- **Relevant für DDD:** Application-Schicht Cross-Cutting Concern (Policy/Guard), operiert auf `ProjectMembership` (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] Eine `ProjectRoleRequirement(params ProjectRole[] allowedRoles)` in Kombination mit `ProjectRoleAuthorizationHandler` (Implementierung von `AuthorizationHandler<ProjectRoleRequirement>`) lehnt Requests ohne passende `ProjectMembership.Role` für das über die Route referenzierte `projectId` mit `403 Forbidden` und Body `{"error":"FORBIDDEN"}` ab.
- [ ] Eine zweite Policy `RequireSystemAdmin` (via `AuthorizationHandler<SystemAdminRequirement>`) lehnt Requests ohne `IsSystemAdmin = true` mit `403 Forbidden` ab; Controller-Actions binden Policies deklarativ über `[Authorize(Policy = AuthorizationPolicies.ProjectRole)]` bzw. `[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]`.
- [ ] Ein Systemadmin ohne zusätzliche `ProjectMembership` erhält bei projektbezogenen, fachlichen Endpunkten `403 Forbidden` (erfüllt Fußnote `*` der Berechtigungsmatrix: Admin hat fachliche Rechte nur mit zusätzlicher Projektzuweisung).
- [ ] Requests ohne gültiges JWT-Bearer-Token liefern `401 Unauthorized` (ASP.NET Core Authentication Middleware), bevor die Authorization-Handler greifen.
- [ ] Die für die Autorisierung nötigen Claims (`sub`/`userId`, `isSystemAdmin`) stammen aus dem JWT; `ProjectMembership.Role` wird pro Request aus der Datenbank nachgeladen (nicht aus dem Token), damit ein Rollenwechsel ohne Re-Login sofort wirksam ist.
- [ ] Unit-Tests (xUnit + `Microsoft.AspNetCore.Authorization.Test`-Helper bzw. gemockter `AuthorizationHandlerContext`) decken alle Kombinationen aus Abschnitt 2.3 exemplarisch ab: PL darf `Stakeholder löschen`, Coreteam darf nicht, User darf keine Assessments lesen.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Api/Authorization/ProjectRoleRequirement.cs`
- `src/SlobSteak.Api/Authorization/ProjectRoleAuthorizationHandler.cs`
- `src/SlobSteak.Api/Authorization/SystemAdminRequirement.cs`, `SystemAdminAuthorizationHandler.cs`
- `src/SlobSteak.Api/Authorization/AuthorizationPolicies.cs` (zentrale Policy-Namenskonstanten)
- `src/SlobSteak.Application/Shared/ProjectRolePolicy.cs` (fachliche Regel-Engine, von den Handlers aufgerufen)
- Unit-Tests `tests/SlobSteak.Api.Tests/Authorization/ProjectRoleAuthorizationHandlerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Berechtigungsprüfung erfolgt ausschließlich serverseitig über ASP.NET Core Authorization Policies; UI-seitiges Verstecken von Elementen ersetzt diese Prüfung nicht (Abschnitt 4.3 Punkt 4).
- Rolle `Admin` ist keine Zeile in `ProjectMemberships` — Prüfung auf `IsSystemAdmin` und `ProjectMemberships.Role` erfolgt über getrennte Requirements/Handler.

### Anmerkungen des Dev-Agenten

- Reihenfolge-Hinweis: Diese Story wurde nach US-010/US-011 statt direkt nach US-006 umgesetzt, da
  sie transitiv von beiden abhängt — siehe die entsprechende Anmerkung in
  `docs/usecases/US-010-project-aggregate.md`. Mit Abschluss dieser Story ist der Vorgriff beendet;
  US-008/US-009 folgen wieder in regulärer Phase-1-Reihenfolge.
- `ProjectRoleRequirement(params ProjectRole[] allowedRoles)` variiert die erlaubten Rollen pro
  Controller-Action — ein einzelner, global registrierter Policy-Name allein kann das nicht
  abbilden. Statt `[Authorize(Policy = AuthorizationPolicies.ProjectRole)]` wörtlich zu verwenden,
  bindet ein neues `[RequireProjectRole(params ProjectRole[])]`-Attribut (nutzt das seit .NET 8
  verfügbare `IAuthorizationRequirementData`) die Requirement-Instanz mit den für die jeweilige
  Action konkreten Rollen — funktional identisch zum in der Story beschriebenen Verhalten, aber
  technisch die vom Framework für genau diesen Fall vorgesehene Lösung.
  `AuthorizationPolicies.ProjectRole` bleibt als dokumentierte Konstante bestehen.
- `IAuthorizationMiddlewareResultHandler` (`JsonAuthorizationMiddlewareResultHandler`) neu
  eingeführt, um die von der eingebauten Authorization-Middleware erzeugten 403-Antworten auf den
  Fehler-Contract `{"error":"FORBIDDEN"}` umzuformen (Standardverhalten liefert 403 ohne Body).
- Da diese Story ausschließlich Cross-Cutting-Infrastruktur liefert und noch keine fachlichen
  Endpunkte im Backlog existieren, an die die Policies gebunden werden könnten, verifiziert der
  Story-Test das tatsächliche HTTP-Verhalten (401/403 inkl. Body) über einen eigenständigen,
  minimalen `TestServer` mit zwei Test-Endpunkten, statt `Program.cs` für Tests zu verändern.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-007-authorization-middleware`),
Auto-Merge gemäß ADR-0003 aktiviert.
