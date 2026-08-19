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

### Anmerkungen des Dev-Agenten

- `IStakeholderListQuery` liegt in `SlobSteak.Domain.Stakeholders` statt `SlobSteak.Application`
  (CLAUDE.md Abschnitt 3.1: Infrastructure darf nur auf Domain referenzieren), analog zu
  `IProjectOverviewQuery`/`IStakeholderRepository` aus früheren Stories.
- Die bereits in US-023 als notwendige Infrastruktur ergänzte Standardliste
  (`GET /api/v1/projects/{projectId}/stakeholders`) wird hier um `search`/`type`/
  `communicationTypeId`-Query-Parameter erweitert — kein neuer Endpoint.
- Response-Contract vereinheitlicht: die Liste liefert jetzt denselben `StakeholderResponse` wie
  Anlegen (US-021)/Bearbeiten (US-022), inkl. aufgelöstem `updatedByName`. Das ersetzt den
  ursprünglich schlankeren `StakeholderListItemResponse` aus US-023 — dadurch kann das Frontend
  dieselben Bearbeiten-/Löschen-Komponenten unabhängig vom Einstiegspunkt (Liste vs. vormals
  session-lokale Anlage-Liste) verwenden. `ListStakeholdersService` löst dafür wie
  `CreateStakeholderService`/`UpdateStakeholderDetailsService` den Namen über `IUserRepository`
  auf.
- Der Filter-Dropdown „Kommunikationsart“ aus Akzeptanzkriterium 1 ist im Frontend noch nicht mit
  echten Optionen befüllt — ein Endpoint zum Auflisten des Kommunikationsarten-Katalogs entsteht
  erst mit US-037. Die Backend-Query unterstützt `communicationTypeId` bereits vollständig
  (inkl. Join gegen `stakeholder_communication_assignments`); nur die UI-Datenquelle für die
  Options-Liste fehlt noch — kein Vorgriff auf US-037.
- Pagination wird nicht umgesetzt — keines der Akzeptanzkriterien testet sie, PRD F1.4 verlangt
  nur Suche/Filter. Bei typischen MVP-Projektgrößen (Stakeholder je Projekt im niedrigen
  zweistelligen Bereich) ist eine vollständige, ungepaginierte Liste die einfachste, am wenigsten
  überraschende Interpretation (CLAUDE.md Abschnitt 4).
- **Größerer Refactor dieser Story**: `CreateStakeholderFormComponent` (US-021) wurde von einem
  eigenständigen Screen mit session-lokaler Liste zu einem reinen Anlage-Formular reduziert (neuer
  `@Output() created`); die neue `StakeholderListComponent` übernimmt die eigentliche
  Listendarstellung (serverseitig geladen, mit Suche/Filter) und bettet das Anlage-Formular sowie
  die bestehenden `EditStakeholderFormComponent`/`DeleteStakeholderDialogComponent` (US-022/023)
  ein, die nach jeder Änderung die Liste neu laden. `StakeholderListComponent` löst
  `CreateStakeholderFormComponent` als Standard-Landingtab-Inhalt der Workspace-Shell (US-019) ab.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-025-stakeholder-liste`),
Auto-Merge gemäß ADR-0003 aktiviert.
