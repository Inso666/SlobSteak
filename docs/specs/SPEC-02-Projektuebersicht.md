# SPEC: Projektübersicht (Screen S2)

> Quelle: `Main.dc.html`, `States.dc.html`, `Mobile.dc.html` (Design-Canvas-Wireframes) + Designer-Notizen.
> Zielordner (Angular): `frontend/src/app/features/projects/project-overview/`
> Persona: Petra (System-Admin + projektbezogene Rollen je Projekt). Hauptscreen nach Login.
> Sprache: Deutsch. Terminologie 1:1 aus dem Wireframe übernehmen (siehe Textbausteine je Element unten).

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Grundsatz zur Komponentenwahl

- Rollen-Radar-Ringe (drei kleine Ring-Gauges „PL/CT/AR" mit Prozentwert unter jeder Projektkarte) haben **keine 1:1-Entsprechung** in PrimeNG. `p-knob` ist ein interaktives Input-Control (Slider-Semantik) und für eine rein lesende Mehrfach-Anzeige pro Karte ungeeignet. → wird als **Custom-Komponente** `app-role-progress-ring` (reines SVG, `role="img"`, kein PrimeNG-Wrapper) umgesetzt und im Baum entsprechend gekennzeichnet.
- Alle übrigen Elemente werden strikt auf PrimeNG/PrimeFlex gemappt (siehe Baum).
- Card-Wireframe-Markup ist ein `<a>`-Tag (echter Link, kein Klick-Handler auf `<div>`) — `p-card` wird daher **innerhalb** eines `routerLink`-Ankers verwendet, nicht umgekehrt, damit native Link-Semantik (Mittelklick, Strg+Klick, Statuszeile) erhalten bleibt.

### 1.2 Component Tree (Desktop, ≥1024px)

```
<app-project-overview-page>                          <!-- Smart Component / Route: /projects -->
  <app-project-sidebar aria-label="Hauptnavigation">  <!-- Desktop: statische <aside>, KEIN p-drawer -->
    <div class="brand">
      <app-brand-logo aria-hidden="true" />           <!-- statisches SVG-Icon, Custom -->
      <span class="display">SlobSteak</span>
    </div>
    <nav role="navigation" aria-label="Hauptnavigation">
      <a routerLink="/projects" class="nav-item active" aria-current="page">
        <i class="pi pi-th-large" aria-hidden="true"></i> Projektübersicht
      </a>
      <a routerLink="/admin" class="nav-item" *ngIf="isAdmin">
        <i class="pi pi-shield" aria-hidden="true"></i> Admin-Bereich
      </a>
    </nav>
    <div class="user-card">
      <p-avatar label="PZ" shape="circle" [style]="{width:'34px',height:'34px'}" />
      <div class="user-meta">
        <span class="user-name">{{ currentUser.name }}</span>       <!-- „Petra Ziegler" -->
        <span class="user-role">{{ currentUser.roleLabel }}</span>  <!-- „System-Admin" -->
      </div>
      <button pButton pRipple text class="logout-row" (click)="onLogout()">
        <i class="pi pi-sign-out" aria-hidden="true"></i> Abmelden
      </button>
    </div>
  </app-project-sidebar>

  <main class="main-content">
    <div class="topbar flex align-items-center justify-content-between">
      <h1 class="page-title display">Projektübersicht</h1>
      <p-button label="Neues Projekt" icon="pi pi-plus"
                *ngIf="isAdmin"
                (onClick)="onCreateProject()" />
      <!-- Rollenregel 1.4: nicht-Admin sieht diesen Button NICHT (ausgeblendet) -->
    </div>

    <div class="toolbar flex align-items-center justify-content-between">
      <p-tabs [value]="activeTab" (valueChange)="onTabChange($event)"
              aria-label="Projektbereich">
        <p-tablist>
          <p-tab value="mine">Meine Projekte <span class="count mono">{{ myProjectsCount }}</span></p-tab>
          <p-tab value="all">Alle Projekte <span class="count mono">{{ allProjectsCount }}</span></p-tab>
        </p-tablist>
      </p-tabs>

      <div class="search-sort flex align-items-center gap-3">
        <p-iconfield>
          <p-inputicon class="pi pi-search" />
          <label for="project-search" class="sr-only">Projekte durchsuchen</label>
          <input pInputText id="project-search" type="text"
                 placeholder="Projekte durchsuchen…"
                 [formControl]="filterForm.controls.search" />
        </p-iconfield>

        <label for="project-sort" class="sr-only">Sortierung</label>
        <p-select id="project-sort"
                  [options]="sortOptions"
                  optionLabel="label" optionValue="value"
                  [formControl]="filterForm.controls.sortBy"
                  ariaLabel="Sortierung" />
        <!-- Wireframe zeigt nur den aktiven Sortwert „Zuletzt aktualisiert" (Dropdown nicht
             geöffnet dargestellt) — weitere Optionswerte sind im Wireframe nicht sichtbar
             und daher nicht spezifiziert; Default-Value = „Zuletzt aktualisiert". -->
      </div>
    </div>

    <!-- ============ Zustands-Switch ============ -->
    <div class="grid-region" [ngSwitch]="viewState">

      <!-- LOADING -->
      <div *ngSwitchCase="'loading'" class="grid" aria-busy="true">
        <span class="sr-only" role="status">Projekte werden geladen</span>
        <app-project-card-skeleton *ngFor="let i of skeletonPlaceholders" />
      </div>

      <!-- EMPTY -->
      <app-empty-state *ngSwitchCase="'empty'"
        icon="pi pi-sitemap"
        heading="Noch keine Projekte zugewiesen"
        text="Ein Admin weist dich einem Projekt zu, sobald eines für dich vorgesehen ist."
        [showCta]="isAdmin"
        ctaLabel="Erstes Projekt anlegen"
        (ctaClick)="onCreateProject()" />

      <!-- ERROR -->
      <app-error-state *ngSwitchCase="'error'"
        heading="Projekte konnten nicht geladen werden"
        text="Die Verbindung zum Server ist fehlgeschlagen. Bitte versuche es erneut."
        (retry)="onRetry()" />

      <!-- SUCCESS -->
      <div *ngSwitchCase="'success'" class="grid" role="list" aria-label="Projekte">
        <a *ngFor="let project of filteredProjects"
           [routerLink]="['/projects', project.id]"
           class="card" [class.archived]="project.archived"
           role="listitem"
           [attr.aria-label]="'Projekt ' + project.name + ' öffnen'">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-head flex justify-content-between">
                <h2 class="card-title display">{{ project.name }}</h2>
                <p-tag *ngIf="project.archived" value="Archiviert" severity="secondary" />
              </div>
            </ng-template>

            <div class="role-row flex align-items-center gap-2">
              <span class="role-label">Meine Rolle</span>
              <p-tag [value]="project.myRoleLabel"
                     [class]="'role-badge role-' + project.myRoleCode" />
              <!-- Farbklassen role-pl/role-ct/role-ar mappen auf --role-pl/--role-ct/--role-ar -->
            </div>

            <div class="stat-row flex align-items-baseline gap-2">
              <span class="stat-num mono">{{ project.stakeholderCount }}</span>
              <span class="stat-label">Stakeholder</span>
            </div>

            <div class="radar-row" aria-label="Bewertungsstand je Rolle"
                 *ngIf="!project.archived">
              <app-role-progress-ring *ngFor="let r of project.roleProgress"
                [roleCode]="r.roleCode" [roleLabel]="r.roleLabel"
                [percent]="r.percent" />
              <!-- Custom-Komponente (kein PrimeNG-Äquivalent), siehe 1.1.
                   percent = null → gestrichelter Ring + „n/a" (Rolle nicht besetzt) -->
            </div>

            <p-tag *ngIf="project.unassessedCount > 0 && !project.archived"
                   class="attention" severity="warn"
                   [value]="project.unassessedCount + ' unbewertet · deine Sicht'" />

            <ng-template pTemplate="footer">
              <div class="card-footer flex align-items-center justify-content-between">
                <span class="meta mono">Aktualisiert vor {{ project.updatedRelative }}</span>
                <i class="pi pi-chevron-right open-affordance" aria-hidden="true"></i>
              </div>
            </ng-template>
          </p-card>
        </a>
      </div>
    </div>
  </main>
</app-project-overview-page>

<p-toast /> <!-- global, für Fehl-Feedback bei Folgeaktionen (z. B. fehlgeschlagenes Retry) -->
```

### 1.3 Component Tree — Delta Mobile (<960px Sidebar, <1024px Grid)

```
<app-project-overview-page>
  <div class="appbar flex align-items-center justify-content-between">
    <div class="appbar-left flex align-items-center gap-2">
      <p-button icon="pi pi-bars" text ariaLabel="Menü öffnen"
                (onClick)="mobileDrawerOpen = true" />
      <app-brand-logo aria-hidden="true" />
      <span class="brand-name display">SlobSteak</span>
    </div>
    <p-avatar label="PZ" shape="circle" [style]="{width:'28px',height:'28px'}" />
  </div>

  <p-drawer [(visible)]="mobileDrawerOpen" position="left"
            ariaLabel="Hauptnavigation">
    <!-- identischer Navigations-/User-Inhalt wie app-project-sidebar (1.2),
         als eingebettetes Template wiederverwendet -->
    <ng-container *ngTemplateOutlet="sidebarContent" />
  </p-drawer>

  <div class="content flex flex-column gap-3">
    <h1 class="page-title display">Projektübersicht</h1>

    <p-tabs [value]="activeTab" (valueChange)="onTabChange($event)" aria-label="Projektbereich">
      <p-tablist>
        <p-tab value="mine">Meine <span class="count mono">{{ myProjectsCount }}</span></p-tab>
        <p-tab value="all">Alle <span class="count mono">{{ allProjectsCount }}</span></p-tab>
      </p-tablist>
    </p-tabs>
    <!-- Label-Kürzung „Meine"/„Alle" statt „Meine Projekte"/„Alle Projekte" ist ein reiner
         Darstellungs-Unterschied unterhalb 1024px, gleicher activeTab-Wert/Zustand. -->

    <p-iconfield>
      <p-inputicon class="pi pi-search" />
      <label for="m-search" class="sr-only">Projekte durchsuchen</label>
      <input pInputText id="m-search" type="text" placeholder="Projekte durchsuchen…"
             [formControl]="filterForm.controls.search" class="w-full" />
    </p-iconfield>
    <!-- Sortierung (p-select) bleibt im Wireframe „Mobile" unsichtbar unterhalb des
         Suchfelds nicht dargestellt — Control bleibt funktional erhalten, Platzierung
         analog Desktop unter/neben der Suche, volle Breite (w-full). -->

    <p-button label="Neues Projekt" icon="pi pi-plus" styleClass="w-full"
              *ngIf="isAdmin" (onClick)="onCreateProject()" />

    <!-- Karten wie 1.2 „SUCCESS", aber: 1-spaltige Liste, KEIN app-role-progress-ring
         (Radar entfällt zugunsten Kennzahl + Hinweis-Badge, siehe Designer-Notiz),
         „Meine Rolle"-Badge und „Stakeholder"-Kennzahl + „Aktualisiert vor…" bleiben. -->
  </div>
</app-project-overview-page>
```

### 1.4 Layout & Styling (PrimeFlex / CSS-Variablen)

- Grid der Projektkarten: `<div class="grid">` mit Karten-Wrapper `class="col-12 lg:col-4"` (3-spaltig ab „lg"). Keine Pixelwerte, keine Hex-Farben aus dem Wireframe übernehmen — stattdessen:
  - Hintergrund Karte/Panel: `background: var(--surface-card)`
  - Rahmen: `border: 1px solid var(--surface-border)`
  - Primärtext: `color: var(--text-color)`, sekundär: `color: var(--text-color-secondary)`
  - Akzent/Hinweis (Attention-Badge, Fokusring): `var(--primary-color)` bzw. dediziertes `--attn`-Custom-Token im Theme, falls das Warn-Gelb nicht 1:1 einem PrimeNG-Severity-Token entspricht — als Theme-Extension in `styles.scss` dokumentieren, nicht hartkodieren.
  - Rollenfarben (PL/CT/AR) sind **projektspezifische Fachfarben**, keine PrimeNG-Severities — als CSS-Custom-Properties `--role-pl`, `--role-ct`, `--role-ar` im Theme definieren (analog Wireframe-`:root`-Werten, aber als benannte Design-Tokens statt Hex im Component-CSS).
- **Breakpoint-Diskrepanz zu PrimeFlex-Defaults:** Die geforderten Schwellen (Sidebar→Drawer bei <960px, Grid 3→1-spaltig bei <1024px) decken sich nicht exakt mit PrimeFlex-Standardbreakpoints (`md:768px`, `lg:992px`). Zwei zulässige Umsetzungen, hier verbindlich Variante A:
  - **(A, verbindlich)** Angular CDK `BreakpointObserver` mit exakten Custom-Queries `(max-width: 959px)` (Sidebar/Drawer-Umschaltung) und `(max-width: 1023px)` (Grid-Spaltenumschaltung) steuert zwei Boolean-Signale (`isMobileNav`, `isCompactGrid`), die per `[class.lg:col-4]`/`*ngIf` statt der PrimeFlex-`lg:`-Utility direkt angewendet werden.
  - (B, Alternative, hier nicht verwendet) PrimeFlex-SCSS-Variable `lg` global auf `1024px` umkonfigurieren — abgelehnt, da das den globalen PrimeFlex-Breakpoint für die gesamte App verschieben würde.
- Abstände durchgängig über PrimeFlex-Gap-Utilities (`gap-2`, `gap-3`, gemäß Wireframe-Rhythmus 8px/12px/16px/20px ≈ `gap-2`/`gap-3`/`gap-4`/`gap-5`), keine fixen `px`-Margins in Component-Styles.
- Fokus sichtbar: globales `:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }` — keine individuelle Button-/Link-Overrides, die den Ring entfernen.

---

## 2. Forms, Directives & Validation

Das Wireframe enthält **kein** sichtbares Formular für „Neues Projekt anlegen" (nur ein Button ohne Dialog/Formularfelder in `Main.dc.html`/`Mobile.dc.html`) — der Klick löst laut Annahme eine reine Navigation aus (siehe 3, Event-Handling), kein `FormGroup` für diesen Screen nötig. Formular-Pflicht besteht ausschließlich für **Suche** und **Sortierung**.

### 2.1 Reactive Form: `filterForm`

```ts
filterForm = new FormGroup({
  search: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.maxLength(120)],
  }),
  sortBy: new FormControl<SortOption>('lastUpdated', {
    nonNullable: true,
    validators: [Validators.required],
  }),
});
```

| FormControl | Validator | Trigger | Deutsche Fehlermeldung |
|---|---|---|---|
| `search` | `Validators.maxLength(120)` | Live (`valueChanges`, debounced) | „Suchbegriff darf maximal 120 Zeichen umfassen." |
| `sortBy` | `Validators.required` | Immer vorbelegt (`'lastUpdated'`), Control kann durch Nutzer:in nicht auf leer gesetzt werden (Select erzwingt Auswahl) | „Bitte eine Sortierung auswählen." (nur defensiv, im Normalfall nicht erreichbar) |

- `search` ist **kein** Pflichtfeld (leer = kein Filter, zeigt alle Projekte des aktiven Tabs).
- `search.valueChanges` wird mit `debounceTime(300), distinctUntilChanged()` verkettet, bevor eine Neufilterung/ein Request ausgelöst wird — kein Request pro Tastenanschlag.
- `sortBy` ändert sich sofort bei Auswahl (`p-select` `onChange`), kein Debounce nötig.
- `activeTab` (Meine/Alle) ist **kein** FormControl, sondern ein Component-State (`activeTab: 'mine' | 'all'`), da `p-tabs` kein Formularfeld im fachlichen Sinn ist.

### 2.2 Directives

- `formControlName`/`[formControl]` auf Such- und Sortierfeld (Standalone-Component-Import: `ReactiveFormsModule`).
- `pInputText` auf dem nativen `<input>` in `p-iconfield`.
- `routerLink` auf Sidebar-Navigationseinträgen und auf jeder Projektkarte (nicht `(click)` + `router.navigate`, da die Karte im Wireframe ein echtes `<a>` ist — native Link-Semantik muss erhalten bleiben, siehe 1.1).
- `pRipple` auf klickbaren Flächen (Buttons, Karten, Logout-Zeile) für Feedback, konsistent mit PrimeNG-Standardinteraktion.
- `pTooltip` optional auf `.card-title`, falls Projektname überläuft (nicht im Wireframe sichtbar, aber notwendig für lange Namen bei fixer Kartenbreite — defensiv ergänzen, kein neues sichtbares Element, nur Overflow-Fallback).
- Echtes `<label for>` für **jedes** Formularfeld: Such-Label (`sr-only`, Text „Projekte durchsuchen") und Sortierungs-Label (`sr-only`, Text „Sortierung") — beide sichtbar nur für Screenreader, exakt wie im Wireframe (`class="sr-only"` + `label[for]`).

---

## 3. UI States & Event Handling

### 3.1 Initial-/Default-Zustand

- Beim Mount ist die statische Chrome sofort sichtbar: Sidebar (Nav + User-Card), Topbar-Titel „Projektübersicht", Toolbar (Tabs, Suche, Sortierung).
- Default-Werte: `activeTab = 'mine'` (Tab „Meine Projekte" aktiv, `aria-selected="true"`), `filterForm.search = ''`, `filterForm.sortBy = 'lastUpdated'` (Anzeige „Zuletzt aktualisiert").
- `viewState` startet als `'loading'` — es gibt **keinen** sichtbaren Zwischenzustand ohne Ladeindikator; der erste Request wird in `ngOnInit` sofort ausgelöst.
- „Neues Projekt"-Button ist nur bei `isAdmin === true` im DOM vorhanden (siehe 3.6 Rollenregel).

### 3.2 Loading-Zustand

- Auslöser: initiales Mount, Tab-Wechsel, Debounce-Fire der Suche, Änderung der Sortierung, Klick auf „Erneut versuchen".
- Grid-Container erhält `aria-busy="true"`.
- Versteckte Live-Region: `<span class="sr-only" role="status">Projekte werden geladen</span>` — wird bei jedem erneuten Laden neu in den DOM eingefügt bzw. ihr Text aktualisiert, damit Screenreader erneut informiert werden.
- Darstellung: 4 `app-project-card-skeleton`-Platzhalter im selben Grid-Layout wie die echten Karten (Titel-Balken, zwei sekundäre Balken je Skeleton), realisiert über `p-skeleton` (Höhen/Breiten gemäß Wireframe: Titel breit, zwei schmalere Zeilen darunter).

### 3.3 Empty-Zustand (zwei Rollen-Varianten)

Beide Varianten teilen Icon, Überschrift „Noch keine Projekte zugewiesen" und Text „Ein Admin weist dich einem Projekt zu, sobald eines für dich vorgesehen ist."

| Variante | Bedingung | CTA-Button |
|---|---|---|
| Nicht-Admin | `isAdmin === false` | **AUSGEBLENDET** (kein Button im DOM, nicht nur deaktiviert) — exakt wie in `States.dc.html` dargestellt. |
| Admin | `isAdmin === true` | **SICHTBAR**: `p-button` „Erstes Projekt anlegen" (Label laut Designer-Notiz; visuell nicht im Wireframe gezeichnet, aus der Notiz „Leerzustand … Admin-Variante zusätzlich mit „Erstes Projekt anlegen"" übernommen). Klick löst dieselbe Aktion aus wie der Topbar-Button „Neues Projekt" (`onCreateProject()`). |

- `isAdmin` bezieht sich auf die globale Nutzerrolle (System-Admin, aus der Sidebar-User-Card), nicht auf eine projektlokale Rolle — da im leeren Zustand keine Projekte (und damit keine Projektrollen) existieren.
- Zeigt sich nur, wenn der aktuelle Tab (Meine/Alle) nach Filterung 0 Ergebnisse liefert **und** kein Suchbegriff aktiv ist. Ist ein Suchbegriff aktiv und liefert 0 Treffer, siehe 3.7 (Sonderfall, nicht im Wireframe abgebildet — siehe Anmerkung).

### 3.4 Error-Zustand

- Container mit `role="alert"`.
- Icon (Fehler-Variante, Warn-/Fehlerfarbe `var(--red-500)`/Theme-Error-Token statt Hex).
- Überschrift: „Projekte konnten nicht geladen werden".
- Text (handlungsleitend, keine Technik-Details, keine HTTP-Statuscodes/Stacktraces): „Die Verbindung zum Server ist fehlgeschlagen. Bitte versuche es erneut."
- Button „Erneut versuchen" (`p-button`, secondary/outlined) → `onRetry()` → identischer Request wie beim letzten fehlgeschlagenen Ladevorgang (gleicher Tab/Suchbegriff/Sortierung) → `viewState = 'loading'`.
- Schlägt auch der Retry fehl, bleibt `viewState = 'error'` (kein Toast nötig, da der Fehlerzustand selbst bereits sichtbares Feedback ist); `p-toast` ist für andere, nicht blockierende Folgefehler außerhalb dieses Zustandsmodells reserviert (z. B. Fehler bei einer Aktion, die den Grid-Zustand nicht verändert).

### 3.5 Success-Zustand

- Grid mit Projektkarten gemäß gefiltertem/sortiertem Ergebnis des aktiven Tabs.
- Jede Karte ist vollständig klickbar (gesamte `<a>`-Fläche, nicht nur Titel) → `routerLink` Navigation zu `/projects/{projectId}` (Projekt-Workspace, außerhalb dieses Screens).
- Archivierte Karte (`project.archived === true`): reduzierte Deckkraft (`opacity` via CSS-Klasse `.archived`, kein Hover-Transform), zeigt Tag „Archiviert", **keinen** Radar-Bereich und **keinen** Attention-Hinweis (wie in `Main.dc.html` Karte 5 abgebildet) — Navigation bleibt aktiv (kein Hinweis im Wireframe auf Deaktivierung).
- Attention-Badge („{n} unbewertet · deine Sicht") nur, wenn `unassessedCount > 0`; sonst nicht gerendert (kein leerer Platzhalter).
- Radar-Ringe: `percent === null` → gestrichelter Ring + Label „n/a" (Rolle im Projekt nicht besetzt, wie Karte 3 „AR" im Wireframe).

### 3.6 Event-Handling (Aktionen → Zustandswechsel/Service-Call)

| Auslöser | Aktion |
|---|---|
| Klick Sidebar-Nav-Item „Projektübersicht" / „Admin-Bereich" | `routerLink`-Navigation, kein Service-Call auf diesem Screen |
| Klick „Abmelden" | `AuthService.logout()` → Redirect zu Login-Route |
| Klick Tab „Meine Projekte"/„Alle Projekte" | `activeTab` setzen → `viewState = 'loading'` → `ProjectService.getProjects({ scope, search, sortBy })` |
| Eingabe Suchfeld (debounced 300 ms) | Filterwert übernehmen → `viewState = 'loading'` → Refetch/Refilter |
| Änderung Sortierung | `sortBy` übernehmen → `viewState = 'loading'` → Refetch/Resort |
| Klick „Neues Projekt" (Topbar/Mobile/Empty-CTA) | Navigation zu Projekt-Anlage-Route (kein Formular auf diesem Screen, siehe 2) — Annahme dokumentiert, da Wireframe keinen Dialog zeigt |
| Klick Projektkarte | `routerLink` zu `/projects/{id}` (Projekt-Workspace) |
| Klick Hamburger (Mobile, <960px) | `mobileDrawerOpen = true` → `p-drawer` öffnet sich |
| Klick „Erneut versuchen" (Error-Zustand) | Letzten Request wiederholen → `viewState = 'loading'` |

### 3.7 Rollenbasierte Sichtbarkeit — Zusammenfassung

| Element | Nicht-Admin | Admin |
|---|---|---|
| Topbar-Button „Neues Projekt" | AUSGEBLENDET | SICHTBAR |
| Empty-State-CTA „Erstes Projekt anlegen" | AUSGEBLENDET | SICHTBAR |
| Sidebar-Nav „Admin-Bereich" | AUSGEBLENDET | SICHTBAR |

Alle drei Fälle sind laut Designer-Notiz „zeigt keinen CTA" konsequent als **Ausblenden**, nicht als „sichtbar, aber deaktiviert" umzusetzen — keine `disabled`-Buttons mit Hinweistext für diese Fälle.

> Anmerkung: Ein „0 Treffer bei aktiver Suche"-Zustand (Empty-State-Variante mit anderem Text, z. B. „Keine Projekte gefunden") ist in keiner der drei Quelldateien abgebildet und daher **nicht Teil dieser Spec** — bei Bedarf als separate Klärung/Story nachreichen (CLAUDE.md Abschnitt 6), nicht stillschweigend ergänzen.

### 3.8 Barrierefreiheit (WCAG 2.1 AA)

- **Tab-Reihenfolge (verbindlich, weicht von der visuellen DOM-Reihenfolge ab):** Sidebar → Suche → Sortierung → Tabs → „Neues Projekt" → Karten. Da Topbar (Titel + Button) und Toolbar (Tabs + Suche/Sortierung) im Wireframe visuell in anderer Reihenfolge übereinander liegen, muss die fokussierbare Reihenfolge **explizit** über `tabindex`-Sequenzierung (oder DOM-Umstrukturierung bei visuell unveränderter Darstellung via CSS `order`/Grid-Platzierung) hergestellt werden — sie ergibt sich nicht automatisch aus der visuellen Anordnung. Dies ist im Component-Template durch geordnete `tabindex`-Werte (oder eine Umsortierung der Template-Blöcke bei gleichbleibendem visuellem Layout) sicherzustellen und im Rahmen der Story mit einem Tastatur-Walkthrough zu verifizieren.
- `aria-busy="true"` auf dem Grid-Container während `viewState === 'loading'`.
- `role="status"` (Live-Region, `sr-only`) mit Text „Projekte werden geladen" während des Ladens.
- `role="alert"` auf dem Error-Container.
- `role="list"` / `role="listitem"` auf Grid und Karten (Karten sind `<a>`, kein `<li>` — Wireframe-Konvention übernehmen).
- Radar-Bereich: `aria-label="Bewertungsstand je Rolle"` auf dem Container; jede `app-role-progress-ring` liefert einen textuellen Wert (Rollen-Kürzel + Prozent bzw. „n/a") für Screenreader, nicht nur visuelle SVG-Balken.
- Alle Icons dekorativ (`aria-hidden="true"`), sichtbarer Text/`aria-label` trägt die Information.
- Sichtbarer Fokusring (`:focus-visible`) auf allen interaktiven Elementen, kein `outline:none` ohne Ersatz.
- Echtes `<label for>` auf Such- und Sortierfeld (siehe 2.2).

---

## 4. Acceptance Criteria (DoD)

- [ ] Component Tree exakt gemäß Abschnitt 1 umgesetzt (Selectors `app-project-overview-page`, `app-project-sidebar`, `app-role-progress-ring`, `app-project-card-skeleton`, `app-empty-state`, `app-error-state` vorhanden und in der beschriebenen Verschachtelung verwendet).
- [ ] Radar-Ringe als Custom-Komponente (`app-role-progress-ring`, SVG-basiert) umgesetzt — **nicht** mit `p-knob` erzwungen.
- [ ] `filterForm` (Reactive Forms) mit `search`- und `sortBy`-Control inkl. der in Abschnitt 2.1 gelisteten Validatoren und deutschen Fehlermeldungen implementiert; Suche debounced (300 ms, `distinctUntilChanged`).
- [ ] Alle fünf Screen-Zustände (Initial/Default, Loading, Empty [Admin- und Nicht-Admin-Variante], Error, Success) sind implementiert und über `viewState` steuerbar/testbar.
- [ ] Loading-Zustand: `aria-busy="true"` + `role="status"`-Live-Region mit Text „Projekte werden geladen" vorhanden und verifiziert (z. B. Screenreader- oder axe-Test).
- [ ] Empty-Zustand zeigt den CTA „Erstes Projekt anlegen" ausschließlich für Admin-Rolle; bei Nicht-Admin ist der Button nicht im DOM vorhanden (kein `disabled`-Zustand).
- [ ] Error-Zustand-Text ist handlungsleitend und enthält keine technischen Details (kein HTTP-Status, kein Stacktrace) — Wortlaut exakt „Projekte konnten nicht geladen werden" / „Die Verbindung zum Server ist fehlgeschlagen. Bitte versuche es erneut." / „Erneut versuchen".
- [ ] Tab-Reihenfolge Sidebar → Suche → Sortierung → Tabs → „Neues Projekt" → Karten ist per Tastatur (Tab-Taste, ohne Maus) nachvollziehbar verifiziert.
- [ ] Responsive-Verhalten: Sidebar → `p-drawer` unterhalb 960px (Hamburger-Trigger oben links), Grid 3-spaltig → 1-spaltige Liste unterhalb 1024px, jeweils per `BreakpointObserver` mit exakten Custom-Queries (siehe 1.4) — keine Abweichung auf PrimeFlex-Default-Breakpoints ohne Dokumentation.
- [ ] Radar-Bereich entfällt auf Mobile-Karten (<1024px) zugunsten von Stakeholder-Kennzahl + Attention-Badge, wie in `Mobile.dc.html` dargestellt.
- [ ] Tab-Labels sind auf Mobile gekürzt („Meine"/„Alle" statt „Meine Projekte"/„Alle Projekte"), gleicher `activeTab`-Zustand dahinter.
- [ ] Keine hartkodierten Hexfarben oder Pixel-Breakpoints im Component-CSS außerhalb der dokumentierten `BreakpointObserver`-Queries; ausschließlich PrimeFlex-Utility-Klassen und PrimeNG-CSS-Variablen (`var(--surface-card)`, `var(--surface-border)`, `var(--text-color)`, `var(--text-color-secondary)`, `var(--primary-color)`) sowie themedefinierte Rollenfarb-Tokens (`--role-pl`, `--role-ct`, `--role-ar`).
- [ ] Alle Formularfelder besitzen ein echtes `<label for>` (auch wenn visuell `sr-only`).
- [ ] Sichtbarer Fokusring auf allen interaktiven Elementen (Links, Buttons, Formularfelder, Tabs) verifiziert.
- [ ] Projektkarten sind native `<a routerLink>`-Elemente (kein `(click)`-Handler auf `<div>`), inkl. `aria-label` „Projekt {Name} öffnen" analog Wireframe.
- [ ] Deutsche UI-Texte stimmen wortgleich mit den in Abschnitt 3 zitierten Wireframe-Texten überein.
