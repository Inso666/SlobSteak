import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { PasswordChangeModalComponent } from '../password-change-modal/password-change-modal.component';
import { SessionNoticeService } from '../../../core/services/session-notice.service';

/**
 * Login-Screen (US-009, Screen S1). Bei Erfolg mit `mustChangePassword = true` wird unmittelbar
 * das blockierende {@link PasswordChangeModalComponent} aus US-008 eingeblendet; erst danach (oder
 * sofort bei `mustChangePassword = false`) navigiert die Anwendung weiter zur Projektübersicht
 * (S2). `/projects` existiert als Ziel-Route erst mit US-018 — die Navigation dorthin ist bereits
 * jetzt korrekt verdrahtet, siehe Anmerkungen in der Story-Datei.
 *
 * US-044: zeigt zusätzlich den einmaligen Hinweistext an, den `httpErrorInterceptor` bei einem
 * automatischen Redirect wegen abgelaufener Sitzung (`401`) über {@link SessionNoticeService}
 * hinterlegt (Akzeptanzkriterium 2).
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordChangeModalComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionNotice = inject(SessionNoticeService);

  protected errorMessage: string | null = null;
  protected sessionExpiredMessage: string | null = null;
  protected isSubmitting = false;
  protected mustChangePassword = false;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.sessionExpiredMessage = this.sessionNotice.consume();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: ({ mustChangePassword }) => {
        this.isSubmitting = false;
        if (mustChangePassword) {
          this.mustChangePassword = true;
        } else {
          this.navigateToProjects();
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'E-Mail oder Passwort ist falsch.';
        this.form.controls.password.setValue('');
      },
    });
  }

  protected onPasswordChanged(): void {
    this.mustChangePassword = false;
    this.navigateToProjects();
  }

  private navigateToProjects(): void {
    void this.router.navigate(['/projects']);
  }
}
