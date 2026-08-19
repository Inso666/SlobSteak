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

### Anmerkungen des Dev-Agenten

- Für Akzeptanzkriterium 1 (Mitgliederzahl je Projekt) gab es noch keinen Backend-Endpoint —
  ergänzt: `GET /api/v1/admin/projects` (`ListProjectsService`) mit `memberCount` im Response-DTO.
  Notwendige Infrastruktur, kein Vorgriff auf eine spätere Story.
- Für die Mitgliederverwaltung (Akzeptanzkriterium 3/4) muss die UI die Mitgliedschaften eines
  Projekts mit aufgelöstem Nutzernamen/E-Mail anzeigen können — `Project.Memberships` kennt nur die
  rohe `UserId` (Bounded-Context-Grenze zu IdentityAccess). Ergänzt: `GET
  /api/v1/admin/projects/{projectId}/memberships` (`ListProjectMembershipsService`), der die
  Zusammenführung mit `IUserRepository` ausschließlich in der Application-Schicht vornimmt (kein
  EF-Core-Join über die Aggregate-Grenze hinweg, CLAUDE.md Abschnitt 3.1).
- `IProjectRepository.FindAllAsync` lud bisher keine `Memberships` (`Include`) — ergänzt, da sonst
  `memberCount` immer 0 gewesen wäre.
- Das Dropdown „bestehenden Nutzer auswählen“ (Akzeptanzkriterium 3) filtert clientseitig bereits
  zugewiesene Nutzer heraus (kein eigenes Akzeptanzkriterium, aber naheliegende UX-Ergänzung, um
  unnötige `409 MEMBERSHIP_ALREADY_EXISTS`-Antworten zu vermeiden).
- Die „Entfernen“-Aktion nutzt den nativen `confirm()`-Dialog als Bestätigung (Akzeptanzkriterium
  4) — kein eigener Modal-Dialog vorgesehen, analog zum bestehenden Muster in US-016 (temporäres
  Passwort direkt in der Erfolgsmeldung statt eigenem Dialog).
- Ein sichtbarer Navigationseintrag existiert weiterhin nicht (Workspace-Shell folgt erst mit
  US-019) — die Route `/admin/projects` ist bereits vollständig funktions- und zugriffsgeschützt
  erreichbar, analog zu `/admin/users` aus US-016.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-017-admin-ui-projektverwaltung`), Auto-Merge gemäß ADR-0003 aktiviert.
