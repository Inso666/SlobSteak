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
