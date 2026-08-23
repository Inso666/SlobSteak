# SPEC: Login & erzwungene Passwort-Änderung

> Screen-Referenz: S1 (Wireframe `Login.dc.html`), Feature-Referenz F6.1 (erzwungene Passwort-Änderung nach Erst-Login) / F6.2 (Standard-Login).
> Zielkomponenten (Angular Feature-Ordner):
> - `frontend/src/app/features/auth/login-page/login-page.component.ts`
> - `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts`
>
> Das Wireframe zeigt zwei Szenen derselben Seite: Szene 1 = Standard-Login (Default-Zustand), Szene 2 = dieselbe Seite mit darübergelegtem, nicht schließbarem Passwort-Änderungs-Dialog. Beide werden hier als **ein** Feature mit zwei Komponenten spezifiziert, die zusammenspielen (siehe Abschnitt 3).

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Grundsatz Layout & Styling

- Seiten-Hintergrund, Karten-Hintergrund, Text- und Fehlerfarben werden **ausschließlich** über PrimeNG-CSS-Variablen abgebildet, keine Hex-Werte aus dem Wireframe (`--bg`, `--surface`, `--text`, `--attn`, `--error` etc. sind Design-Tool-interne Tokens, keine Zielwerte):
  - Seiten-Hintergrund → `var(--surface-ground)`
  - Karten-/Dialog-Hintergrund → `var(--surface-card)`
  - Primärtext → `var(--text-color)`
  - Sekundärtext (Tagline, Footnote, Hinweistext, Labels) → `var(--text-color-secondary)`
  - Rahmenfarbe → `var(--surface-border)`
  - Akzent-/Icon-Hintergrund (Passwort-Icon-Badge) → `var(--yellow-100)` Hintergrund / `var(--yellow-600)` Icon-Farbe (Wireframe-Akzentfarbe `--attn` ist bernstein/amber-artig, daher Mapping auf PrimeNG-Amber/Yellow-Skala statt `--primary-color`, da es sich im Wireframe erkennbar um eine Warn-/Hinweisfarbe handelt, nicht um die Markenfarbe)
  - Fehlerfarbe (Text/Icon) → `var(--red-500)`
  - Eckenradius Karte/Dialog → `var(--border-radius)`
- Layout ausschließlich über PrimeFlex-Utility-Klassen: `flex`, `flex-column`, `align-items-center`, `justify-content-center`, `gap-2`/`gap-3`, `p-4`, `w-full`, `min-h-screen`, `text-center`.
- Feste Breite der Login-Karte (Wireframe: 380px) → `w-25rem` (PrimeFlex-Utility, kein Pixelwert).
- Keine Inline-Pixelwerte, keine Hex-Farben im Komponenten-Template.

### 1.2 Component Tree — Login-Seite (`login-page.component.html`)

```html
<div class="flex flex-column align-items-center justify-content-center min-h-screen p-4"
     style="background: var(--surface-ground);">

  <!-- Markenblock (statisch, kein PrimeNG-Steuerelement) -->
  <div class="flex flex-column align-items-center gap-2 mb-4">
    <div class="flex align-items-center gap-2">
      <svg aria-hidden="true" ...></svg> <!-- dekoratives Logo, aus Wireframe übernommen -->
      <span class="text-xl font-semibold" style="color: var(--text-color);">SlobSteak</span>
    </div>
    <span class="text-sm" style="color: var(--text-color-secondary);">
      Stakeholder-Management für Projektteams
    </span>
  </div>

  <p-card styleClass="w-25rem" [style]="{ 'border-radius': 'var(--border-radius)' }">

    <!-- LOADING-STATE: Bootstrap-Skeleton, siehe Abschnitt 3 -->
    <ng-container *ngIf="bootstrapping; else formTpl">
      <div class="flex flex-column gap-3">
        <p-skeleton width="60%" height="1.5rem"></p-skeleton>
        <p-skeleton height="2.5rem"></p-skeleton>
        <p-skeleton height="2.5rem"></p-skeleton>
        <p-skeleton height="2.75rem" borderRadius="8px"></p-skeleton>
      </div>
    </ng-container>

    <ng-template #formTpl>
      <h1 id="login-title" class="text-lg font-semibold mt-0 mb-3"
          style="color: var(--text-color); font-family: var(--font-family);">
        Anmelden
      </h1>

      <!-- ERROR-STATE: serverseitiger/globaler Login-Fehler -->
      <p-message *ngIf="loginErrorMessage"
                  severity="error"
                  [text]="loginErrorMessage"
                  styleClass="w-full mb-3"
                  role="alert">
      </p-message>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-column gap-3" novalidate
            [attr.aria-labelledby]="'login-title'">

        <div class="flex flex-column gap-2">
          <label for="l-mail" class="text-sm font-semibold" style="color: var(--text-color-secondary);">
            E-Mail
          </label>
          <input pInputText
                 id="l-mail"
                 type="email"
                 formControlName="email"
                 autocomplete="username"
                 class="w-full"
                 [class.ng-invalid]="emailControl.invalid && emailControl.touched"
                 [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
                 [attr.aria-describedby]="emailControl.invalid && emailControl.touched ? 'l-mail-error' : null" />
          <small id="l-mail-error"
                 *ngIf="emailControl.invalid && emailControl.touched"
                 style="color: var(--red-500);">
            {{ emailErrorMessage }}
          </small>
        </div>

        <div class="flex flex-column gap-2">
          <label for="l-pw" class="text-sm font-semibold" style="color: var(--text-color-secondary);">
            Passwort
          </label>
          <p-password inputId="l-pw"
                      formControlName="password"
                      [toggleMask]="true"
                      [feedback]="false"
                      autocomplete="current-password"
                      styleClass="w-full"
                      [inputStyle]="{ width: '100%' }"
                      [attr.aria-invalid]="passwordControl.invalid && passwordControl.touched"
                      [attr.aria-describedby]="passwordControl.invalid && passwordControl.touched ? 'l-pw-error' : null">
          </p-password>
          <small id="l-pw-error"
                 *ngIf="passwordControl.invalid && passwordControl.touched"
                 style="color: var(--red-500);">
            Passwort ist erforderlich.
          </small>
        </div>

        <p-button type="submit"
                  label="Anmelden"
                  styleClass="w-full"
                  [loading]="submitting"
                  [disabled]="loginForm.invalid || submitting">
        </p-button>

        <span class="text-center text-xs" style="color: var(--text-color-secondary);">
          Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.
        </span>
      </form>
    </ng-template>
  </p-card>
</div>

<p-toast position="top-right"></p-toast>

<!-- Nicht schließbarer Dialog, siehe Abschnitt 1.3 -->
<app-password-change-modal *ngIf="mustChangePassword" [userId]="authenticatedUserId"></app-password-change-modal>
```

**Bewusste Auslassung (kein offener Punkt):** Es gibt im Wireframe keinen "Passwort vergessen"-Link und keine entsprechende PrimeNG-Komponente wird ergänzt. Self-Service-Passwort-Reset ist laut PRD explizit außerhalb des MVP-Scopes; Passwort-Resets erfolgen ausschließlich durch einen Administrator im Admin-Bereich (separate Story/Spec).

### 1.3 Component Tree — Erzwungener Passwort-Änderungs-Dialog (`password-change-modal.component.html`)

```html
<p-dialog [(visible)]="visible"
          [modal]="true"
          [closable]="false"
          [closeOnEscape]="false"
          [dismissableMask]="false"
          [draggable]="false"
          [resizable]="false"
          [showHeader]="false"
          styleClass="w-25rem"
          [style]="{ 'border-radius': 'var(--border-radius)' }"
          [ariaLabelledBy]="'pwchange-title'"
          role="alertdialog">

  <div class="flex flex-column gap-3 p-2">

    <div class="flex align-items-center justify-content-center border-circle"
         style="width: 2.5rem; height: 2.5rem; background: var(--yellow-100); color: var(--yellow-600);">
      <i class="pi pi-lock text-lg" aria-hidden="true"></i>
    </div>

    <h1 id="pwchange-title" class="text-lg font-semibold m-0"
        style="color: var(--text-color); font-family: var(--font-family);">
      Neues Passwort festlegen
    </h1>
    <p class="text-sm m-0" style="color: var(--text-color-secondary);">
      Dies ist dein erster Login. Bitte lege ein neues Passwort fest, bevor du fortfährst.
    </p>

    <!-- ERROR-STATE: serverseitiger Fehler beim Speichern -->
    <p-message *ngIf="saveErrorMessage"
                severity="error"
                [text]="saveErrorMessage"
                styleClass="w-full"
                role="alert">
    </p-message>

    <form [formGroup]="passwordChangeForm" (ngSubmit)="onSavePassword()" class="flex flex-column gap-3" novalidate>

      <div class="flex flex-column gap-2">
        <label for="p-new" class="text-sm font-semibold" style="color: var(--text-color-secondary);">
          Neues Passwort
        </label>
        <p-password inputId="p-new"
                    formControlName="newPassword"
                    [toggleMask]="true"
                    [feedback]="true"
                    placeholder="Mindestens 10 Zeichen"
                    autocomplete="new-password"
                    styleClass="w-full"
                    [inputStyle]="{ width: '100%' }"
                    [attr.aria-invalid]="newPasswordControl.invalid && newPasswordControl.touched"
                    [attr.aria-describedby]="newPasswordControl.invalid && newPasswordControl.touched ? 'p-new-error' : null">
        </p-password>
        <small id="p-new-error"
               *ngIf="newPasswordControl.invalid && newPasswordControl.touched"
               style="color: var(--red-500);">
          {{ newPasswordErrorMessage }}
        </small>
      </div>

      <div class="flex flex-column gap-2">
        <label for="p-rep" class="text-sm font-semibold" style="color: var(--text-color-secondary);">
          Passwort bestätigen
        </label>
        <p-password inputId="p-rep"
                    formControlName="confirmPassword"
                    [toggleMask]="true"
                    [feedback]="false"
                    autocomplete="new-password"
                    styleClass="w-full"
                    [inputStyle]="{ width: '100%' }"
                    [attr.aria-invalid]="confirmPasswordInvalid"
                    [attr.aria-describedby]="confirmPasswordInvalid ? 'p-rep-error' : null">
        </p-password>
        <small id="p-rep-error" *ngIf="confirmPasswordInvalid" style="color: var(--red-500);">
          {{ confirmPasswordErrorMessage }}
        </small>
      </div>

      <small class="text-xs" style="color: var(--text-color-secondary); line-height: 1.5;">
        Du kannst die Anwendung erst nach dieser Änderung nutzen — der Dialog lässt sich nicht überspringen oder schließen.
      </small>

      <p-button type="submit"
                label="Passwort speichern"
                styleClass="w-full"
                [loading]="saving"
                [disabled]="passwordChangeForm.invalid || saving">
      </p-button>
    </form>
  </div>
</p-dialog>
```

**Wichtige Layout-Anmerkung:** `[showHeader]="false"` unterdrückt den PrimeNG-Standard-Dialogkopf inkl. des dort sonst automatisch gerenderten Schließen-Icons — dieses Icon existiert im Wireframe nicht und darf auch technisch nicht erreichbar sein (siehe Abschnitt 3, Constraint "nicht schließbar"). Titel/Icon/Untertitel werden stattdessen wie im Wireframe im Dialog-Body gerendert; die Barrierefreiheits-Zuordnung erfolgt über `[ariaLabelledBy]="'pwchange-title'"` und `role="alertdialog"`.

---

## 2. Forms, Directives & Validation

Beide Formulare werden als **Reactive Forms** (`FormGroup`, `FormControl`, aufgebaut via `FormBuilder`) implementiert. Keine Template-Driven-Forms, kein `ngModel`.

### 2.1 `loginForm` (Login-Seite)

```ts
this.loginForm = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required]],
});
```

| Control | Validatoren | Fehlermeldung (deutsch) | Anzeigebedingung |
|---|---|---|---|
| `email` | `Validators.required` | „E-Mail ist erforderlich." | `email.invalid && email.touched` bei `email.errors.required` |
| `email` | `Validators.email` | „Bitte eine gültige E-Mail-Adresse eingeben." | `email.invalid && email.touched` bei `email.errors.email` |
| `password` | `Validators.required` | „Passwort ist erforderlich." | `password.invalid && password.touched` |

Anmerkung: Das Wireframe nutzt für das E-Mail-Feld `type="text"`; in der Umsetzung wird semantisch korrekt `type="email"` verwendet (kein neues Element, nur korrektes natives Attribut) — das ist mit den Barrierefreiheits-/Semantik-Vorgaben (native semantische Elemente) konsistent und ändert nichts am sichtbaren Wireframe-Inhalt.

Der Submit-Button ist deaktiviert, solange `loginForm.invalid`. Zusätzlich werden bei Klick auf „Anmelden" mit ungültigem Formular alle Controls über `markAllAsTouched()` als touched markiert, damit Inline-Fehler sichtbar werden (Button bleibt aber wegen `[disabled]` de facto nicht klickbar bei ungültigem Formular — `markAllAsTouched()` dient nur der Konsistenz falls der Button-Disabled-State per Zwischenzustand kurz umgangen wird, z. B. bei asynchroner Validierung).

### 2.2 `passwordChangeForm` (Passwort-Änderungs-Dialog)

```ts
this.passwordChangeForm = this.fb.group(
  {
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword: ['', [Validators.required]],
  },
  { validators: passwordsMatchValidator('newPassword', 'confirmPassword') }
);
```

`passwordsMatchValidator` ist ein eigener `ValidatorFn` auf Gruppenebene (Cross-Field-Validation), der bei Ungleichheit den Fehler `passwordMismatch` auf der `confirmPassword`-Control setzt.

| Control | Validatoren | Fehlermeldung (deutsch) | Anzeigebedingung |
|---|---|---|---|
| `newPassword` | `Validators.required` | „Neues Passwort ist erforderlich." | `newPassword.invalid && newPassword.touched` bei `errors.required` |
| `newPassword` | `Validators.minLength(10)` | „Das Passwort muss mindestens 10 Zeichen lang sein." | `newPassword.invalid && newPassword.touched` bei `errors.minlength` |
| `confirmPassword` | `Validators.required` | „Bitte das Passwort bestätigen." | `confirmPassword.invalid && confirmPassword.touched` bei `errors.required` |
| `confirmPassword` (Gruppen-Validator) | `passwordsMatchValidator` | „Die Passwörter stimmen nicht überein." | sobald `confirmPassword.touched` und `confirmPassword.errors.passwordMismatch` gesetzt ist |

Der Submit-Button „Passwort speichern" ist deaktiviert, solange `passwordChangeForm.invalid`.

### 2.3 Gemeinsame Directives

- `[formGroup]` / `formControlName` auf beiden Formularen (Reactive-Forms-API).
- `pInputText` als Directive auf dem nativen `<input>` für das E-Mail-Feld.
- `p-password` als eigenständige PrimeNG-Komponente für alle Passwortfelder — `[toggleMask]="true"` überall (Sichtbarkeits-Umschalter, im Wireframe nicht explizit gezeichnet, aber PrimeNG-Standardverhalten für Passwortfelder und barrierefreiheitsfördernd); `[feedback]="true"` **nur** beim „Neues Passwort"-Feld im Änderungsdialog (Stärkeanzeige beim Neuanlegen sinnvoll), `[feedback]="false"` bei Login-Passwort und „Passwort bestätigen" (keine Stärkeanzeige bei reiner Eingabe/Bestätigung nötig).
- Alle Formularfelder haben ein natives `<label for="...">`, das per `id`/`inputId` mit dem jeweiligen Feld verknüpft ist — kein reiner Placeholder als Label-Ersatz (Placeholder „Mindestens 10 Zeichen" ist zusätzlicher Hinweis, kein Label-Ersatz).
- Fehler werden nie ausschließlich farblich kodiert: `aria-invalid` und `aria-describedby` verknüpfen Feld und Fehlertext programmatisch; der Fehlertext selbst ist als sichtbarer Text vorhanden, nicht nur als Farbwechsel des Rahmens.

---

## 3. UI States & Event Handling

### 3.1 Login-Seite — Zustände

**Initial-/Default-Zustand**
- `bootstrapping = true` beim ersten Rendern, während geprüft wird, ob bereits eine gültige Session besteht (Auth-Guard-Vorprüfung). Anzeige: `<p-skeleton>`-Platzhalter für Titel, zwei Felder und Button (siehe 1.2).
- Sobald die Prüfung abgeschlossen ist (`bootstrapping = false`) und keine gültige Session vorliegt: Formular wird angezeigt, `loginForm` leer, beide Felder untouched, kein Fehler sichtbar, Button aktiv sobald Formular valide ist.
- Besteht bereits eine gültige Session, erfolgt Redirect (außerhalb dieser Spec, Routing-Verantwortung).

**Event: Nutzer:in füllt Felder aus**
- Jede Eingabe aktualisiert die jeweilige `FormControl`. Blur setzt `touched = true` und triggert die entsprechende Inline-Validierungsanzeige (Abschnitt 2.1).

**Event: Klick auf „Anmelden" (Submit)**
- Voraussetzung: `loginForm.valid` (Button ist sonst `[disabled]`).
- `onSubmit()` → `submitting = true`, Button zeigt PrimeNG-Loading-State (`[loading]="true"`, Spinner statt Label), beide Formularfelder werden über `loginForm.disable()` gesperrt, `loginErrorMessage` wird zurückgesetzt (`null`).
- Ruft den Auth-Service auf (`POST /api/auth/login` o. ä., Endpunkt außerhalb dieser Spec).

**Success-Zustand**
- Response `mustChangePassword === false` → `submitting = false`, Navigation in den authentifizierten Bereich der Anwendung (Zielroute außerhalb dieser Spec).
- Response `mustChangePassword === true` (Seed-Admin oder von Admin angelegtes Konto beim Erst-Login) → `submitting = false`, `mustChangePassword = true` gesetzt → `app-password-change-modal` wird gerendert und macht den erzwungenen Dialog (Szene 2 des Wireframes) sichtbar. Die Login-Karte bleibt darunter sichtbar, aber durch den Dialog-Modal-Layer (`[modal]="true"`) inert/verdunkelt (entspricht `.backdrop` im Wireframe).

**Error-Zustand**
- Fehlerhafte Zugangsdaten oder Server-/Netzwerkfehler → `submitting = false`, `loginForm.enable()`, `loginErrorMessage` wird gesetzt (z. B. „E-Mail oder Passwort ist ungültig." bzw. „Anmeldung derzeit nicht möglich. Bitte später erneut versuchen." bei technischem Fehler) und über `<p-message severity="error">` inline in der Karte angezeigt.
- Zusätzlich wird bei technischen/Server-Fehlern (nicht bei simplem „Zugangsdaten falsch") ein `<p-toast>` mit `severity="error"` ausgelöst, um den Fehler auch außerhalb des unmittelbaren Formularkontexts sichtbar zu machen (z. B. Summary „Anmeldung fehlgeschlagen").
- Das Passwortfeld wird nach einem Fehlversuch geleert (`passwordControl.reset()`), das E-Mail-Feld bleibt erhalten; Fokus wird programmatisch zurück auf das Passwortfeld gesetzt.

### 3.2 Passwort-Änderungs-Dialog — Zustände

**Constraint (gilt für alle Zustände dieses Dialogs, nicht überstimmbar):** Der Dialog ist **nicht schließbar und nicht überspringbar**. Das ist keine Fehlkonfiguration, sondern zwingende fachliche Vorgabe (F6.1): `[closable]="false"`, `[closeOnEscape]="false"`, `[dismissableMask]="false"` sind gemeinsam und dauerhaft gesetzt, solange der Dialog sichtbar ist. Es gibt keinen Button, Link oder Tastaturbefehl, der den Dialog schließt, außer dem erfolgreichen Abschluss des Passwort-Änderungs-Vorgangs (siehe Success-Zustand unten). Die Nutzer:in kann die Anwendung dahinter nicht bedienen (`[modal]="true"` fängt Fokus/Interaktion).

**Initial-/Default-Zustand**
- Wird ausschließlich programmatisch durch die Login-Seite geöffnet (`visible = true`), niemals durch eine eigene Nutzeraktion.
- `passwordChangeForm` leer, beide Felder untouched, kein Fehler sichtbar.
- Button „Passwort speichern" ist deaktiviert (`disabled`), solange Formular ungültig ist (leere Felder → initial deaktiviert).

**Event: Nutzer:in füllt „Neues Passwort" / „Passwort bestätigen" aus**
- Live-Validierung analog Abschnitt 2.2; `p-password` mit `[feedback]="true"` beim neuen Passwort zeigt PrimeNG-eigene Stärkeanzeige zusätzlich zur Mindestlängen-Validierung.

**Event: Klick auf „Passwort speichern" (Submit)**
- Voraussetzung: `passwordChangeForm.valid`.
- `onSavePassword()` → `saving = true`, Button zeigt Loading-State (`[loading]="true"`), beide Felder werden gesperrt (`passwordChangeForm.disable()`), `saveErrorMessage` wird zurückgesetzt. Dialog bleibt weiterhin nicht schließbar während des Ladevorgangs.
- Ruft den Auth-/User-Service auf (`POST /api/auth/change-password` o. ä., Endpunkt außerhalb dieser Spec) mit `newPassword`.

**Success-Zustand**
- `saving = false`, Dialog wird **programmatisch** geschlossen (`visible = false`), `mustChangePassword` in der Login-Seite wird zurückgesetzt.
- Ein `<p-toast>` mit `severity="success"` bestätigt den Vorgang (z. B. „Passwort erfolgreich geändert.").
- Anschließend Navigation in den authentifizierten Bereich der Anwendung (Zielroute außerhalb dieser Spec).

**Error-Zustand**
- Serverseitige Ablehnung (z. B. Passwortrichtlinie serverseitig verletzt, technischer Fehler) → `saving = false`, `passwordChangeForm.enable()`, `saveErrorMessage` gesetzt und über `<p-message severity="error">` **innerhalb** des Dialogs angezeigt (kein Toast als alleiniger Kanal, da der Fehler direkt im Formularkontext behoben werden muss).
- Dialog bleibt in jedem Fall geöffnet und weiterhin nicht schließbar — ein Fehler darf niemals dazu führen, dass der Dialog verlassen werden kann, ohne dass ein Passwort erfolgreich gesetzt wurde.
- Beide Passwortfelder werden aus Sicherheitsgründen geleert (`passwordChangeForm.reset()`), Fokus wird programmatisch auf „Neues Passwort" gesetzt.

---

## 4. Acceptance Criteria (DoD)

- [ ] Login-Karte rendert exakt die im Wireframe sichtbaren Elemente: Marke (Logo + „SlobSteak" + Tagline „Stakeholder-Management für Projektteams"), Titel „Anmelden", Feld „E-Mail", Feld „Passwort", Button „Anmelden", Footnote „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein." — keine zusätzlichen, im Wireframe nicht vorhandenen Elemente (insbesondere **kein** „Passwort vergessen"-Link).
- [ ] `loginForm` ist als `FormGroup` mit `email` (`Validators.required`, `Validators.email`) und `password` (`Validators.required`) implementiert; alle Fehlermeldungen erscheinen als deutscher Text gemäß Abschnitt 2.1.
- [ ] E-Mail-Feld nutzt `pInputText` auf einem nativen `<input>` mit `<label for="l-mail">`; Passwortfeld nutzt `<p-password inputId="l-pw" [toggleMask]="true" [feedback]="false">` mit `<label for="l-pw">`.
- [ ] Submit-Button ist eine `<p-button>`, deaktiviert bei ungültigem Formular, zeigt während des Login-Requests `[loading]="true"` an; Felder sind während des Requests gesperrt.
- [ ] Login-Fehler werden inline via `<p-message severity="error">` angezeigt; technische/Server-Fehler zusätzlich via `<p-toast severity="error">`; Fehler sind nie ausschließlich farblich kodiert (sichtbarer Text + `aria-invalid`/`aria-describedby`).
- [ ] Initialer Bootstrap-/Session-Check der Login-Seite zeigt `<p-skeleton>`-Platzhalter, solange `bootstrapping === true`.
- [ ] Bei Response `mustChangePassword === true` öffnet sich automatisch (ohne weitere Nutzeraktion) der Passwort-Änderungs-Dialog; die Login-Ansicht ist währenddessen durch das Dialog-Modal verdunkelt/inert.
- [ ] Passwort-Änderungs-Dialog ist als `<p-dialog>` mit `[modal]="true"`, `[closable]="false"`, `[closeOnEscape]="false"`, `[dismissableMask]="false"` implementiert; es existiert **kein** UI-Weg (Klick, Escape, Klick auf Hintergrund), diesen Dialog zu schließen, außer über erfolgreichen Abschluss der Passwort-Änderung.
- [ ] Dialog rendert Icon-Badge, Titel „Neues Passwort festlegen", Untertitel „Dies ist dein erster Login. Bitte lege ein neues Passwort fest, bevor du fortfährst.", Feld „Neues Passwort" (Placeholder „Mindestens 10 Zeichen"), Feld „Passwort bestätigen", Hinweistext „Du kannst die Anwendung erst nach dieser Änderung nutzen — der Dialog lässt sich nicht überspringen oder schließen." und Button „Passwort speichern" — exakt wie im Wireframe, keine zusätzlichen Elemente.
- [ ] `passwordChangeForm` ist als `FormGroup` mit `newPassword` (`Validators.required`, `Validators.minLength(10)`), `confirmPassword` (`Validators.required`) und einem Gruppen-Validator (`passwordsMatchValidator`) implementiert; alle Fehlermeldungen erscheinen als deutscher Text gemäß Abschnitt 2.2.
- [ ] Bei serverseitigem Fehler beim Speichern bleibt der Dialog offen, zeigt den Fehler inline via `<p-message severity="error">`, und beide Passwortfelder werden geleert.
- [ ] Bei erfolgreichem Speichern wird der Dialog programmatisch geschlossen, ein `<p-toast severity="success">` bestätigt den Vorgang, und die Nutzer:in gelangt in den authentifizierten Bereich.
- [ ] Alle Formularfelder (Login + Passwort-Änderung) haben ein echtes `<label for="...">`/`inputId`-Pairing, keinen reinen Placeholder als Label-Ersatz.
- [ ] Sichtbarer Fokusindikator ist auf allen interaktiven Elementen (Inputs, Toggle-Mask-Icon von `p-password`, Buttons) vorhanden (Standard-PrimeNG-Fokusstile, nicht deaktiviert).
- [ ] Keine hartkodierten Hex-Farben oder Pixelwerte im Template; ausschließlich PrimeNG-CSS-Variablen (`var(--surface-ground)`, `var(--surface-card)`, `var(--text-color)`, `var(--text-color-secondary)`, `var(--red-500)`, `var(--yellow-100)`, `var(--yellow-600)`, `var(--border-radius)`) und PrimeFlex-Utility-Klassen.
- [ ] Fehlendes „Passwort vergessen" ist im Code/PR nicht als offener Punkt oder TODO markiert, sondern (falls überhaupt referenziert) als bewusste fachliche Auslassung gemäß F6.1/F6.2 dokumentiert.
