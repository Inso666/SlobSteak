**ID:** US-015
**Titel:** Admin-API: Nutzer-Projekt-Zuweisung mit Rolle
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-011, US-012, US-014

---

### 1. User Story

Als **Admin** möchte ich **über einen API-Endpoint einen bestehenden Nutzer einem Projekt mit genau einer Rolle zuweisen bzw. die Zuweisung entziehen**, damit **Nutzer entsprechend ihrer Funktion (PL, Coreteam, Architect, User) Zugriff auf die richtigen Projekte erhalten**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F5.2
- **Relevant für DDD:** Application Service `AssignProjectMembershipService` (ProjectManagement Context), nutzt `Project.AssignMember`/`RemoveMember`

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/admin/projects/{projectId}/memberships` mit `userId`, `role` liefert `201 Created`.
- [ ] Zuweisung eines Nutzers, der im Projekt bereits eine Rolle hat, liefert `409 Conflict` mit `{"error":"MEMBERSHIP_ALREADY_EXISTS"}` (der Client muss stattdessen den Rollen-Änderungs-Endpoint nutzen).
- [ ] `PATCH /api/v1/admin/projects/{projectId}/memberships/{userId}` mit neuer `role` ändert die bestehende Rollenzuweisung und liefert `200 OK`.
- [ ] `DELETE /api/v1/admin/projects/{projectId}/memberships/{userId}` entfernt die Zuweisung und liefert `204 No Content`; bereits erfasste Assessments der Rolle bleiben laut Integrationstest unverändert erhalten.
- [ ] Alle Endpunkte sind ausschließlich für Systemadmins erreichbar.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Projects/AssignProjectMembershipService.cs`
- `src/SlobSteak.Api/Controllers/Admin/AdminProjectMembershipController.cs`
- Integrationstest `tests/SlobSteak.Api.Tests/Admin/AdminProjectMembershipControllerTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Ein Nutzer hat pro Projekt genau eine Rolle (US-011).
- Entzug einer Mitgliedschaft löscht keine Assessments (Abschnitt F5.2).
