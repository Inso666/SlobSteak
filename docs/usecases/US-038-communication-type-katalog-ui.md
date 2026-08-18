**ID:** US-038
**Titel:** Kommunikationsarten-Katalog Admin-UI
**Bounded Context / Domain:** CommunicationCatalog
**Abhängigkeiten:** US-037, US-017

---

### 1. User Story

Als **Admin** möchte ich **den Kommunikationsarten-Katalog über eine Weboberfläche pflegen**, damit **ich ohne API-Kenntnisse konsistente Kommunikationsarten für alle Projekte bereitstellen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S5 — Sub-Bereich Kommunikationsarten-Katalog)
- **Relevant für DDD:** Presentation-Schicht (CommunicationCatalog Context)

### 3. Akzeptanzkriterien

- [ ] Sub-Bereich „Kommunikationsarten-Katalog“ zeigt eine Liste aller Einträge mit Status (aktiv/deaktiviert).
- [ ] Formular „Anlegen“ ruft `POST /api/v1/admin/communication-types` auf; Duplikat-Fehler wird inline am Namensfeld angezeigt.
- [ ] Je Eintrag existiert eine „Umbenennen“- und eine „Aktivieren/Deaktivieren“-Aktion, die die jeweiligen `PATCH`-Aufrufe auslösen.
- [ ] Bereich ist ausschließlich für Systemadmins sichtbar/erreichbar.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.ts`
- `frontend/src/app/features/admin/admin-communication-types.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Deaktivierte Einträge werden in der Liste weiterhin angezeigt (nicht ausgeblendet), aber klar als deaktiviert markiert.
