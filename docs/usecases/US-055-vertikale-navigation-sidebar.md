**ID:** US-055
**Titel:** Globale Navigation als vertikale Sidebar statt horizontaler Kopfleiste
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-045, US-046, US-047

**Status:** fertig (29.08.2026), PR siehe unten

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

- [x] Die Hauptnavigation ist eine feste, vertikale `<aside>`-Sidebar am linken Rand der Anwendung (Desktop), nicht mehr eine horizontale Kopfleiste.
- [x] Alle bisherigen Navigationspunkte (Projektübersicht, Admin-Bereich für Systemadmins, Abmelden) sind in der Sidebar vorhanden und funktional unverändert (keine Regression zu US-045/US-046).
- [x] Verhalten unterhalb 960px Breite: Sidebar klappt zu einem `p-drawer` mit Hamburger-Trigger zusammen (SPEC-02 §1.3/§1.4) — sofern dieser Breakpoint bislang nirgends anders definiert wurde, gilt SPEC-02 als verbindliche Quelle für diese cross-cutting Komponente.
- [x] Kein Screen-lokales Overriding der Sidebar-Struktur — jeder Screen (Projektübersicht, Projekt-Workspace, Stakeholder-Liste/-Detail, Admin) nutzt exakt dieselbe `app-navigation`/`app-project-sidebar`-Komponente ohne Kopie (SPEC-00 §1.1 Grundsatz „ein Preset/eine Komponente, kein Screen definiert lokale Werte“).
- [x] Fokus-Ring, Tastaturbedienbarkeit und `aria-label="Hauptnavigation"` bleiben erhalten bzw. werden gemäß SPEC-00 §2/§4 ergänzt.
- [x] Bestehende Tests (`app-navigation.component.spec.ts`, `us-045-app-navigation.spec.ts`, `us-046-admin-navigation.spec.ts`) bleiben grün bzw. werden an die neue Struktur angepasst (nicht entfernt) — betreffen sie nur CSS-Klassen/DOM-Struktur, ist das laut US-047-Präzedenzfall zulässig.
- [x] `ng test`/`ng lint`/`ng build` bleiben grün.

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

### Anmerkungen des Agenten

**Umfang bewusst auf die Navigations-Shell begrenzt, nicht SPEC-02s vollständigen Sidebar-Baum 1:1 übernommen:** SPEC-02 §1.2 zeigt zusätzlich einen `user-card`-Block (Avatar mit Initialen, Nutzername, Rollen-Label) unterhalb der Navigationslinks. Diese Story-AC-Liste nennt jedoch explizit nur „Projektübersicht, Admin-Bereich für Systemadmins, Abmelden" als vorhandene Punkte — kein Nutzername/Avatar. `TokenStorageService.getClaims()` liefert aktuell nur `sub`/`isSystemAdmin`, keinen Namen — ein Nutzername-Feld hätte entweder einen neuen API-Aufruf oder eine JWT-Claim-Erweiterung erfordert, beides außerhalb dieser Story (CLAUDE.md Abschnitt 3: nur an dieser Story arbeiten, kein stiller Scope-Zuwachs). Ebenso nicht übernommen: das SPEC-02-eigene `<app-brand-logo>`-Icon im Sidebar-Kopf (SPEC-02 zeigt es, US-055s eigene AC-Liste nennt nur den Text „SlobSteak", unverändert aus US-045) — als mögliche kleine Folge-Verbesserung dokumentiert, nicht stillschweigend ergänzt.

**Struktur: `<aside>` außen, `<nav>` innen (beide mit `aria-label="Hauptnavigation"`) statt eines einzelnen Elements** — deckt sich exakt mit SPEC-02 §1.2s eigenem Baum (`<app-project-sidebar aria-label="...">` umschließt `<nav role="navigation" aria-label="...">`). Praktischer Vorteil: alle bestehenden `querySelector('nav')`-basierten Sichtbarkeits-Assertions in `us-045-app-navigation.spec.ts`/`us-046-admin-navigation.spec.ts` blieben dadurch ohne Anpassung an der Selector-Logik selbst funktionsfähig.

**Unerwarteter, aber vorhersehbarer Testeinfluss — Chrome-Headless-Standardfenster liegt unterhalb des neuen Breakpoints:** Karma/Chrome Headless startet in dieser Umgebung standardmäßig mit 800×600px (kein `--window-size`-Flag in `karma.conf.js`), deutlich unterhalb der neuen 960px-Schwelle. Ohne Gegenmaßnahme hätten dadurch ALLE 21 bestehenden `AppNavigationComponent`-Tests (die weder Mobile- noch Desktop-Zustand ausdrücklich adressierten) plötzlich den mobilen, initial geschlossenen `p-drawer` getroffen (dessen Inhalt PrimeNG erst nach dem Öffnen rendert) statt der Desktop-Sidebar — und wären mit „Element nicht gefunden"-Fehlern gescheitert. Behoben durch einen `BreakpointObserver`-Stub (`{ observe: () => of({ matches: false }) }`) in den Providern der drei betroffenen Testdateien, der deterministisch den Desktop-Zustand erzwingt — robuster als sich auf die zufällige Testumgebungs-Fenstergröße zu verlassen. Der neue Story-Test steuert stattdessen ein kontrollierbares `Subject`, um beide Zustände gezielt und deterministisch zu prüfen.

**Manueller Smoke-Test — Einschränkung dokumentiert:** Die Desktop-Sidebar wurde per Browser-Automatisierung gegen einen echten `docker-compose`-Stack visuell verifiziert (Screenshot). Ein echter schmaler Viewport ließ sich über das verfügbare `resize_window`-Werkzeug in dieser Umgebung nicht erzwingen (`window.innerWidth` blieb trotz mehrfachem Resize-Aufruf konstant bei 2560px — vermutlich eine Eigenheit der Remote-Display-/Automatisierungsumgebung, keine Eigenschaft des SlobSteak-Codes). Das mobile Drawer-Verhalten (Hamburger-Trigger, Öffnen/Schließen, identischer Navigationsinhalt) ist daher ausschließlich durch die 5 deterministischen Unit-Tests in `us-055-vertikale-navigation-sidebar.spec.ts` verifiziert (kontrollierter `BreakpointObserver`-Stub statt echter Fenstergröße) — nicht zusätzlich durch einen echten schmalen Browser-Screenshot.

**Sidebar-Breite (16rem) nicht als globaler Token modelliert:** SPEC-00 §1.2 definiert Farb-/Radius-/Abstands-/Typografie-Tokens, aber keine Struktur-Dimension für eine Sidebar-Breite — analog zu bereits bestehenden, lokal definierten konkreten Größen im Projekt (z. B. `.icon-badge` 2.5rem in US-054, Dialog-Breite `w-25rem`), direkt in `app-navigation.component.css` als `width: 16rem` festgelegt statt einen neuen, einmalig verwendeten globalen Token zu erfinden.

**Bundle-Größe:** `@angular/cdk/layout` (`BreakpointObserver`) und `primeng/drawer` sind neue Abhängigkeiten dieser Story — die bereits vorbestehende Bundle-Budget-Warnung wuchs von ca. 277 kB auf 300 kB über dem 900-kB-Budget. Kein neuer Fehler (Budget-Überschreitung ist bereits seit früheren Stories eine reine Warnung, kein Build-Abbruch), aber der Vollständigkeit halber dokumentiert.

**Verifikation:** `ng test` (gesamter Workspace) 237/237 grün (232/232 nach US-054-Merge als Basis, +5 neue Tests im Story-Test; die drei bestehenden Testdateien mit `BreakpointObserver`-Stub bleiben unverändert grün). `ng lint` fehlerfrei. `ng build` erfolgreich. `dotnet test` unverändert grün (kein Backend-Anteil).

**„So probierst du es aus":** `docker-compose up`, mit Seed-Admin anmelden → die Navigation erscheint als feste, vertikale Sidebar am linken Rand (SlobSteak-Schriftzug oben, Projektübersicht/Admin-Links darunter, „Abmelden" am unteren Rand), statt wie zuvor als horizontale Kopfleiste. Bei einem realen schmalen Browserfenster (<960px) klappt sie zu einem Hamburger-Menü zusammen.

**Neue/geänderte Dateien:**
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.ts` / `.html` / `.css` (vertikale Sidebar, `BreakpointObserver`, `p-drawer`)
- `frontend/src/app/app.html` / `.css` (Flex-Shell: Sidebar + Main-Content)
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.spec.ts`, `us-045-app-navigation.spec.ts`, `frontend/src/app/features/admin/us-046-admin-navigation.spec.ts` (`BreakpointObserver`-Stub ergänzt)
- `frontend/src/app/core/navigation/app-navigation/us-055-vertikale-navigation-sidebar.spec.ts` (neu, Story-Test)
- `docs/usecases/US-055-vertikale-navigation-sidebar.md` (diese Datei)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
