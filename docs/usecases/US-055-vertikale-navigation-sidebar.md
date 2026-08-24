**ID:** US-055
**Titel:** Globale Navigation als vertikale Sidebar statt horizontaler Kopfleiste
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-045, US-046, US-047

**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich die Hauptnavigation als feste, vertikale Sidebar am linken Rand der Anwendung vorfinden, wie es im abgestimmten App-Shell-Konzept vorgesehen ist, statt als horizontale Leiste am Kopf der Seite.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“: „Die Navigationsleiste ist horizontal am Kopf der Seite. Sie sollte vertikal an der linken Seite der Applikation sein.“
- **Verifikation durch PO (Code-Review + Spec-Abgleich):**
  - Aktuelle Umsetzung: `app-navigation.component.css` — `.app-navigation { display: flex; align-items: center; … padding: var(--app-space-sm) var(--app-space-lg); border-bottom: 1px solid var(--app-color-border); }`, `app-navigation.component.html` — Marke, Links und Logout-Button in **einer** horizontalen Zeile mit `border-bottom`. Das ist eindeutig eine horizontale Kopfleiste.
  - **Alle** vorliegenden Feature-Spezifikationen gehen übereinstimmend von einer vertikalen Sidebar als App-Shell aus, nicht von einer horizontalen Kopfleiste:
    - `docs/specs/SPEC-02-Projektuebersicht.md` Zeile 22: `<app-project-sidebar aria-label="Hauptnavigation"> <!-- Desktop: statische <aside>, KEIN p-drawer -->`, inkl. eigenem Abschnitt zu Responsive-Verhalten „Sidebar → `p-drawer` unterhalb 960px“.
    - `docs/specs/SPEC-06-Stakeholder-Detail.md` Zeile 16/20: „Der Screen besteht aus einer Zwei-Spalten-Detailansicht innerhalb des bestehenden App-Shells (Sidebar + Main-Content)“, `<aside class="app-sidebar" aria-label="Hauptnavigation">`.
    - `docs/specs/SPEC-03-Stakeholder-Liste.md`, `SPEC-04-Stakeholder-Map.md`, `SPEC-05-Verteiler.md`, `SPEC-07-Admin.md` referenzieren durchgängig dieselbe „bestehende App-Shell (Sidebar-Navigation)“ als Kontext, ohne sie jeweils neu zu definieren.
  - Es gibt keine einzige Spec-Datei, die eine horizontale Kopfleiste vorsieht — die aktuelle Umsetzung aus US-045 ist damit nachweislich eine Abweichung von der über sechs Spec-Dateien hinweg konsistenten Vorgabe, vermutlich entstanden, weil US-045 (19./23.08.2026) vor den erst am 23.08.2026 verfassten Feature-Specs umgesetzt wurde und daher keine Sidebar-Vorgabe kannte.
- **Relevant für DDD:** Reine Presentation-Schicht (`app-navigation`-Komponente + globales Layout), keine Routing-/Guard-Änderung.

### 3. Akzeptanzkriterien

- [ ] Die Hauptnavigation ist eine feste, vertikale `<aside>`-Sidebar am linken Rand der Anwendung (Desktop), nicht mehr eine horizontale Kopfleiste.
- [ ] Alle bisherigen Navigationspunkte (Projektübersicht, Admin-Bereich für Systemadmins, Abmelden) sind in der Sidebar vorhanden und funktional unverändert (keine Regression zu US-045/US-046).
- [ ] Verhalten unterhalb 960px Breite: Sidebar klappt zu einem `p-drawer` mit Hamburger-Trigger zusammen (SPEC-02 §1.3/§1.4) — sofern dieser Breakpoint bislang nirgends anders definiert wurde, gilt SPEC-02 als verbindliche Quelle für diese cross-cutting Komponente.
- [ ] Kein Screen-lokales Overriding der Sidebar-Struktur — jeder Screen (Projektübersicht, Projekt-Workspace, Stakeholder-Liste/-Detail, Admin) nutzt exakt dieselbe `app-navigation`/`app-project-sidebar`-Komponente ohne Kopie (SPEC-00 §1.1 Grundsatz „ein Preset/eine Komponente, kein Screen definiert lokale Werte“).
- [ ] Fokus-Ring, Tastaturbedienbarkeit und `aria-label="Hauptnavigation"` bleiben erhalten bzw. werden gemäß SPEC-00 §2/§4 ergänzt.
- [ ] Bestehende Tests (`app-navigation.component.spec.ts`, `us-045-app-navigation.spec.ts`, `us-046-admin-navigation.spec.ts`) bleiben grün bzw. werden an die neue Struktur angepasst (nicht entfernt) — betreffen sie nur CSS-Klassen/DOM-Struktur, ist das laut US-047-Präzedenzfall zulässig.
- [ ] `ng test`/`ng lint`/`ng build` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.ts` / `.html` / `.css`
- `frontend/src/app/app.html` / `.css` (Gesamtlayout: Sidebar + Main-Content-Bereich statt Kopfzeile + Inhalt)
- `frontend/src/app/features/admin/admin-sub-nav/admin-sub-nav.component.css` (Platzierung relativ zur neuen Sidebar ggf. anzupassen)
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.spec.ts`, `us-045-app-navigation.spec.ts`, `frontend/src/app/features/admin/us-046-admin-navigation.spec.ts`

**Wichtige Invarianten:**
- Ausschließlich SPEC-00-Tokens/PrimeFlex-Utilities, keine neuen hartkodierten Werte (CLAUDE.md/US-047-Präzedenzfall).
- `BreakpointObserver` mit exakten Custom-Queries gemäß SPEC-02 §1.4, keine Abweichung auf PrimeFlex-Default-Breakpoints ohne Dokumentation.

### Anmerkungen des Product Owners

Diese Story betrifft ausschließlich die App-weite Navigations-Shell selbst (bereits identisch für alle Screens sichtbar, siehe US-047 „app-navigation zusätzlich migriert“) — sie erledigt damit implizit auch den in SPEC-02/03/04/05/06/07 wiederkehrend vorausgesetzten Sidebar-Kontext für alle Screens in einem Zug, ohne dass jeder Screen einzeln angepasst werden muss.
