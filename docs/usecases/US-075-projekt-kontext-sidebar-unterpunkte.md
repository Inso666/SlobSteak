**ID:** US-075
**Titel:** Projekt-Kontext-Navigation als eingerückte Sidebar-Unterpunkte statt horizontaler Tab-Leiste
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-074

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
