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

### Anmerkungen des Dev-Agenten

- `DeletedStakeholdersQuery` (Application) nutzt bewusst direkt `IStakeholderRepository.
  FindDeletedByProjectAsync` (bereits seit US-020/US-023 vorhanden) statt eines eigenen
  Domain-/Infrastructure-Read-Modell-Ports wie `IStakeholderListQuery` (US-025) — die Abfrage ist
  ein einfacher Filter ohne zusätzliche Such-/Join-Logik, den das bestehende Repository-Interface
  bereits vollständig abdeckt; ein weiterer Port wäre unnötige Indirektion gewesen.
- `GET .../stakeholders?deleted=true` teilt sich bewusst den bestehenden Endpoint mit der
  Standardliste (US-025) statt eine eigene Route zu bekommen (Akzeptanzkriterium 1 spezifiziert
  explizit denselben Pfad mit Query-Parameter). Da das deklarative `RequireProjectRole`-Attribut
  keine query-parameterabhängige Rolleneinschränkung ausdrücken kann, prüft die Action für
  `deleted=true` zusätzlich manuell über die bereits bestehende, framework-freie
  `ProjectRolePolicy` (dieselbe Regel-Engine, die auch `ProjectRoleAuthorizationHandler` nutzt) —
  keine neue Autorisierungsinfrastruktur, nur eine zusätzliche Anwendung der bestehenden.
- `StakeholderResponse` (aus US-021/US-022/US-025) um `deletedAt`/`deletedByName` erweitert statt
  eines eigenen `DeletedStakeholderResponse`-DTOs — konsistent mit der in US-025 begonnenen
  Vereinheitlichung des Response-Contracts über alle Stakeholder-Endpunkte hinweg.
- Akzeptanzkriterium 5 (Wiederauftauchen in einer gespeicherten Verteilerlisten-Filterkombination)
  referenziert US-041 (Verteilerlisten-Filter-Query-API), das als eigenständige Abfrage noch nicht
  existiert (weit spätere Phase) — analog zur bereits in US-023 dokumentierten Abweichung wird nur
  verifiziert, dass die Standardliste (US-025) den wiederhergestellten Stakeholder wieder enthält;
  der US-041-spezifische Teil wird erneut geprüft, sobald diese Story entsteht.
- Kein eigenständiges `deleted-stakeholders-view.component.ts` (wie im technischen Hinweis
  benannt): der Umschalter „Gelöschte anzeigen“ ist stattdessen direkt in die bestehende
  `StakeholderListComponent` (US-025) integriert, die bei Aktivierung denselben Tabellen-/
  Zeilen-Rahmen für die Papierkorb-Ansicht wiederverwendet (Badge statt Bearbeiten-/
  Löschen-Aktionen, Restore-Button). Ein separates Component hätte Tabellen-Markup und
  Lade-/Filterlogik dupliziert, ohne einen eigenen Mehrwert zu bieten — konsistent mit der in
  US-025 bereits etablierten Struktur derselben Komponente.
- Der `POST .../restore`-404-Zweig ist über die HTTP-API praktisch nicht erreichbar für eine
  global unbekannte Id: die Autorisierung (`StakeholderProjectRoleAuthorizationHandler`) muss den
  Stakeholder ebenfalls zuerst auflösen, um das zugehörige Projekt/die Rolle zu prüfen, und
  scheitert bei einer unbekannten Id bereits dort mit `403` (analog zu `DELETE .../stakeholders/
  {id}` aus US-023, das denselben Autorisierungsmechanismus nutzt). Der Fehlerpfad selbst bleibt
  im Code (Robustheit, z. B. bei einem parallelen physischen Löschen) und ist über
  `RestoreStakeholderServiceTests` auf Application-Ebene abgedeckt.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-024-stakeholder-wiederherstellen`),
Auto-Merge gemäß ADR-0003 aktiviert.
