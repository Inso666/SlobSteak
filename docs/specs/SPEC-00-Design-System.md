# SPEC: Design-System &amp; wiederverwendbare Komponenten

> **Kein eigenständiger Fach-Screen.** Diese Spezifikation definiert die gemeinsame visuelle und strukturelle Basis (Design-Tokens, PrimeNG-Theming, wiederverwendbare Bausteine, Formular- und State-Muster) für **alle** Fach-Screens S2–S5 (Projektübersicht, Stakeholder-Liste, Stakeholder-Map, Verteiler, Stakeholder-Detail, Admin). Jede Feature-Spec-Datei referenziert diese Datei, statt Tokens oder Bausteine erneut zu definieren. Abgeleitet aus dem Wireframe `Components.dc.html` (Designer-Notiz: „Design-Tokens &amp; wiederverwendbare Bausteine für S3–S5. Rollenfarben und das Perspektiven-Radar wandern unverändert in die Stakeholder-Map (F3.2 Legende) — Konsistenz von Anfang an statt Nacharbeit.").

## 1. PrimeNG Component Tree & Layout

### 1.1 Theme-Grundlage

Das Wireframe zeigt ein dunkles Analytics-Theme. Empfehlung für den Frontend-Agenten: PrimeNG **Custom Theme / unstyled + eigenes Preset** auf Basis eines dunklen PrimeNG-Preset (z. B. `Aura` als Ausgangspunkt, im `definePreset`-Mechanismus von PrimeNG v18+ überschrieben) statt eines unveränderten Standard-Presets — die Palette (insbesondere `--attn`, die drei Rollenfarben und die Space-Grotesk/IBM-Plex-Schriftpaarung) existiert in keinem PrimeNG-Standard-Preset und muss als Custom-Preset-Layer definiert werden. Alle Screens importieren ausschließlich dieses eine Preset — kein Screen definiert lokale Farb-/Radius-/Abstandswerte.

Fonts: `Space Grotesk` (500/600/700, Google Fonts) für Display/Titel, `IBM Plex Sans` (400/500/600, Google Fonts) für Fließtext/UI, `IBM Plex Mono` (400/500, Google Fonts) ausschließlich für Zahlen/Kennzahlen/Zeitstempel.

### 1.2 Token-Referenztabelle (Wireframe-Wert → Token-Name → PrimeNG-Variable)

Diese Tabelle ist die **einzige Quelle der Wahrheit** für Farben, Typografie und Abstände. Jeder im Wireframe vorkommende Hex-/px-Wert wird hier auf ein benanntes Token abgebildet. Kein Screen darf einen Hex-Code oder px-Wert direkt verwenden — ausschließlich diese Variablen bzw. äquivalente PrimeFlex-Utility-Klassen.

| Wireframe-Wert | Token-Name | PrimeNG-Variable (Vorschlag) | Verwendung |
|---|---|---|---|
| `#10151F` | `color.background` | `var(--p-surface-ground)` | App-Hintergrund |
| `#161D2B` | `color.surface` | `var(--p-surface-card)` / `var(--p-content-background)` | Karten, Panels |
| `#1D2536` | `color.surface-hover` | `var(--p-surface-hover)` | Hover-, aktive Zustände |
| `#262F42` | `color.border` | `var(--p-content-border-color)` / `var(--p-surface-border)` | Trennlinien, Karten-Rahmen, Input-Rahmen |
| `#EDEFF4` | `color.text` | `var(--p-text-color)` | Primärtext, Fläche des Primär-Buttons |
| `#8D97AC` | `color.text-muted` | `var(--p-text-muted-color)` | Sekundärtext, Labels, inaktive Tabs |
| `#5D6883` | `color.text-faint` | `var(--p-text-color-secondary)` (abgeschwächt) bzw. eigenes Custom-Token `--app-text-faint` | Meta-Infos, Zeitstempel, Platzhalter für unbesetzte Radar-Ringe |
| `#F2A93B` | `color.attention` (Akzentfarbe) | `var(--p-primary-color)` bzw. eigenes Custom-Token `--app-attention` | „Braucht Aufmerksamkeit"-Signal, Fokus-Ring — **ausschließlich** dafür reserviert, nie für allgemeine Links/Buttons |
| `rgba(242,169,59,0.14)` | `color.attention-bg` | Custom-Token `--app-attention-bg` | Hintergrund von Attention-Badges |
| `#22C55E` | `color.success` | `var(--p-green-500)` / `var(--p-success-color)` | Bestätigungen, Status „Aktiv" |
| `#F87171` | `color.error` | `var(--p-red-400)` / `var(--p-error-color)` | Fehler, destruktive Aktionen |
| `#8B7CF6` | `color.role-pl` | Custom-Token `--app-role-pl` | Badge/Radar-Ring/Map-Punkt Rolle „PL" (F3) |
| `#2DD4BF` | `color.role-ct` | Custom-Token `--app-role-ct` | Badge/Radar-Ring/Map-Punkt Rolle „Coreteam" (F3) |
| `#38BDF8` | `color.role-ar` | Custom-Token `--app-role-ar` | Badge/Radar-Ring/Map-Punkt Rolle „Architect" (F3) |
| `8px` (Swatch-Radius) | `radius.md` | `var(--p-border-radius-md)` | Karten, Buttons, Input-Felder |
| `10px` (Karten-/Tabs-Radius) | `radius.lg` | `var(--p-border-radius-lg)` | Panels, Tabs-Container, Legende |
| `999px` (Badge-Radius) | `radius.full` | `var(--p-border-radius-full)` bzw. `border-radius: 9999px` | Rollen-Badges, Attention-Badge-Punkt |
| `5–7px` (Status-Tag/Tab-Radius) | `radius.sm` | `var(--p-border-radius-sm)` | Status-Tags, aktiver Tab |
| `26px` (Display-Titel) | `font-size.display` | Custom-Token `--app-font-size-display` | Seitentitel (`h1`) |
| `16px` (Karten-Titel) | `font-size.card-title` | Custom-Token `--app-font-size-card-title` | Karten-/Abschnittstitel |
| `13–14px` (Body) | `font-size.body` | `var(--p-content-font-size)` bzw. Standard-Textgröße | Fließtext, Labels, Navigation, Tabellenzellen |
| `28px` (Data) | `font-size.data` | Custom-Token `--app-font-size-data` | Kennzahlen (mono) |
| `11px` (Meta) | `font-size.meta` | Custom-Token `--app-font-size-meta` | Zeitstempel, Meta-Infos (mono) |
| `14px/20px` (Gap in `.row`) | `space.md` / `space.lg` | PrimeFlex `gap-3`/`gap-5` | horizontaler Abstand zwischen Bedienelementen |
| `16px` (Grid-Gap Rollen/Swatches) | `space.md` | PrimeFlex `gap-4` | Grid-Abstände (Rollen-Karten, Swatches) |
| `36px` (Section-Gap) | `space.xl` | PrimeFlex `gap-6` | Abstand zwischen Abschnitten |
| `0.72` (Deckkraft, US-064) | `opacity.map-point-locked` | Custom-Token `--app-map-point-locked-opacity` | Einheitliche reduzierte Deckkraft für „gesperrt/nicht ziehbar"-Punkte auf der Stakeholder-Map (Vergleichspunkt UND eigener Punkt bei Rollen-/Perspektiven-Mismatch, SPEC-04 §3.1) sowie deren Legenden-Swatch — unabhängig vom Sperrgrund identisch, da kein fachlicher Unterschied zwischen den Sperr-Gründen kommuniziert wird (Issue #71) |

> Hinweis für Folge-Specs: Wird in einer Feature-Spec ein Farb-/Radius-/Abstandswert benötigt, der hier nicht gelistet ist, ist das ein Hinweis auf eine fehlende Design-Entscheidung — nicht auf einen frei wählbaren Wert. Rückfrage an UX/UI statt Erfindung eines neuen Tokens.

### 1.3 Wiederverwendbare UI-Bausteine → PrimeNG-Äquivalent

| Wireframe-Baustein | PrimeNG-Äquivalent | Hinweise |
|---|---|---|
| `.btn-primary` (Text-auf-hell-Fläche, `color.text` als Fläche, `color.background` als Schrift) | `<p-button>` ohne `severity` (bzw. `severity="contrast"`), gefüllt | Standard-Primäraktion — Space-Grotesk/IBM-Plex-Body-Font, nicht die Attention-Farbe |
| `.btn-secondary` (transparent, `color.border`-Rahmen) | `<p-button [outlined]="true" severity="secondary">` | Sekundäraktion |
| `.btn-destructive` (transparent, `color.error`-Rahmen/-Text) | `<p-button [outlined]="true" severity="danger">` | Löschen/destruktive Aktionen |
| `.btn[disabled]` (Opazität 0.4) | `<p-button [disabled]="true">` | native PrimeNG-Disabled-Optik verwenden, keine manuelle Opazität |
| `.tabs` / `.tab.active` (Pill-Container mit aktivem Tab in Textfarbe) | `<p-tabs>` / `<p-tablist>` / `<p-tab>` (PrimeNG v18 Tabs-API) im Pill-Stil, aktiver Tab = `color.text`-Fläche auf `color.background`-Schrift | Tab-Unterstrich-Muster aus dem Wireframe ist tatsächlich ein **gefüllter Pill**, kein Unterstrich — Folge-Specs (z. B. Stakeholder-Detail-Assessment-Tabs, US-029) übernehmen exakt dieses Pill-Muster |
| `.role-badge` (Rollenfarbe als Text auf 16%-Opazitäts-Hintergrund, `radius.full`) | `<p-tag [rounded]="true">` mit Custom-Styling je Rolle (`--app-role-pl/ct/ar` als `color`, gleiche Farbe bei 16% Opazität als `background`) bzw. `<p-chip>` | Vier Varianten: PL, Coreteam (`ct`), Architect (`ar`), Admin (`ad`, neutral: `color.surface-hover`-Fläche + `color.border`-Rahmen). Rolle „User" hat **keinen** Badge (siehe §4) |
| `.status-tag` (uppercase, `radius.sm`, drei Varianten) | `<p-tag [rounded]="false">` mit `severity`-Mapping: `active` → `success`, `archived` → `secondary`/neutral, `deleted` → `danger` | Uppercase + Letter-Spacing als Text-Transform, nicht als eigene Komponente |
| `.attention` (Punkt + Text, `color.attention-bg`-Fläche) | Custom-Komponente `AppAttentionBadgeComponent` auf Basis `<p-tag>`/`<p-message severity="warn">`, mit vorangestelltem 6px-Punkt (`<span class="dot">`) | Kein reines PrimeNG-Standardelement — kombiniert Punkt + Badge-Fläche; als projektspezifischer Wrapper bauen |
| `.role-card` (Karte mit Badge + Beschreibungstext) | `<p-card>` | Container für Rollenübersicht (Admin-/Hilfe-Kontext) |
| Swatch-Kachel (Farbe + Name + Hex + Verwendungszweck) | keine PrimeNG-Entsprechung — reines Style-Guide-Element, nicht Teil der Produkt-UI | Nur relevant für diese Spec-Datei/Storybook-artige Doku, nicht für Fach-Screens |
| Formularfeld (`.field`, `.field.error`) | `<input pInputText>` / `p-password` / `p-select` innerhalb `<label>` + Wrapper, siehe §2 | siehe Formular-Abschnitt |
| **Perspektiven-Radar** (drei konzentrische SVG-Ringe, Fortschritt je Rolle, gestrichelter Ring für „nicht besetzt") | **Custom-Komponente**, kein PrimeNG-Standardelement | Kein PrimeNG-`p-knob`/`p-progressbar`-Element bildet drei unabhängige, farbcodierte Ring-Segmente mit gestricheltem „nicht besetzt"-Zustand ab. Als eigenständige Angular-Komponente `AppPerspectivesRadarComponent` bauen (SVG-basiert, `stroke-dasharray`/`stroke-dashoffset` wie im Wireframe), mit Eingabe-API pro Rolle (`status: 'rated' \| 'partial' \| 'unassigned'`, `progress: number`, `roleColor` aus §1.2). Diese Komponente wird unverändert in Stakeholder-Liste (Karten-Vorschau) **und** Stakeholder-Map (F3.2 Legende) wiederverwendet — keine zweite Implementierung. |

### 1.4 Layout-Grundsätze

- Ausschließlich PrimeFlex-Utility-Klassen (`flex`, `flex-column`, `gap-*`, `grid`, `col-*`) für Abstände/Layout — keine hartkodierten `px`-Werte in Komponenten-Templates oder -Styles.
- Grid-Muster aus dem Wireframe (`repeat(6, minmax(0,1fr))` für Swatches, `repeat(4, minmax(0,1fr))` für Rollen-Karten) werden als PrimeFlex-`grid`-Spaltenzahl übernommen, responsiv über PrimeFlex-Breakpoint-Klassen (`md:col-*`) — kein festes Pixel-Raster.
- Abschnittstrenner (`.section-title`, Uppercase + `letter-spacing:0.08em` + `border-bottom`) ist das Standardmuster für Gruppierungs-Überschriften innerhalb von Panels/Detailseiten.

## 2. Forms, Directives & Validation

Diese Muster gelten für **jedes** Formularfeld in **jedem** Screen (Login, Stakeholder anlegen/bearbeiten, Assessment-Formular, Admin-Formulare). Kein Screen definiert ein abweichendes Fehler- oder Label-Muster.

- **Struktur je Feld:** ein Wrapper-Element pro Feld, darin ein echtes, mit `for`/`id` verknüpftes `<label>` (kein reiner Placeholder-Text als Label-Ersatz — Wireframe-Kommentar: „Echtes, verknüpftes `<label>` je Feld"), gefolgt vom Eingabeelement, optional gefolgt vom Fehlerblock.
- **Eingabeelemente:** `<input pInputText>` für Text, `<p-password>` für Passwortfelder (mit `[feedback]="false"`, sofern nicht anders spezifiziert), `<p-select>` für Auswahllisten. Alle nutzen `color.surface` als Feldhintergrund, `color.border` als Standard-Rahmenfarbe, `radius.md` als Eckenradius, `color.text` als Eingabetextfarbe, Body-Font-Größe (`13px`/`font-size.body`).
- **Validierung:** Angular Reactive Forms (`FormGroup`/`FormControl` mit `Validators`), kein Template-driven-Forms-Ansatz projektweit (Konsistenz mit `.claude/agents/frontend.md`, sofern dort abweichend nicht anders vorgegeben — diese Spec setzt nur das visuelle/strukturelle Muster, nicht die konkrete API-Wahl der Rollen-Datei außer Kraft).
- **Fehlerdarstellung — verbindliches Muster für alle Screens:**
  1. Feld-Wrapper erhält einen Fehlerzustand (Modifier-Klasse, z. B. `.field.error` bzw. Angular-Bindung `[class.p-invalid]`/`ng-invalid`), der die Rahmenfarbe des Eingabeelements auf `color.error` ändert.
  2. **Zusätzlich** zur roten Umrandung erscheint direkt unter dem Feld ein Fehlertext **mit vorangestelltem Warn-Icon**, beides in `color.error` — die Umrandung allein ist nicht ausreichend (Wireframe-Kommentar, deckt sich mit `ux-ui.md §3`, Barrierefreiheit: Farbe ist nie das einzige Signal).
  3. Fehlertext ist ein vollständiger, verständlicher deutscher Satz (z. B. „Bitte eine gültige E-Mail-Adresse eingeben."), keine Kurzform wie „Ungültig".
  4. Der Fehlertext ist über `aria-describedby` mit dem Eingabeelement verknüpft, das Eingabeelement erhält `aria-invalid="true"` im Fehlerzustand.
- **Fokuszustand:** Fokus-Ring produktweit einheitlich in `color.attention` (`:focus-visible { outline: 2px solid var(--app-attention); outline-offset: 2px; }`) — dieselbe Farbe wie das Attention-Badge, da beide „hier ist gerade Aufmerksamkeit nötig/vorhanden" signalisieren.
- **Wiederverwendbares Angular-Artefakt:** ein gemeinsames `SharedFormFieldComponent` (oder vergleichbare Directive) kapselt Label-Verknüpfung, Fehlerblock-Rendering und ARIA-Attribute, damit kein Screen dieses Muster manuell nachbaut.

## 3. UI States & Event Handling

Generische, wiederverwendbare State-Bausteine — jeder Fach-Screen referenziert diese Bibliothek, statt eigene Lade-/Fehler-/Leer-Darstellungen zu erfinden. Das Wireframe selbst zeigt keine Loading-/Empty-/Toast-Beispiele explizit; die folgenden Muster sind aus den vorhandenen Tokens (Farbpalette, Radius, Typografie) abgeleitet und **müssen** dieselben Tokens verwenden wie alle anderen Bausteine dieser Spec.

- **Skeleton-Loading:** `<p-skeleton>` in `color.surface-hover` auf `color.surface`-Hintergrund, `radius.md`, für Karten-, Listen- und Tabellenzeilen-Platzhalter. Ersetzt Inhalte 1:1 in Form und Größe (kein Spinner-Overlay als Standardfall) — reduziert Layout-Sprung beim Nachladen.
- **Toast-Varianten:** `<p-toast>` mit `severity`-Mapping auf die Palette aus §1.2: `success` → `color.success`, `error`/`destruktive Bestätigung` → `color.error`, `warn`/„braucht Aufmerksamkeit" → `color.attention`, `info` → `color.text-muted`-Akzent auf `color.surface`. Konsistente Positionierung (top-right, Standard-PrimeNG) über alle Screens.
- **Empty-State-Baustein:** zentrierter Block innerhalb eines `<p-card>`- oder Panel-Containers, bestehend aus kurzer `color.text-muted`-Meldung + optionaler Primär-Aktion (`.btn-primary`-Muster aus §1.3). Kein eigenes Icon-Set vorgegeben durch das Wireframe — Folge-Specs entscheiden screen-spezifisch, ob ein Icon ergänzt wird, behalten aber Typografie- und Farbmuster bei.
- **Fehler-Baustein (Inline, außerhalb von Formularfeldern):** gleiche visuelle Sprache wie Formularfehler (§2) — `color.error`-Text mit vorangestelltem Warn-Icon, keine reine Farbumrandung. Für ganzseitige Fehler (z. B. API nicht erreichbar) wird derselbe Baustein in einem zentrierten Panel verwendet, ergänzt um eine Wiederholen-Aktion im `.btn-secondary`-Muster.
- **Attention-Baustein (`.attention`):** wiederverwendbares Element für „braucht Aufmerksamkeit"-Hinweise (z. B. „8 unbewertet · deine Sicht") — Punkt + Text auf `color.attention-bg`, Rahmen `rgba(attention, 0.35)`. Wird kontextabhängig mit dynamischem Zähler/Text befüllt, Struktur und Farbe bleiben screen-übergreifend identisch.
- **Perspektiven-Radar als State-Träger:** Die drei Ring-Zustände aus §1.3 (`vollständig bewertet` = durchgezogener Ring mit Rollenfarbe bei 100% `stroke-dasharray`, `teilweise bewertet` = durchgezogener Ring mit anteiligem `stroke-dashoffset`, `Rolle nicht besetzt` = gestrichelter Ring in `color.text-faint`, kein Fortschrittswert) sind der verbindliche State-Ausdruck für Bewertungsfortschritt — jeder Screen, der Bewertungsstatus je Rolle zeigt (Stakeholder-Liste, Stakeholder-Map-Legende F3.2), nutzt exakt diese drei Zustände derselben Komponente, keine abweichende Fortschrittsdarstellung (z. B. kein Prozent-Balken als Ersatz).
- **Event-Handling-Grundsatz:** Zustandswechsel (Laden → Inhalt/Leer/Fehler) werden als diskrete, exklusive Zustände eines Screens modelliert (z. B. über ein `ViewState`-Union-Type oder vergleichbares Muster gemäß `.claude/agents/frontend.md`), nicht als kombinierbare Boolean-Flags — verhindert widersprüchliche gleichzeitige Darstellung von Skeleton und Empty-State.

## 4. Acceptance Criteria (DoD)

- [ ] Alle Farbwerte, die in Fach-Screens verwendet werden, stammen ausschließlich aus der Token-Tabelle in §1.2 — kein Screen enthält einen hartkodierten Hex-Code.
- [ ] Alle Radius- und Abstandswerte stammen ausschließlich aus der Token-Tabelle in §1.2 bzw. aus PrimeFlex-Utility-Klassen — kein Screen enthält einen hartkodierten `px`-Wert für Radius oder Gap/Margin/Padding.
- [ ] Das PrimeNG-Custom-Preset (bzw. `definePreset`-Override) ist zentral an einer Stelle definiert und wird von allen Screens importiert; kein Screen überschreibt Theme-Variablen lokal.
- [ ] Rollenfarben (PL `#8B7CF6`, Coreteam `#2DD4BF`, Architect `#38BDF8`) sind zentral als Tokens definiert und werden **identisch** (gleicher Hex-Wert, gleiche Verwendung als Badge-/Ring-/Punktfarbe) in Stakeholder-Liste, Stakeholder-Detail-Tabs, Stakeholder-Map und Perspektiven-Radar verwendet — keine abweichende oder screen-lokal neu gemischte Rollenfarbe.
- [ ] Die Rolle „User" führt in keinem Screen einen eigenen Rollen-Badge; UI-seitig werden ihr Assessment-Tabs, Map und Verteiler vollständig ausgeblendet (nicht nur deaktiviert), konsistent mit PRD 4.3 Punkt 4 und der serverseitigen Durchsetzung.
- [ ] Die Attention-Farbe (`#F2A93B`) wird ausschließlich für „braucht Aufmerksamkeit"-Signale und den Fokus-Ring verwendet — in keinem Screen für allgemeine Links, Primär-Buttons oder dekorative Akzente.
- [ ] Die Perspektiven-Radar-Komponente ist als einzige, gemeinsam genutzte Angular-Komponente implementiert und wird unverändert (keine Kopie, keine Teil-Neuimplementierung) sowohl in der Stakeholder-Liste als auch in der Stakeholder-Map-Legende (F3.2) eingebunden.
- [ ] Alle Formularfelder in allen Screens folgen dem in §2 definierten Muster: verknüpftes `<label>`, Fehlerdarstellung durch Rahmenfarbe **und** Icon **und** Text gemeinsam, `aria-invalid`/`aria-describedby` gesetzt.
- [ ] Alle Toasts, Skeletons, Empty- und Fehler-Zustände in allen Screens nutzen die in §3 definierten gemeinsamen Bausteine bzw. `severity`-Mappings — kein Screen definiert eine eigene Lade-/Fehler-/Leer-Darstellung.
- [ ] Typografie ist konsistent: Space Grotesk ausschließlich für Display-/Titel-Text, IBM Plex Sans für Fließtext/UI-Elemente, IBM Plex Mono ausschließlich für Zahlen/Zeitstempel — kein Screen mischt diese Zuordnung.
- [ ] **WCAG 2.1 AA — Kontrastprüfung:** Für jede Kombination aus Textfarbe und ihrem vorgesehenen Hintergrund aus §1.2 ist ein Kontrastverhältnis von mindestens 4.5:1 (Fließtext) bzw. 3:1 (großformatiger/Display-Text ab 24px bzw. 19px fett) nachgewiesen und dokumentiert — insbesondere:
  - `color.attention` (`#F2A93B`) auf `color.background`/`color.surface` (Attention-Text/-Badges, Fokus-Ring-Sichtbarkeit),
  - alle drei Rollenfarben (`#8B7CF6`, `#2DD4BF`, `#38BDF8`) auf ihrem jeweiligen Badge-Hintergrund (16%-Opazitätsfläche) sowie als Ring-/Punktfarbe auf `color.background`/`color.surface`,
  - `color.text-muted` (`#8D97AC`) auf `color.background` und `color.surface` (bereits im Wireframe als „AA-Kontrast geprüft" vermerkt — bei jeder Preset-Anpassung erneut zu verifizieren),
  - `color.error` (`#F87171`) auf `color.surface` (Formularfehlertext).
  - Wo ein Nachweis fehlschlägt, wird die betroffene Farbe **vor** Verwendung in einem Fach-Screen angepasst (Rückmeldung an UX/UI gemäß CLAUDE.md Abschnitt 6) statt unverändert übernommen.
- [ ] Der Fokus-Ring (`:focus-visible`, 2px `color.attention`, 2px Offset) ist auf allen interaktiven Elementen (Buttons, Tabs, Links, Formularfelder, Karten mit Klick-Handler) einheitlich sichtbar und wird durch kein Screen-lokales Styling überschrieben oder entfernt.
- [ ] Diese Spec-Datei wird von jeder Feature-Spec (Login, Projektübersicht, Stakeholder-Liste, Stakeholder-Map, Verteiler, Stakeholder-Detail, Admin) explizit referenziert, statt Tokens oder Bausteine dort erneut zu definieren.
