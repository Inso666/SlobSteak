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

- [x] `POST /api/v1/stakeholders/{id}/communications` mit `communicationTypeId`, `frequency`, `channel` liefert `201 Created`; Duplikat liefert `409 Conflict`.
- [x] `PATCH /api/v1/stakeholders/{id}/communications/{communicationTypeId}` aktualisiert Frequenz/Kanal.
- [x] `DELETE /api/v1/stakeholders/{id}/communications/{communicationTypeId}` entfernt die Zuordnung.
- [x] Endpunkte sind für `PL`, `Coreteam`, `Architect` erreichbar (Architect darf laut Berechtigungsmatrix Kommunikationszuordnungen pflegen, obwohl er keine Verteilerlisten erstellen darf — Abschnitt F4.2), für `User` `403 Forbidden`.
- [x] Stakeholder-Detailseite (S4) zeigt im Kommunikations-Bereich die Liste bestehender Zuordnungen sowie ein Auswahlformular (Katalog-Dropdown aus aktiven Einträgen von US-037/US-038 + Frequenz-Select + Kanal-Select + „Hinzufügen“).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/ManageStakeholderCommunicationService.cs`
- `src/SlobSteak.Api/Controllers/StakeholderCommunicationController.cs`
- `frontend/src/app/features/stakeholders/communication-assignment-panel/communication-assignment-panel.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Rolle `Architect` darf Kommunikationszuordnungen pflegen, aber keine Verteilerlisten erstellen (F4.2 — Abgrenzung zu US-041/US-042).

### 5. Status

Fertig am 2026-08-30. Branch `feature/US-040-communication-assignment-ui`, PR siehe GitHub (Backend + Frontend in diesem PR).

### 6. Anmerkungen des Agenten (CLAUDE.md Abschnitt 6)

- **Zusätzlicher `GET /api/v1/stakeholders/{id}/communications`-Endpoint:** Die Story listet nur POST/PATCH/DELETE als eigene Akzeptanzkriterien, Akzeptanzkriterium 5 fordert aber explizit die Anzeige „der Liste bestehender Zuordnungen“ auf der Detailseite. Ohne einen lesenden Endpunkt ist das nicht umsetzbar; analog zu `GET .../assessments` (US-028) wurde ein `GET`-Endpoint ergänzt, für alle vier Projektrollen erreichbar (konsistent mit „Stammdaten lesen“ aus der PRD-Berechtigungsmatrix) — keine stille Erweiterung der Schreibrechte, nur der lesende Zugriff.
- **Response um `communicationTypeName`/`communicationTypeIsActive` angereichert:** Die Domain-Entity kennt nur die `communicationTypeId` (Cross-Bounded-Context-Referenz ohne EF-Navigation, CLAUDE.md Abschnitt 3.1); der Application Service löst Name/Aktiv-Status zusätzlich über `ICommunicationTypeRepository` auf, damit die Liste auf der Detailseite den Namen anzeigen kann, ohne dass das Frontend selbst mehrere Requests korrelieren muss.
- **Bearbeiten-/Entfernen-Aktionen im Frontend über den wörtlichen Akzeptanzkriterium-5-Wortlaut hinaus:** Die Story nennt im Auswahlformular nur „Hinzufügen“; da die bereits vorhandenen `PATCH`/`DELETE`-Endpunkte (Akzeptanzkriterien 2/3) sonst ohne jede UI-Anbindung blieben, zeigt jede Zeile der Liste zusätzlich „Bearbeiten“/„Entfernen“ (nur für `PL`/`Coreteam`/`Architect` sichtbar, `User` bleibt rein lesend) — eine sinnvolle technische Vervollständigung, keine fachliche Abweichung vom PRD.
