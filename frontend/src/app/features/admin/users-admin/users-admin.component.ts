import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { AdminSubNavComponent } from '../admin-sub-nav/admin-sub-nav.component';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Admin-Bereich „Nutzerverwaltung“ (US-016, Screen S5 Sub-Bereich Nutzer): Liste aller Nutzer,
 * Formular zum Anlegen neuer Nutzer, Aktion zum Zurücksetzen eines Passworts je Zeile.
 *
 * US-046: Zeigt zusätzlich {@link AdminSubNavComponent}, damit ein Systemadmin von hier zum
 * Sub-Bereich „Projekte“ wechseln kann (Akzeptanzkriterium 4).
 */
@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [ReactiveFormsModule, AdminSubNavComponent, ProcessingButtonComponent, InputText, Message, Password],
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.css',
})
export class UsersAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);

  protected users: AdminUser[] = [];
  protected createErrorMessage: string | null = null;
  protected resetPasswordMessage: string | null = null;
  protected loadError: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isCreatingUser = false;
  protected readonly resettingUserIds = new Set<string>();

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.required],
    initialPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.loadUsers();
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
      },
      error: () => {
        this.resettingUserIds.delete(user.id);
        this.resetPasswordMessage = `Passwort für ${user.name} konnte nicht zurückgesetzt werden.`;
      },
    });
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. */
  private loadUsers(): void {
    this.loadError = null;
    this.adminUsersService.listUsers().subscribe({
      next: (users) => (this.users = users),
      error: () => (this.loadError = LOAD_ERROR_MESSAGE),
    });
  }

  private generateTemporaryPassword(): string {
    return `temp-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
  }
}
