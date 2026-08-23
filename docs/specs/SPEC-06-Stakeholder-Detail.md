# SPEC: Stakeholder-Detail inkl. Assessment-Tabs

> Screen-Referenz: S4 (Wireframes `Detail.dc.html`, `DetailStates.dc.html`) · Feature-Referenz: F1.2 (Stakeholder-Stammdaten), F2 / F2.1 (Perspektivisches Assessment inkl. Randfälle) · PRD 6.3 (projektbezogene Sub-Navigation), PRD 4.3 Punkt 4 (rollenbasierte Sichtbarkeit Assessment)
>
> Vermutete Ordnerstruktur (nicht bindend, nur Orientierung):
> `frontend/src/app/features/stakeholders/stakeholder-detail/`
> `frontend/src/app/features/assessments/assessment-tabs/`
> `frontend/src/app/features/assessments/assessment-conflict-dialog/`

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Layout-Grundstruktur

Der Screen besteht aus einer Zwei-Spalten-Detailansicht innerhalb des bestehenden App-Shells (Sidebar + Main-Content). Diese Spec beschreibt den Inhalt von `stakeholder-detail.component.html`; die App-Shell (Sidebar/Header) wird hier nur so weit spezifiziert, wie sie in diesem Screen die projektbezogene Sub-Navigation zeigt.

```
<app-shell> (bestehend, nicht Teil dieser Story — nur Sub-Navigation-Zustand relevant)
  <aside class="app-sidebar" aria-label="Hauptnavigation">
    <p-menu [model]="primaryNavItems" styleClass="app-primary-nav"></p-menu>
    <!-- Projektbezogener Block: "ERP-Einführung Rewe" -->
    <div class="p-text-secondary p-text-uppercase project-label">{{ projectName }}</div>
    <p-menu [model]="projectSubNavItems" styleClass="app-project-subnav">
      <!-- Eintrag "Stakeholder-Liste" trägt CSS-Klasse "active" solange dieser Screen aktiv ist -->
    </p-menu>
    <!-- Eintrag "Admin-Bereich" separat, nur sichtbar wenn currentUser.role === 'Admin' -->
  </aside>
</app-shell>

<main class="stakeholder-detail p-p-5">

  <!-- Breadcrumb / Zurück-Link -->
  <a routerLink="/projects/{{projectId}}/stakeholders" class="detail-back-link">
    <i class="pi pi-chevron-left"></i> Zurück zur Stakeholder-Liste
  </a>

  <!-- Kopfzeile -->
  <header class="detail-head p-d-flex p-jc-between p-ai-start">
    <div class="detail-head-left">
      <div class="p-d-flex p-ai-center gap-2">
        <h1 class="detail-title">{{ stakeholder.name }}</h1>
        <p-tag [value]="stakeholder.typ" severity="secondary" styleClass="type-tag"></p-tag>
      </div>
      <span class="detail-org-line">{{ stakeholder.organisation }} · {{ stakeholder.position }}</span>
      <span class="detail-meta-line mono">Zuletzt geändert von {{ stakeholder.lastModifiedBy }} am {{ stakeholder.lastModifiedAt | date:'dd.MM.yyyy, HH:mm' }}</span>
    </div>
    <p-button
      label="Löschen"
      icon="pi pi-trash"
      severity="danger"
      [outlined]="true"
      (onClick)="onDeleteRequested()">
    </p-button>
  </header>

  <!-- Zwei-Spalten-Bereich -->
  <div class="detail-columns p-d-flex gap-4">

    <!-- LINKE SPALTE: Stammdaten + Kommunikationszuordnungen -->
    <section class="detail-col-left" [style.flex]="'0 0 620px'">

      <p-card header="Stammdaten" styleClass="detail-panel">
        <form [formGroup]="stammdatenForm" class="p-grid p-formgrid">
          <!-- siehe Abschnitt 2.1 für FormControls -->
          <div class="field p-col-6"><label for="f-name">Name</label><input pInputText id="f-name" formControlName="name" /></div>
          <div class="field p-col-6"><label for="f-typ">Typ</label>
            <p-dropdown id="f-typ" formControlName="typ" [options]="typOptions" optionLabel="label" optionValue="value"></p-dropdown>
          </div>
          <div class="field p-col-6"><label for="f-org">Organisation / Zugehörigkeit</label><input pInputText id="f-org" formControlName="organisation" /></div>
          <div class="field p-col-6"><label for="f-pos">Position / Funktion</label><input pInputText id="f-pos" formControlName="position" /></div>
          <div class="field p-col-6"><label for="f-mail">E-Mail</label><input pInputText id="f-mail" formControlName="email" /></div>
          <div class="field p-col-6"><label for="f-tel">Telefon</label><input pInputText id="f-tel" formControlName="telefon" /></div>
          <div class="field p-col-12"><label for="f-loc">Standort / Abteilung</label><input pInputText id="f-loc" formControlName="standort" /></div>
          <div class="field p-col-12"><label for="f-desc">Freitext-Beschreibung</label>
            <textarea pInputTextarea id="f-desc" formControlName="beschreibung" [autoResize]="true" rows="3"></textarea>
          </div>
        </form>
      </p-card>

      <p-card header="Kommunikationszuordnungen" styleClass="detail-panel">
        <div class="comm-list p-d-flex p-flex-column gap-2">
          <div class="comm-row p-d-flex p-ai-center gap-3" *ngFor="let comm of kommunikationszuordnungen">
            <i class="pi" [ngClass]="comm.icon"></i>
            <span class="comm-name p-text-bold">{{ comm.name }}</span>
            <span class="comm-meta p-text-secondary">{{ comm.frequenz }} · {{ comm.kanal }}</span>
          </div>
          <button
            type="button"
            class="add-comm-trigger p-d-flex p-ai-center gap-2"
            (click)="onAddKommunikationszuordnung()">
            <i class="pi pi-plus"></i> Kommunikationsart hinzufügen
          </button>
        </div>
      </p-card>
    </section>

    <!-- RECHTE SPALTE: Perspektivisches Assessment -->
    <section class="detail-col-right p-flex-1" style="min-width:0;">
      <p-card header="Perspektivisches Assessment" styleClass="detail-panel assessment-panel" [style]="{flex:1}">

        <!-- Nur gerendert, wenn currentUserRole !== 'User' (siehe 3.2 State „Rolle User“) -->
        <p-tabs [value]="activeRoleTab" (valueChange)="onRoleTabChange($event)" *ngIf="visibleAssessmentTabs.length">
          <p-tablist>
            <p-tab
              *ngFor="let tab of visibleAssessmentTabs"
              [value]="tab.role"
              [disabled]="tab.disabled"
              [attr.aria-disabled]="tab.disabled"
              [pTooltip]="tab.disabled ? 'Nur die eigene Rollen-Sicht ist bearbeitbar. Sichtansicht anderer Rollen ist nur lesend.' : null"
              tooltipPosition="top"
              [style]="{'--tab-underline-color': 'var(--role-color-' + tab.role + ')'}">
              <span class="tab-role-dot" [style.background]="'var(--role-color-' + tab.role + ')'"></span>
              {{ tab.label }}
            </p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel *ngFor="let tab of visibleAssessmentTabs" [value]="tab.role">

              <!-- State: Loading -->
              <div *ngIf="assessmentState(tab.role) === 'loading'" class="assessment-skeleton p-d-flex p-flex-column gap-3">
                <p-skeleton height="1.25rem" width="40%"></p-skeleton>
                <p-skeleton height="0.5rem" width="100%"></p-skeleton>
                <p-skeleton height="1.25rem" width="30%"></p-skeleton>
                <p-skeleton height="0.5rem" width="100%"></p-skeleton>
                <p-skeleton height="4rem" width="100%"></p-skeleton>
              </div>

              <!-- State: Konflikt (Optimistic Locking) -->
              <p-message
                *ngIf="assessmentState(tab.role) === 'conflict'"
                severity="warn"
                styleClass="assessment-conflict-banner"
                [closable]="false">
                <div role="alert" class="p-d-flex p-flex-column gap-2">
                  <span>Diese Bewertung wurde zwischenzeitlich von {{ conflict.conflictingUserName }} aktualisiert.<br>Trotzdem speichern?</span>
                  <div class="p-d-flex gap-2">
                    <p-button label="Neu laden" [text]="true" severity="warn" (onClick)="onConflictReload(tab.role)"></p-button>
                    <p-button label="Trotzdem speichern" severity="warn" (onClick)="onConflictForceSave(tab.role)"></p-button>
                  </div>
                </div>
              </p-message>

              <!-- State: Rolle nicht besetzt -->
              <div *ngIf="assessmentState(tab.role) === 'role-unassigned'" class="assessment-empty-state p-d-flex p-flex-column p-ai-center p-jc-center gap-2">
                <span class="empty-icon-circle"><i class="pi pi-users"></i></span>
                <h3>Keine Rolle zugewiesen</h3>
                <p class="p-text-secondary">Kein Nutzer mit Rolle {{ tab.label }} ist diesem Projekt zugewiesen. Ein Admin kann jemanden zuweisen.</p>
                <p-tag value="Rolle nicht besetzt" severity="secondary"></p-tag>
              </div>

              <!-- State: Noch nicht bewertet (eigene Rolle, keine Daten) -->
              <div *ngIf="assessmentState(tab.role) === 'not-yet-assessed'" class="assessment-empty-state p-d-flex p-flex-column p-ai-center p-jc-center gap-2">
                <span class="empty-icon-circle"><i class="pi pi-sort-amount-up"></i></span>
                <h3>Noch nicht bewertet</h3>
                <p class="p-text-secondary">Für diese Rolle liegt noch kein Assessment vor.</p>
                <p-button label="Bewertung erstellen" size="small" (onClick)="onCreateAssessment(tab.role)"></p-button>
              </div>

              <!-- State: Default (Daten vorhanden), editierbar nur wenn tab.role === currentUserRole -->
              <form
                *ngIf="assessmentState(tab.role) === 'loaded'"
                [formGroup]="assessmentForms[tab.role]"
                (ngSubmit)="onAssessmentSubmit(tab.role)"
                class="assessment-form p-d-flex p-flex-column gap-4">

                <div class="slider-block">
                  <div class="slider-head p-d-flex p-jc-between">
                    <label for="f-einfluss-{{tab.role}}">Einfluss</label>
                    <span class="slider-value mono">{{ assessmentForms[tab.role].get('einfluss')?.value }}</span>
                  </div>
                  <p-slider
                    inputId="f-einfluss-{{tab.role}}"
                    formControlName="einfluss"
                    [min]="0" [max]="100" [step]="1"
                    [disabled]="tab.role !== currentUserRole"
                    [style]="{'--slider-fill-color': 'var(--role-color-' + tab.role + ')'}">
                  </p-slider>
                  <div class="track-scale p-d-flex p-jc-between mono"><span>0</span><span>50</span><span>100</span></div>
                </div>

                <div class="slider-block">
                  <div class="slider-head p-d-flex p-jc-between">
                    <label for="f-interesse-{{tab.role}}">Interesse</label>
                    <span class="slider-value mono">{{ assessmentForms[tab.role].get('interesse')?.value }}</span>
                  </div>
                  <p-slider
                    inputId="f-interesse-{{tab.role}}"
                    formControlName="interesse"
                    [min]="0" [max]="100" [step]="1"
                    [disabled]="tab.role !== currentUserRole"
                    [style]="{'--slider-fill-color': 'var(--role-color-' + tab.role + ')'}">
                  </p-slider>
                  <div class="track-scale p-d-flex p-jc-between mono"><span>0</span><span>50</span><span>100</span></div>
                </div>

                <div class="note-field p-d-flex p-flex-column gap-2">
                  <label for="f-note-{{tab.role}}">Notiz</label>
                  <textarea
                    pInputTextarea
                    id="f-note-{{tab.role}}"
                    formControlName="notiz"
                    [autoResize]="true"
                    rows="3"
                    [disabled]="tab.role !== currentUserRole"
                    [attr.maxlength]="1000">
                  </textarea>
                  <small
                    *ngIf="assessmentForms[tab.role].get('notiz')?.invalid && assessmentForms[tab.role].get('notiz')?.touched"
                    class="p-error">
                    Notiz darf maximal 1000 Zeichen umfassen.
                  </small>
                </div>

                <div class="assess-footer p-d-flex p-ai-center p-jc-between gap-3">
                  <span class="mono p-text-secondary">Zuletzt geändert von {{ assessment(tab.role).lastModifiedBy }} · {{ assessment(tab.role).lastModifiedAt | date:'dd.MM.yyyy, HH:mm' }}</span>
                  <p-button
                    *ngIf="tab.role === currentUserRole"
                    type="submit"
                    label="Speichern"
                    size="small"
                    [loading]="isSaving(tab.role)"
                    [disabled]="assessmentForms[tab.role].invalid || assessmentForms[tab.role].pristine">
                  </p-button>
                </div>
              </form>

            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

      </p-card>
    </section>

  </div>
</main>

<!-- Globales Feedback für Speichern/Fehler, außerhalb des Card-Baums -->
<p-toast position="top-right"></p-toast>

<!-- Löschen-Bestätigung (bestehend/analog anderer Detail-Screens) -->
<p-confirmDialog></p-confirmDialog>
```

### 1.2 Selector-Übersicht (verbindlich)

| Wireframe-Element | PrimeNG-Selector | Bemerkung |
|---|---|---|
| Sidebar Hauptnavigation | `<p-menu>` (oder projektspezifisches `app-sidebar-nav`, falls bereits aus anderer Story vorhanden) | Sub-Navigation "Stakeholder-Liste" aktiv markiert via `styleClass`/`[ngClass]` |
| Zurück-Link | `<a routerLink>` mit `pi pi-chevron-left` | kein eigenes PrimeNG-Element nötig |
| Typ-Tag ("Person") | `<p-tag severity="secondary">` | |
| Löschen-Button | `<p-button severity="danger" [outlined]="true">` | |
| Stammdaten-Panel | `<p-card header="Stammdaten">` | |
| Formularfelder Stammdaten | `pInputText`, `<p-dropdown>` (Typ), `pInputTextarea` (Beschreibung) | |
| Kommunikationszuordnungen-Panel | `<p-card header="Kommunikationszuordnungen">` | Liste als einfache `*ngFor`-Zeilen, kein `p-table` nötig (Wireframe zeigt Kartenzeilen, keine Tabelle) |
| "Kommunikationsart hinzufügen" | eigener Button/Trigger (`<button>` mit `pi pi-plus`), öffnet ggf. `<p-dialog>` (Detail außerhalb dieser Story) | |
| Assessment-Panel | `<p-card header="Perspektivisches Assessment">` | |
| Rollen-Tabs (PL-Sicht/Coreteam-Sicht/Architect-Sicht) | `<p-tabs>` mit `<p-tablist>`/`<p-tab>`/`<p-tabpanels>`/`<p-tabpanel>` (PrimeNG 18+ API) | je Tab `[disabled]`, `[attr.aria-disabled]`, `pTooltip` |
| Rollen-Farbpunkt im Tab | eigenes `<span class="tab-role-dot">` | Hintergrundfarbe = Rollen-Token (Abschnitt 4) |
| Einfluss-/Interesse-Slider | `<p-slider>` | `[min]="0" [max]="100"`, Wertanzeige separat (Wireframe zeigt Wert + Skala 0/50/100 als eigenes Markup) |
| Notiz-Textarea | `pInputTextarea` mit `[autoResize]="true"` | |
| Speichern-Button (Assessment) | `<p-button size="small" [loading]>` | |
| Konflikt-Banner | `<p-message severity="warn">` mit `role="alert"`, zwei `<p-button>` darin | siehe Abschnitt 3.4 |
| "Noch nicht bewertet" / "Keine Rolle zugewiesen" Leerstände | eigener Empty-State-Block (Icon-Kreis + `<h3>` + `<p>`), kein dediziertes PrimeNG-Element vorgesehen | Icon per `<i class="pi …">`, optional `<p-tag>` für "Rolle nicht besetzt" |
| Ladezustand Assessment | `<p-skeleton>` (mehrere Zeilen) | |
| Erfolg-/Fehler-Feedback | `<p-toast>` | global einmalig im Layout |
| Löschen-Bestätigung | `<p-confirmDialog>` | ausgelöst über `ConfirmationService` bei Klick auf "Löschen" |

---

## 2. Forms, Directives & Validation

### 2.1 Stammdaten-Formular (`stammdatenForm: FormGroup`)

Reine Anzeige-/Bearbeitungsfelder gemäß Wireframe; Validierungsregeln sind hier konservativ nach Feldtyp abgeleitet, sofern das PRD/die Story keine engeren Regeln vorgibt — bei Abweichung ist dies gemäß CLAUDE.md Abschnitt 6 im PR zu vermerken.

```ts
stammdatenForm = new FormGroup({
  name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
  typ: new FormControl('', [Validators.required]),
  organisation: new FormControl('', [Validators.maxLength(200)]),
  position: new FormControl('', [Validators.maxLength(200)]),
  email: new FormControl('', [Validators.email, Validators.maxLength(320)]),
  telefon: new FormControl('', [Validators.maxLength(50)]),
  standort: new FormControl('', [Validators.maxLength(200)]),
  beschreibung: new FormControl('', [Validators.maxLength(2000)]),
});
```

Fehlermeldungen (deutsch, unter jedem Feld via `<small class="p-error">`, analog zum Assessment-Notizfeld):

| Control | Validator | Fehlermeldung |
|---|---|---|
| `name` | `required` | „Name ist ein Pflichtfeld." |
| `name` | `maxLength(200)` | „Name darf maximal 200 Zeichen umfassen." |
| `typ` | `required` | „Typ ist ein Pflichtfeld." |
| `email` | `email` | „Bitte eine gültige E-Mail-Adresse eingeben." |
| `beschreibung` | `maxLength(2000)` | „Beschreibung darf maximal 2000 Zeichen umfassen." |

### 2.2 Assessment-Formular je Rolle (`assessmentForms: Record<Rolle, FormGroup>`)

Für jede sichtbare Rolle existiert eine eigene `FormGroup`-Instanz (Tab-Wechsel wechselt nur die aktive Ansicht, nicht die Formularinstanz — Eingaben in nicht gespeicherten anderen Tabs bleiben erhalten). Nur die `FormGroup` der eigenen Rolle (`tab.role === currentUserRole`) ist tatsächlich enabled; alle anderen werden serverseitig als reine Anzeige geladen und clientseitig mit `.disable()` gesperrt (siehe Abschnitt 3.1).

```ts
function buildAssessmentForm(initial: Assessment): FormGroup {
  return new FormGroup({
    einfluss: new FormControl(initial.einfluss, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    interesse: new FormControl(initial.interesse, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    notiz: new FormControl(initial.notiz, [Validators.maxLength(1000)]),
  });
}
```

Fehlermeldungen (deutsch):

| Control | Validator | Fehlermeldung |
|---|---|---|
| `einfluss` | `required` | „Einfluss ist ein Pflichtfeld." |
| `einfluss` | `min(0)` / `max(100)` | „Einfluss muss zwischen 0 und 100 liegen." |
| `interesse` | `required` | „Interesse ist ein Pflichtfeld." |
| `interesse` | `min(0)` / `max(100)` | „Interesse muss zwischen 0 und 100 liegen." |
| `notiz` | `maxLength(1000)` | „Notiz darf maximal 1000 Zeichen umfassen." |

Bei Rollen-Tabs anderer Rollen wird die `FormGroup` nach dem Laden per `assessmentForms[role].disable()` deaktiviert; PrimeNG-`[disabled]`-Bindings an `p-slider`/`pInputTextarea` spiegeln diesen Zustand zusätzlich visuell.

### 2.3 Optimistic-Locking-Konfliktfall (Submit-Fehlerpfad)

Beim Absenden von `onAssessmentSubmit(role)` sendet die API neben den Formulardaten den zuletzt geladenen `version`-Stempel (bzw. `lastModifiedAt`-ETag, konsistent mit US-028-Konfliktregel). Antwortet die API mit HTTP 409 (Conflict), wird **kein** generischer Fehlertext, sondern der handlungsleitende Konflikt-Zustand aus dem Wireframe gerendert (Abschnitt 3.4):

- Formular bleibt im DOM (Werte des Nutzers gehen nicht verloren), wird aber optisch gedimmt (`.dim`-Analogie im Wireframe) und für weitere Eingaben gesperrt, bis der Konflikt aufgelöst ist.
- Exakter Wortlaut aus dem Wireframe (`DetailStates.dc.html`):
  > „Diese Bewertung wurde zwischenzeitlich von **{Name des überschreibenden Nutzers}** aktualisiert.
  > Trotzdem speichern?"
- Zwei Aktionen, exakter Wortlaut:
  - **„Neu laden"** → verwirft die eigenen ungespeicherten Änderungen, lädt die aktuelle Serverversion neu in die `FormGroup`, verlässt den Konflikt-Zustand.
  - **„Trotzdem speichern"** → sendet die eigenen Werte erneut mit dem aktuellen Server-Versionsstempel (Force-Overwrite), verlässt den Konflikt-Zustand bei Erfolg.

### 2.4 Direktiven-Hinweise

- `formGroup` / `formControlName` (Reactive Forms) für Stammdaten- und Assessment-Formulare — kein Template-Driven-Forms-Ansatz.
- `pTooltip` auf jedem deaktivierten Tab-Trigger zur Erklärung, warum der Tab nicht editierbar ist (siehe Abschnitt 3.1/Barrierefreiheit).
- `[attr.aria-disabled]` zusätzlich zu `[disabled]`, wo PrimeNG dies nicht automatisch spiegelt, damit Screenreader den Zustand korrekt ansagen.

---

## 3. UI States & Event Handling

### 3.1 State: Default / Initial (Rollen PL, Coreteam, Architect)

- Alle drei Rollen-Tabs (`PL-Sicht`, `Coreteam-Sicht`, `Architect-Sicht`) sind **sichtbar**.
- Nur der Tab der eigenen Rolle (`tab.role === currentUserRole`) ist editierbar: `FormGroup` enabled, `p-slider`/Textarea nicht `[disabled]`, „Speichern"-Button sichtbar.
- Die beiden anderen Tabs sind **sichtbar, aber deaktiviert** (`[disabled]="true"` auf `<p-tab>` selbst verhindert i. d. R. bereits das Aktivieren; zusätzlich wird der Inhalt bei Fokus/Klick rein lesend dargestellt: Slider- und Textarea-Controls mit `[disabled]`, kein „Speichern"-Button).
- Tab-Unterstrichfarbe des aktiven Tabs = Rollenfarben-Token der jeweiligen Rolle (nicht nur des eigenen), damit auch inaktive/deaktivierte Tabs ihre Rollenfarbe im Ruhezustand erkennbar zeigen (`rdot`-Farbpunkt im Wireframe ist je Tab fix auf die Rollenfarbe gesetzt, nicht nur beim aktiven Tab).
- Barrierefreiheit: deaktivierte Tabs erhalten `aria-disabled="true"` und einen `pTooltip`-Text (z. B. „Nur die eigene Rollen-Sicht ist bearbeitbar. Sichtansicht anderer Rollen ist nur lesend."), nicht nur eine visuelle Abblendung.

### 3.2 State: Rolle „User"

- Alle drei Assessment-Tabs sind **vollständig ausgeblendet** — nicht nur deaktiviert (`*ngIf="visibleAssessmentTabs.length"` liefert für Rolle `User` eine leere Liste; das gesamte `<p-tabs>`-Element wird nicht gerendert).
- Anstelle des Tab-Bereichs zeigt die Assessment-`<p-card>` einen neutralen Hinweis (z. B. „Für deine Rolle sind keine Assessment-Perspektiven verfügbar."), sofern die Story dies vorsieht — andernfalls bleibt die Card leer/entfällt; die konkrete Ausgestaltung dieses Leerzustands ist **nicht** im Wireframe dargestellt und daher hier nicht spezifiziert (Abweichung/Klärungsbedarf gemäß CLAUDE.md Abschnitt 6 vermerken, falls die Story das nicht abdeckt).
- **Server-seitig zusätzlich geschützt** (PRD 4.3 Punkt 4): der Frontend-Guard ist Komfort, nicht die Sicherheitsgrenze — die API liefert für Rolle `User` grundsätzlich keine Assessment-Daten aus (weder lesend noch schreibend). Der Frontend-Code darf sich nicht allein auf clientseitiges Ausblenden verlassen; ein direkter API-Aufruf durch einen `User`-Account muss serverseitig 403/leer beantwortet werden (Hinweis für Backend-Abstimmung, nicht Teil dieser Frontend-Spec).

### 3.3 State: Loading

- Direkt nach Tab-Aktivierung bzw. beim initialen Laden des Screens: `assessmentState(tab.role) === 'loading'` → `<p-skeleton>`-Platzhalter für Wertzeile, Slider-Track und Notizfeld (siehe Component Tree 1.1).
- Stammdaten-Panel analog: bis `stakeholder$` aufgelöst ist, wird das gesamte linke Panel mit `<p-skeleton>`-Zeilen dargestellt (Umsetzungsdetail dem Frontend-Agenten überlassen, da im Wireframe nicht explizit gezeigt).

### 3.4 State: Success (nach Speichern)

- Nach erfolgreichem `PUT`/`PATCH` des Assessments (HTTP 200/204): `<p-toast>` mit `severity="success"`, Text z. B. „Assessment gespeichert." Formular wird mit den vom Server zurückgegebenen Werten (inkl. neuem `lastModifiedBy`/`lastModifiedAt`) re-synchronisiert, `pristine`-Zustand wiederhergestellt, Speichern-Button wieder `disabled` bis zur nächsten Änderung.
- Nach erfolgreichem Speichern der Stammdaten analog: `<p-toast severity="success">` „Stammdaten gespeichert."

### 3.5 State: Error (generischer Fehler, kein Konflikt)

- Netzwerkfehler oder Server-Fehler (5xx) beim Speichern: `<p-toast severity="error">` mit Text z. B. „Speichern fehlgeschlagen. Bitte erneut versuchen." Formularwerte bleiben erhalten, `FormGroup` bleibt `dirty`, Nutzer kann erneut „Speichern" klicken.
- Fehler beim initialen Laden von Stammdaten/Assessment: `<p-message severity="error">` im jeweiligen Panel statt Skeleton, mit Retry-Möglichkeit (Button „Erneut laden").

### 3.6 State: Optimistic-Locking-Konflikt (DetailStates, Randfall a)

- Ausgelöst durch HTTP 409 beim Assessment-Submit (siehe 2.3).
- `assessmentState(tab.role)` wechselt zu `'conflict'`; der Konflikt-Banner (`<p-message severity="warn">`, `role="alert"`) erscheint **innerhalb des betroffenen Rollen-Tabs**, nicht als globaler Toast/Dialog — konsistent mit dem Wireframe, das den Konflikt im Panel selbst zeigt, nicht im Haupt-Layout überlagernd.
- Wortlaut: exakt wie in 2.3 zitiert.
- Event-Handling:
  - `onConflictReload(role)`: GET des aktuellen Assessments für diese Rolle, `assessmentForms[role].reset(neueWerte)`, `assessmentState(role)` zurück zu `'loaded'`.
  - `onConflictForceSave(role)`: erneuter Save-Request mit aktuellem Server-Versionsstempel und den unveränderten eigenen Formularwerten; bei Erfolg → State `'loaded'` + Success-Toast (3.4); bei erneutem 409 → Banner bleibt mit aktualisiertem Konfliktnutzer sichtbar.
- Nicht nur farblich kodiert: `role="alert"` sorgt für Screenreader-Ansage; Icon (`pi pi-exclamation-triangle`, sofern `p-message` dies nicht bereits mitbringt) ergänzt die Warnfarbe.

### 3.7 State: „Rolle nicht besetzt" (DetailStates, Randfall b)

- Gilt für einen Rollen-Tab, dem im Projekt aktuell kein Nutzer mit dieser Rolle zugewiesen ist (`assessmentState(tab.role) === 'role-unassigned'`).
- Darstellung: Empty-State-Block mit Icon-Kreis, Überschrift „Keine Rolle zugewiesen", Text „Kein Nutzer mit Rolle {Rollenname} ist diesem Projekt zugewiesen. Ein Admin kann jemanden zuweisen." — **keine** Eingabemöglichkeit (keine Slider, keine Textarea, kein Speichern-Button), bis ein Admin jemanden zuweist.
- Optional zusätzlich `<p-tag value="Rolle nicht besetzt" severity="secondary">` als kompakter Status-Indikator (Regelwerk-Vorgabe „`<p-tag>` für Rolle-nicht-besetzt-Zustand"), ergänzend zur ausführlichen Empty-State-Erklärung — nicht als Ersatz dafür, da der Wireframe den erklärenden Text als primäres Element zeigt.
- Kein Event-Handling nötig; der Zustand ist rein lesend bis zu einer außerhalb dieses Screens liegenden Admin-Zuweisung (Neuladen des Screens/der Rollenliste löst den Zustand auf).

### 3.8 State: „Noch nicht bewertet" (eigene Rolle, keine Daten)

- Gilt nur für den Tab der eigenen Rolle, wenn für diese noch kein Assessment existiert (`assessmentState(tab.role) === 'not-yet-assessed'`).
- Darstellung: Empty-State-Block mit Icon-Kreis, Überschrift „Noch nicht bewertet", Text „Für diese Rolle liegt noch kein Assessment vor.", Button „Bewertung erstellen".
- Event: `onCreateAssessment(role)` initialisiert eine leere `FormGroup` (Default-Werte, z. B. `einfluss: 0, interesse: 0, notiz: ''`) und wechselt `assessmentState(role)` zu `'loaded'`, sodass das reguläre editierbare Formular erscheint.

### 3.9 Event-Handling — Übersicht

| Event | Auslöser | Verhalten |
|---|---|---|
| `onRoleTabChange($event)` | Klick/Tastatur auf nicht-deaktivierten Tab | wechselt `activeRoleTab`; lädt Assessment-Daten der Rolle nach, falls noch nicht geladen (`assessmentState` → `'loading'` → `'loaded'`/`'not-yet-assessed'`/`'role-unassigned'`) |
| `onAssessmentSubmit(role)` | Formular-Submit (Speichern-Button, nur eigene Rolle) | validiert `FormGroup`; bei gültig → API-Call; Erfolg → 3.4, 409 → 3.6, sonstiger Fehler → 3.5 |
| `onConflictReload(role)` / `onConflictForceSave(role)` | Klick auf Banner-Aktionen | siehe 3.6 |
| `onCreateAssessment(role)` | Klick „Bewertung erstellen" | siehe 3.8 |
| `onAddKommunikationszuordnung()` | Klick „Kommunikationsart hinzufügen" | öffnet Erfassungsdialog (Detailumsetzung außerhalb dieser Spec, da im Wireframe nur als Trigger gezeigt) |
| `onDeleteRequested()` | Klick „Löschen" | öffnet `<p-confirmDialog>` über `ConfirmationService.confirm(...)`; bei Bestätigung → Lösch-API-Call, danach Navigation zurück zur Stakeholder-Liste |
| Navigation „Zurück zur Stakeholder-Liste" | Klick auf Breadcrumb-Link | `routerLink` zur Listenansicht des aktuellen Projekts |
| Navigation Sidebar-Sub-Item „Stakeholder-Liste" / „Map" / „Verteiler" | Klick in `<p-menu>` | `routerLink` je Sub-Navigationspunkt innerhalb des Projektkontexts; „Stakeholder-Liste" zeigt in diesem Screen den `active`-Zustand |

---

## 4. Acceptance Criteria (DoD)

- [ ] Stammdaten-Panel zeigt alle Felder aus dem Wireframe (Name, Typ, Organisation/Zugehörigkeit, Position/Funktion, E-Mail, Telefon, Standort/Abteilung, Freitext-Beschreibung) als Reactive-Forms-Controls mit den in Abschnitt 2.1 definierten Validatoren und deutschen Fehlermeldungen.
- [ ] Kommunikationszuordnungen-Panel listet vorhandene Zuordnungen (Name, Frequenz, Kanal) sowie einen „Kommunikationsart hinzufügen"-Trigger.
- [ ] Assessment-Bereich rendert genau drei Rollen-Tabs (PL-Sicht, Coreteam-Sicht, Architect-Sicht) über `<p-tabs>`, sofern `currentUserRole !== 'User'`.
- [ ] Nur der Tab der eigenen Rolle ist editierbar (Slider, Notizfeld, Speichern-Button aktiv); die anderen beiden Tabs sind sichtbar, aber deaktiviert (`[disabled]`, `aria-disabled`, `pTooltip`-Erklärung), nicht ausgeblendet.
- [ ] Für Rolle `User` sind alle drei Assessment-Tabs vollständig aus dem DOM entfernt (nicht nur `display:none`/`disabled`), und ein direkter API-Zugriff auf Assessment-Daten durch `User` wird serverseitig verweigert (frontend- und backend-seitige Absicherung dokumentiert).
- [ ] Tab-Unterstrichfarbe und Farbpunkt je Rolle nutzen benannte Design-Tokens (`--role-color-pl`, `--role-color-ct`, `--role-color-ar` o. ä.), konsistent mit den Rollenfarben aus S2-Radar und der Map-Legende — keine im Frontend neu erfundenen Farbwerte.
- [ ] Einfluss- und Interesse-Slider sind über `<p-slider>` mit `[min]="0" [max]="100"` umgesetzt, Wertanzeige (0–100) und Skalenbeschriftung (0/50/100) sind vorhanden.
- [ ] Notizfeld ist auf 1000 Zeichen begrenzt (`Validators.maxLength(1000)`), mit deutscher Fehlermeldung bei Überschreitung.
- [ ] Erfolgreiches Speichern von Stammdaten und Assessment löst je einen `<p-toast severity="success">` aus; Formular wird mit Server-Antwort resynchronisiert.
- [ ] Optimistic-Locking-Konflikt (HTTP 409) zeigt den Banner mit exaktem Wortlaut „Diese Bewertung wurde zwischenzeitlich von {Name} aktualisiert. Trotzdem speichern?" und den beiden Aktionen „Neu laden" und „Trotzdem speichern", beide funktional verdrahtet gemäß Abschnitt 3.6.
- [ ] „Rolle nicht besetzt"-Zustand zeigt Icon, Überschrift „Keine Rolle zugewiesen" und den Erklärungstext aus dem Wireframe, ohne jegliche Eingabemöglichkeit (kein Slider, keine Textarea, kein Speichern-Button sichtbar oder fokussierbar).
- [ ] „Noch nicht bewertet"-Zustand (eigene Rolle, keine Daten) zeigt Icon, Überschrift „Noch nicht bewertet", Erklärungstext und einen funktionalen „Bewertung erstellen"-Button, der in das editierbare Formular überführt.
- [ ] Ladezustände (Stammdaten- und Assessment-Panel) nutzen `<p-skeleton>` statt leerem Weißraum oder Spinnerabhängigkeit vom gesamten Screen.
- [ ] Alle Farb-/Statusinformationen (Konflikt-Banner, „Rolle nicht besetzt") sind zusätzlich zur Farbe über Text/Icon/`role="alert"` erkennbar (WCAG 2.1 AA, nicht nur farblich kodiert).
- [ ] Keine hartkodierten Pixelwerte oder Hex-Farben aus dem Wireframe im produktiven Code — ausschließlich PrimeFlex-Utility-Klassen und PrimeNG-/Projekt-CSS-Variablen (`var(--primary-color)`, `var(--surface-card)`, `var(--surface-border)`, `var(--yellow-500)`/`var(--red-500)` bzw. die projektdefinierten Rollen-Tokens).
- [ ] Sidebar zeigt die projektbezogene Sub-Navigation mit „Stakeholder-Liste" im aktiven Zustand, konsistent mit PRD 6.3.
- [ ] Löschen-Aktion ist über `<p-confirmDialog>` abgesichert, kein direktes Löschen ohne Bestätigung.
- [ ] Alle Texte sind deutschsprachig und entsprechen wörtlich der im Wireframe verwendeten Terminologie („Stakeholder", „Assessment", „Rolle", „Stammdaten", „Kommunikationszuordnungen", Feldbezeichnungen).
