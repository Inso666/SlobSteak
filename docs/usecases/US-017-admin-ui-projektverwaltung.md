**ID:** US-017
**Titel:** Admin-Bereich UI: Projektverwaltung & Mitgliederzuweisung
**Bounded Context / Domain:** ProjectManagement
**Abhängigkeiten:** US-014, US-015, US-016

---

### 1. User Story

Als **Admin** möchte ich **Projekte über eine Weboberfläche anlegen und je Projekt Nutzer mit einer Rolle zuweisen, ändern oder entfernen**, damit **ich Projektzugriffe vollständig über die UI steuern kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S5 — Admin-Bereich, Sub-Bereich Projekte)
- **Relevant für DDD:** Presentation-Schicht (ProjectManagement Context)

### 3. Akzeptanzkriterien

- [ ] Sub-Bereich „Projekte“ zeigt eine Liste aller Projekte mit Name, Status und Anzahl Mitglieder.
- [ ] Formular „Projekt anlegen“ erfasst Name, Beschreibung und ruft `POST /api/v1/admin/projects` auf.
- [ ] Je Projekt existiert eine Mitgliederverwaltung: Dropdown zur Auswahl eines bestehenden Nutzers + Rollen-Select, Button „Hinzufügen“ ruft `POST .../memberships` auf.
- [ ] Je Mitgliedszeile existiert ein Rollen-Select zur Änderung (`PATCH .../memberships/{userId}`) sowie eine „Entfernen“-Aktion (`DELETE .../memberships/{userId}`) mit Bestätigungsdialog.
- [ ] Bereich ist nur für Systemadmins sichtbar/erreichbar.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts`
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts`
- `frontend/src/app/features/admin/admin-projects.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Rollen-Select bietet ausschließlich `PL`, `Coreteam`, `Architect`, `User` an (kein `Admin`).
