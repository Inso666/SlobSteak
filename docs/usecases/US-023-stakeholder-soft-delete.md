**ID:** US-023
**Titel:** Stakeholder Soft-Delete: API + UI
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-020, US-022

---

### 1. User Story

Als **PL** möchte ich **einen Stakeholder als gelöscht markieren, ohne dass zugehörige Assessments und Kommunikationszuordnungen verloren gehen**, damit **fälschlich angelegte oder nicht mehr relevante Stakeholder aus den Standardansichten verschwinden, aber wiederherstellbar bleiben**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F1.3
- **Relevant für DDD:** Application Service `SoftDeleteStakeholderService`, Aggregate `Stakeholder.SoftDelete` (StakeholderManagement Context)

### 3. Akzeptanzkriterien

- [ ] `DELETE /api/v1/stakeholders/{id}` ist ausschließlich für Rolle `PL` (und Admin mit zusätzlicher PL-Zuweisung) erreichbar; sonst `403 Forbidden`.
- [ ] Response vor der eigentlichen Löschbestätigung (`GET /api/v1/stakeholders/{id}/deletion-impact`) liefert die Anzahl betroffener Assessments und Kommunikationszuordnungen, damit die UI eine Bestätigung mit diesen Zahlen anzeigen kann.
- [ ] `DELETE` setzt ausschließlich `deleted_at`/`deleted_by`; ein Integrationstest verifiziert, dass der Datensatz sowie alle zugehörigen `stakeholder_assessments`- und `stakeholder_communication_assignments`-Zeilen physisch unverändert in der Datenbank bestehen bleiben.
- [ ] Nach dem Löschen liefert `GET /api/v1/projects/{projectId}/stakeholders` (Standardliste) diesen Stakeholder nicht mehr; ebenso verschwindet er aus Map-Query (US-031) und Verteilerlisten-Filter (US-041) — Integrationstest deckt alle drei Abfragen ab.
- [ ] Erneutes `DELETE` auf einen bereits gelöschten Stakeholder liefert `200 OK`/idempotent ohne Fehler; `deleted_at` bleibt beim ursprünglichen Zeitpunkt (Unit-/Integrationstest).
- [ ] UI zeigt vor dem Löschen einen Bestätigungsdialog mit den Impact-Zahlen aus dem Impact-Endpoint.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/SoftDeleteStakeholderService.cs`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`DELETE /api/v1/stakeholders/{id}`, `GET .../deletion-impact`)
- `frontend/src/app/features/stakeholders/delete-stakeholder-dialog/delete-stakeholder-dialog.component.ts`
- Integrationstest `tests/SlobSteak.Api.Tests/Stakeholders/StakeholderController_DeleteTests.cs`

**Wichtige Invarianten & Validierungsregeln:**

- Löschen ist Soft-Delete — kein physisches Entfernen (F1.3).
- Löschaktion ist idempotent (F1.3 Edge Case).
- Alle Standardabfragen filtern `deleted_at IS NULL` serverseitig (Abschnitt 4.3 Punkt 5).
