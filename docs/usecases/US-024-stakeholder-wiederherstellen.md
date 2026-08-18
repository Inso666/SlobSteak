**ID:** US-024
**Titel:** Stakeholder Wiederherstellen & Papierkorb-Ansicht: API + UI (S3.x)
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-023, US-025

---

### 1. User Story

Als **PL** möchte ich **soft-gelöschte Stakeholder in einer dedizierten Papierkorb-Ansicht einsehen und wiederherstellen**, damit **versehentlich gelöschte Stakeholder inkl. aller Assessments und Kommunikationszuordnungen zurückgeholt werden können**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F1.3, Abschnitt 6.2 (S3.x — Papierkorb-Ansicht)
- **Relevant für DDD:** Application Service `RestoreStakeholderService`, Query `DeletedStakeholdersQuery` (StakeholderManagement Context)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/projects/{projectId}/stakeholders?deleted=true` liefert ausschließlich soft-gelöschte Stakeholder inkl. `deletedAt`/`deletedByName` und ist ausschließlich für `PL`/Admin(mit PL-Zuweisung) erreichbar; sonst `403 Forbidden`.
- [ ] `POST /api/v1/stakeholders/{id}/restore` setzt `deleted_at`/`deleted_by` zurück auf `null` und liefert `200 OK`; danach erscheint der Stakeholder wieder in Standardliste (US-025), Map (US-031) und Verteilerlisten-Filter (US-041) — Integrationstest deckt dies ab.
- [ ] UI-Umschalter „Gelöschte anzeigen“ (Standard: aus) ist nur für `PL`/Admin(mit PL-Zuweisung) sichtbar; aktiviert zeigt die Liste gelöschte Einträge ausgegraut mit Badge „Gelöscht am [Datum] von [Name]“.
- [ ] Aus dieser Ansicht heraus löst ein „Wiederherstellen“-Button den Restore-Endpoint aus und aktualisiert die Liste ohne vollständigen Reload.
- [ ] War der Stakeholder Teil einer gespeicherten Verteilerlisten-Filterkombination, taucht er nach Wiederherstellung automatisch wieder in deren Ergebnissen auf (Integrationstest über US-041-Query).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/RestoreStakeholderService.cs`
- `src/SlobSteak.Application/Stakeholders/DeletedStakeholdersQuery.cs`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`GET ?deleted=true`, `POST .../restore`)
- `frontend/src/app/features/stakeholders/deleted-stakeholders-view/deleted-stakeholders-view.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Gelöschte Datensätze werden ausschließlich über die dedizierte Abfrage zurückgegeben, ausschließlich an `PL`/Admin(mit PL-Zuweisung) (Abschnitt 4.3 Punkt 5).
