# SPEC: Admin-Bereich (Nutzer, Projekte, Kommunikationsarten)

> Screen-Referenz: S5 (Wireframe `Admin.dc.html` — Tab „Nutzer" vollständig ausgestaltet) sowie `AdminCatalogs.dc.html` (Zweitartboard, reine Vorschau-Panels für Tab „Projekte" → Mitgliederverwaltung und Tab „Kommunikationsarten" → instanzweiter Katalog). Feature-Referenz F5 (Admin-Bereich allgemein), F5.2 (Mitgliederverwaltung je Projekt), F5.3 (Kommunikationsarten-Katalog).
>
> Zielkomponenten (Angular Feature-Ordner, gemäß Backlog-Konvention):
> - `frontend/src/app/features/admin/admin-page/admin-page.component.ts` (Tab-Host, neu — im Backlog nicht explizit benannt, aber als Träger der drei Tabs erforderlich)
> - `frontend/src/app/features/admin/users-admin/users-admin.component.ts`
> - `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts`
> - `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts`
> - `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.ts` (**Vorschlag** — im Backlog-Auszug nicht als fixer Pfad genannt, hier strukturell analog zu den beiden anderen Admin-Unterfeatures angelegt)
>
> **Wichtige Mapping-Entscheidung (Abweichung von der reinen Wireframe-Optik, bewusst getroffen gemäß Regelwerk-Vorgabe):** Das Wireframe zeigt „Nutzer anlegen" als dauerhaft sichtbares Formular-Panel in der rechten Spalte neben der Nutzertabelle. Die Aufgabenstellung verlangt für alle Anlegen-/Bearbeiten-Formulare (Nutzer anlegen, Passwort zurücksetzen, Projekt anlegen, Mitglied zuweisen, Kommunikationsart anlegen) verbindlich `<p-dialog>`. Diese Spec setzt daher **alle** genannten Formulare als Dialoge um, ausgelöst über einen Button in einer Toolbar oberhalb der jeweiligen Tabelle/Liste. Alle im Wireframe sichtbaren Feld-, Label-, Placeholder- und Hinweistexte bleiben inhaltlich unverändert erhalten — nur der Container wechselt von „permanentes Seitenpanel" zu „Dialog". Diese Entscheidung wird hier festgehalten, damit sie nicht als stille Abweichung erscheint.
>
> **Layout-Grundsatz Sidebar (Abgrenzung zu Screen S4):** Der Admin-Bereich ist instanzweit und **nicht** projektbezogen. Die Hauptnavigation (Sidebar links, außerhalb dieser Spec bereits vorhanden) zeigt hier bewusst **keinen** Projekt-Kontext/-Switcher — nur „Projektübersicht" und „Admin-Bereich" als Top-Level-Navigationspunkte, letzterer aktiv markiert. Diese Spec erzeugt keinen neuen Sidebar-Zustand, sondern setzt voraus, dass die bestehende Sidebar-Komponente beim Routing auf `/admin` keinen Projekt-Kontext rendert.

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Grundsatz Layout & Styling

- Ausschließlich PrimeNG-CSS-Variablen, keine Hex-Werte aus dem Wireframe (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--text-faint`, `--attn`, `--role-pl`, `--role-ct`, `--role-ar` sind Design-Tool-interne Tokens, keine Zielwerte):
  - Seiten-/Panel-Hintergrund → `var(--surface-ground)` bzw. `var(--surface-card)`
  - Tabellen-/Dialog-Rahmen → `var(--surface-border)`
  - Primärtext → `var(--text-color)`
  - Sekundärtext (Tabellen-Metadaten, Hinweistexte, Labels) → `var(--text-color-secondary)`
  - Akzent-/Primäraktion (Buttons, aktiver Tab) → `var(--primary-color)` / `var(--primary-color-text)`
  - Eckenradius Panels/Dialoge → `var(--border-radius)`
- Layout ausschließlich über PrimeFlex-Utility-Klassen: `flex`, `flex-column`, `grid`, `col-12`, `col-8`, `col-4`, `align-items-center`, `justify-content-between`, `gap-2`/`gap-3`, `p-4`, `w-full`.
- Keine Inline-Pixelwerte, keine Hex-Farben im Komponenten-Template.
- Die drei Rollen-Badges im Wireframe (PL/lila, Coreteam/türkis, Architect/blau) werden **nicht** über eigene Hex-Töne nachgebaut, sondern über unterschiedliche `p-tag`-`severity`-Werte differenziert (deterministisches, projektweites Mapping, siehe 1.4): `PL` → `severity="contrast"`, `Coreteam` → `severity="success"`, `Architect` → `severity="info"`.

### 1.2 Component Tree — Tab-Host (`admin-page.component.html`)

```html
<div class="flex flex-column gap-4 p-4">
  <h1 class="text-2xl font-semibold m-0" style="color: var(--text-color);">Admin-Bereich</h1>

  <p-tabs [(value)]="activeTab" styleClass="admin-tabs">
    <p-tablist>
      <p-tab value="users">Nutzer</p-tab>
      <p-tab value="projects">Projekte</p-tab>
      <p-tab value="communication-types">Kommunikationsarten</p-tab>
    </p-tablist>
    <p-tabpanels>
      <p-tabpanel value="users">
        <app-users-admin></app-users-admin>
      </p-tabpanel>
      <p-tabpanel value="projects">
        <app-projects-admin></app-projects-admin>
      </p-tabpanel>
      <p-tabpanel value="communication-types">
        <app-communication-types-admin></app-communication-types-admin>
      </p-tabpanel>
    </p-tabpanels>
  </p-tabs>
</div>

<p-toast position="top-right"></p-toast>
<p-confirmdialog [style]="{ width: '28rem' }"></p-confirmdialog>
```

- `<p-toast>` und `<p-confirmdialog>` werden genau **einmal** auf Ebene des Tab-Hosts eingebunden (nicht pro Tab-Kind-Komponente), da alle drei Tabs dieselben globalen Services (`MessageService`, `ConfirmationService`) nutzen.
- `[(value)]="activeTab"` hält den aktiven Tab in einem Signal/State der Host-Komponente; kein Deep-Link/Query-Param-Handling ist im Wireframe erkennbar, daher hier nicht spezifiziert.

### 1.3 Component Tree — Tab „Nutzer" (`users-admin.component.html`)

```html
<div class="flex flex-column gap-3">

  <p-toolbar>
    <ng-template pTemplate="end">
      <p-button label="Nutzer anlegen" icon="pi pi-plus" (onClick)="openCreateUserDialog()"></p-button>
    </ng-template>
  </p-toolbar>

  <!-- LOADING-STATE: Skeleton-Zeilen statt Tabelleninhalt, siehe Abschnitt 3.1 -->
  <div class="flex flex-column gap-2" *ngIf="loading()">
    <p-skeleton height="2.5rem" *ngFor="let i of skeletonRows"></p-skeleton>
  </div>

  <p-table *ngIf="!loading()"
           [value]="users()"
           dataKey="id"
           responsiveLayout="scroll"
           styleClass="p-datatable-sm">
    <ng-template pTemplate="header">
      <tr>
        <th scope="col">Name</th>
        <th scope="col">E-Mail</th>
        <th scope="col">Status</th>
        <th scope="col">Erstellt am</th>
        <th scope="col"></th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-user>
      <tr>
        <td class="font-semibold">{{ user.name }}</td>
        <td style="font-family: var(--font-family-monospace, monospace); color: var(--text-color-secondary);">
          {{ user.email }}
        </td>
        <td>
          <p-tag *ngIf="user.mustChangePassword" severity="warn" value="Muss Passwort ändern"></p-tag>
          <span *ngIf="!user.mustChangePassword" style="color: var(--text-color-secondary);">—</span>
        </td>
        <td style="color: var(--text-color-secondary);">{{ user.createdAt | date: 'dd.MM.yyyy' }}</td>
        <td class="text-right">
          <p-button label="Passwort zurücksetzen"
                    [text]="true"
                    size="small"
                    (onClick)="confirmResetPassword(user)">
          </p-button>
        </td>
      </tr>
    </ng-template>
    <!-- EMPTY-STATE, siehe Abschnitt 3.1 -->
    <ng-template pTemplate="emptymessage">
      <tr>
        <td colspan="5" class="text-center" style="color: var(--text-color-secondary);">
          Es sind noch keine Nutzer angelegt. Über „Nutzer anlegen" wird das erste Konto erstellt.
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>

<!-- DIALOG: Nutzer anlegen -->
<p-dialog header="Nutzer anlegen"
          [(visible)]="createUserDialogVisible"
          [modal]="true"
          styleClass="w-30rem"
          [style]="{ 'border-radius': 'var(--border-radius)' }">
  <form [formGroup]="createUserForm" (ngSubmit)="submitCreateUser()" class="flex flex-column gap-3" novalidate>

    <div class="flex flex-column gap-2">
      <label for="u-name" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Name</label>
      <input pInputText id="u-name" type="text" formControlName="name" placeholder="Vor- und Nachname" class="w-full"
             [attr.aria-invalid]="nameControl.invalid && nameControl.touched"
             [attr.aria-describedby]="nameControl.invalid && nameControl.touched ? 'u-name-error' : null" />
      <small id="u-name-error" *ngIf="nameControl.invalid && nameControl.touched" style="color: var(--red-500);">
        {{ nameErrorMessage }}
      </small>
    </div>

    <div class="flex flex-column gap-2">
      <label for="u-mail" class="text-sm font-semibold" style="color: var(--text-color-secondary);">E-Mail</label>
      <input pInputText id="u-mail" type="text" formControlName="email" placeholder="name@firma.de" class="w-full"
             [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
             [attr.aria-describedby]="emailControl.invalid && emailControl.touched ? 'u-mail-error' : null" />
      <small id="u-mail-error" *ngIf="emailControl.invalid && emailControl.touched" style="color: var(--red-500);">
        {{ emailErrorMessage }}
      </small>
    </div>

    <div class="flex flex-column gap-2">
      <label for="u-pw" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Initiales Passwort</label>
      <input pInputText id="u-pw" type="text" formControlName="initialPassword"
             placeholder="Wird bei erstem Login geändert" class="w-full"
             [attr.aria-invalid]="initialPasswordControl.invalid && initialPasswordControl.touched"
             [attr.aria-describedby]="initialPasswordControl.invalid && initialPasswordControl.touched ? 'u-pw-error' : null" />
      <small id="u-pw-error" *ngIf="initialPasswordControl.invalid && initialPasswordControl.touched" style="color: var(--red-500);">
        {{ initialPasswordErrorMessage }}
      </small>
    </div>

    <small style="color: var(--text-color-secondary); line-height: 1.5;">
      Keine Selbstregistrierung: Der einzige Weg zu einem Konto ist die Anlage hier. Die Projektzuweisung inkl. Rolle
      erfolgt anschließend im Tab „Projekte".
    </small>
  </form>

  <ng-template pTemplate="footer">
    <p-button label="Abbrechen" [text]="true" (onClick)="closeCreateUserDialog()"></p-button>
    <p-button label="Nutzer anlegen" (onClick)="submitCreateUser()"
              [loading]="submittingUser()" [disabled]="createUserForm.invalid || submittingUser()">
    </p-button>
  </ng-template>
</p-dialog>
```

- Die Zeilenaktion „Passwort zurücksetzen" öffnet **keinen** Dialog mit Formularfeldern, sondern löst `ConfirmationService.confirm(...)` aus (siehe Abschnitt 3.1) — kritische, destruktive Aktion, kein Klick-ohne-Rückfrage.
- `mustChangePassword`-Badge nur für Nutzer, deren initiales Passwort noch nicht geändert wurde (Wireframe-Zeile „Jonas Weiß"); alle anderen Zeilen zeigen „—" (`meta`-Spalte im Wireframe) statt Badge.

### 1.4 Component Tree — Tab „Projekte" (`projects-admin.component.html` + `project-membership-manager.component.html`)

`AdminCatalogs.dc.html` zeigt für diesen Tab ausschließlich das Detail-Panel „Mitgliederverwaltung" eines bereits ausgewählten Projekts (`ERP-Einführung Rewe`). Die Notiz „strukturell dem Admin-Nutzer-Tab folgen" wird so umgesetzt, dass links analog zum Nutzer-Tab eine Projektliste steht und rechts das im Wireframe gezeigte Mitgliederverwaltungs-Panel für das ausgewählte Projekt erscheint.

```html
<!-- projects-admin.component.html -->
<div class="flex flex-column gap-3">

  <p-toolbar>
    <ng-template pTemplate="end">
      <p-button label="Projekt anlegen" icon="pi pi-plus" (onClick)="openCreateProjectDialog()"></p-button>
    </ng-template>
  </p-toolbar>

  <div class="grid">
    <div class="col-12 lg:col-6">
      <div class="flex flex-column gap-2" *ngIf="loading()">
        <p-skeleton height="2.5rem" *ngFor="let i of skeletonRows"></p-skeleton>
      </div>

      <p-table *ngIf="!loading()"
               [value]="projects()"
               [(selection)]="selectedProject"
               selectionMode="single"
               dataKey="id"
               (onRowSelect)="onSelectProject($event.data)"
               styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Mitglieder</th>
            <th scope="col">Erstellt am</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-project>
          <tr [pSelectableRow]="project" style="cursor: pointer;">
            <td class="font-semibold">{{ project.name }}</td>
            <td><p-tag [severity]="project.active ? 'success' : 'secondary'" [value]="project.active ? 'Aktiv' : 'Inaktiv'"></p-tag></td>
            <td style="color: var(--text-color-secondary);">{{ project.memberCount }}</td>
            <td style="color: var(--text-color-secondary);">{{ project.createdAt | date: 'dd.MM.yyyy' }}</td>
          </tr>
        </ng-template>
        <!-- EMPTY-STATE -->
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="4" class="text-center" style="color: var(--text-color-secondary);">
              Es sind noch keine Projekte angelegt.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <div class="col-12 lg:col-6">
      <app-project-membership-manager *ngIf="selectedProject() as project" [project]="project"></app-project-membership-manager>
      <p class="text-center" style="color: var(--text-color-secondary);" *ngIf="!selectedProject()">
        Ein Projekt auswählen, um die Mitgliederverwaltung anzuzeigen.
      </p>
    </div>
  </div>
</div>

<!-- DIALOG: Projekt anlegen -->
<p-dialog header="Projekt anlegen" [(visible)]="createProjectDialogVisible" [modal]="true" styleClass="w-30rem">
  <form [formGroup]="createProjectForm" (ngSubmit)="submitCreateProject()" class="flex flex-column gap-3" novalidate>
    <div class="flex flex-column gap-2">
      <label for="p-name" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Projektname</label>
      <input pInputText id="p-name" type="text" formControlName="name" placeholder="Projektname" class="w-full"
             [attr.aria-invalid]="projectNameControl.invalid && projectNameControl.touched"
             [attr.aria-describedby]="projectNameControl.invalid && projectNameControl.touched ? 'p-name-error' : null" />
      <small id="p-name-error" *ngIf="projectNameControl.invalid && projectNameControl.touched" style="color: var(--red-500);">
        {{ projectNameErrorMessage }}
      </small>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <p-button label="Abbrechen" [text]="true" (onClick)="closeCreateProjectDialog()"></p-button>
    <p-button label="Projekt anlegen" (onClick)="submitCreateProject()"
              [loading]="submittingProject()" [disabled]="createProjectForm.invalid || submittingProject()">
    </p-button>
  </ng-template>
</p-dialog>
```

**Anmerkung (Abschnitt 6 CLAUDE.md — Abweichung/Ergänzung gegenüber Wireframe):** Weder Projektliste noch „Projekt anlegen"-Dialog sind im gelieferten Wireframe-Ausschnitt visuell abgebildet (`AdminCatalogs.dc.html` zeigt nur das bereits selektierte Detail-Panel). Beide werden hier ausschließlich aus der Designer-Notiz „strukturell dem Admin-Nutzer-Tab folgen" sowie der expliziten Formular-Vorgabe der Aufgabenstellung abgeleitet (Strukturparallele zu Tab „Nutzer": Liste links, Anlegen-Aktion oben rechts als Toolbar-Button/Dialog). Feldumfang des „Projekt anlegen"-Dialogs ist auf das im Wireframe für Projekte einzig erkennbare Attribut (`Projektname`) beschränkt — es werden keine weiteren, im Wireframe nicht sichtbaren Felder erfunden.

```html
<!-- project-membership-manager.component.html -->
<div class="p-4 flex flex-column gap-3" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius);">

  <div class="flex align-items-baseline justify-content-between">
    <span class="font-semibold" style="color: var(--text-color);">{{ project.name }}</span>
    <span class="text-sm" style="color: var(--text-color-secondary);">
      {{ project.active ? 'Aktiv' : 'Inaktiv' }} · {{ project.members.length }} Mitglieder
    </span>
  </div>

  <div class="flex flex-column">
    <div class="flex align-items-center gap-3 py-2" style="border-bottom: 1px solid var(--surface-border);"
         *ngFor="let member of project.members">
      <p-avatar [label]="member.initials" shape="circle" size="normal"></p-avatar>
      <span class="flex-1 font-semibold" style="color: var(--text-color);">{{ member.name }}</span>

      <p-select [options]="roleOptions"
                [(ngModel)]="member.role"
                optionLabel="label"
                optionValue="value"
                (onChange)="onRoleChange(member, $event.value)"
                [ariaLabel]="'Rolle von ' + member.name">
        <ng-template pTemplate="selectedItem" let-selected>
          <p-tag [severity]="roleSeverity(selected)" [value]="roleLabel(selected)"></p-tag>
        </ng-template>
      </p-select>

      <p-button icon="pi pi-times" [text]="true" [rounded]="true" severity="secondary"
                [ariaLabel]="'Mitgliedschaft von ' + member.name + ' entfernen'"
                (onClick)="confirmRemoveMember(member)">
      </p-button>
    </div>

    <!-- EMPTY-STATE: Projekt ohne Mitglieder -->
    <p *ngIf="project.members.length === 0" class="text-center py-3" style="color: var(--text-color-secondary);">
      Diesem Projekt sind noch keine Nutzer zugewiesen.
    </p>

    <p-button label="Nutzer hinzufügen" icon="pi pi-plus" [text]="true" (onClick)="openAssignMemberDialog()"></p-button>
  </div>

  <small style="color: var(--text-color-secondary); line-height: 1.5; border-top: 1px solid var(--surface-border); padding-top: 0.75rem;">
    Entzug einer Zuweisung entfernt den Zugriff sofort, lässt aber bereits erfasste Assessments der Rolle unangetastet —
    sie gehören der Rolle im Projekt, nicht der Person.
  </small>
</div>

<!-- DIALOG: Mitglied zuweisen -->
<p-dialog header="Mitglied zuweisen" [(visible)]="assignMemberDialogVisible" [modal]="true" styleClass="w-30rem">
  <form [formGroup]="assignMemberForm" (ngSubmit)="submitAssignMember()" class="flex flex-column gap-3" novalidate>
    <div class="flex flex-column gap-2">
      <label for="m-user" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Nutzer</label>
      <p-select inputId="m-user" [options]="assignableUsers()" optionLabel="name" optionValue="id"
                formControlName="userId" placeholder="Nutzer auswählen" [filter]="true" class="w-full"
                [attr.aria-invalid]="userIdControl.invalid && userIdControl.touched"
                [attr.aria-describedby]="userIdControl.invalid && userIdControl.touched ? 'm-user-error' : null">
      </p-select>
      <small id="m-user-error" *ngIf="userIdControl.invalid && userIdControl.touched" style="color: var(--red-500);">
        {{ userIdErrorMessage }}
      </small>
    </div>
    <div class="flex flex-column gap-2">
      <label for="m-role" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Rolle</label>
      <p-select inputId="m-role" [options]="roleOptions" optionLabel="label" optionValue="value"
                formControlName="role" placeholder="Rolle auswählen" class="w-full"
                [attr.aria-invalid]="roleControl.invalid && roleControl.touched"
                [attr.aria-describedby]="roleControl.invalid && roleControl.touched ? 'm-role-error' : null">
      </p-select>
      <small id="m-role-error" *ngIf="roleControl.invalid && roleControl.touched" style="color: var(--red-500);">
        {{ roleErrorMessage }}
      </small>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <p-button label="Abbrechen" [text]="true" (onClick)="closeAssignMemberDialog()"></p-button>
    <p-button label="Zuweisen" (onClick)="submitAssignMember()"
              [loading]="submittingMember()" [disabled]="assignMemberForm.invalid || submittingMember()">
    </p-button>
  </ng-template>
</p-dialog>
```

- Rollen-Optionen (`roleOptions`) exakt die drei im Wireframe sichtbaren Rollen-Badges: `PL`, `Coreteam`, `Architect` (Werte/Labels 1:1 aus dem Wireframe-Text übernommen, keine Übersetzung/Umbenennung).
- `roleSeverity()`/`roleLabel()` sind reine Template-Hilfsfunktionen der Komponente, kein neuer Service.
- Entfernen einer Mitgliedschaft (`remove-x`-Icon im Wireframe) läuft **nicht** direkt über `onClick`, sondern über `confirmRemoveMember()` → `ConfirmationService.confirm(...)`, da das Entfernen laut Wireframe-Hinweistext eine Zugriffsänderung mit sofortiger Wirkung ist (siehe Abschnitt 3.2).

### 1.5 Component Tree — Tab „Kommunikationsarten" (`communication-types-admin.component.html`)

**Ordnerhinweis:** `frontend/src/app/features/admin/communication-types-admin/` ist im vorgegebenen Backlog-Auszug nicht als fixer Pfad genannt und wird hier als **Vorschlag** (strukturelle Analogie zu `users-admin` und `projects-admin`) verwendet.

```html
<div class="flex flex-column gap-3">

  <p-toolbar>
    <ng-template pTemplate="end">
      <p-button label="Kommunikationsart anlegen" icon="pi pi-plus" (onClick)="openCreateTypeDialog()"></p-button>
    </ng-template>
  </p-toolbar>

  <div class="flex flex-column gap-2" *ngIf="loading()">
    <p-skeleton height="2.5rem" *ngFor="let i of skeletonRows"></p-skeleton>
  </div>

  <div *ngIf="!loading()" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--border-radius);" class="p-3 flex flex-column">
    <div class="flex align-items-center gap-3 py-2" style="border-bottom: 1px solid var(--surface-border);"
         *ngFor="let type of communicationTypes()">
      <span class="flex-1 font-semibold"
            [style.color]="type.active ? 'var(--text-color)' : 'var(--text-color-secondary)'"
            [style.text-decoration]="type.active ? 'none' : 'line-through'">
        {{ type.name }}
      </span>
      <p-tag [severity]="type.active ? 'success' : 'secondary'" [value]="type.active ? 'Aktiv' : 'Deaktiviert'"></p-tag>
      <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary"
                [ariaLabel]="'Kommunikationsart ' + type.name + ' bearbeiten'"
                (onClick)="openEditTypeDialog(type)">
      </p-button>
    </div>

    <!-- EMPTY-STATE -->
    <p *ngIf="communicationTypes().length === 0" class="text-center py-3" style="color: var(--text-color-secondary);">
      Es sind noch keine Kommunikationsarten angelegt.
    </p>

    <p-button label="Kommunikationsart hinzufügen" icon="pi pi-plus" [text]="true" (onClick)="openCreateTypeDialog()"></p-button>

    <small style="color: var(--text-color-secondary); line-height: 1.5; border-top: 1px solid var(--surface-border); padding-top: 0.75rem;">
      Deaktivierte Einträge (z. B. „Pressemitteilung") bleiben an bereits zugeordneten Stakeholdern sichtbar, stehen
      aber bei neuen Zuordnungen nicht mehr zur Auswahl.
    </small>
  </div>
</div>

<!-- DIALOG: Kommunikationsart anlegen / bearbeiten (ein Dialog, zwei Modi) -->
<p-dialog [header]="editingType() ? 'Kommunikationsart bearbeiten' : 'Kommunikationsart anlegen'"
          [(visible)]="typeDialogVisible" [modal]="true" styleClass="w-30rem">
  <form [formGroup]="communicationTypeForm" (ngSubmit)="submitCommunicationType()" class="flex flex-column gap-3" novalidate>
    <div class="flex flex-column gap-2">
      <label for="c-name" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Bezeichnung</label>
      <input pInputText id="c-name" type="text" formControlName="name" placeholder="z. B. Newsletter" class="w-full"
             [attr.aria-invalid]="typeNameControl.invalid && typeNameControl.touched"
             [attr.aria-describedby]="typeNameControl.invalid && typeNameControl.touched ? 'c-name-error' : null" />
      <small id="c-name-error" *ngIf="typeNameControl.invalid && typeNameControl.touched" style="color: var(--red-500);">
        {{ typeNameErrorMessage }}
      </small>
    </div>

    <div class="flex align-items-center gap-2" *ngIf="editingType()">
      <p-toggleswitch inputId="c-active" formControlName="active"></p-toggleswitch>
      <label for="c-active" class="text-sm font-semibold" style="color: var(--text-color-secondary);">Aktiv</label>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <p-button label="Abbrechen" [text]="true" (onClick)="closeTypeDialog()"></p-button>
    <p-button [label]="editingType() ? 'Speichern' : 'Kommunikationsart anlegen'" (onClick)="submitCommunicationType()"
              [loading]="submittingType()" [disabled]="communicationTypeForm.invalid || submittingType()">
    </p-button>
  </ng-template>
</p-dialog>
```

- Das Stift-/Bearbeiten-Icon (`icon-btn` im Wireframe) ist die einzige Zeilenaktion; Deaktivieren einer Kommunikationsart erfolgt **innerhalb** dieses Bearbeiten-Dialogs über den `Aktiv`-Toggle, nicht über eine separate Lösch-/Deaktivieren-Aktion in der Zeile (im Wireframe existiert kein zweites Icon pro Zeile).
- Beim Anlegen (`editingType() === null`) ist der `Aktiv`-Toggle nicht sichtbar; neue Kommunikationsarten werden serverseitig als aktiv angelegt (Default), analog zu allen vier „Aktiv"-Einträgen im Wireframe.

---

## 2. Forms, Directives & Validation

Alle Formulare dieser Spec werden als **Reactive Forms** (`FormGroup`/`FormControl`, aufgebaut via `FormBuilder`) implementiert. Keine Template-Driven-Forms, kein `ngModel` außer für die inline editierbare Rollen-Zuweisung in 2.3 (dort bewusst `[(ngModel)]` auf einem einzelnen `p-select` außerhalb eines Formularkontexts, siehe Begründung dort).

### 2.1 `createUserForm` (Tab „Nutzer" — Dialog „Nutzer anlegen")

```ts
this.createUserForm = this.fb.group({
  name: ['', [Validators.required, Validators.maxLength(200)]],
  email: ['', [Validators.required, Validators.email]],
  initialPassword: ['', [Validators.required, Validators.minLength(8)]],
});
```

| Control | Validatoren | Fehlermeldung (deutsch) |
|---|---|---|
| `name` | `Validators.required` | „Name ist erforderlich." |
| `name` | `Validators.maxLength(200)` | „Der Name darf maximal 200 Zeichen lang sein." |
| `email` | `Validators.required` | „E-Mail ist erforderlich." |
| `email` | `Validators.email` | „Bitte eine gültige E-Mail-Adresse eingeben." |
| `initialPassword` | `Validators.required` | „Initiales Passwort ist erforderlich." |
| `initialPassword` | `Validators.minLength(8)` | „Das Passwort muss mindestens 8 Zeichen lang sein." |

Serverseitige Ablehnung wegen bereits vergebener E-Mail-Adresse wird auf `emailControl.setErrors({ emailTaken: true })` gemappt und als „Diese E-Mail-Adresse wird bereits verwendet." angezeigt (zusätzlich zum Toast-Fehler, siehe Abschnitt 3.1).

### 2.2 `createProjectForm` (Tab „Projekte" — Dialog „Projekt anlegen")

```ts
this.createProjectForm = this.fb.group({
  name: ['', [Validators.required, Validators.maxLength(200)]],
});
```

| Control | Validatoren | Fehlermeldung (deutsch) |
|---|---|---|
| `name` | `Validators.required` | „Projektname ist erforderlich." |
| `name` | `Validators.maxLength(200)` | „Der Projektname darf maximal 200 Zeichen lang sein." |

### 2.3 `assignMemberForm` (Tab „Projekte" — Dialog „Mitglied zuweisen")

```ts
this.assignMemberForm = this.fb.group({
  userId: [null, [Validators.required]],
  role: [null, [Validators.required]],
});
```

| Control | Validatoren | Fehlermeldung (deutsch) |
|---|---|---|
| `userId` | `Validators.required` | „Bitte einen Nutzer auswählen." |
| `role` | `Validators.required` | „Bitte eine Rolle auswählen." |

Zusätzlich, außerhalb dieses Dialog-Formulars: Die **inline** Rollenänderung eines bereits zugewiesenen Mitglieds (Dropdown-Chevron direkt in der Mitgliederzeile, siehe 1.4) wird bewusst **nicht** über ein `FormControl`, sondern über `[(ngModel)]` mit sofortigem `(onChange)`-Speichern umgesetzt, da es sich um eine einzelne, isolierte Inline-Bearbeitung pro Tabellenzeile handelt (kein mehrfeldriges Formular, kein Submit-Button im Wireframe erkennbar) — konsistent mit dem PrimeNG-Pattern für Inline-Edits in Listen/Tabellen.

### 2.4 `communicationTypeForm` (Tab „Kommunikationsarten" — Dialog „Kommunikationsart anlegen/bearbeiten")

```ts
this.communicationTypeForm = this.fb.group({
  name: ['', [Validators.required, Validators.maxLength(100)]],
  active: [true],
});
```

| Control | Validatoren | Fehlermeldung (deutsch) |
|---|---|---|
| `name` | `Validators.required` | „Bezeichnung ist erforderlich." |
| `name` | `Validators.maxLength(100)` | „Die Bezeichnung darf maximal 100 Zeichen lang sein." |

`active` hat keinen Validator (Boolean, immer gültig); beim Anlegen ist das Feld nicht sichtbar und bleibt auf dem Default `true`.

### 2.5 Passwort zurücksetzen — kein Formular

Die Aktion „Passwort zurücksetzen" hat **kein** eigenes `FormGroup` — es werden keine Eingabefelder benötigt (das System generiert serverseitig ein neues initiales Passwort). Der Vorgang läuft ausschließlich über `ConfirmationService.confirm(...)` (siehe Abschnitt 3.1). Dies ist keine ausgelassene Anforderung, sondern folgt direkt aus dem Wireframe, das für diese Aktion keinerlei Eingabefeld zeigt.

### 2.6 Gemeinsame Directives & Barrierefreiheit

- `[formGroup]` / `formControlName` auf allen vier Formularen (Reactive-Forms-API).
- `pInputText` als Directive auf allen einzeiligen Text-`<input>`-Feldern.
- `p-select` für Rollen- und Nutzerauswahl (Single-Select, kein `p-multiselect`, da pro Mitgliedschaft genau eine Rolle und genau ein Nutzer gewählt wird).
- `p-toggleswitch` für den `Aktiv`-Status einer Kommunikationsart.
- Jedes Formularfeld hat ein natives `<label for="...">`/`inputId`-Pairing — kein reiner Placeholder als Label-Ersatz (Placeholder wie „name@firma.de" oder „Wird bei erstem Login geändert" sind zusätzliche Hinweise, kein Label-Ersatz).
- Fehler werden nie ausschließlich farblich kodiert: `aria-invalid` und `aria-describedby` verknüpfen Feld und Fehlertext programmatisch; der Fehlertext ist als sichtbarer Text vorhanden.
- Alle destruktiven/kritischen Aktionen (Passwort zurücksetzen, Mitgliedschaft entfernen) laufen ausschließlich über `<p-confirmdialog>` — niemals per einfachem Klick ohne Rückfrage (WCAG 2.1 AA, Schutz vor Fehlbedienung).

---

## 3. UI States & Event Handling

### 3.1 Tab „Nutzer"

**Initial-/Default-Zustand**
- Beim Aktivieren des Tabs wird `loading = true` gesetzt und die Nutzerliste geladen; Formular-Dialog ist geschlossen (`createUserDialogVisible = false`).

**Loading-Zustand**
- Solange `loading() === true`: `<p-skeleton>`-Platzhalterzeilen anstelle der Tabelle (siehe 1.3), Toolbar-Button „Nutzer anlegen" bleibt bedienbar.

**Empty-Zustand**
- `users().length === 0` nach abgeschlossenem Laden → `p-table`-`emptymessage`-Template: „Es sind noch keine Nutzer angelegt. Über „Nutzer anlegen" wird das erste Konto erstellt."

**Event: Klick „Nutzer anlegen" (Toolbar)**
- `openCreateUserDialog()` → `createUserForm.reset()`, `createUserDialogVisible = true`.

**Event: Submit „Nutzer anlegen"**
- Voraussetzung: `createUserForm.valid`.
- `submitCreateUser()` → `submittingUser = true`, Button/Formular zeigen Loading-State, Formularfelder gesperrt.
- Erfolg → `submittingUser = false`, `createUserDialogVisible = false`, Nutzerliste wird neu geladen (neuer Nutzer erscheint), `<p-toast severity="success" summary="Nutzer wurde angelegt">`.
- Fehler (z. B. E-Mail bereits vergeben) → `submittingUser = false`, Dialog bleibt offen, Fehler wird inline am betroffenen Feld angezeigt (Abschnitt 2.1) **und** zusätzlich `<p-toast severity="error" summary="Nutzer konnte nicht angelegt werden">` bei technischen/Server-Fehlern ohne Feldbezug.

**Event: Klick „Abbrechen" im Dialog**
- `closeCreateUserDialog()` → `createUserDialogVisible = false`, `createUserForm.reset()`.

**Event: Klick „Passwort zurücksetzen" (Zeilenaktion)**
- `confirmResetPassword(user)` → `ConfirmationService.confirm({ header: 'Passwort zurücksetzen', message: 'Das Passwort von ' + user.name + ' wird zurückgesetzt. Der Nutzer muss beim nächsten Login ein neues Passwort vergeben. Fortfahren?', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Zurücksetzen', rejectLabel: 'Abbrechen' })`.
- Bei Bestätigung (`accept`): Request an den Passwort-Reset-Endpunkt (außerhalb dieser Spec) → Erfolg: `<p-toast severity="success" summary="Passwort wurde zurückgesetzt">`, betroffene Zeile erhält den Badge „Muss Passwort ändern"; Fehler: `<p-toast severity="error" summary="Passwort konnte nicht zurückgesetzt werden">`.
- Bei Ablehnung (`reject`) oder Schließen des Confirm-Dialogs: keine Aktion, Zustand unverändert.

**Error-Zustand (Laden der Liste)**
- Schlägt das initiale Laden der Nutzerliste fehl → `loading = false`, Tabelle bleibt leer, `<p-message severity="error">` oberhalb der Tabelle („Nutzer konnten nicht geladen werden.") sowie `<p-toast severity="error">`.

### 3.2 Tab „Projekte"

**Initial-/Default-Zustand**
- Beim Aktivieren des Tabs: `loading = true`, Projektliste wird geladen, `selectedProject = null` (rechte Spalte zeigt Platzhaltertext „Ein Projekt auswählen, um die Mitgliederverwaltung anzuzeigen.").

**Loading-Zustand**
- Solange `loading() === true`: `<p-skeleton>`-Platzhalterzeilen in der Projektliste (siehe 1.4).

**Empty-Zustand**
- `projects().length === 0` → `emptymessage`-Template „Es sind noch keine Projekte angelegt."
- Innerhalb eines ausgewählten Projekts ohne Mitglieder: „Diesem Projekt sind noch keine Nutzer zugewiesen." (siehe 1.4).

**Event: Klick „Projekt anlegen" (Toolbar)**
- `openCreateProjectDialog()` → `createProjectForm.reset()`, `createProjectDialogVisible = true`.

**Event: Submit „Projekt anlegen"**
- Voraussetzung: `createProjectForm.valid`.
- Erfolg → Dialog schließt, Projektliste wird neu geladen, `<p-toast severity="success" summary="Projekt wurde angelegt">`.
- Fehler → Dialog bleibt offen, Inline-Fehler am Feld bzw. `<p-toast severity="error">` bei technischem Fehler.

**Event: Auswahl einer Projektzeile**
- `onSelectProject(project)` → `selectedProject = project`, `project-membership-manager` rendert das Panel für dieses Projekt.

**Event: Klick „Nutzer hinzufügen" (innerhalb Mitgliederverwaltung)**
- `openAssignMemberDialog()` → `assignMemberForm.reset()`, Liste `assignableUsers()` wird geladen (alle Nutzer, die diesem Projekt noch nicht zugewiesen sind), `assignMemberDialogVisible = true`.

**Event: Submit „Mitglied zuweisen"**
- Voraussetzung: `assignMemberForm.valid`.
- Erfolg → Dialog schließt, Mitgliederliste des Projekts wird aktualisiert (neue Zeile erscheint), `<p-toast severity="success" summary="Mitglied wurde zugewiesen">`.
- Fehler → Dialog bleibt offen, Inline-Fehler bzw. `<p-toast severity="error" summary="Mitglied konnte nicht zugewiesen werden">`.

**Event: Änderung der Rolle einer bestehenden Mitgliedschaft (inline `p-select`)**
- `onRoleChange(member, newRole)` → sofortiges Speichern (kein separater Bestätigungsschritt, da keine destruktive Aktion). Erfolg → `<p-toast severity="success" summary="Rolle wurde aktualisiert">`. Fehler → Rollback auf vorherigen Wert im UI, `<p-toast severity="error" summary="Rolle konnte nicht aktualisiert werden">`.

**Event: Klick auf „Entfernen"-Icon einer Mitgliedschaft**
- `confirmRemoveMember(member)` → `ConfirmationService.confirm({ header: 'Mitgliedschaft entfernen', message: member.name + ' wird aus dem Projekt entfernt und verliert den Zugriff sofort. Bereits erfasste Assessments dieser Rolle bleiben erhalten. Fortfahren?', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Entfernen', rejectLabel: 'Abbrechen' })`.
- Bei Bestätigung: Request → Erfolg: Zeile verschwindet aus der Liste, `memberCount` wird dekrementiert, `<p-toast severity="success" summary="Mitgliedschaft wurde entfernt">`; Fehler: `<p-toast severity="error" summary="Mitgliedschaft konnte nicht entfernt werden">`.
- Bei Ablehnung: keine Aktion.

**Error-Zustand (Laden)**
- Schlägt das Laden der Projektliste oder der Mitgliederliste fehl → `<p-message severity="error">` an entsprechender Stelle sowie `<p-toast severity="error">`.

### 3.3 Tab „Kommunikationsarten"

**Initial-/Default-Zustand**
- Beim Aktivieren des Tabs: `loading = true`, Liste der Kommunikationsarten wird geladen; Dialog geschlossen (`typeDialogVisible = false`, `editingType = null`).

**Loading-Zustand**
- Solange `loading() === true`: `<p-skeleton>`-Platzhalterzeilen (siehe 1.5).

**Empty-Zustand**
- `communicationTypes().length === 0` → „Es sind noch keine Kommunikationsarten angelegt."

**Event: Klick „Kommunikationsart anlegen/hinzufügen" (Toolbar oder Listenzeile)**
- `openCreateTypeDialog()` → `editingType = null`, `communicationTypeForm.reset({ active: true })`, `typeDialogVisible = true`.

**Event: Klick Stift-Icon einer Zeile**
- `openEditTypeDialog(type)` → `editingType = type`, `communicationTypeForm.patchValue({ name: type.name, active: type.active })`, `typeDialogVisible = true`.

**Event: Submit (Anlegen oder Bearbeiten)**
- Voraussetzung: `communicationTypeForm.valid`.
- Anlegen, Erfolg → Dialog schließt, Liste aktualisiert (neuer Eintrag „Aktiv"), `<p-toast severity="success" summary="Kommunikationsart wurde angelegt">`.
- Bearbeiten, Erfolg (inkl. Statuswechsel über den `Aktiv`-Toggle) → Dialog schließt, Liste aktualisiert, `<p-toast severity="success" summary="Kommunikationsart wurde aktualisiert">`. Wird dabei `active` von `true` auf `false` gesetzt, erscheint der Eintrag in der Liste sofort durchgestrichen mit Status-Pill „Deaktiviert" (analog „Pressemitteilung" im Wireframe) — bereits an Stakeholdern zugeordnete Vorkommen dieser Kommunikationsart bleiben unangetastet (reine Sichtbarkeitsregel bei künftigen Zuordnungen, keine Kaskadenlöschung).
- Fehler (z. B. Name bereits vergeben) → Dialog bleibt offen, Inline-Fehler am Namensfeld bzw. `<p-toast severity="error">` bei technischem Fehler.

**Error-Zustand (Laden)**
- Schlägt das Laden der Liste fehl → `<p-message severity="error">` sowie `<p-toast severity="error">`.

---

## 4. Acceptance Criteria (DoD)

- [ ] `admin-page.component` rendert die drei Tabs „Nutzer", „Projekte", „Kommunikationsarten" als `<p-tabs>`/`<p-tablist>`/`<p-tab>`/`<p-tabpanels>`/`<p-tabpanel>`, Tab „Nutzer" initial aktiv (entspricht Wireframe-Default).
- [ ] Die Sidebar zeigt beim Routing auf den Admin-Bereich **keinen** Projekt-Kontext/-Switcher — nur „Projektübersicht" und „Admin-Bereich" als Top-Level-Punkte (Abgrenzung zu Screen S4, siehe Vorbemerkung).
- [ ] Tab „Nutzer": `<p-table>` mit Spalten Name, E-Mail, Status, Erstellt am und Zeilenaktion „Passwort zurücksetzen"; Badge „Muss Passwort ändern" nur bei Nutzern mit offener Passwort-Änderung, sonst „—".
- [ ] `createUserForm` ist als `FormGroup` mit `name` (`Validators.required`, `Validators.maxLength(200)`), `email` (`Validators.required`, `Validators.email`), `initialPassword` (`Validators.required`, `Validators.minLength(8)`) implementiert; alle Fehlermeldungen erscheinen als deutscher Text gemäß Abschnitt 2.1.
- [ ] Dialog „Nutzer anlegen" enthält exakt die drei Felder (Name, E-Mail, Initiales Passwort) plus den Hinweistext „Keine Selbstregistrierung: Der einzige Weg zu einem Konto ist die Anlage hier. Die Projektzuweisung inkl. Rolle erfolgt anschließend im Tab „Projekte"." — wortgleich zum Wireframe.
- [ ] „Passwort zurücksetzen" löst ausschließlich über `<p-confirmdialog>` aus (kein direkter Klick-ohne-Rückfrage); erst nach Bestätigung erfolgt der Reset.
- [ ] Tab „Projekte": Projektliste (`<p-table>`) links, Mitgliederverwaltungs-Panel (`project-membership-manager`) rechts für das ausgewählte Projekt; Panel zeigt Projektname, Status, Mitgliederanzahl, Mitgliederzeilen mit Avatar, Name, Rollen-`p-select` (PL/Coreteam/Architect) und Entfernen-Aktion, sowie den Hinweistext „Entzug einer Zuweisung entfernt den Zugriff sofort, lässt aber bereits erfasste Assessments der Rolle unangetastet — sie gehören der Rolle im Projekt, nicht der Person." wortgleich zum Wireframe.
- [ ] Entfernen einer Mitgliedschaft löst ausschließlich über `<p-confirmdialog>` aus.
- [ ] `assignMemberForm` ist als `FormGroup` mit `userId` (`Validators.required`) und `role` (`Validators.required`) implementiert; Dialog „Mitglied zuweisen" bietet Nutzer- und Rollenauswahl je über `<p-select>`.
- [ ] Tab „Kommunikationsarten": Liste zeigt Name, Status-`p-tag` (Aktiv/Deaktiviert) und Bearbeiten-Icon je Zeile; deaktivierte Einträge werden durchgestrichen dargestellt (analog „Pressemitteilung" im Wireframe) und bleiben in der Liste sichtbar (keine Löschung).
- [ ] `communicationTypeForm` ist als `FormGroup` mit `name` (`Validators.required`, `Validators.maxLength(100)`) und `active` (Boolean, nur im Bearbeiten-Modus sichtbar) implementiert; der Hinweistext „Deaktivierte Einträge (z. B. „Pressemitteilung") bleiben an bereits zugeordneten Stakeholdern sichtbar, stehen aber bei neuen Zuordnungen nicht mehr zur Auswahl." ist wortgleich zum Wireframe vorhanden.
- [ ] Jeder der drei Tabs zeigt einen eigenen Loading- (`<p-skeleton>`), Empty- und Error-Zustand gemäß Abschnitt 3; jede erfolgreiche Anlegen-/Bearbeiten-/Entfernen-Aktion bestätigt sich über `<p-toast severity="success">` mit einer der in Abschnitt 3 genannten Meldungen, jede fehlgeschlagene Aktion über `<p-toast severity="error">` bzw. Inline-Feldfehler.
- [ ] Alle vier Formulare (Nutzer anlegen, Projekt anlegen, Mitglied zuweisen, Kommunikationsart anlegen/bearbeiten) sind Reactive Forms mit echtem `<label for="...">`/`inputId`-Pairing je Feld, keinen Placeholder-only-Labels.
- [ ] Keine hartkodierten Hex-Farben oder Pixelwerte im Template; ausschließlich PrimeNG-CSS-Variablen (`var(--surface-ground)`, `var(--surface-card)`, `var(--surface-border)`, `var(--text-color)`, `var(--text-color-secondary)`, `var(--primary-color)`, `var(--red-500)`, `var(--border-radius)`) und PrimeFlex-Utility-Klassen.
- [ ] **Fachliche Scope-Abgrenzung (verbindlich, PRD 2.2):** Keine der drei Tab-Komponenten liest, zeigt oder verlinkt Assessment-Daten/Bewertungsinhalte. Der Admin-Bereich bleibt rein strukturelle Verwaltung (Nutzer-Konten, Projekt-Mitgliedschaften/Rollen, Kommunikationsarten-Stammdaten); ein Zugriff auf Assessment-Inhalte ist ausschließlich über eine gesonderte, projektbezogene Rollenzuweisung außerhalb dieses Screens möglich, nicht über diese Spec.
- [ ] Sichtbarer Fokusindikator ist auf allen interaktiven Elementen (Tabs, Tabellenzeilen, Buttons, Formularfelder, `p-select`) vorhanden (Standard-PrimeNG-Fokusstile, nicht deaktiviert).
- [ ] Alle sichtbaren UI-Texte sind deutsch und terminologisch konsistent mit dem Wireframe („Nutzer", „Projekt", „Kommunikationsart", „Rolle", „PL", „Coreteam", „Architect").
