# SPEC: Stakeholder-Liste inkl. Papierkorb (S3, F1.3/F1.4)

**Quelle:** `StakeholderList.dc.html` (Design-Canvas-Wireframe) · **Screen:** S3 · **Feature-Referenz:** F1.4 (Stakeholder-Liste), F1.3 (Papierkorb)
**Tab-Kontext:** Standard-Landingtab beim Öffnen eines Projekts, Teil des Projekt-Workspace neben den Tabs „Map" und „Verteiler".
**Vermutete Ordnerstruktur:**
- `frontend/src/app/features/workspace/project-workspace-layout/` — Shell (Sidebar-Navigation, Projekt-Kopfzeile mit Titel + Rollen-Badge, Tab-Umschaltung). **Nicht Teil dieser Spec**, wird hier nur als Kontext referenziert.
- `frontend/src/app/features/stakeholders/stakeholder-list/` — Hauptkomponente dieser Spec (`StakeholderListComponent`, Selector `app-stakeholder-list`).
- `frontend/src/app/features/stakeholders/create-stakeholder-form/` bzw. `edit-stakeholder-form/` — geteiltes Formular-Component für Anlegen (dieser Screen) und Bearbeiten (Trigger vermutlich auf der Stakeholder-Detailseite, außerhalb dieses Screens — siehe Abschnitt 2).
- `frontend/src/app/features/stakeholders/delete-stakeholder-dialog/` — **kein Bestandteil dieses Wireframes**, siehe Anmerkung in Abschnitt 1.4.

> **Anmerkung zur Abgrenzung (Abweichungs-Dokumentation gemäß CLAUDE.md Abschnitt 6):** Das Wireframe zeigt für den Papierkorb ausschließlich die **Wiederherstellen**-Aktion. Es enthält **keinen** sichtbaren Trigger, um einen Stakeholder aus der Hauptliste zu löschen (kein Icon-Button, kein Kontextmenü, keine Zeilen-Aktion). Diese Spec erfindet daher keinen Lösch-Trigger auf diesem Screen. Vermutlich liegt der Soft-Delete-Trigger auf der Stakeholder-Detailseite (Folgestory zu US-029, separater Screen S4) — das ist außerhalb des Scopes dieser Spec und muss dort gesondert spezifiziert werden. `delete-stakeholder-dialog/` wird in dieser Spec daher nicht ausgestaltet.

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Einordnung in die Shell

Die Kopfzeile (`.head`: Projekttitel „ERP-Einführung Rewe" + Rollen-Badge „PL") gehört layouttechnisch vermutlich zur `project-workspace-layout`-Shell, da Titel und Rolle tab-übergreifend gleichbleiben (Stakeholder-Liste/Map/Verteiler zeigen denselben Projektkontext). Sie wird hier dennoch spezifiziert, damit der Rollen-Badge mit dem Farbschema dieser Story konsistent bleibt.

### 1.2 Component Tree (Pseudo-Markup)

```html
<!-- project-workspace-layout.component.html (Kontext, nicht Teil dieser Spec) -->
<div class="flex align-items-center gap-3 mb-3">
  <h1 class="text-2xl font-semibold m-0">{{ project.name }}</h1>
  <p-tag
    [value]="currentUserRoleInProject"
    [style]="getRoleTagStyle(currentUserRoleInProject)"
    styleClass="text-xs font-bold" />
</div>

<!-- Tab-Navigation (p-tabs / router-outlet je nach bestehendem Muster) -->
<router-outlet></router-outlet>

<!-- ============================================================ -->
<!-- stakeholder-list.component.html — eigentliche Feature-Komponente -->
<!-- ============================================================ -->
<app-stakeholder-list>

  <!-- Toolbar -->
  <div class="flex align-items-center gap-3 flex-wrap mb-4">

    <p-iconfield iconPosition="left" styleClass="w-full sm:w-20rem">
      <p-inputicon class="pi pi-search" />
      <label for="sh-search" class="sr-only">Stakeholder durchsuchen</label>
      <input
        pInputText
        id="sh-search"
        type="text"
        placeholder="Name oder Organisation…"
        [formControl]="searchControl" />
    </p-iconfield>

    <p-select
      [options]="typeFilterOptions"
      [(ngModel)]="selectedTypeFilter"
      optionLabel="label"
      optionValue="value"
      placeholder="Alle"
      appendTo="body"
      styleClass="w-12rem"
      ariaLabel="Nach Typ filtern"
      (onChange)="onFilterChange()">
      <ng-template pTemplate="dropdownicon"><span class="pi pi-chevron-down"></span></ng-template>
    </p-select>
    <!-- Vorangestelltes Label "Typ:" als <span class="p-select-label-prefix"> oder als eigenes <label> vor dem p-select -->

    <p-select
      [options]="communicationFilterOptions"
      [(ngModel)]="selectedCommunicationFilter"
      optionLabel="label"
      optionValue="value"
      placeholder="Alle"
      appendTo="body"
      styleClass="w-14rem"
      ariaLabel="Nach Kommunikationsart filtern"
      (onChange)="onFilterChange()" />

    <div class="flex-1"></div> <!-- .spacer -->

    <div class="flex align-items-center gap-2">
      <p-toggleswitch
        inputId="show-deleted-toggle"
        [(ngModel)]="showDeleted"
        (onChange)="onToggleShowDeleted($event)"
        *ngIf="canViewTrash" />
      <label for="show-deleted-toggle" class="text-sm text-color-secondary" *ngIf="canViewTrash">
        Gelöschte anzeigen
      </label>
    </div>

    <p-button
      label="Stakeholder anlegen"
      icon="pi pi-plus"
      (onClick)="openCreateDialog()" />
  </div>

  <!-- Hauptliste -->
  <p-table
    #dt
    [value]="stakeholders"
    [columns]="tableColumns"
    dataKey="id"
    [lazy]="true"
    (onLazyLoad)="loadStakeholders($event)"
    [paginator]="true"
    [rows]="20"
    [totalRecords]="totalRecords"
    [rowsPerPageOptions]="[10, 20, 50]"
    [loading]="isLoading"
    [sortField]="'aktualisiertAm'"
    [sortOrder]="-1"
    selectionMode="single"
    (onRowSelect)="onRowSelect($event)"
    styleClass="p-datatable-sm"
    [tableStyle]="{ 'min-width': '100%' }">

    <ng-template pTemplate="header">
      <tr>
        <th pSortableColumn="name" scope="col">Name <p-sortIcon field="name" /></th>
        <th pSortableColumn="organisation" scope="col">Organisation <p-sortIcon field="organisation" /></th>
        <th scope="col">Kommunikation</th>
        <th pSortableColumn="meineBewertung" scope="col">Meine Bewertung <p-sortIcon field="meineBewertung" /></th>
        <th pSortableColumn="aktualisiertAm" scope="col">Aktualisiert <p-sortIcon field="aktualisiertAm" /></th>
      </tr>
    </ng-template>

    <ng-template pTemplate="body" let-row>
      <tr class="cursor-pointer" (click)="onRowSelect({ data: row })" tabindex="0"
          (keydown.enter)="onRowSelect({ data: row })">
        <td>
          <div class="flex align-items-center gap-2 font-semibold">
            <span class="stakeholder-type-icon" [attr.aria-hidden]="true">
              <i class="pi" [ngClass]="row.typ === 'PERSON' ? 'pi-user' : 'pi-building'"></i>
            </span>
            {{ row.name }}
          </div>
        </td>
        <td class="text-color-secondary">{{ row.organisation || '—' }}</td>
        <td>
          <div class="flex gap-2 flex-wrap">
            <p-chip
              *ngFor="let art of row.kommunikationsartenVisible"
              [label]="art"
              styleClass="text-xs" />
            <p-chip
              *ngIf="row.kommunikationsartenOverflowCount as n"
              [label]="'+' + n"
              styleClass="text-xs text-color-secondary"
              [pTooltip]="row.kommunikationsartenOverflowTooltip" />
          </div>
        </td>
        <td>
          <ng-container *ngIf="row.meineBewertung as b; else keineBewertung">
            <div class="flex flex-column gap-1">
              <span class="font-mono text-sm">
                <span [style]="getRoleValueStyle(b.rolle)" class="font-semibold">E {{ b.einfluss }}</span>
                &nbsp;·&nbsp;I {{ b.interesse }}
              </span>
              <p-tag [value]="b.rolle" [style]="getRoleTagStyle(b.rolle)" styleClass="text-xs w-fit" />
            </div>
          </ng-container>
          <ng-template #keineBewertung>
            <span class="text-color-secondary font-mono text-sm">– noch nicht bewertet</span>
          </ng-template>
        </td>
        <td class="font-mono text-sm text-color-secondary">{{ row.aktualisiertAm | relativeTime }}</td>
      </tr>
    </ng-template>

    <!-- Loading-State: Skeleton-Zeilen statt Tabellenkörper -->
    <ng-template pTemplate="loadingbody">
      <tr *ngFor="let _ of skeletonRows">
        <td><div class="flex align-items-center gap-2"><p-skeleton shape="circle" size="1.6rem" /><p-skeleton width="8rem" height="0.9rem" /></div></td>
        <td><p-skeleton width="6rem" height="0.9rem" /></td>
        <td><div class="flex gap-2"><p-skeleton width="4rem" height="1.2rem" borderRadius="999px" /><p-skeleton width="3rem" height="1.2rem" borderRadius="999px" /></div></td>
        <td><p-skeleton width="5rem" height="0.9rem" /></td>
        <td><p-skeleton width="4rem" height="0.9rem" /></td>
      </tr>
    </ng-template>

    <!-- Empty-State -->
    <ng-template pTemplate="emptymessage">
      <tr>
        <td colspan="5">
          <div class="flex flex-column align-items-center gap-3 py-6" *ngIf="!isFiltered; else filteredEmpty">
            <i class="pi pi-users text-3xl text-color-secondary"></i>
            <span class="text-color-secondary">Noch keine Stakeholder in diesem Projekt angelegt.</span>
            <p-button label="Stakeholder anlegen" icon="pi pi-plus" (onClick)="openCreateDialog()" size="small" />
          </div>
          <ng-template #filteredEmpty>
            <div class="flex flex-column align-items-center gap-3 py-6">
              <i class="pi pi-filter-slash text-3xl text-color-secondary"></i>
              <span class="text-color-secondary">Keine Stakeholder gefunden für die aktuellen Filter.</span>
              <p-button label="Filter zurücksetzen" [text]="true" (onClick)="resetFilters()" size="small" />
            </div>
          </ng-template>
        </td>
      </tr>
    </ng-template>
  </p-table>

  <div class="text-sm text-color-secondary py-2">
    {{ totalRecordsUnfiltered }} Stakeholder insgesamt
    <ng-container *ngIf="isFiltered"> · {{ totalRecords }} angezeigt (gefiltert)</ng-container>
  </div>

  <!-- Papierkorb-Vorschau — Teil desselben Tabs, kein eigener Screen -->
  <section class="flex flex-column gap-2 mt-3" *ngIf="canViewTrash && showDeleted" aria-labelledby="trash-heading">
    <div id="trash-heading" class="flex align-items-center gap-2 text-sm font-semibold text-color-secondary">
      <i class="pi pi-trash text-color-secondary" aria-hidden="true"></i>
      Vorschau: „Gelöschte anzeigen" aktiv (nur PL/Admin sichtbar)
    </div>

    <p-table
      [value]="deletedStakeholders"
      [loading]="isTrashLoading"
      dataKey="id"
      styleClass="p-datatable-sm trash-table"
      [tableStyle]="{ 'min-width': '100%' }">
      <ng-template pTemplate="body" let-row>
        <tr class="opacity-60">
          <td style="width:40%">
            <div class="flex align-items-center gap-2 font-semibold">
              <span class="stakeholder-type-icon" aria-hidden="true">
                <i class="pi" [ngClass]="row.typ === 'PERSON' ? 'pi-user' : 'pi-building'"></i>
              </span>
              {{ row.name }}
            </div>
          </td>
          <td class="text-color-secondary" style="width:20%">{{ row.organisation || '—' }} (ehem.)</td>
          <td style="width:24%">
            <p-tag
              [value]="'Gelöscht am ' + (row.gelöschtAm | date:'dd.MM.yyyy') + ' von ' + row.gelöschtVon"
              severity="danger"
              styleClass="text-xs" />
          </td>
          <td class="text-right">
            <p-button
              label="Wiederherstellen"
              [text]="true"
              severity="warn"
              size="small"
              [loading]="row.restoring"
              (onClick)="onRestore(row)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="loadingbody">
        <tr *ngFor="let _ of trashSkeletonRows">
          <td colspan="4"><p-skeleton width="100%" height="1rem" /></td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4" class="text-color-secondary text-sm py-3">Papierkorb ist leer.</td></tr>
      </ng-template>
    </p-table>
  </section>

  <!-- Anlegen-Dialog, siehe Abschnitt 2 -->
  <p-dialog
    [(visible)]="createDialogVisible"
    [modal]="true"
    [draggable]="false"
    [style]="{ width: '32rem' }"
    header="Stakeholder anlegen"
    (onHide)="onDialogHide()">
    <app-stakeholder-form
      [form]="stakeholderForm"
      (submitForm)="onSubmitCreate()" />
    <ng-template pTemplate="footer">
      <p-button label="Abbrechen" [text]="true" severity="secondary" (onClick)="closeCreateDialog()" />
      <p-button
        label="Speichern"
        icon="pi pi-check"
        [disabled]="stakeholderForm.invalid"
        [loading]="isSaving"
        (onClick)="onSubmitCreate()" />
    </ng-template>
  </p-dialog>

  <p-toast />
</app-stakeholder-list>
```

### 1.3 Selector-Referenz

| Wireframe-Element | PrimeNG-Selector | Zweck |
|---|---|---|
| Rollen-Badge „PL" (Kopfzeile) | `<p-tag>` | Aktuelle Projektrolle des eingeloggten Nutzers |
| Suchfeld | `<p-iconfield>` + `<p-inputicon>` + `input[pInputText]` | Freitextsuche Name/Organisation |
| Filter „Typ" / „Kommunikationsart" | `<p-select>` | Serverseitige Filterung |
| Toggle „Gelöschte anzeigen" | `<p-toggleswitch>` | Papierkorb-Vorschau ein-/ausblenden |
| Button „Stakeholder anlegen" | `<p-button>` (primary) | Öffnet Anlegen-Dialog |
| Hauptliste | `<p-table>` mit `[paginator]`, `[lazy]`, Sortier-Templates | Stakeholder-Übersicht |
| Typ-Icon in Namenszelle | `<i class="pi pi-user">` / `<i class="pi pi-building">` in Custom-Span | Unterscheidung Person/Organisation (kein eigenes PrimeNG-Component nötig) |
| Kommunikations-Chips inkl. „+1" | `<p-chip>` | Mehrfachwerte + Overflow-Anzeige |
| Bewertungszelle „E 88 · I 82" + Label „PL" | Custom-Template + `<p-tag>` für Rollen-Label | Farbcodierte eigene Bewertungsperspektive |
| „– noch nicht bewertet" | Reiner Text, `text-color-secondary` | Leerwert, keine eigene Komponente |
| Zeilen-Ladezustand | `<p-skeleton>` in `pTemplate="loadingbody"` | Ladeindikator pro Spalte |
| Trefferzeile „32 Stakeholder insgesamt …" | Reiner Text unterhalb `<p-table>` | Zähl-Feedback |
| Papierkorb-Vorschau-Panel | `<section>` + zweite, ungepaginierte `<p-table>` | F1.3, Teil desselben Tabs |
| „Gelöscht am … von …" Badge | `<p-tag severity="danger">` | Lösch-Metadaten |
| Button „Wiederherstellen" | `<p-button [text]="true" severity="warn">` | Restore-Aktion |
| Anlegen-Dialog | `<p-dialog>` | Reactive-Form-Host, siehe Abschnitt 2 |
| Erfolg-/Fehler-Feedback | `<p-toast>` | Globale Rückmeldung nach Aktionen |

### 1.4 Nicht im Wireframe enthalten (bewusst nicht spezifiziert)

- Kein sichtbarer Zeilen-Aktionsbutton „Löschen" oder „Bearbeiten" in der Hauptliste → `delete-stakeholder-dialog/` und der Bearbeiten-Trigger sind **nicht** Teil dieser Spec (siehe Abgrenzungs-Anmerkung oben).
- Kein `<p-confirmdialog>` auf diesem Screen: Die einzige destruktive/reversible Aktion, die das Wireframe zeigt, ist „Wiederherstellen" — ein einstufiger Button ohne Bestätigungsdialog. Ein `p-confirmdialog` wird daher hier nicht verbaut.

### 1.5 Layout & Styling (PrimeFlex + Design-Tokens)

- Layout ausschließlich über PrimeFlex-Utilities (`flex`, `align-items-center`, `gap-*`, `flex-wrap`, `flex-column`, `w-*`, `mt-*`/`mb-*`) — keine Fixmaße aus dem Wireframe (`width:1440px` etc.) übernehmen; die Komponente muss sich in die Breite des Tab-Contents der Workspace-Shell einfügen (`w-full`).
- Farben ausschließlich über PrimeNG-CSS-Variablen, keine Hex-Werte aus dem Wireframe:
  - Panel-/Tabellenhintergrund: `var(--surface-card)`
  - Rahmen: `var(--surface-border)`
  - Primärtext: `var(--text-color)`, Sekundärtext: `var(--text-color-secondary)`
  - Primäraktion (Button „Stakeholder anlegen"): `var(--primary-color)` / `var(--primary-color-text)`
  - Papierkorb-Panel: gestrichelter Rahmen weiterhin über `var(--surface-border)`, Stil `dashed` per Utility-Klasse, Zeilen-Deckkraft `opacity: .6` als einzige verbleibende Inline-Eigenschaft (kein Farbwert)
  - Lösch-Badge: `severity="danger"` von `p-tag` nutzt das Theme-eigene Fehlerfarbschema (kein hartkodiertes `#f87171`)
- **Rollenfarben („Meine Bewertung", Rollen-Badge):** Das Wireframe kodiert Rollen fest (`--role-pl:#8b7cf6`, `--role-ct:#2dd4bf`, `--role-ar:#38bdf8`). Da dies keine offiziellen PrimeNG-Tokens sind, werden sie als **Vorschlag** auf benannte, themefähige CSS-Variablen abgebildet, die im globalen Theme (`styles.scss` bzw. Theme-Preset) ergänzt werden müssen:
  ```css
  :root {
    --role-pl-color: var(--purple-500, #8b7cf6);
    --role-pl-bg: var(--purple-100, rgba(139,124,246,.16));
    --role-ct-color: var(--teal-500, #2dd4bf);
    --role-ct-bg: var(--teal-100, rgba(45,212,191,.16));
    --role-ar-color: var(--sky-500, #38bdf8);
    --role-ar-bg: var(--sky-100, rgba(56,189,248,.16));
  }
  ```
  `getRoleTagStyle(rolle)` / `getRoleValueStyle(rolle)` in `StakeholderListComponent` mappen die Rollenabkürzung (`PL`, `CT`, `AR` — **Annahme:** Abkürzungen aus dem Wireframe, exakte Rollenbezeichnungen gegen die im Backend/PRD gepflegte Rollentaxonomie verifizieren, bevor weitere Rollen ergänzt werden) auf `{ color: 'var(--role-<x>-color)', background: 'var(--role-<x>-bg)' }`.
- Monospace-Werte (Bewertungszahlen, Zeitstempel) über eine Utility-Klasse `font-mono`, die auf die im Projekt bereits eingebundene Monospace-Schriftfamilie zeigt (nicht hartkodiert im Component-CSS wiederholen).
- Typ-Icon-Badge (`.stakeholder-type-icon`) als kleine quadratische Fläche mit `var(--surface-100)`/`var(--surface-border)` statt der wireframe-eigenen `var(--surface-2)`.

---

## 2. Forms, Directives & Validation

### 2.1 Geteiltes Formular-Component

`StakeholderFormComponent` (`create-stakeholder-form/` bzw. gemeinsam mit `edit-stakeholder-form/` genutzt) kapselt ein `FormGroup`, das aus den im Wireframe sichtbaren Datenfeldern abgeleitet ist: Name, Typ (Person/Organisation — abgeleitet aus den zwei unterschiedlichen Typ-Icons in der Tabelle sowie dem Filter „Typ"), Organisation/Zugehörigkeit, Kommunikationsart(en) (abgeleitet aus den Chips je Zeile sowie dem Filter „Kommunikationsart"). Felder zur „Meinen Bewertung" (E/I-Werte) gehören **nicht** zu diesem Formular — sie werden laut bestehender Story US-028/US-029 über die Assessment-Funktion auf der Stakeholder-Detailseite gepflegt und hier nur lesend angezeigt.

```ts
this.stakeholderForm = this.fb.group({
  name: ['', [Validators.required, Validators.maxLength(200)]],
  typ: ['PERSON', [Validators.required]],
  organisation: ['', [Validators.maxLength(200)]],
  kommunikationsarten: [[] as string[], [Validators.required, minArrayLength(1)]],
});
```

- `typ` steuert reaktiv die Aktivierung von `organisation`: Bei `typ === 'ORGANISATION'` wird `organisation` per `this.stakeholderForm.get('organisation')!.disable()` deaktiviert und geleert (analog zur Tabellenzeile „Systemhaus Nord GmbH", die in der Organisation-Spalte „—" zeigt), bei `typ === 'PERSON'` wieder `enable()`.
- `minArrayLength(1)` ist ein projektspezifischer Custom-Validator (nicht Teil von Angular core) — analog zu vorhandenen Validator-Utilities im Frontend anlegen, falls noch nicht vorhanden.

### 2.2 Formularfelder im Markup

```html
<form [formGroup]="form" class="flex flex-column gap-4" (ngSubmit)="submitForm.emit()">

  <div class="flex flex-column gap-2">
    <label for="sh-name">Name<span aria-hidden="true"> *</span></label>
    <input
      pInputText
      id="sh-name"
      formControlName="name"
      [attr.aria-invalid]="isInvalid('name')"
      [attr.aria-describedby]="isInvalid('name') ? 'sh-name-error' : null" />
    <small id="sh-name-error" class="p-error flex align-items-center gap-1" role="alert" *ngIf="isInvalid('name')">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <ng-container *ngIf="form.get('name')?.hasError('required')">Name ist ein Pflichtfeld.</ng-container>
      <ng-container *ngIf="form.get('name')?.hasError('maxlength')">Name darf maximal 200 Zeichen lang sein.</ng-container>
    </small>
  </div>

  <div class="flex flex-column gap-2">
    <label id="sh-typ-label">Typ<span aria-hidden="true"> *</span></label>
    <p-selectbutton
      formControlName="typ"
      [options]="[
        { label: 'Person', value: 'PERSON', icon: 'pi pi-user' },
        { label: 'Organisation', value: 'ORGANISATION', icon: 'pi pi-building' }
      ]"
      optionLabel="label"
      optionValue="value"
      ariaLabelledBy="sh-typ-label" />
    <small class="p-error flex align-items-center gap-1" role="alert" *ngIf="isInvalid('typ')">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      Bitte einen Typ auswählen.
    </small>
  </div>

  <div class="flex flex-column gap-2" *ngIf="form.get('typ')?.value === 'PERSON'">
    <label for="sh-org">Organisation</label>
    <input
      pInputText
      id="sh-org"
      formControlName="organisation"
      [attr.aria-invalid]="isInvalid('organisation')"
      [attr.aria-describedby]="isInvalid('organisation') ? 'sh-org-error' : null" />
    <small id="sh-org-error" class="p-error flex align-items-center gap-1" role="alert" *ngIf="isInvalid('organisation')">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      Organisation darf maximal 200 Zeichen lang sein.
    </small>
  </div>

  <div class="flex flex-column gap-2">
    <label for="sh-komm">Kommunikationsart<span aria-hidden="true"> *</span></label>
    <p-multiselect
      inputId="sh-komm"
      formControlName="kommunikationsarten"
      [options]="communicationOptions"
      optionLabel="label"
      optionValue="value"
      display="chip"
      appendTo="body"
      [attr.aria-invalid]="isInvalid('kommunikationsarten')"
      [attr.aria-describedby]="isInvalid('kommunikationsarten') ? 'sh-komm-error' : null" />
    <small id="sh-komm-error" class="p-error flex align-items-center gap-1" role="alert" *ngIf="isInvalid('kommunikationsarten')">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      Mindestens eine Kommunikationsart ist erforderlich.
    </small>
  </div>

</form>
```

### 2.3 Validatoren-Übersicht

| Feld | Control | Validatoren | Fehlermeldung (deutsch) |
|---|---|---|---|
| Name | `name` | `Validators.required`, `Validators.maxLength(200)` | „Name ist ein Pflichtfeld." / „Name darf maximal 200 Zeichen lang sein." |
| Typ | `typ` | `Validators.required` | „Bitte einen Typ auswählen." |
| Organisation | `organisation` | `Validators.maxLength(200)` (nur sichtbar/aktiv bei Typ „Person") | „Organisation darf maximal 200 Zeichen lang sein." |
| Kommunikationsart(en) | `kommunikationsarten` | `Validators.required`, `minArrayLength(1)` | „Mindestens eine Kommunikationsart ist erforderlich." |

### 2.4 Directives & Accessibility-Regeln

- Jedes Feld hat ein natives `<label for="...">`, keine reinen Platzhalter-Labels (Ausnahme: das Suchfeld in der Toolbar nutzt zusätzlich `class="sr-only"` für das Label, da der Platzhalter „Name oder Organisation…" bereits visuell beschreibt — das `<label>` bleibt für Screenreader erhalten, analog zum Wireframe-Markup `<label for="sh-search" class="sr-only">`).
- Fehler werden nicht nur farblich, sondern zusätzlich über Icon (`pi-exclamation-circle`) + Text vermittelt; Fehler-Container tragen `role="alert"`, Felder `aria-invalid`/`aria-describedby`.
- `p-selectbutton` erhält `ariaLabelledBy` statt eines eigenen sichtbaren Labels pro Option.
- Speichern-Button im Dialogfooter ist `[disabled]="form.invalid"` — zusätzlich serverseitige Validierung abfangen (siehe Abschnitt 3, Error-State).
- Fokus-Reihenfolge im Dialog: Name → Typ → Organisation (falls sichtbar) → Kommunikationsart → Abbrechen → Speichern; `p-dialog` setzt beim Öffnen den Fokus automatisch auf das erste fokussierbare Element.

---

## 3. UI States & Event Handling

### 3.1 Zustände der Hauptliste

| Zustand | Auslöser | Darstellung |
|---|---|---|
| **Initial/Default** | Tab „Stakeholder-Liste" wird geöffnet, Daten vorhanden | `<p-table>` zeigt geladene Zeilen, sortiert nach `aktualisiertAm` absteigend (entspricht der Reihenfolge „vor 2 Std." … „vor 1 Woche" im Wireframe), Trefferzeile zeigt Gesamtzahl ohne „(gefiltert)"-Zusatz |
| **Loading** | Erstes Laden, Filter-/Such-/Sortier-/Seitenwechsel (`onLazyLoad`) | `pTemplate="loadingbody"` rendert 6–8 Skeleton-Zeilen (`<p-skeleton>` je Spalte: Kreis+Balken für Name, Balken für Organisation, zwei pillenförmige Skeletons für Kommunikation, Balken für Bewertung/Datum); `[loading]="true"` an `<p-table>` |
| **Empty (keine Stakeholder im Projekt)** | `totalRecordsUnfiltered === 0` und keine Filter aktiv | `pTemplate="emptymessage"`: Icon `pi-users`, Text „Noch keine Stakeholder in diesem Projekt angelegt.", CTA-Button „Stakeholder anlegen" (öffnet denselben Dialog wie der Toolbar-Button) |
| **Empty (keine Treffer für aktive Filter)** | `totalRecords === 0` bei aktiver Suche/Filterung | Icon `pi-filter-slash`, Text „Keine Stakeholder gefunden für die aktuellen Filter.", Button „Filter zurücksetzen" (`resetFilters()` setzt Suche/Selects zurück und lädt neu) |
| **Error** | `loadStakeholders()` schlägt fehl (API-Fehler) | Tabellenkörper durch Inline-Fehlermeldung ersetzt (`p-message severity="error"`: „Stakeholder konnten nicht geladen werden.") + `<p-button label="Erneut versuchen">`, zusätzlich `<p-toast severity="error">` |
| **Success (Anlegen)** | `onSubmitCreate()` erfolgreich | Dialog schließt, `<p-toast severity="success" summary="Stakeholder angelegt" detail="{{name}} wurde angelegt.">`, `loadStakeholders()` erneut ausgeführt (Trefferzeile aktualisiert sich) |
| **Success (Bearbeiten)** *(Trigger außerhalb dieses Screens)* | Formular wird auch für Edit wiederverwendet | `<p-toast severity="success" summary="Stakeholder aktualisiert">` — analoge Logik, Trigger-UI ist nicht Teil dieser Spec |

### 3.2 Zustände der Papierkorb-Vorschau

Der Papierkorb ist **kein eigener Screen/Dialog**, sondern ein bedingt gerenderter Abschnitt unterhalb der Hauptliste, gesteuert durch `showDeleted` (Toggle) **und** eine Rollenprüfung (`canViewTrash`, nur PL/Admin — Text im Wireframe: „nur PL/Admin sichtbar"). Ist der eingeloggte Nutzer weder PL noch Admin im aktuellen Projekt, wird der gesamte Toggle inkl. Label **nicht gerendert** (`*ngIf="canViewTrash"` auf Toggle und Abschnitt).

| Zustand | Auslöser | Darstellung |
|---|---|---|
| **Ausgeblendet** | `showDeleted === false` (Default) oder `!canViewTrash` | Abschnitt nicht im DOM |
| **Loading** | `showDeleted` wird aktiviert → `loadDeletedStakeholders()` läuft | Skeleton-Zeilen in der Papierkorb-`<p-table>` (`pTemplate="loadingbody"`) |
| **Gefüllt** | Gelöschte Stakeholder vorhanden | Zeilen mit `opacity:.6`-Stil, `<p-tag severity="danger">` „Gelöscht am {{datum}} von {{name}}", Button „Wiederherstellen" je Zeile |
| **Leer** | Keine gelöschten Stakeholder im Projekt | `pTemplate="emptymessage"`: Text „Papierkorb ist leer." (kein Icon/CTA, da keine Aktion sinnvoll ist) |
| **Error** | `loadDeletedStakeholders()` schlägt fehl | `<p-toast severity="error" summary="Papierkorb konnte nicht geladen werden.">`, Abschnitt bleibt sichtbar mit zuletzt bekanntem Stand oder Fehlertext an Stelle der Tabelle |

### 3.3 Event-Handling-Matrix

| UI-Aktion | Handler | Service-Aufruf | Resultierender Zustandswechsel |
|---|---|---|---|
| Eingabe im Suchfeld (debounced, 300ms) | `searchControl.valueChanges` → `onFilterChange()` | `StakeholderService.query({ search, typ, kommunikationsart, page, sort })` | Tabelle → Loading → neue Zeilen + aktualisierte Trefferzeile (`isFiltered = true`, sobald `search` nicht leer) |
| Auswahl „Typ"-Filter | `(onChange)="onFilterChange()"` | s.o. | s.o. |
| Auswahl „Kommunikationsart"-Filter | `(onChange)="onFilterChange()"` | s.o. | s.o. |
| Toggle „Gelöschte anzeigen" | `(onChange)="onToggleShowDeleted($event)"` | bei `true`: `TrashService.getDeletedStakeholders(projectId, filters)`; bei `false`: kein Aufruf | Papierkorb-Abschnitt erscheint/verschwindet, s. 3.2 |
| Sortierklick Spaltenkopf | `p-table` intern → `onLazyLoad` | `StakeholderService.query({ ...aktuelleFilter, sortField, sortOrder })` | Neue Sortierreihenfolge, Loading-Zwischenschritt |
| Seitenwechsel/Zeilenanzahl | `p-table` intern → `onLazyLoad` | s.o. mit `page`/`rows` | Neue Seite geladen |
| Klick/Enter auf Tabellenzeile | `onRowSelect($event)` | keiner (nur Navigation) | `router.navigate(['/projekte', projectId, 'stakeholder', row.id])` → Stakeholder-Detailseite (außerhalb dieser Spec) |
| Klick „Stakeholder anlegen" (Toolbar oder Empty-State-CTA) | `openCreateDialog()` | keiner | `stakeholderForm.reset({ typ: 'PERSON' })`, `createDialogVisible = true` |
| Submit „Speichern" im Dialog | `onSubmitCreate()` | `StakeholderService.create(dto)` | Erfolg: Dialog schließt, Toast, `loadStakeholders()`. Fehler: `<p-message>` inline im Dialog mit Backend-Fehlertext, Dialog bleibt offen, `<p-toast severity="error">` zusätzlich bei nicht feldbezogenen Fehlern (z. B. Konflikt) |
| Klick „Abbrechen" / `(onHide)` am Dialog | `closeCreateDialog()` | keiner | Formular zurückgesetzt, Dialog geschlossen, keine Bestätigung nötig (keine Löschaktion) |
| Klick „Wiederherstellen" | `onRestore(row)` | `TrashService.restore(row.id)` | Während Aufruf: `row.restoring = true` (Button-Spinner). Erfolg: Zeile aus Papierkorb-Liste entfernt (`loadDeletedStakeholders()` erneut oder Zeile lokal filtern), `loadStakeholders()` erneut (Stakeholder erscheint wieder in Hauptliste, Trefferzeile erhöht sich), `<p-toast severity="success" summary="Stakeholder wiederhergestellt">`. Fehler: Zeile bleibt unverändert (kein optimistisches Entfernen vor Serverbestätigung), `<p-toast severity="error" summary="Wiederherstellen fehlgeschlagen">` |

---

## 4. Acceptance Criteria (DoD)

- [ ] Die Hauptliste zeigt exakt die Spalten „Name", „Organisation", „Kommunikation", „Meine Bewertung", „Aktualisiert" in dieser Reihenfolge, per `<p-table>` mit Server-seitiger Pagination (`[lazy]="true"`) und Sortierung je Spalte außer „Kommunikation".
- [ ] Die Default-Sortierung ist „Aktualisiert" absteigend (zuletzt geänderte Stakeholder zuerst).
- [ ] Personen-Stakeholder zeigen ein Personen-Icon (`pi-user`), Organisations-/Team-Stakeholder ein Gebäude-Icon (`pi-building`) vor dem Namen.
- [ ] Ist für einen Stakeholder keine „Meine Bewertung" vorhanden, erscheint statt Werten der Text „– noch nicht bewertet" (keine Platzhalterwerte wie „0").
- [ ] Vorhandene Bewertungen zeigen „E {{einfluss}} · I {{interesse}}" plus die Rollen-Abkürzung als `<p-tag>`, farblich über die Rollenfarb-Tokens aus Abschnitt 1.5 (keine hartkodierten Hex-Werte im Component-Code oder -Stylesheet).
- [ ] Suchfeld filtert nach Name/Organisation mit Debounce (empfohlen 300ms), Ergebnis inkl. Trefferzeile „{{gesamt}} Stakeholder insgesamt" bzw. zusätzlich „ · {{gefiltert}} angezeigt (gefiltert)" sobald ein Filter/Suche aktiv ist.
- [ ] Die Filter „Typ" und „Kommunikationsart" schränken die Serverabfrage ein und sind kombinierbar mit der Suche.
- [ ] Button „Stakeholder anlegen" öffnet einen `<p-dialog>` mit Reactive-Form gemäß Abschnitt 2; alle vier Felder (Name, Typ, Organisation, Kommunikationsart) sind vorhanden, mit den in Abschnitt 2.3 definierten Validatoren und deutschen Fehlermeldungen.
- [ ] Das Feld „Organisation" ist deaktiviert/ausgeblendet bzw. geleert, sobald Typ „Organisation" gewählt ist.
- [ ] Erfolgreiches Anlegen schließt den Dialog, zeigt einen Erfolgs-Toast und aktualisiert die Liste inkl. Trefferzeile ohne vollständigen Seiten-Reload.
- [ ] Fehlgeschlagenes Anlegen (z. B. Serverfehler) hält den Dialog offen, zeigt eine nicht rein farbliche Fehlermeldung und verwirft keine bereits eingegebenen Formulardaten.
- [ ] Der Toggle „Gelöschte anzeigen" sowie der gesamte Papierkorb-Abschnitt sind nur für Nutzer mit Rolle PL oder Admin im aktuellen Projekt sichtbar; für alle anderen Rollen ist weder Toggle noch Papierkorb-Abschnitt im DOM vorhanden.
- [ ] Der Papierkorb-Abschnitt ist standardmäßig eingeklappt/nicht gerendert und erscheint ausschließlich unterhalb der Hauptliste im selben Tab (keine eigene Route, kein Modal).
- [ ] Jeder Papierkorb-Eintrag zeigt „Gelöscht am {{Datum}} von {{Name}}" sowie einen Button „Wiederherstellen".
- [ ] Klick auf „Wiederherstellen" ruft den Restore-Service auf, entfernt den Eintrag nach Erfolg aus dem Papierkorb, lässt ihn wieder in der Hauptliste erscheinen und zeigt einen Erfolgs-Toast; bei Fehler bleibt der Eintrag im Papierkorb erhalten und ein Fehler-Toast erscheint.
- [ ] Während jedes Ladevorgangs (initiales Laden, Filter-/Sortier-/Seitenwechsel, Papierkorb-Laden) werden Skeleton-Zeilen statt eines leeren oder alten Tabellenzustands angezeigt.
- [ ] Ist das Projekt komplett stakeholder-frei, erscheint der definierte Empty-State mit CTA „Stakeholder anlegen"; führt eine aktive Filterung zu null Treffern, erscheint stattdessen der Empty-State „Keine Stakeholder gefunden…" mit „Filter zurücksetzen".
- [ ] Klick (und Tastatur-Enter) auf eine Tabellenzeile der Hauptliste navigiert zur Stakeholder-Detailseite des jeweiligen Stakeholders; Papierkorb-Zeilen sind nicht klickbar/navigierbar (`cursor:default`, wie im Wireframe).
- [ ] Alle Formularfelder besitzen ein natives `<label for>`, sichtbaren Fokusindikator und Fehlermeldungen mit `role="alert"` plus Icon (nicht nur Farbe).
- [ ] Layout nutzt ausschließlich PrimeFlex-Utilities und PrimeNG-CSS-Variablen; es gibt keine hartkodierten Pixelwerte oder Hex-Farben aus dem Wireframe im produktiven Component-Code.
- [ ] Alle sichtbaren Texte sind deutsch und stimmen mit der im Wireframe verwendeten Terminologie überein („Stakeholder", „Papierkorb", „Meine Bewertung", „Gelöschte anzeigen", „Wiederherstellen", „Stakeholder anlegen").
