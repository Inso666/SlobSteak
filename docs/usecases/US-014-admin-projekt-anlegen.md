**ID:** US-014
**Titel:** Admin-API: Projekt anlegen
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-010, US-007

---

### 1. User Story

Als **Admin** möchte ich **über einen API-Endpoint ein neues Projekt mit Name, Beschreibung und Status anlegen**, damit **Projektleiter, Architekten und Coreteam-Mitglieder darin Stakeholder verwalten können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F5.2
- **Relevant für DDD:** Application Service `CreateProjectService` (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/admin/projects` mit `name`, `description` liefert `201 Created` mit `status = active`.
- [ ] `POST /api/v1/admin/projects` mit leerem `name` liefert `400 Bad Request`.
- [ ] Endpoint ist ausschließlich für Systemadmins erreichbar (`403` sonst, durchgesetzt via US-007).
- [ ] Integrationstest deckt erfolgreiche Anlage und Validierungsfehler ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Projects/CreateProjectService.cs`
- `src/SlobSteak.Api/Controllers/Admin/AdminProjectController.cs` (`POST /api/v1/admin/projects`)

**Wichtige Invarianten & Validierungsregeln:**

- Projektanlage ist ausschließlich Admins vorbehalten (Berechtigungsmatrix Abschnitt 2.3).
