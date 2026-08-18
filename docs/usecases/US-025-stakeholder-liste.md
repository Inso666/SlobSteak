**ID:** US-025
**Titel:** Stakeholder-Liste mit Suche/Filter: API + UI inkl. Rollen-Sichtbarkeitsregel
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-020, US-019

---

### 1. User Story

Als **beliebiger Projekt-Nutzer (inkl. Rolle User)** möchte ich **eine durchsuchbare, filterbare Liste aller aktiven Stakeholder meines Projekts sehen**, damit **ich schnell den gesuchten Stakeholder finde, auch ohne Zugriff auf Bewertungsdaten**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F1.4
- **Relevant für DDD:** Query `StakeholderListQuery` (StakeholderManagement Context, Read-Modell)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/projects/{projectId}/stakeholders?search=&type=&communicationTypeId=` liefert eine paginierte/gefilterte Liste aktiver Stakeholder (implizit `deleted_at IS NULL`).
- [ ] `search` filtert per Volltextsuche über `name` und `organization` (case-insensitive, Teilstring-Match).
- [ ] Response-Felder für Rolle `User` enthalten ausschließlich Stammdaten-Spalten (Name, Typ, Organisation, Position, Kontakt); Einfluss-/Interesse-Werte sind **serverseitig nicht** im Payload enthalten (unabhängig davon, dass F1.4 primär Stammdaten zeigt — Konsistenz mit F2.3 wird hier bereits sichergestellt, da die Liste keine Assessment-Felder liefert).
- [ ] Frontend zeigt Suchfeld, Filter-Dropdowns (Typ, Kommunikationsart) und eine Tabelle/Kartenliste; Tabelle ist für alle Rollen inkl. `User` erreichbar.
- [ ] Integrationstest deckt: Suche nach Teilstring, Filter nach Typ, leeres Ergebnis zeigt Leerzustand-Meldung.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Stakeholders/StakeholderListQuery.cs`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`GET /api/v1/projects/{projectId}/stakeholders`)
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Standardliste filtert immer `deleted_at IS NULL` (Abschnitt 4.3 Punkt 5).
- Rolle `User` erhält niemals Einfluss-/Interesse-Werte, auch nicht implizit über diese Liste.
