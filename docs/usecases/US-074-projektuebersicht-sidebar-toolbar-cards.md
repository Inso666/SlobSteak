**ID:** US-074
**Titel:** Projektübersicht: Sidebar-Icons/Nutzerkarte, Toolbar (Tabs/Suche/Sortierung) und Karten-Grundlayout gemäß Main.dc.html
**Bounded Context / Domain:** ProjectManagement (Frontend, Presentation-Schicht; kleine additive Backend-Erweiterung)
**Abhängigkeiten:** US-073

---

### 1. User Story

Als **Nutzer** möchte ich auf der Projektübersicht sofort erkennen können, welche Rolle ich je Projekt habe und wie viele Stakeholder es enthält, meine Projekte durchsuchen und sortieren können, und in der Sidebar eine vollständige, mit Icons versehene Navigation samt eigener Nutzerkarte sehen, damit die Anwendung sich wie ein fertiges Produkt statt wie ein Rohentwurf anfühlt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #99](https://github.com/Inso666/SlobSteak/issues/99), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026, gegen `docs/design/Main.dc.html`.
- **Ist-Zustand:** `frontend/src/app/features/projects/project-overview/project-overview.component.html` zeigt Karten als reinen Fließtext (`<h2>Name</h2><p>Rolle: …</p><p>Stakeholder: …</p>`); Toolbar existiert nur für Systemadmins (Tab-Pills „Meine Projekte“/„Alle Projekte“ ohne Zähler, Button „Neues Projekt“) — für PL/Coreteam/Architect gar kein Toolbar-Bereich. `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html` zeigt weder Brand-Icon (siehe [US-073](US-073-marken-icon-steak-svg.md)) noch Nav-Item-Icons noch eine Nutzerkarte.
- **Datenverfügbarkeit geprüft (PO-Analyse):** `ProjectOverviewResponse`/`ProjectOverviewItem` (US-018, `GET /api/v1/projects`) führt aktuell nur `Id`, `Name`, `Role`, `StakeholderCount` — **kein** `Status` (Active/Archived, existiert bereits auf dem `Project`-Aggregate, aber bislang nur in der Admin-Projektliste exponiert) und **kein** `UpdatedAt` (existiert auf dem Aggregate bislang gar nicht — `Project` kennt nur `CreatedAt`, es gibt keine Rename-/Bearbeiten-Methode, die einen Änderungszeitpunkt festhalten würde).
- **PO-Entscheidung zum Scope:** Diese Story deckt Issue #99 **mit Ausnahme** der Rollen-Fortschritts-Ringe (Bewertungsstand-Donuts) und des „X unbewertet · deine Sicht“-Banners ab — beide erfordern ein neues, aggregiertes Backend-Read-Modell (Bewertungsabdeckung je Rolle über alle Stakeholder eines Projekts) sowie ein neues `Project.UpdatedAt`-Feld inkl. EF-Core-Migration, das über eine additive Read-Modell-Erweiterung hinausgeht. Diese beiden Design-Elemente sind bewusst in die eigenständige Folge-Story [US-076](US-076-projektkarten-bewertungsfortschritt.md) ausgelagert (kein stilles Weglassen — CLAUDE.md Abschnitt 6). Die Fußzeile „Aktualisiert vor …“ entfällt in dieser Story entsprechend vorerst; das Sortierkriterium „Zuletzt aktualisiert“ wird durch „Name (A–Z)“ und „Neu zuerst“ (nach `CreatedAt`) ersetzt, bis US-076 `UpdatedAt` einführt.
- **Relevant für DDD:** `Status` wird additiv in `ProjectOverviewItem`/`ProjectOverviewResponse` ergänzt (bereits auf dem Aggregate vorhanden, keine neue Invariante). Keine Änderung an `Project.Create`/`Archive`/`Reactivate`.

### 3. Akzeptanzkriterien

**Sidebar (`app-navigation.component.html`):**
- [ ] Jeder Eintrag der Hauptnavigation (`navLinks`, ggf. Admin-Link) zeigt zusätzlich zum Label ein passendes Icon.
- [ ] Unterhalb der Navigationslinks, über dem „Abmelden“-Eintrag, erscheint eine Nutzerkarte (Avatar-Kreis mit Initialen, angemeldeter Name) — Daten aus der bereits vorhandenen Session-/Auth-Information des Frontends, kein neuer Backend-Request.

**Toolbar (`project-overview.component.html`):**
- [ ] Für **alle** Rollen (nicht nur Systemadmins) zeigt die Toolbar Tabs „Meine Projekte (N)“ / „Alle Projekte (N)“ mit Live-Zähler — „Alle Projekte“ bleibt dabei ausschließlich für Systemadmins sichtbar (unverändertes Berechtigungsverhalten aus US-018, nur der Zähler ist neu).
- [ ] Ein Suchfeld „Projekte durchsuchen…“ filtert die sichtbare Kartenliste client-seitig nach Projektname.
- [ ] Ein Sortier-Dropdown bietet „Name (A–Z)“ und „Neu zuerst“ (nach `CreatedAt`) an.
- [ ] Der Button „Neues Projekt“ bleibt ausschließlich für Systemadmins sichtbar (unverändertes Berechtigungsverhalten aus US-014/US-018 — PRD sieht Projektanlage ausschließlich durch Admins vor, `docs/design` trifft dazu keine abweichende Aussage).

**Projekt-Karten:**
- [ ] Jede Karte zeigt eine farbcodierte Rollen-Badge-Pille (PL/Coreteam/Architect, Farben analog zu bestehenden Rollen-Badges im Produkt, z. B. `role-badge` aus `project-workspace-layout.component.html`).
- [ ] Die Stakeholder-Zahl wird in Mono-Schrift hervorgehoben dargestellt.
- [ ] Archivierte Projekte (`status === 'Archived'`) erscheinen optisch gedimmt mit „Archiviert“-Tag.
- [ ] Kein Rückschritt gegenüber der bestehenden Admin-„Alle Projekte“-Kartendarstellung (Status/Mitgliederzahl bleiben dort wie bisher sichtbar).

**Übergreifend:**
- [ ] Automatisierter Test (Angular `TestBed`) belegt: Sidebar-Icons + Nutzerkarte vorhanden, Toolbar mit Zählern/Suche/Sortierung für alle Rollen, Karten mit Rollen-Badge/Mono-Stakeholder-Zahl/Archiviert-Tag.
- [ ] Backend-Test (xUnit) belegt: `Status` korrekt in `ProjectOverviewResponse` befüllt.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Layout entspricht optisch `docs/design/Main.dc.html` (mit Ausnahme der laut PO-Entscheidung nach US-076 ausgelagerten Elemente) — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests (inkl. Story-Tests aus US-018, US-055) bleiben grün bzw. werden ans neue Markup angepasst.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien (Backend):**
- `src/SlobSteak.Domain/Projects/ProjectOverviewItem.cs` — `ProjectStatus Status` ergänzen.
- Zugehörige Query-Implementierung (`IProjectOverviewQuery`) — `Status` mitliefern.
- `src/SlobSteak.Api/Controllers/ProjectController.cs` — `ProjectOverviewResponse` um `string Status` erweitern.

**Zu ändernde Dateien (Frontend):**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html`/`.css`/`.ts` (Nav-Item-Icons, Nutzerkarte)
- `frontend/src/app/features/projects/project-overview/project-overview.component.html`/`.ts`/`.css` (Toolbar-Erweiterung, Karten-Redesign)
- `frontend/src/app/features/projects/projects.service.ts` (Response-Typ um `status` erweitern)
- Zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Keine EF-Core-Migration nötig — `Status` existiert bereits als Spalte, wird nur zusätzlich in dieser Response exponiert.
- Keine Änderung an der Autorisierung von „Neues Projekt“ (weiterhin `isSystemAdmin`-Gate).

### Anmerkungen des Product Owners

Sechste Story dieser Phase — unabhängig von US-069–US-072 (keine gemeinsamen Dateien), aber nach [US-073](US-073-marken-icon-steak-svg.md) eingeplant, da beide `app-navigation.component.html` ändern (Brand-Icon dort zuerst). Der Bewertungsfortschritt (Progress-Ringe/Banner) ist bewusst als eigenständige Folge-Story [US-076](US-076-projektkarten-bewertungsfortschritt.md) ausgelagert (siehe Abschnitt 2) — beide Stories zusammen decken Issue #99 vollständig ab.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
