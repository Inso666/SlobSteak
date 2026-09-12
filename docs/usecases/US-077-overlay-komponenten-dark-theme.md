**ID:** US-077
**Titel:** Overlay-Komponenten (Dialoge, Auswahl-Panels, Passwort-Overlay) im dunklen Theme statt auf weißer Fläche
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht, zentrales PrimeNG-Preset)
**Abhängigkeiten:** US-047, US-048, US-056
**Status:** fertig am 2026-09-13, Branch `feature/US-077-overlay-komponenten-dark-theme`, PR siehe GitHub

---

### 1. User Story

Als **Nutzer** möchte ich in jedem Dialog und jeder Auswahlliste Überschrift, Feldbeschriftungen und Schaltflächen lesen können, damit ich Formulare wie „Passwort ändern" oder „Nutzer anlegen" überhaupt bedienen kann, statt auf eine weiße Fläche mit unsichtbarem Text zu blicken.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #116](https://github.com/Inso666/SlobSteak/issues/116) (vom Projektverantwortlichen gemeldet), Ursache eingegrenzt im QA-Design-Abgleich vom 04.09.2026.
- **Ist-Zustand (gemessen im laufenden Chrome, `docker compose up`, Stand `main` @ 01028dd):**
  - `.p-dialog` → `background-color: rgb(255, 255, 255)`
  - `.p-password-overlay` → `background-color: rgb(255, 255, 255)`
  - Der Inhalt erbt weiterhin die Dark-Theme-Textfarben, daraus folgen diese Kontrastwerte (WCAG 2.1 AA verlangt 4,5:1):

    | Element | Farbe auf Grund | Kontrast |
    |---|---|---|
    | `.p-dialog-title` „Neues Passwort festlegen" | `#edeff4` auf `#ffffff` | **1,15** |
    | `.p-dialog-title` „Nutzer anlegen" | `#edeff4` auf `#ffffff` | **1,15** |
    | `.p-button-text` „Abbrechen" | `#edeff4` auf `#ffffff` | **1,15** |
    | `label` „Name" / „E-Mail" / „Neues Passwort" | `#8d97ac` auf `#ffffff` | **2,94** |
    | `.dialog-hint` (Hinweistext im Passwort-Dialog) | `#8d97ac` auf `#ffffff` | **2,94** |

- **Root Cause:** `frontend/src/app/core/theme/slobsteak-preset.ts` mappt `semantic.primary`, `semantic.text`, `semantic.content`, `semantic.formField`, `semantic.highlight` sowie `components.card` und `components.skeleton` — aber **kein Overlay-Token**. Alle Overlay-Komponenten (`p-dialog`, `p-popover`, `p-select`-Panel, `p-password`-Panel, `p-tooltip`, `p-menu`, `p-confirmdialog`) bleiben damit auf den Aura-Defaults. Dass `components.card` bereits explizit für `light` **und** `dark` überschrieben wird, zeigt, dass die `light-dark()`-Auflösung von PrimeNG v22 in diesem Setup nicht wie in ADR-0004 angenommen greift; für Overlays fehlt die entsprechende Behandlung vollständig.
- **Schweregrad:** Der erzwungene Passwort-Änderungs-Dialog (US-008) ist der erste Screen, den **jeder** neu angelegte Nutzer sieht (`mustChangePassword: true`), und er lässt sich laut `docs/design/Login.dc.html` bewusst nicht überspringen. Der Ersteindruck der Anwendung ist damit ein weißes Rechteck mit unsichtbarem Titel und unsichtbarer Abbrechen-Schaltfläche.

### 3. Akzeptanzkriterien

- [ ] `slobsteak-preset.ts` mappt die Overlay-Semantik (`semantic.overlay` inkl. `modal`, `popover`, `select` bzw. die von PrimeNG v22 dafür vorgesehenen Token) auf die bestehenden Design-Tokens: Fläche `#161D2B` (`color.surface`), Rahmen `#262F42` (`color.border`), Schrift `#EDEFF4` (`color.text`), Radius aus `--app-radius-*`. Kein Screen überschreibt Dialog-Farben lokal (SPEC-00 §4).
- [ ] `.p-dialog`, `.p-password`-Overlay, `p-select`-/`p-multiselect`-Panels, `p-tooltip` und `p-menu`/`p-popover` rendern auf `color.surface`; die Maske bleibt wie bisher abgedunkelt.
- [ ] Für jedes Textelement in Dialog und Auswahl-Panel (Titel, Label, Hinweistext, Schaltflächen-Beschriftung, Options-Einträge inkl. Hover-/Selected-Zustand) beträgt der gemessene Kontrast mindestens **4,5:1**.
- [ ] Automatisierter Test (Angular `TestBed`) belegt, dass das Preset die Overlay-Token setzt bzw. dass ein gerenderter `p-dialog` die Surface-Farbe und nicht `#ffffff` trägt.
- [ ] Manueller Smoke-Test gegen `docker compose up`, Screenshot-Nachweis im PR für beide Fälle:
  1. `docker compose down -v && docker compose up` → Login mit `admin@example.com` / `ChangeMe123!` → erzwungener Passwort-Dialog.
  2. Admin-Bereich → Nutzer → „Nutzer anlegen".
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests bleiben grün (insbesondere US-054, US-056, US-057).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/core/theme/slobsteak-preset.ts` (zentral — Ziel ist genau **eine** Fundstelle, keine Overrides je Dialog)
- ggf. `frontend/src/styles.css`, falls PrimeNG v22 einzelne Overlay-Werte nur über CSS-Custom-Properties erreichbar macht
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- SPEC-00 §1.1: SlobSteak ist ausschließlich als dunkles Theme spezifiziert; es wird **kein** Light-Mode eingeführt.
- SPEC-00 §4: Die Akzentfarbe `#F2A93B` bleibt Braucht-Aufmerksamkeit-Signalen und dem Fokus-Ring vorbehalten und darf nicht als Dialog-Akzent zweckentfremdet werden.
- Keine Backend-Änderung, keine Migration.

### 5. Anmerkungen des Product Owners

Diese Story ist bewusst **vor** allen übrigen Design-Abgleich-Stories dieser Phase eingeplant: Sie behebt den einzigen Befund, der eine Kernfunktion (Erst-Login) praktisch unbenutzbar macht, und sie berührt dieselbe Datei wie US-079 — die Reihenfolge vermeidet parallele Änderungen am Preset.

### 6. Anmerkungen des Dev-Agenten (CLAUDE.md Abschnitt 6)

- **Root Cause abschließend geklärt (über die in der Story vermutete `light-dark()`-Unzuverlässigkeit hinaus):** Node-seitige Analyse von `@primeuix/styled`/`@primeuix/themes` (Version aus `frontend/package.json`) zeigt den exakten Mechanismus: `providePrimeNG` wird in `app.config.ts` mit `options.darkModeSelector: false` verdrahtet. PrimeNG prüft dies über `applyDarkColorScheme(options) = !(darkModeSelector === 'none' || darkModeSelector === false)` — bei `false` liefert `getColorSchemeOption(...)` ein leeres Array, wodurch für jeden Token, dessen Aura-Default zwei `light-dark()`-Varianten definiert, ausschließlich die **Light**-Variante fest in die generierte `:root`-Regel geschrieben wird. Das erzwungene `color-scheme: dark` in `styles.css` kann diesen bereits aufgelösten Wert nachträglich nicht mehr umsteuern. Betroffen waren `semantic.overlay.{modal,popover,select}` (vollständig ungemappt), `semantic.list.option.focusBackground`, `semantic.navigation.item.focusBackground/activeBackground` (Options-/Menü-Hover) sowie `components.tooltip.root.{background,color}` (verweist in Aura auf feste Primitiv-Farben statt auf einen Overlay-Token). Die Gegenmaßnahme ist in allen Fällen identisch: ein flacher Hex-Wert ohne `light-dark()` je Token — das entspricht exakt dem bereits für `components.card` verwendeten Muster und wurde mit dem echten `@primeuix/themes`-Compiler (`Theme.getCommonStyleSheet()`/`Theme.getStyleSheet('tooltip')`) empirisch verifiziert (kein `light-dark()` mehr im generierten CSS für die betroffenen Tokens).
- **Radius-Entscheidung (Akzeptanzkriterium 1, "Radius aus `--app-radius-*`"):** SPEC-00 §1.2 listet sowohl `radius.md` (8px, Verwendung laut Tabelle: „Karten, Buttons, Input-Felder") als auch `radius.lg` (10px, „Panels, Tabs-Container, Legende") mit teils überlappender Wortwahl, ohne Overlays/Dialoge explizit einer der beiden Stufen zuzuordnen. Gewählt wurde `radius.md` (8px) für alle drei Overlay-Gruppen (`modal`, `popover`, `select`) — identisch mit dem bereits bestehenden `content.borderRadius` (Karten, Panels, SPEC-00 §1.2 Zeile `#161D2B`/`color.surface`), um keine zusätzliche, in SPEC-00 nicht eindeutig belegte Radius-Differenzierung einzuführen. Keine zentrale Invariante betroffen (CLAUDE.md Abschnitt 6 Punkt 3 nicht einschlägig) — bei abweichender UX/UI-Vorgabe im Rahmen einer Folge-Story leicht nachziehbar (ein Wert je Overlay-Gruppe an einer Fundstelle).
- **Docker-Smoke-Test (Akzeptanzkriterium 5):** In dieser Agenten-Umgebung ist die Docker-CLI installiert, aber der Docker-Daemon nicht erreichbar (`docker info` bricht mit `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` ab — Docker Desktop läuft in diesem isolierten Arbeits-Worktree nicht). Der manuelle Smoke-Test gegen `docker compose up` (Login mit erzwungenem Passwort-Dialog, „Nutzer anlegen") konnte daher nicht wie vorgeschrieben durchgeführt werden. Als Ersatznachweis: (1) der Story-Test rendert einen echten `p-dialog` in echtem Chrome (Karma `ChromeHeadlessCI`) und misst `background-color: rgb(22, 29, 43)` (= `#161D2B`) statt `rgb(255, 255, 255)`; (2) der reale `@primeuix/themes`-CSS-Compiler wurde direkt mit dem Preset und exakt der Produktions-Option `darkModeSelector: false` aufgerufen und erzeugt für alle betroffenen Tokens ausschließlich flache, korrekte Dark-Werte. Der ausstehende Docker-basierte Screenshot-Nachweis (beide in Akzeptanzkriterium 5 genannten Fälle) ist damit als offener Punkt zu verstehen, nicht als stillschweigend übersprungen — Nachholung durch den Projektverantwortlichen oder eine Umgebung mit laufendem Docker-Daemon empfohlen, bevor der PR gemergt wird.
