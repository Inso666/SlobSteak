**ID:** US-053
**Titel:** App-Identität im Browser (Tab-Titel, Favicon, Marken-Icon)
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-001, US-047

**Status:** fertig (29.08.2026), PR siehe unten

---

### 1. User Story

Als **Nutzer** möchte ich SlobSteak an seinem eigenen Namen und Icon im Browser-Tab erkennen, statt am generischen Angular-CLI-Gerüst, mit dem das Projekt einmal begonnen hat.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“, drei Einzelbefunde, zusammengefasst zu einer Story, da alle drei denselben, nie nachgezogenen Scaffold-Zustand betreffen:
  1. „Das Icon für die App fehlt.“
  2. „Der Tabname ist nicht vergeben, sondern immer noch ‚Frontend‘.“
  3. „Das Navicon ist noch das Standard-Icon für Angular.“
- **Verifikation durch PO (Code-Review):**
  - `frontend/src/index.html` Zeile 4: `<title>Frontend</title>` — bestätigt unverändert seit dem Angular-CLI-Scaffold, nie auf „SlobSteak“ (o. ä.) angepasst.
  - `frontend/public/favicon.ico`: laut `git log --follow` seit dem allerersten Commit (`85455da feat(US-001): Projekt-Grundgerüst & Architektur-Setup`) kein einziges Mal verändert — es handelt sich nachweislich um das von `ng new` generierte Standard-Angular-Favicon, referenziert von `index.html` als Browser-Tab-Icon.
  - Login-Seite (`login-page.component.html`) enthält aktuell **keinerlei** Marken-/Logo-Element — `docs/specs/SPEC-01-Login.md` §1.2 sieht dafür explizit einen „Markenblock“ mit dekorativem SVG-Logo neben dem Schriftzug „SlobSteak“ vor (`<svg aria-hidden="true" …></svg> <!-- dekoratives Logo, aus Wireframe übernommen -->`), der schlicht nicht umgesetzt wurde. Das erklärt den Befund „Icon für die App fehlt“ zusätzlich zum Favicon-Punkt — hier fehlt das Icon nicht nur im Browser-Tab, sondern auch im Produkt selbst.
- **Abgrenzung zu US-054:** Diese Story behebt ausschließlich die drei oben genannten, eng zusammenhängenden Identitäts-Lücken (Titel, Favicon, Marken-Icon als Asset). Die vollständige strukturelle/visuelle Angleichung der Login-Seite an SPEC-01 (Tagline, Footnote-Text, Bootstrapping-Zustand) ist Gegenstand von US-054 — dort wird das in dieser Story bereitgestellte Marken-Icon eingebaut.

### 3. Akzeptanzkriterien

- [x] `frontend/src/index.html` trägt einen aussagekräftigen `<title>` („SlobSteak“ bzw. eine vom Projektverantwortlichen bestätigte Variante, z. B. „SlobSteak – Stakeholder-Management“).
- [x] `frontend/public/favicon.ico` (sowie ggf. zusätzliche moderne Icon-Formate, falls im Rahmen dieser Story ergänzt, z. B. SVG-Favicon) zeigt ein SlobSteak-eigenes Icon, nicht mehr das Angular-CLI-Standardicon.
- [x] Ein Marken-Icon (SVG, dekorativ, `aria-hidden="true"`) steht als wiederverwendbares Asset zur Verfügung und wird mindestens auf der Login-Seite eingesetzt (Umsetzung im Markup selbst erfolgt in US-054, sofern das Icon rechtzeitig vorliegt — andernfalls liefert diese Story das Icon als eigenständiges Zwischenergebnis für die Folge-Story).
- [x] Design des Icons ist mit den in SPEC-00 definierten Farb-Tokens konsistent (z. B. `color.text`/`color.attention`, keine neu erfundene Farbe).
- [x] Kein bestehender Test wird gebrochen; `ng test`/`ng lint`/`ng build` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/index.html` (`<title>`, `<link rel="icon">`)
- `frontend/public/favicon.ico` (und optional `frontend/public/icon.svg` o. ä.)
- ggf. ein neues, wiederverwendbares SVG-Asset/Komponente für das Marken-Icon (Ablage z. B. `frontend/src/app/shared/` oder `frontend/public/`), damit US-054 es direkt referenzieren kann.

**Wichtige Invarianten:**
- Rein statische Assets/Metadaten — keine Logik-Änderung.
- Icon-Gestaltung ist eine gestalterische Entscheidung ohne PRD-Vorgabe im Detail — bei Unklarheit gilt CLAUDE.md Abschnitt 6 (PRD-konformste, am wenigsten überraschende Interpretation wählen und begründen, z. B. Ableitung aus dem Produktnamen „SlobSteak“ und den SPEC-00-Tokens).

### Anmerkungen des Product Owners

Bewusst als eigenständige, kleine Story vor US-054 geschnitten, damit das Marken-Icon als Asset unabhängig von der größeren strukturellen Login-Migration bereitsteht und nicht zwei Stories dasselbe Icon parallel neu erfinden.

### Anmerkungen des Agenten

**Icon-Herleitung (Akzeptanzkriterium 4):** Statt eine neue, im PRD nicht vorgegebene Bildmarke frei zu erfinden (CLAUDE.md Abschnitt 6: PRD-konformste, am wenigsten überraschende Interpretation), knüpft das Icon an eine bereits im Produkt etablierte visuelle Sprache an — die drei Rollenfarben `color.role-pl`/`role-ct`/`role-ar` (`#8B7CF6`/`#2DD4BF`/`#38BDF8`, SPEC-00 §1.2), dieselben Farben, die das bereits spezifizierte Perspektiven-Radar (SPEC-00 §1.3) für die drei Stakeholder-Perspektiven verwendet. Drei überlappende Kreise in diesen Farben auf einer `color.background`-Kachel (`#10151F`) — die Überlappung als sinnbildliches Zusammenspiel der Perspektiven. Keine neu erfundene Farbe (Story-test verifiziert das direkt gegen die vier verwendeten Hex-Werte).

**Favicon-Erzeugung — kein Rasterisierungswerkzeug verfügbar:** Weder ImageMagick/`rsvg-convert`/Inkscape noch eine funktionierende Python-Installation standen in dieser Umgebung zur Verfügung, um `icon.svg` maschinell in ein `.ico` zu konvertieren. Stattdessen wurde ein einmaliges, nicht eingechecktes Node-Skript (keine npm-Abhängigkeiten) geschrieben, das dieselbe Grafik (Kachel + drei Kreise) direkt als Pixel-Bitmap nachbildet (4×4-Supersampling für Kantenglättung) und in ein valides Multi-Auflösungs-`.ico` (16/32/48 px, 32bpp BGRA) verpackt — das Skript selbst ist reines Build-Werkzeug für ein statisches Asset, kein Teil der Anwendung, und wurde daher nicht ins Repository übernommen (nur das erzeugte `favicon.ico` ist Teil dieses Commits). Visuell verifiziert durch Rückkonvertierung zu PNG und Sichtprüfung bei 16px und 32px sowie im echten Browser-Tab (siehe unten) — bei beiden Größen klar von den PrimeUI-/Angular-Standardicons unterscheidbar und erkennbar.

**Titel-Wahl (Akzeptanzkriterium 1):** „SlobSteak" (kurz) statt „SlobSteak – Stakeholder-Management" gewählt — Browser-Tabs kürzen lange Titel ohnehin auf wenige Zeichen, ein kurzer, eindeutiger Produktname ist das gängigere Muster (vgl. andere SaaS-Anwendungen) und am wenigsten überraschend.

**Nicht per `ng test` automatisiert prüfbar:** `<title>` (Akzeptanzkriterium 1) und die Icon-Binärdateien (Akzeptanzkriterium 2) sind reine, build-zeitliche `index.html`/Asset-Inhalte außerhalb des von Karma/TestBed geladenen Komponentenbaums — ein Karma-Test sieht ohnehin nur Karmas eigene Test-Runner-Seite, nicht `index.html`. Stattdessen direkt verifiziert: Datei-Inhalt (`grep` auf `<title>`/`<link rel="icon">` im Build-Output), das gerenderte Icon selbst (Rückkonvertierung zu PNG, Sichtprüfung) sowie ein echter Browser-Smoke-Test (siehe unten). Akzeptanzkriterium 3 (wiederverwendbares Icon-Bauteil, auf der Login-Seite eingesetzt) und Akzeptanzkriterium 4 (Farb-Tokens) sind dagegen echte Angular-Komponenten-Eigenschaften und daher reguläre Story-Testfälle.

**Verifikation:** `ng test` (gesamter Workspace) 221/221 grün (218/218 nach US-052-Merge als Basis, +3 neue Tests: 2 im neuen Story-Test, 1 in `brand-mark.component.spec.ts`). `ng lint` fehlerfrei. `ng build` erfolgreich, Build-Output enthält `favicon.ico`, `icon.svg` und den aktualisierten `<title>` korrekt (per `grep` gegen `dist/frontend/browser/index.html` verifiziert). `dotnet test` unverändert grün (kein Backend-Anteil).

**Manueller Smoke-Test:** Produktions-Build (`ng build`) über einen lokalen statischen Server ausgeliefert, per Browser-Automatisierung geprüft — Browser-Tab-Titel zeigt „SlobSteak" (nicht mehr „Frontend"), Markenblock (Icon + Schriftzug „SlobSteak") erscheint zentriert über der Login-Karte, bei Detailvergrößerung klar erkennbar und von den PrimeUI-/Angular-Standardicons unterscheidbar (Screenshot-verifiziert).

**„So probierst du es aus":** `docker-compose up`, `http://localhost:4200/login` öffnen → Browser-Tab zeigt „SlobSteak" mit eigenem Icon statt „Frontend"/Angular-Standardicon; auf der Seite selbst erscheint oberhalb der Anmeldekarte das Markenzeichen mit Schriftzug.

**Neue/geänderte Dateien:**
- `frontend/public/icon.svg` (neu, Master-Grafik)
- `frontend/public/favicon.ico` (neu, ersetzt Angular-CLI-Standardicon)
- `frontend/src/index.html` (`<title>`, `<link rel="icon">` für SVG + ICO)
- `frontend/src/app/shared/brand-mark/brand-mark.component.ts` / `.html` / `.css` (neu, wiederverwendbares Icon-Bauteil) + `.spec.ts`
- `frontend/src/app/features/auth/login-page/login-page.component.ts` / `.html` / `.css` (Markenblock eingesetzt)
- `frontend/src/app/features/auth/login-page/us-053-app-identitaet-browser.spec.ts` (neu, Story-Test)
- `docs/usecases/US-053-app-identitaet-browser.md` (diese Datei)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
