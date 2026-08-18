import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';

/**
 * Blockierendes Passwort-Änderungs-Modal (US-008, Screen S1). Wird nach einem Login mit
 * `mustChangePassword = true` angezeigt; erst nach erfolgreichem Absenden emittiert die
 * Komponente {@link passwordChanged}, woraufhin die einbettende Shell (US-009) die restliche
 * Anwendung freigibt. Reaktives Formular (`ReactiveFormsModule`) gemäß CLAUDE.md Abschnitt 3.7 —
 * die Mindestlänge (8 Zeichen) spiegelt die serverseitige Regel aus `PasswordTooShortError`; die
 * eigentliche Durchsetzung bleibt serverseitig (`PATCH /api/v1/auth/password`).
 */
@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './password-change-modal.component.html',
  styleUrl: './password-change-modal.component.css',
})
export class PasswordChangeModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  @Output() readonly passwordChanged = new EventEmitter<void>();

  protected errorMessage: string | null = null;
  protected isSubmitting = false;

  protected readonly form = this.formBuilder.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService.changePassword(this.form.getRawValue().newPassword).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.passwordChanged.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Passwort konnte nicht geändert werden. Bitte erneut versuchen.';
      },
    });
  }
}
