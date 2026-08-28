import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/**
 * Admin-Bereich „Nutzerverwaltung“ (US-016, Screen S5 Sub-Bereich Nutzer): Liste aller Nutzer,
 * Formular zum Anlegen neuer Nutzer, Aktion zum Zurücksetzen eines Passworts je Zeile.
 *
 * US-056: Wird seit dieser Story unter der Kind-Route `admin/users` innerhalb des Tab-Host
 * {@link AdminPageComponent} gerendert — die vormals hier eingebettete Sub-Navigation
 * ({@link AdminSubNavComponent}) sowie die eigene Seitenüberschrift entfallen, da der Tab-Host
 * beides bereits einmalig für beide Admin-Unterseiten stellt (Akzeptanzkriterium 1). Das
 * „Nutzer anlegen“-Formular öffnet seit dieser Story als `p-dialog` über einen Button statt
 * dauerhaft sichtbar unterhalb der Liste (Akzeptanzkriterium 2, SPEC-07 §1.3) — Formularfelder,
 * Validierung und Verhalten bleiben aus US-012/US-016 unverändert, nur die Präsentation ändert
 * sich.
 */
@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, ViewStateComponent, ButtonDirective, Dialog, InputText, Message, Password],
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.css',
})
export class UsersAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected users: AdminUser[] = [];
  protected createErrorMessage: string | null = null;
  protected resetPasswordMessage: string | null = null;
  protected loadError: string | null = null;
  /** US-050: diskreter Ladezustand der Nutzerliste statt eines kombinierbaren `isLoading`-Flags. */
  protected usersState: ViewState = 'loading';
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isCreatingUser = false;
  protected readonly resettingUserIds = new Set<string>();
  /** US-056 Akzeptanzkriterium 2: `p-dialog` erfordert ein `WritableSignal` für `[(visible)]`
   * (`Dialog.visible` ist ein `ModelSignal<boolean>`, siehe PrimeNG-Typdeklaration), daher hier
   * bewusst ein Signal statt eines einfachen Felds wie bei den übrigen Zuständen dieser Klasse. */
  protected readonly createDialogVisible = signal(false);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.required],
    initialPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  protected openCreateDialog(): void {
    this.createErrorMessage = null;
    this.createForm.reset();
    this.createDialogVisible.set(true);
  }

  protected closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.createErrorMessage = null;
    this.createForm.reset();
  }

  protected onCreateUser(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.createForm.invalid || this.isCreatingUser) {
      return;
    }

    this.createErrorMessage = null;
    this.isCreatingUser = true;
    const { name, email, initialPassword } = this.createForm.getRawValue();

    this.adminUsersService.createUser(name, email, initialPassword).subscribe({
      next: () => {
        this.isCreatingUser = false;
        this.createForm.reset();
        this.createDialogVisible.set(false);
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.isCreatingUser = false;
        this.createErrorMessage =
          error.status === 409
            ? 'Diese E-Mail-Adresse wird bereits verwendet.'
            : 'Nutzer konnte nicht angelegt werden.';
      },
    });
  }

  /** US-051: `changeDetectorRef.markForCheck()` behebt hier dieselbe Root Cause wie bei
   * {@link loadUsers} (siehe dortiger Kommentar) — ohne `zone.js` markiert eine reine
   * Feldzuweisung/`Set`-Mutation in einem `subscribe()`-Callback die Komponente nicht automatisch
   * für die nächste Change-Detection-Runde. Bisher fehlte der Aufruf in beiden Zweigen dieses
   * `subscribe()`, wodurch der Button nach Abschluss des Requests dauerhaft im
   * Verarbeitungs-Zustand sichtbar blieb, obwohl `resettingUserIds` intern bereits korrekt war. */
  protected onResetPassword(user: AdminUser): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.resettingUserIds.has(user.id)) {
      return;
    }

    this.resetPasswordMessage = null;
    this.resettingUserIds.add(user.id);
    const temporaryPassword = this.generateTemporaryPassword();

    this.adminUsersService.resetPassword(user.id, temporaryPassword).subscribe({
      next: () => {
        this.resettingUserIds.delete(user.id);
        this.resetPasswordMessage = `Passwort für ${user.name} wurde zurückgesetzt. Temporäres Passwort: ${temporaryPassword}`;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.resettingUserIds.delete(user.id);
        this.resetPasswordMessage = `Passwort für ${user.name} konnte nicht zurückgesetzt werden.`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. US-050: zusätzlich ein diskreter `ViewState`, damit „lädt noch“
   * sichtbar von „wirklich leer“ unterschieden wird.
   *
   * `changeDetectorRef.markForCheck()` behebt die eigentliche technische Ursache der Story: Das
   * Frontend läuft ohne `zone.js`, eine reine Feldzuweisung in einem `subscribe()`-Callback
   * markiert die Komponente sonst nicht automatisch für die nächste Change-Detection-Runde (siehe
   * ausführliche Anmerkung in `project-overview.component.ts` bzw. der Story-Datei). */
  private loadUsers(): void {
    this.loadError = null;
    this.usersState = 'loading';
    this.adminUsersService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.usersState = deriveListViewState(users.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.usersState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private generateTemporaryPassword(): string {
    return `temp-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
  }
}
