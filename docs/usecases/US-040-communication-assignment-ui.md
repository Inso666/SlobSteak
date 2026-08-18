**ID:** US-040
**Titel:** Kommunikationszuordnung API + UI auf Stakeholder-Detailseite
**Bounded Context / Domain:** StakeholderCommunication
**Abhängigkeiten:** US-039, US-026, US-038

---

### 1. User Story

Als **Nutzer** möchte ich **einem Stakeholder eine oder mehrere Kommunikationsarten mit Frequenz und Kanal zuordnen**, damit **später gezielte Verteilerlisten für bestimmte Kommunikationsanlässe gebildet werden können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F4.2
- **Relevant für DDD:** Application Service `ManageStakeholderCommunicationService` (StakeholderCommunication Context)

### 3. Akzeptanzkriterien

- [ ] `POST /api/v1/stakeholders/{id}/communications` mit `communicationTypeId`, `frequency`, `channel` liefert `201 Created`; Duplikat liefert `409 Conflict`.
- [ ] `PATCH /api/v1/stakeholders/{id}/communications/{communicationTypeId}` aktualisiert Frequenz/Kanal.
- [ ] `DELETE /api/v1/stakeholders/{id}/communications/{communicationTypeId}` entfernt die Zuordnung.
- [ ] Endpunkte sind für `PL`, `Coreteam`, `Architect` erreichbar (Architect darf laut Berechtigungsmatrix Kommunikationszuordnungen pflegen, obwohl er keine Verteilerlisten erstellen darf — Abschnitt F4.2), für `User` `403 Forbidden`.
- [ ] Stakeholder-Detailseite (S4) zeigt im Kommunikations-Bereich die Liste bestehender Zuordnungen sowie ein Auswahlformular (Katalog-Dropdown aus aktiven Einträgen von US-037/US-038 + Frequenz-Select + Kanal-Select + „Hinzufügen“).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/ManageStakeholderCommunicationService.cs`
- `src/SlobSteak.Api/Controllers/StakeholderCommunicationController.cs`
- `frontend/src/app/features/stakeholders/communication-assignment-panel/communication-assignment-panel.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Rolle `Architect` darf Kommunikationszuordnungen pflegen, aber keine Verteilerlisten erstellen (F4.2 — Abgrenzung zu US-041/US-042).
