**ID:** US-037
**Titel:** CommunicationType-Aggregate & Admin-Katalog-API
**Bounded Context / Domain:** CommunicationCatalog
**Abhängigkeiten:** US-002, US-003, US-007

---

### 1. User Story

Als **Admin** möchte ich **über die API den instanzweiten Kommunikationsarten-Katalog anlegen, umbenennen und deaktivieren**, damit **alle Projekte konsistente Kommunikationsarten (z. B. Newsletter, Statusbericht) nutzen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F5.3
- **Relevant für DDD:** Aggregate Root `CommunicationType` (CommunicationCatalog Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/admin/communication-types` mit `name` liefert `201 Created` mit `is_active = true`; Duplikat-Name liefert `409 Conflict` mit `{"error":"NAME_ALREADY_IN_USE"}`.
- [ ] `PATCH /api/v1/admin/communication-types/{id}` mit neuem `name` benennt den Eintrag um.
- [ ] `PATCH /api/v1/admin/communication-types/{id}` mit `is_active = false` deaktiviert den Eintrag, ohne ihn zu löschen; Datensatz bleibt in `communication_types` erhalten.
- [ ] `GET /api/v1/communication-types?activeOnly=true` liefert nur aktive Einträge (für Auswahl bei neuen Zuordnungen); ohne den Parameter werden alle Einträge inkl. deaktivierter geliefert (für historische Anzeige).
- [ ] Alle Schreib-Endpunkte sind ausschließlich für Systemadmins erreichbar.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Domain/Communications/CommunicationType.cs`
- `src/SlobSteak.Domain/Communications/ICommunicationTypeRepository.cs`
- `src/SlobSteak.Infrastructure/Persistence/Communications/CommunicationTypeRepository.cs`
- `src/SlobSteak.Api/Controllers/Admin/CommunicationTypeController.cs`

**Wichtige Invarianten & Validierungsregeln:**

- `name` ist instanzweit eindeutig (DB Unique Constraint aus US-003).
- Deaktivierte Einträge bleiben an bereits zugeordneten Stakeholdern sichtbar, stehen aber bei neuen Zuordnungen nicht mehr zur Auswahl (F5.3).

---

### Status

Fertig am 29.08.2026. Branch `feature/US-037-communication-type-katalog-api`, PR siehe GitHub.

### Anmerkungen des Agenten

- **Keine neue EF-Core-Migration nötig.** Die Tabelle `communication_types` inkl. Unique-Index `ix_communication_types_name` existiert bereits seit der `InitialCreate`-Migration aus US-003 (Domain-Skeleton-Pattern, siehe `docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md`). Diese Story ergänzt ausschließlich Verhalten (`Create`/`Rename`/`Deactivate`/`Activate`) auf dem bestehenden Schema.
- **Controller-Dateiname/-Klassenname weicht vom technischen Hinweis ab.** Die Story nennt `src/SlobSteak.Api/Controllers/Admin/CommunicationTypeController.cs` als einzige zu erstellende Controller-Datei. Da Akzeptanzkriterium 4 (`GET /api/v1/communication-types`) explizit für **alle** authentifizierten Nutzer ohne Admin-Gate erreichbar sein muss, während Akzeptanzkriterium 5 die Schreib-Endpunkte auf Systemadmins beschränkt, sind zwei getrennte Controller erforderlich — analog zur bestehenden Repo-Konvention `AdminProjectController`/`ProjectController` (US-014/US-018) und `AdminUserController` (US-012). Umgesetzt als `Controllers/Admin/AdminCommunicationTypeController.cs` (Schreib-Endpunkte, Systemadmin-only) und `Controllers/CommunicationTypeController.cs` (Lese-Endpunkt, alle authentifizierten Nutzer). Der Klassenname folgt damit der etablierten `AdminXController`-Namenskonvention (`AdminProjectController`, `AdminUserController`, `AdminProjectMembershipController`) statt des literalen Datei-Hinweises — least-surprising, PRD-konformste Interpretation gemäß CLAUDE.md Abschnitt 6, keine zentrale Invariante betroffen.
- **PATCH-Request-DTO unterstützt Name und `isActive` unabhängig voneinander, auch kombiniert.** Die Akzeptanzkriterien beschreiben zwei separate PATCH-Aufrufe (Umbenennen bzw. Deaktivieren), das Story-Dokument schließt eine kombinierte Änderung in einem Request aber nicht aus — `UpdateCommunicationTypeService.UpdateAsync(id, name?, isActive?)` wendet nur die tatsächlich gesetzten Felder an.
