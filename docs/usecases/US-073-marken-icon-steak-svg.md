**ID:** US-073
**Titel:** Einheitliches Marken-Icon (Steak-SVG) app-weit statt abstraktem Drei-Kreise-Symbol
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht)
**Abhängigkeiten:** US-072
**Status:** fertig (01.09.2026), PR siehe Feature-Branch `feature/US-073-marken-icon-steak-svg`

---

### 1. User Story

Als **Nutzer** möchte ich auf jedem Screen (Login, Sidebar, Browser-Tab) dasselbe, zum Produktnamen „SlobSteak“ passende Markenzeichen sehen, damit die Markenidentität der Anwendung konsistent und wiedererkennbar ist.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #98](https://github.com/Inso666/SlobSteak/issues/98), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026 — alle 12 Artboards in `docs/design/S2-Projektuebersicht-Wireframe.html` zeigen übereinstimmend dasselbe SVG-Markenzeichen: eine stilisierte, gegrillte Steak-Form mit Farbverlauf (`linear-gradient` `#c96a45` → `#a8502f` → `#6f2f1c`) und Grillstreifen.
- **Ist-Zustand:** `frontend/src/app/shared/brand-mark/brand-mark.component.html` rendert ein abstraktes Icon aus drei überlappenden Kreisen in den Rollenfarben (`--app-role-pl/ct/ar`) auf abgerundetem dunklem Kachel-Hintergrund — laut Code-Kommentar (`brand-mark.component.ts`) bewusst aus `SPEC-00-Design-System.md` abgeleitet, ohne `docs/design` zu konsultieren (`docs/design` existierte zum Zeitpunkt von US-053 bereits, Commit `de23df9`, 2026-08-23). Dieselbe Grafik wird für `frontend/public/icon.svg`/`favicon.ico` verwendet. `app-navigation.component.html` (Sidebar) zeigt aktuell **gar kein** Icon in der Brand-Zeile, nur den Text „SlobSteak“ (`<span class="app-navigation__brand">SlobSteak</span>`, Zeile 3) — `<app-brand-mark />` ist dort nicht eingebunden.
- **Soll-Zustand:** Einheitliches Steak-Icon gemäß `docs/design`, verwendet in `BrandMarkComponent` (damit automatisch auf Login-Seite korrekt), zusätzlich in der Sidebar-Brand-Zeile eingebunden, sowie als `icon.svg`/`favicon.ico`.
- **PO-Entscheidung zur Umsetzung:** `BrandMarkComponent` ist bereits die zentrale, einzige Quelle für das Marken-SVG (US-053, wiederverwendet auf Login) — diese Story ersetzt ausschließlich deren SVG-Inhalt sowie den Inhalt von `frontend/public/icon.svg`/`favicon.ico` durch die Steak-Grafik und bindet `<app-brand-mark />` zusätzlich in die Sidebar-Brand-Zeile ein. Kein neues, paralleles Icon-Bauteil.
- **Relevant für DDD:** Rein visuelle Presentation-Schicht, keine fachliche Logik betroffen.

### 3. Akzeptanzkriterien

- [x] `BrandMarkComponent` rendert das Steak-Icon gemäß `docs/design` (Farbverlauf `#c96a45` → `#a8502f` → `#6f2f1c`, Grillstreifen-Andeutung) statt der drei Kreise — automatisch wirksam überall, wo `<app-brand-mark />` bereits eingebunden ist (Login-Seite, US-053/US-054).
- [x] Die Sidebar-Brand-Zeile (`app-navigation.component.html`) bindet `<app-brand-mark />` zusätzlich zum bestehenden Text „SlobSteak“ ein.
- [x] `frontend/public/icon.svg` und `frontend/public/favicon.ico` zeigen dieselbe Steak-Grafik (`GET /icon.svg` liefert die neue Grafik).
- [x] Kein Bruch der bestehenden Barrierefreiheits-/Dekorativ-Kennzeichnung (`aria-hidden="true"`, `focusable="false"` bleiben erhalten, analog zur bisherigen `BrandMarkComponent`).
- [x] Automatisierter Test (Angular `TestBed`) belegt: `BrandMarkComponent` enthält kein Element mit den alten Drei-Kreis-Farbwerten mehr; `app-navigation.component.html` bindet `app-brand-mark` ein.
- [x] Manueller Smoke-Test gegen `docker-compose up`: Login-Seite, Sidebar und Browser-Tab-Icon zeigen konsistent die Steak-Grafik — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [x] Bestehende Tests von `BrandMarkComponent`, `LoginPageComponent`, `AppNavigationComponent` (inkl. Story-Tests aus US-053/US-054/US-055) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/shared/brand-mark/brand-mark.component.html`/`.css` (SVG-Inhalt austauschen)
- `frontend/public/icon.svg`, `frontend/public/favicon.ico` (dieselbe Grafik, ggf. `favicon.ico` per Build-Schritt/Konvertierung aus dem SVG erzeugen — bestehendes Verfahren aus US-053 prüfen)
- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.html`/`.css` (`<app-brand-mark />` in die Brand-Zeile einfügen, Layout/Abstand neben dem Text „SlobSteak“ anpassen)
- Zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Ein einziges SVG-Bauteil (`BrandMarkComponent`) bleibt die alleinige Quelle für das Marken-Icon — keine Duplizierung des SVG-Markups an mehreren Stellen.
- Farbverlauf-Werte sind reine Marken-/Illustrationsfarben (kein SPEC-00-Token nötig, analog zur bisherigen Behandlung der Rollenfarben-Kreise als bewusste Ausnahme).

### Anmerkungen des Product Owners

Fünfte Story dieser Phase — unabhängig von den vorangehenden vier Stories (keine gemeinsam betroffenen Dateien), aber bewusst vor [US-074](US-074-projektuebersicht-sidebar-toolbar-cards.md) eingeplant, da jene Story dieselbe Sidebar-Brand-Zeile für die Nav-Item-Icons/Nutzerkarte weiter ausbaut — sequenzielle Reihenfolge vermeidet parallele Änderungen an `app-navigation.component.html`.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **Extraktion aus `docs/design`:** Das `<script id="appifact-doc">`-JSON in
  `docs/design/S2-Projektuebersicht-Wireframe.html` wurde per einmaligem, nicht eingechecktem
  Node-Skript geparst (Datei ist zu groß für eine direkte Volltextsuche/-anzeige). Alle 8 der 12
  Artboards, die das Icon enthalten (u. a. `Main.dc.html`, `Login.dc.html`), führen exakt dasselbe
  `<path>`-Markup mit identischem Farbverlauf (`#c96a45` → `#a8502f` → `#6f2f1c`, Stop-Offsets
  0 %/55 %/100 %) — 1:1 in `BrandMarkComponent`/`icon.svg` übernommen, keine eigene Interpretation.
- **`favicon.ico`-Erzeugung:** Wie bereits in US-053 dokumentiert, existiert in dieser Umgebung kein
  Bildkonvertierungswerkzeug. `frontend/gen-favicon.js` (einmalig, nicht eingecheckt) hat via
  temporär installiertem `sharp` (SVG→PNG, 48/32/16px) und `png-to-ico` (PNG→ICO) die neue
  `favicon.ico` erzeugt; beide npm-Pakete wurden anschließend wieder deinstalliert
  (`package.json`/`package-lock.json` unverändert, `--no-save`).
- **Superseded Test (US-053 Akzeptanzkriterium 4):** Der bestehende Story-Test
  `us-053-app-identitaet-browser.spec.ts` prüfte bisher, dass `BrandMarkComponent` ausschließlich
  SPEC-00-Farb-Tokens verwendet (Konsequenz des damaligen Drei-Kreise-Designs). Diese Story ersetzt
  das Design bewusst durch eine Marken-/Illustrationsfarbe außerhalb von SPEC-00 (siehe „Wichtige
  Invarianten“ oben) — der Test wurde entsprechend angepasst (prüft jetzt den dokumentierten
  Steak-Farbverlauf statt der SPEC-00-Token-Liste), nicht ersatzlos gelöscht. Keine bisher geprüfte
  fachliche Aussage geht verloren (CLAUDE.md Abschnitt 3, analog zum Vorgehen in US-071/US-070).
- **Icon-Größe:** `BrandMarkComponent` bleibt bei der bestehenden, festen Größe (1.5rem, siehe
  `brand-mark.component.css`) statt der in `docs/design` uneinheitlichen Nativgrößen (34px Login
  vs. 28px Sidebar) — konsistente Icon-Größe an allen Einsatzorten ist näher an der fachlichen
  Absicht „einheitliches Markenzeichen“ als eine unterschiedliche Größe je Screen; keine
  Design-Vorgabe wird dadurch verletzt (nur die Nativgröße des SVG-`viewBox`, nicht die Darstellung,
  unterscheidet sich vom Mockup).
- **Manueller Smoke-Test:** `docker-compose up` mit isoliertem Port-Satz (`db:55432`, `api:55010`,
  `frontend:54210`, Projekt `us073smoke`) gegen einen frischen Seed-Admin. Login-Seite, Browser-Tab-
  Favicon (Zoom) und Sidebar nach Login zeigen konsistent die Steak-Grafik — Screenshots in
  `docs/usecases/screenshots/US-073/`. Stack anschließend vollständig abgebaut
  (`docker compose down -v`), temporäre Compose-Override-Datei nicht eingecheckt.
