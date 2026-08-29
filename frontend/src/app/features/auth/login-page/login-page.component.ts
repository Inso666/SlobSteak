import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { Skeleton } from 'primeng/skeleton';
import { AuthService } from '../auth.service';
import { PasswordChangeModalComponent } from '../password-change-modal/password-change-modal.component';
import { SessionNoticeService } from '../../../core/services/session-notice.service';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * US-049 Akzeptanzkriterium 5: Schwellenwert, ab dem ein noch laufender Login-Request als „dauert
 * ungewöhnlich lange" markiert wird (statt für den Nutzer nur wie hängengeblieben zu wirken). Der
 * eigentliche visuelle Ladezustand dafür (SPEC-01 §1.2 `bootstrapping`-Skeleton bzw. ein
 * ausgearbeiteter Hinweis) ist Aufgabe von US-054 — diese Story liefert ausschließlich den
 * technischen Anknüpfungspunkt/Zustand (`isTakingLonger`), siehe Story „Anmerkungen des Agenten
 * (Backend, US-049)".
 */
const SLOW_LOGIN_THRESHOLD_MS = 3000;

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
  imports: [ReactiveFormsModule, PasswordChangeModalComponent, BrandMarkComponent, ProcessingButtonComponent, Card, InputText, Message, Password, Skeleton],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionNotice = inject(SessionNoticeService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected errorMessage: string | null = null;
  protected sessionExpiredMessage: string | null = null;
  protected isSubmitting = false;
  /** US-049 Akzeptanzkriterium 5: `true`, sobald ein laufender Login-Request länger als
   * {@link SLOW_LOGIN_THRESHOLD_MS} andauert — technischer Zustand für den in US-054 umzusetzenden
   * visuellen Ladezustand. */
  protected isTakingLonger = false;
  protected mustChangePassword = false;

  /**
   * US-054 / SPEC-01 §3.1: `bootstrapping = true` beim allerersten Rendern, Skeleton statt
   * Formular (Akzeptanzkriterium 3), auf `false` gesetzt in `ngOnInit`, sobald die
   * Initialisierung der Seite abgeschlossen ist. Diese Anwendung hat aktuell keinen echten
   * asynchronen Session-Check — `TokenStorageService`/`authGuard` lesen synchron aus
   * `localStorage`, kein Netzwerk-Roundtrip nötig — daher ist dieser Übergang hier synchron
   * innerhalb desselben `ngOnInit`-Aufrufs abgeschlossen (bewusst KEIN künstlich verzögerter
   * `setTimeout`: das würde denselben Zustandsübergang wie das in US-050/US-057/US-051
   * dokumentierte zoneless-Muster erfordern und obendrein jeden bestehenden, synchron
   * arbeitenden Test dieser Komponente brechen, ohne einen echten fachlichen Ladevorgang
   * abzubilden). Der in SPEC-01 §3.1 zusätzlich beschriebene automatische Redirect bereits
   * angemeldeter Nutzer:innen weg von `/login` ist dort selbst ausdrücklich „außerhalb dieser
   * Spec" markiert und wird hier bewusst NICHT ergänzt (CLAUDE.md Abschnitt 3: nur an dieser
   * Story arbeiten, kein stiller Scope-Zuwachs auf Routing-Verhalten). Der Zustand bleibt damit
   * ein realer, korrekt verdrahteter technischer Anknüpfungspunkt (analog `isTakingLonger`,
   * US-049) für eine künftige echte, tatsächlich asynchrone Session-Prüfung — sichtbar wird er
   * heute nur, solange Angular selbst noch initialisiert (z. B. bei einem sehr langsamen
   * initialen Bundle-Ladevorgang), nicht als künstlich verlängerter Zustand.
   */
  protected bootstrapping = true;

  private takingLongerTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.sessionExpiredMessage = this.sessionNotice.consume();
    this.bootstrapping = false;
  }

  ngOnDestroy(): void {
    // US-049: verhindert, dass ein noch laufender Timer nach Verlassen der Seite (z. B. Redirect
    // während eines laufenden Login-Requests) verspätet auf der zerstörten Komponente feuert.
    this.clearTakingLongerTimer();
  }

  /**
   * US-057: `changeDetectorRef.markForCheck()` in beiden Callbacks behebt den Bug, dass der Button
   * nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen bleibt. Ursache ist
   * exakt dasselbe, in US-050 an fünf anderen Stellen behobene Muster (siehe „Anmerkungen des
   * Dev-Agenten“ dort): Dieses Frontend läuft ohne `zone.js` (zoneless), eine reine Feldzuweisung
   * (`this.isSubmitting = false`) in einem `subscribe()`-Callback, der außerhalb eines von Angular
   * beobachteten Nutzer-Events eintrifft, markiert die Komponente nicht automatisch für die nächste
   * Change-Detection-Runde. `isSubmitting`/`app-processing-button` (US-043) bleiben unverändert —
   * es fehlte ausschließlich diese Markierung. Aus demselben Grund braucht auch der neue,
   * verzögerte `setTimeout`-Callback für `isTakingLonger` (US-049) sein eigenes `markForCheck()`.
   */
  protected onSubmit(): void {
    // US-043 Akzeptanzkriterium 3/5: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.isTakingLonger = false;
    this.errorMessage = null;
    const { email, password } = this.form.getRawValue();

    // US-049 Akzeptanzkriterium 5: technischer Anknüpfungspunkt für einen erkennbaren Unterschied
    // zwischen „Request läuft" und „Request läuft bereits ungewöhnlich lange" — kein globaler
    // HttpClient-Timeout vorhanden, mit dem dieser Timer kollidieren könnte (siehe Story
    // „Anmerkungen des Agenten (Backend, US-049)"). Wird in beiden subscribe()-Callbacks
    // aufgeräumt, damit ein rechtzeitig abgeschlossener Request keinen verspäteten Zustandswechsel
    // mehr auslösen kann.
    this.takingLongerTimer = setTimeout(() => {
      this.isTakingLonger = true;
      this.changeDetectorRef.markForCheck();
    }, SLOW_LOGIN_THRESHOLD_MS);

    this.authService.login(email, password).subscribe({
      next: ({ mustChangePassword }) => {
        this.clearTakingLongerTimer();
        this.isSubmitting = false;
        this.isTakingLonger = false;
        if (mustChangePassword) {
          this.mustChangePassword = true;
        } else {
          this.navigateToProjects();
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        this.clearTakingLongerTimer();
        this.isSubmitting = false;
        this.isTakingLonger = false;
        // US-049: der Backend-Agent hat angemerkt, dass diese Meldung zuvor unterschiedslos für
        // JEDEN Fehler (auch technische Fehler wie ein noch nicht bereites Backend, `502`) die
        // fachlich falsche „Zugangsdaten falsch"-Meldung zeigte. Differenzierung nach Statuscode
        // gemäß SPEC-01-Login.md §3.1 (dort für genau diesen Fall vorgesehene Formulierung für
        // technische/Server-Fehler): nur ein `401` gilt als „Zugangsdaten falsch", jeder andere
        // Fehler (Netzwerkfehler, `5xx`, `0`) als „Anmeldung derzeit nicht möglich".
        this.errorMessage =
          error instanceof HttpErrorResponse && error.status === 401
            ? 'E-Mail oder Passwort ist falsch.'
            : 'Anmeldung derzeit nicht möglich. Bitte später erneut versuchen.';
        this.form.controls.password.setValue('');
        this.changeDetectorRef.markForCheck();
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

  private clearTakingLongerTimer(): void {
    if (this.takingLongerTimer !== null) {
      clearTimeout(this.takingLongerTimer);
      this.takingLongerTimer = null;
    }
  }
}
