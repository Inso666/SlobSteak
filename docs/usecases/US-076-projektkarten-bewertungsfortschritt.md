**ID:** US-076
**Status:** fertig am 01.09.2026 (PR: siehe `feature/US-076-projektkarten-bewertungsfortschritt`)
**Titel:** Rollen-Bewertungsfortschritt (Progress-Ringe) und „unbewertet“-Hinweis auf Projektkarten
**Bounded Context / Domain:** ProjectManagement / StakeholderAssessment (Backend: neues aggregiertes Read-Modell + `Project.UpdatedAt`; Frontend: Presentation-Schicht)
**Abhängigkeiten:** US-074

---

### 1. User Story

Als **Nutzer** möchte ich auf der Projektübersicht auf einen Blick sehen, wie weit die Stakeholder-Bewertung je Rolle (PL/Coreteam/Architect) in einem Projekt fortgeschritten ist, und einen Hinweis erhalten, wenn aus meiner eigenen Perspektive noch unbewertete Stakeholder offen sind, damit ich den Handlungsbedarf erkenne, ohne jedes Projekt einzeln öffnen zu müssen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #99](https://github.com/Inso666/SlobSteak/issues/99), Teil-Scope — QA-Design-Abgleich-Gesamtaudit vom 30.08.2026, gegen `docs/design/Main.dc.html`. Aus [US-074](US-074-projektuebersicht-sidebar-toolbar-cards.md) ausgelagert (siehe dortige „Anmerkungen des Product Owners“), da diese beiden Design-Elemente ein neues, aggregiertes Backend-Read-Modell sowie ein neues Domänen-Feld erfordern, das über eine additive Erweiterung des bestehenden Response-Contracts hinausgeht.
- **Soll-Zustand laut `docs/design/Main.dc.html`:** Jede Projektkarte zeigt eine Reihe aus drei Fortschritts-Ringen (SVG-Donut je Rolle PL/CT/AR) mit dem Prozentwert des Bewertungsstands dieser Rolle (Anteil der aktiven Stakeholder des Projekts, für die diese Rolle ein Assessment abgegeben hat) sowie — falls aus der **eigenen** Rollen-Perspektive des angemeldeten Nutzers Stakeholder unbewertet sind — einen „X unbewertet · deine Sicht“-Hinweisbanner in der Attention-Farbe. Zusätzlich zeigt die Kartenfußzeile „Aktualisiert vor …“ (relative Zeit).
- **Fehlende Datengrundlage (PO-Analyse):**
  1. Kein aggregiertes Read-Modell für „Anteil bewerteter Stakeholder je Rolle und Projekt“ — muss neu berechnet werden (aktive `Stakeholder`-Anzahl je Projekt vs. Anzahl `StakeholderAssessment`-Einträge je Rolle für dieselben Stakeholder), analog zur bereits bestehenden Aggregations-Logik in `Map.StakeholderMapQuery`/`DistributionListQuery`, aber projektweit zusammengefasst statt pro Punkt.
  2. `Project`-Aggregate kennt bislang keinen `UpdatedAt`-Zeitpunkt (nur `CreatedAt`) — wird für die Fußzeile „Aktualisiert vor …“ benötigt.
- **Relevant für DDD:** Punkt 1 ist eine neue Application-Query im `ProjectManagement`-Kontext, die lesend auf `StakeholderManagement` (aktive Stakeholder je Projekt) und `StakeholderAssessment` (Assessment-Einträge je Rolle) zugreift — über deren jeweilige Repository-Schnittstellen, kein direkter Cross-Aggregate-EF-Core-Join (analog zu `DistributionListQuery`/`Map.StakeholderMapQuery`). Punkt 2 ist eine additive Erweiterung des `Project`-Aggregates inkl. EF-Core-Migration (eigener, von Feature-Commits getrennter Commit, CLAUDE.md Abschnitt 4).

### 3. Akzeptanzkriterien

- [x] `Project` erhält ein `UpdatedAt`-Feld (`DateTimeOffset`), das bei `Archive()`, `Reactivate()`, `AssignMember(...)`, `ChangeMemberRole(...)`, `RemoveMember(...)` aktualisiert wird; initial gleich `CreatedAt`. EF-Core-Migration in eigenem, klar erkennbarem Commit.
- [x] Neue Application-Query liefert je Projekt und je perspektiv-tragender Rolle (PL/Coreteam/Architect) den Anteil aktiver Stakeholder, für die diese Rolle ein Assessment hat (0–100 %, gerundet).
- [x] `ProjectOverviewResponse` (US-018/US-074) wird um `UpdatedAt` sowie die drei Rollen-Bewertungsanteile erweitert (additiv, kein Bruch bestehender Konsumenten).
- [x] Jede Projektkarte zeigt drei Fortschritts-Ringe (PL/CT/AR) mit Prozentwert, farblich den bestehenden Rollenfarben zugeordnet (SPEC-00 §1.2).
- [x] Für die eigene Rolle des angemeldeten Nutzers in diesem Projekt zeigt die Karte, falls Stakeholder aus dieser Perspektive unbewertet sind, einen „X unbewertet · deine Sicht“-Hinweisbanner in `--app-attention`. Für Rolle `User` (keine eigene Perspektive) erscheint kein Banner.
- [x] Die Kartenfußzeile zeigt „Aktualisiert vor …“ als relative Zeitangabe basierend auf dem neuen `UpdatedAt`.
- [x] Das Sortier-Dropdown aus US-074 erhält zusätzlich die Option „Zuletzt aktualisiert“ (sortiert nach `UpdatedAt`, absteigend).
- [x] Backend-Test (xUnit) belegt: korrekte Prozent-Berechnung (inkl. Randfälle 0 aktive Stakeholder → keine Division durch 0, 0 % bei keinem Assessment, 100 % bei vollständiger Bewertung), korrekte `UpdatedAt`-Aktualisierung bei allen fünf genannten Mutationen.
- [x] Automatisierter Test (Angular `TestBed`) belegt: Ringe zeigen korrekte Prozentwerte, Banner erscheint nur bei tatsächlich unbewerteten Stakeholdern der eigenen Rolle und nie für Rolle `User`, Fußzeile zeigt relative Zeit.
- [x] Manueller Smoke-Test gegen `docker-compose up`: Karten entsprechen optisch `docs/design/Main.dc.html` — Screenshot-Nachweis im PR (`docs/usecases/screenshots/US-076/`).
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests (inkl. Story-Tests aus US-010, US-011, US-018, US-027–US-030, US-074) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien (Backend):**
- `src/SlobSteak.Domain/Projects/Project.cs` — `UpdatedAt`, Aktualisierung in den fünf genannten Methoden.
- Neue EF-Core-Migration für die `UpdatedAt`-Spalte.
- Neue Application-Query (z. B. `ProjectAssessmentProgressQuery`, analog zu `DistributionListQuery`/`Map.StakeholderMapQuery` strukturiert) im `ProjectManagement`-Kontext, unter Nutzung von `IStakeholderRepository`/Assessment-Repository-Schnittstellen.
- `src/SlobSteak.Domain/Projects/ProjectOverviewItem.cs`, zugehörige Query-Implementierung, `src/SlobSteak.Api/Controllers/ProjectController.cs` (`ProjectOverviewResponse` erweitern).

**Zu ändernde Dateien (Frontend):**
- `frontend/src/app/features/projects/project-overview/project-overview.component.html`/`.ts`/`.css` (Ringe, Banner, Fußzeile, Sortieroption)
- `frontend/src/app/features/projects/projects.service.ts` (Response-Typ erweitern)
- Zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Bewertungsanteil bezieht sich ausschließlich auf **aktive** (nicht soft-gelöschte) Stakeholder (PRD Abschnitt 4.3, `deleted_at`-Filterung).
- Kein neuer Endpunkt für Rolle `User` mit Bewertungs-Detaildaten — der Bewertungsanteil ist eine reine Prozentzahl je Projekt/Rolle, keine Einzel-Stakeholder-Auflösung, daher unproblematisch für alle Rollen sichtbar (im Unterschied zur Einzel-Zuordnungsebene aus US-072).

### Anmerkungen des Product Owners

Folge-Story zu [US-074](US-074-projektuebersicht-sidebar-toolbar-cards.md) — beide zusammen decken Issue #99 vollständig ab. Bewusst als eigenständige Story statt Teil von US-074, da diese Story eine EF-Core-Migration einführt und laut Kernregel 4 des Systemkontexts (CLAUDE.md) Migrations-Commits klar von Feature-Commits getrennt und eigenständig verifizierbar sein müssen — eine Vermischung mit dem primär visuellen Scope von US-074 hätte diese Trennung erschwert.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **EF-Core-Konstruktorbindung (Abweichung von der Story-Skizze `DateTimeOffset?`):** Der `Project`-Konstruktor erhält `updatedAt` als **nicht-optionalen** `DateTimeOffset`-Parameter statt eines optionalen `DateTimeOffset? = null`. EF Core bindet Konstruktorparameter bei der Rematerialisierung ausschließlich gegen exakt typgleiche Properties (`dotnet ef migrations add` scheiterte mit „Cannot bind 'updatedAt'“, solange der Parametertyp `DateTimeOffset?` war, die Spalte aber `DateTimeOffset` NOT NULL ist). `Project.Create()` übergibt daher denselben Zeitpunkt zweimal (`createdAt`/`updatedAt`) statt sich auf einen Default-Parameter zu verlassen.
- **Migration enthält eine unbeabsichtigte Nebenwirkung:** `dotnet ef migrations add AddProjectUpdatedAt` hat zusätzlich zur beabsichtigten Spalte zwei bereits bestehende Fremdschlüssel (`project_memberships`/`stakeholder_communication_assignments`) neu deklariert — eine bereits vor dieser Story vorhandene, nie migrierte Diskrepanz zwischen der `ClientCascade`-Fluent-API-Konfiguration und dem letzten Migrations-Snapshot (siehe Kommentar in `ProjectMembershipConfiguration`). Kein funktionales Verhalten dieser Story geändert, aber im Migrations-Commit dokumentiert, da EF Core dies automatisch mit aufgenommen hat.
- **Migrations-Backfill:** Die generierte `AddColumn`-Anweisung verwendet für NOT NULL zwingend einen technischen Platzhalter-Defaultwert (`0001-01-01`). Ergänzt um `UPDATE projects SET updated_at = created_at;`, damit Akzeptanzkriterium 1 („initial gleich CreatedAt“) auch für bereits vor dieser Migration angelegte Projekte gilt, nicht nur für künftig über `Project.Create()` angelegte.
- **Bewusst kein „Rolle nicht besetzt“-Zustand (`n/a`-Ring) umgesetzt**, obwohl `docs/design/Main.dc.html`/`docs/specs/SPEC-02-Projektuebersicht.md` §1.1/§3.5 einen solchen Zustand für eine im Projekt nicht zugewiesene Rolle vorsehen (gestrichelter Ring + „n/a“). Die Akzeptanzkriterien dieser Story sowie die „Technischen Hinweise“ (Abschnitt 4) grenzen die Datengrundlage bewusst auf `IStakeholderRepository`/`IStakeholderAssessmentRepository` ein und listen als einzigen Randfall „0 aktive Stakeholder“ — nicht „Rolle unbesetzt“. Nach CLAUDE.md Abschnitt 6 (PRD-/Story-konformste, am wenigsten überraschende Interpretation, keine stille Feature-Erweiterung) implementiert diese Story daher ausschließlich den in den Akzeptanzkriterien explizit geforderten Umfang: Prozent 0–100 für alle drei Rollen, 0 % bei 0 aktiven Stakeholdern. Eine spätere Story kann den „n/a“-Zustand (analog zu `AssessmentRoleStatus.NoRoleAssigned` aus US-028) ergänzen, falls gewünscht.
- **`ProjectAssessmentProgressQuery` nutzt zusätzlich `IProjectRepository`? Nein** — entgegen einer ersten Überlegung (um „Rolle unbesetzt“ zu prüfen) verwendet die finale Implementierung ausschließlich `IStakeholderRepository`/`IStakeholderAssessmentRepository`, exakt wie in den technischen Hinweisen vorgegeben (siehe vorigen Punkt).
- **`shared/utils/relative-time.ts`:** Die bereits in `StakeholderListComponent` (US-072) implementierte Umrechnung „vor X …“ wurde in eine gemeinsame, reine Utility-Funktion extrahiert, da die Kartenfußzeile dieser Story exakt dieselbe Logik benötigt (`.claude/agents/frontend.md` Abschnitt 3: Duplizierung vermeiden). `StakeholderListComponent.relativeTime()` bleibt als schmaler Delegations-Wrapper erhalten, um bestehende Templates/Tests nicht anzufassen.
- **Bestehende Tests angepasst (keine neue Fachlogik, reine Kompatibilität mit dieser Story):**
  - `US003_DatenbankschemaTests.AC6`: Assertion „genau eine angewendete Migration“ auf „mindestens eine“ gelockert — mit `AddProjectUpdatedAt` existiert erstmals seit `InitialCreate` eine zweite Migration.
  - `us-074-projektuebersicht-sidebar-toolbar-cards.spec.ts` Akzeptanzkriterium 5: Prüft nur noch, dass die zwei ursprünglichen Sortieroptionen weiterhin (in ihrer Reihenfolge) vorhanden sind, nicht mehr die Gesamtzahl der Optionen (US-076 ergänzt eine dritte, additive Option).
  - `SchemaConstraintsTests.NewProject()`: an die neue, nicht-optionale `updatedAt`-Konstruktorsignatur angepasst.
