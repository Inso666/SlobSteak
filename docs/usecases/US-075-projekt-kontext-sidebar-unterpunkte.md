**ID:** US-075
**Titel:** Projekt-Kontext-Navigation als eingerückte Sidebar-Unterpunkte statt horizontaler Tab-Leiste
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-074
**Status:** fertig am 01.09.2026, PR #113 (`feature/US-075-projekt-kontext-sidebar-unterpunkte`)

---

### 1. User Story

Als **Nutzer innerhalb eines Projekts** möchte ich zwischen Stakeholder-Liste, Map und Verteiler über die Sidebar wechseln können, damit die Navigation an einer einzigen, konsistenten Stelle liegt, statt zusätzlich eine horizontale Tab-Leiste im Hauptbereich bedienen zu müssen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #101](https://github.com/Inso666/SlobSteak/issues/101), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026. Betroffene Artboards: `docs/design/Detail.dc.html`, `Map.dc.html`, `StakeholderList.dc.html`, `Verteiler.dc.html` — alle vier übereinstimmend.
- **Ist-Zustand:** Innerhalb eines Projekts (`/projects/:id/...`) liegt die Navigation zwischen „Stakeholder-Liste“, „Map“, „Verteiler“ als horizontale `tab-pills`-Leiste in `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.html` (Zeilen 15–23), unterhalb der Kopfzeile mit Projektname. Die linke Sidebar (`app-navigation.component.html`) zeigt dabei ausschließlich die globalen Einträge („Projektübersicht“, ggf. „Admin“) — keinen Projekt-Kontext.
- **Soll-Zustand laut `docs/design`:** Die Projekt-Kontext-Navigation erscheint in der linken Sidebar selbst, als eingerückter Block unterhalb der globalen Nav-Items: ein nicht-klickbares Projekt-Label (Kapitälchen/gedämpfte Farbe) gefolgt von drei eingerückten Unterpunkten „Stakeholder-Liste“, „Map“, „Verteiler“ (aktiver Zustand hervorgehoben). Eine horizontale Tab-Leiste im Hauptbereich ist in keinem der vier Artboards vorgesehen.
- **Vermutete Historie:** Rückstand aus der ursprünglichen US-019-Tab-Navigation, der beim Sidebar-Umbau in US-055 (horizontale → vertikale App-Navigation) nicht auf die Projekt-Unterebene ausgeweitet wurde.
- **Relevant für DDD:** Reine Presentation-Schicht. Die bestehende Sichtbarkeitslogik für „Map“/„Verteiler“ (`showMapTab`/`showDistributionTab`, rollenabhängig, US-031/US-041) bleibt unverändert — nur der Darstellungsort der drei Links ändert sich.

### 3. Akzeptanzkriterien

- [ ] Innerhalb eines geöffneten Projekts zeigt die Sidebar unterhalb der globalen Nav-Items einen eingerückten Block: nicht-klickbares Projekt-Label (aktueller Projektname) gefolgt von den Unterpunkten „Stakeholder-Liste“, „Map“ (nur sichtbar gemäß bisheriger `showMapTab`-Regel), „Verteiler“ (nur sichtbar gemäß bisheriger `showDistributionTab`-Regel).
- [ ] Der jeweils aktive Unterpunkt ist visuell hervorgehoben (`routerLinkActive`, analog zum bestehenden Muster der globalen Nav-Items).
- [ ] Die bisherige horizontale `tab-pills`-Leiste in `project-workspace-layout.component.html` entfällt vollständig.
- [ ] Der Projekt-Rollen-Badge (`role-badge`, bisher neben dem Projektnamen im Hauptbereich-Header) bleibt an geeigneter Stelle sichtbar (Kopfbereich des Hauptinhalts oder alternativ neben dem Projekt-Label in der Sidebar — Design zeigt hierzu keine explizite Vorgabe, Umsetzung nach etabliertem Muster).
- [ ] Außerhalb eines geöffneten Projekts (z. B. auf `/projects` oder `/admin/...`) zeigt die Sidebar unverändert nur die globalen Nav-Items, kein Projekt-Block.
- [ ] Direktnavigation per URL zu `/projects/{id}/stakeholders`, `/map`, `/distribution` funktioniert unverändert (reine Darstellungsänderung, keine Routing-Änderung).
- [ ] Automatisierter Test (Angular `TestBed`) belegt: Projekt-Unterpunkte erscheinen in der Sidebar nur im Projekt-Kontext, korrekte aktive Hervorhebung, rollenabhängige Sichtbarkeit von Map/Verteiler-Unterpunkten bleibt erhalten, horizontale Tab-Leiste ist entfernt.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Navigation entspricht optisch den vier referenzierten `docs/design`-Artboards — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests (inkl. Story-Tests aus US-019, US-031, US-041, US-055) bleiben grün bzw. werden ans neue Markup angepasst, ohne eine bisher geprüfte fachliche Aussage (insbesondere die rollenabhängige Tab-Sichtbarkeit) zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html`/`.css`/`.ts` — Projekt-Kontext-Block ergänzen; die Komponente benötigt dafür Kenntnis des aktuellen Projekts (Name, `showMapTab`/`showDistributionTab`-Äquivalent) — Datenquelle analog zu `ProjectWorkspaceLayoutComponent`s bestehendem `getProject(...)`-Aufruf, ggf. über einen gemeinsam injizierbaren Service statt Duplizierung der Lade-Logik (Wiederverwendung vor Neuimplementierung, siehe Systemkontext).
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.html`/`.css`/`.ts` (Tab-Pills-Leiste entfernen, Rollen-Badge-Platzierung anpassen)
- Zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Rollenabhängige Sichtbarkeit von „Map“/„Verteiler“ bleibt exakt wie bisher (US-031 Akzeptanzkriterium zu Rollen, US-041 Rollen-Gate) — nur der Darstellungsort ändert sich.
- Kein neuer Backend-Request nur für die Sidebar — falls die Sidebar Projektdaten benötigt, die `ProjectWorkspaceLayoutComponent` bereits lädt, ist ein gemeinsamer, injizierbarer Zustand (Service mit Signal/Observable) der doppelten Anfrage vorzuziehen.

### Anmerkungen des Product Owners

Letzte Story dieser Phase — nach [US-074](US-074-projektuebersicht-sidebar-toolbar-cards.md) eingeplant, da beide `app-navigation.component.html` ändern (Nav-Icons/Nutzerkarte dort zuerst, Projekt-Unterpunkte danach).

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **Geteilter Zustand statt Duplizierung:** Neuer `CurrentProjectContextService`
  (`frontend/src/app/core/services/current-project-context.service.ts`) — ein einfacher
  Signal-Halter (`project: Signal<ProjectOverviewItem | null>`, `setProject()`/`clear()`), befüllt
  ausschließlich von `ProjectWorkspaceLayoutComponent.ngOnInit`/`ngOnDestroy` (einzige Stelle mit
  echtem `ProjectsService.getProject(...)`-Aufruf) und gelesen von `AppNavigationComponent`. Damit
  löst kein zusätzlicher Backend-Request für die Sidebar aus (Story „Wichtige Invarianten“).
- **Rollenlogik verschoben statt dupliziert:** Die vormals in `ProjectWorkspaceLayoutComponent`
  liegenden Getter `showMapTab`/`showDistributionTab` (US-031/US-041) sind vollständig entfernt und
  unverändert als `AppNavigationComponent.showMapSubItem`/`showDistributionSubItem` in die Sidebar
  gewandert — dieselbe Bedingung (`role !== 'User'` bzw. `role === 'PL' || role === 'Coreteam'`),
  nur der Darstellungsort hat sich geändert.
- **Projekt-Kontext-Erkennung ohne `ActivatedRoute`-Baum:** `AppNavigationComponent` lebt in
  `app.html` außerhalb des `<router-outlet>` und hat daher keinen direkten Zugriff auf die
  aktivierte Kind-Route der Workspace-Shell. Ob die aktuelle Route innerhalb eines Projekts liegt,
  wird deshalb – analog zum bereits etablierten `isVisible`/`isAdmin`-Muster (US-045/US-046) – per
  Regex auf `router.url` bei jedem `NavigationEnd` neu berechnet (`/^\/projects\/[^/?#]+/`, matcht
  bewusst NICHT die Projektübersicht `/projects` selbst).
- **Rollen-Badge-Platzierung (Abweichung/Klarstellung ggü. Story-Anmerkung, CLAUDE.md Abschnitt 6):**
  Die Story-Datei merkt an, das Design zeige „keine explizite Vorgabe“ zur Badge-Platzierung. Der
  tatsächliche Wireframe-Quelltext (`docs/design/S2-Projektuebersicht-Wireframe.html`, Artboards
  `Detail`/`Map`/`StakeholderList`/`Verteiler.dc.html`) zeigt den Rollen-Badge weiterhin exakt an
  der bisherigen Stelle im Hauptbereich-Header (`<h1>{{project.name}}</h1><span class="role-badge">`)
  — zusätzlich (nicht ersetzend) erscheint dort auch ein kontextueller Rollentext in der
  Sidebar-Nutzerkarte („PL in diesem Projekt“ statt nur des Namens). Letzteres hätte eine
  Erweiterung der projektunabhängigen, app-weiten Nutzerkarte aus US-074 um einen
  projektabhängigen Zustand bedeutet — über den in dieser Story beschriebenen Scope („Rollen-Badge
  bleibt sichtbar“) hinausgehend. Gewählt: Rollen-Badge unverändert im Hauptbereich-Header belassen
  (deckt sich 1:1 mit allen vier Artboards, geringstes Risiko, keine stille Scope-Erweiterung); die
  Nutzerkarten-Erweiterung wird hier bewusst nicht mit umgesetzt und müsste, falls gewünscht, als
  eigene Story nachgezogen werden.
- **Manueller Smoke-Test** gegen einen isolierten `docker-compose`-Stack (Projekt `us075smoke`,
  Ports 55432/55075/45075): Login als Seed-Admin, Testprojekt „ERP-Einführung Rewe“ angelegt, sich
  selbst als `PL` zugewiesen. Sidebar zeigt exakt das Wireframe-Muster (Projekt-Label in
  Kapitälchen, drei Unterpunkte, aktive Hervorhebung wechselt korrekt zwischen
  Stakeholder-Liste/Map/Verteiler, kein Rückstand der horizontalen Tab-Leiste). Rolle anschließend
  auf `User` reduziert: „Map“/„Verteiler“ sowie der Rollen-Badge (SPEC-00 §4) verschwinden korrekt,
  „Stakeholder-Liste“ bleibt. Direktnavigation per URL zu allen drei Kind-Routen erneut geprüft.
  Außerhalb des Projekt-Kontexts (`/projects`) zeigt die Sidebar ausschließlich die globalen
  Nav-Items. Screenshots wurden während der interaktiven Session aufgenommen, aber (wie bereits bei
  vorherigen Stories dieser Kette, z. B. US-074) nicht als Datei-Anhang persistiert — der PR-Text
  beschreibt die Beobachtungen stattdessen im Detail.
