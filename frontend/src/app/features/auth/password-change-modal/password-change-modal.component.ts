import { ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { AuthService } from '../auth.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { passwordsMatchValidator } from '../../../shared/validators/passwords-match.validator';

/**
 * Blockierendes Passwort-Änderungs-Modal (US-008, Screen S1). Wird nach einem Login mit
 * `mustChangePassword = true` angezeigt; erst nach erfolgreichem Absenden emittiert die
 * Komponente {@link passwordChanged}, woraufhin die einbettende Shell (US-009) die restliche
 * Anwendung freigibt. Reaktives Formular (`ReactiveFormsModule`) gemäß CLAUDE.md Abschnitt 3.7.
 *
 * US-054 / SPEC-01 §2.2: Mindestlänge bewusst bei **8** Zeichen belassen (nicht auf die dort
 * vorgegebenen 10 geändert) — sie spiegelt die tatsächlich serverseitig durchgesetzte Regel aus
 * `PasswordTooShortError.MinimumLength` (Backend, `SlobSteak.Domain`). Ein abweichender
 * Frontend-Grenzwert würde Nutzer:innen ein Passwort verbieten, das der Server anschließend
 * anstandslos akzeptieren würde — CLAUDE.md Abschnitt 6: dokumentierte, bewusste Abweichung von
 * SPEC-01 zugunsten der bestehenden, verbindlichen Backend-Invariante statt stiller Übernahme des
 * Wireframe-Werts.
 *
 * US-058: `changeDetectorRef.markForCheck()` in beiden `subscribe()`-Zweigen von {@link onSubmit}
 * ergänzt — dieselbe Root Cause wie in US-050/US-051/US-057: Das Frontend läuft ohne `zone.js`,
 * eine reine Feldzuweisung in einem `subscribe()`-Callback markiert die Komponente sonst nicht
 * automatisch für die nächste Change-Detection-Runde, wodurch der Submit-Button nach Abschluss des
 * Requests dauerhaft im Verarbeitungs-Zustand sichtbar bleiben konnte.
 */
@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, Dialog, Message, Password],
  templateUrl: './password-change-modal.component.html',
  styleUrl: './password-change-modal.component.css',
})
export class PasswordChangeModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Output() readonly passwordChanged = new EventEmitter<void>();

  protected errorMessage: string | null = null;
  protected isSubmitting = false;

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') },
  );

  protected onSubmit(): void {
    // US-043 Akzeptanzkriterium 3/5: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService.changePassword(this.form.getRawValue().newPassword).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.passwordChanged.emit();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Passwort konnte nicht geändert werden. Bitte erneut versuchen.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
