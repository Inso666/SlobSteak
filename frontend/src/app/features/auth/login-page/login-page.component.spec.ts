import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../auth.service';
import { SessionNoticeService } from '../../../core/services/session-notice.service';
import { SESSION_EXPIRED_MESSAGE } from '../../../core/messages/http-error-messages';

describe('LoginPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should disable the submit button while email or password are empty', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    expect(component['form'].invalid).toBeTrue();

    component['form'].controls.email.setValue('user@example.com');
    expect(component['form'].invalid).toBeTrue();

    component['form'].controls.password.setValue('correct-horse');
    expect(component['form'].invalid).toBeFalse();
  });

  it('should navigate to /projects on successful login without mustChangePassword', () => {
    authServiceSpy.login.and.returnValue(of({ mustChangePassword: false }));
    const navigateSpy = spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
    component['onSubmit']();

    expect(authServiceSpy.login).toHaveBeenCalledWith('user@example.com', 'correct-horse');
    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
    expect(component['mustChangePassword']).toBeFalse();
  });

  it('should show the password-change modal instead of navigating when mustChangePassword is true', () => {
    authServiceSpy.login.and.returnValue(of({ mustChangePassword: true }));
    const navigateSpy = spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
    component['onSubmit']();

    expect(component['mustChangePassword']).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should navigate to /projects once the password-change modal reports completion', () => {
    authServiceSpy.login.and.returnValue(of({ mustChangePassword: true }));
    const navigateSpy = spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
    component['onSubmit']();
    component['onPasswordChanged']();

    expect(component['mustChangePassword']).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
  });

  it('should show the session-expired hint text once after a redirect from httpErrorInterceptor (US-044 Akzeptanzkriterium 2)', () => {
    const sessionNotice = TestBed.inject(SessionNoticeService);
    sessionNotice.set(SESSION_EXPIRED_MESSAGE);

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['sessionExpiredMessage']).toBe(SESSION_EXPIRED_MESSAGE);
    expect(sessionNotice.consume()).toBeNull();
  });

  it('should not show a session-expired hint text on a regular login visit', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['sessionExpiredMessage']).toBeNull();
  });

  it('should show a non-blocking error and clear the password field on 401', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'wrong-password' });
    component['onSubmit']();

    expect(component['errorMessage']).toBe('E-Mail oder Passwort ist falsch.');
    expect(component['form'].controls.password.value).toBe('');
    expect(component['mustChangePassword']).toBeFalse();
  });

  /**
   * US-049: der Backend-Agent hat angemerkt, dass der Fehler-Handler zuvor unterschiedslos für
   * JEDEN Fehler (auch einen 502 durch ein noch nicht bereites Backend) die fachlich falsche
   * „Zugangsdaten falsch"-Meldung zeigte. Dieser Test belegt die Differenzierung nach Statuscode
   * gemäß SPEC-01-Login.md §3.1.
   */
  it('should show a generic technical-error message (not "Zugangsdaten falsch") for a non-401 error such as a 502', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' })),
    );
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
    component['onSubmit']();

    expect(component['errorMessage']).toBe('Anmeldung derzeit nicht möglich. Bitte später erneut versuchen.');
    expect(component['form'].controls.password.value).toBe('');
    expect(component['isSubmitting']).toBeFalse();
    expect(component['isTakingLonger']).toBeFalse();
  });

  /**
   * US-057: die obigen Tests verwenden einen `AuthService`-Spy mit synchronem `of(...)`/
   * `throwError(...)`, wodurch der `subscribe()`-Callback noch im selben synchronen Aufruf von
   * `onSubmit()` läuft — das reproduziert den eigentlichen Bug nicht (siehe Story Abschnitt 2).
   * Diese Tests nutzen stattdessen `HttpTestingController`: `flush()` löst den Callback erst NACH
   * dem ursprünglichen `onSubmit()`-Aufruf aus, analog zum in US-050 etablierten Muster, und
   * beweisen, dass das DOM danach — ohne zusätzliche simulierte Interaktion — den korrekten
   * Endzustand zeigt (Akzeptanzkriterium 4 der Story).
   */
  describe('mit echtem HttpClient/HttpTestingController (US-057)', () => {
    let http: HttpTestingController;
    let httpRouter: Router;
    let httpNavigateSpy: jasmine.Spy;

    beforeEach(async () => {
      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [LoginPageComponent],
          providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        })
        .compileComponents();

      http = TestBed.inject(HttpTestingController);
      httpRouter = TestBed.inject(Router);
      httpNavigateSpy = spyOn(httpRouter, 'navigate').and.resolveTo(true);
    });

    afterEach(() => http.verify());

    it('should navigate to /projects and release the button from the processing state after flush() without further interaction (success)', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();
      fixture.componentInstance['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
      fixture.componentInstance['onSubmit']();

      http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
      // Bewusst KEIN simulierter Klick/Tastatur-Event nach flush() — nur der reguläre CD-Zyklus.
      fixture.detectChanges();

      expect(httpNavigateSpy).toHaveBeenCalledWith(['/projects']);
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
      expect(button.disabled).toBeFalse();
      expect(button.getAttribute('aria-busy')).toBe('false');
      expect(button.textContent).toContain('Anmelden');
    });

    it('should show the error message and release the button from the processing state after flush() without further interaction (error)', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();
      fixture.componentInstance['form'].setValue({ email: 'user@example.com', password: 'wrong-password' });
      fixture.componentInstance['onSubmit']();

      http.expectOne('/api/v1/auth/login').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(httpNavigateSpy).not.toHaveBeenCalled();
      // `disabled` wird bewusst nicht geprüft: `onSubmit()` leert das Passwort-Feld im Fehlerfall,
      // wodurch die Formular-Validierung den Button erneut sperrt — beabsichtigtes Verhalten, nicht
      // der hier zu behebende Verarbeitungs-Zustand. Maßgeblich ist `aria-busy`.
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
      expect(button.getAttribute('aria-busy')).toBe('false');
      expect(fixture.nativeElement.textContent).toContain('E-Mail oder Passwort ist falsch.');
    });

    /**
     * US-049 Akzeptanzkriterium 5: technischer Anknüpfungspunkt für einen erkennbaren Unterschied
     * zwischen „Request läuft" und „Request läuft bereits ungewöhnlich lange" — belegt mit einem
     * echten, noch ausstehenden Request (kein flush() vor Ablauf des Schwellenwerts), analog zum
     * bug-reproduzierenden Muster der übrigen Tests in diesem describe-Block.
     */
    it('should mark the login request as taking longer than usual once it has been pending for 3s (US-049)', () => {
      jasmine.clock().install();
      try {
        const fixture = TestBed.createComponent(LoginPageComponent);
        fixture.detectChanges();
        fixture.componentInstance['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
        fixture.componentInstance['onSubmit']();

        expect(fixture.componentInstance['isTakingLonger']).toBeFalse();

        jasmine.clock().tick(2999);
        fixture.detectChanges();
        expect(fixture.componentInstance['isTakingLonger']).toBeFalse();

        jasmine.clock().tick(1);
        fixture.detectChanges();
        expect(fixture.componentInstance['isTakingLonger']).toBeTrue();
        const notice: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]');
        expect(notice).not.toBeNull();
        expect(notice?.textContent).toContain('dauert ungewöhnlich lange');

        http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
        fixture.detectChanges();

        expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('should NOT mark the login request as taking longer than usual when it resolves before the 3s threshold, and clears the pending timer (US-049)', () => {
      jasmine.clock().install();
      try {
        const fixture = TestBed.createComponent(LoginPageComponent);
        fixture.detectChanges();
        fixture.componentInstance['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
        fixture.componentInstance['onSubmit']();

        jasmine.clock().tick(50);
        http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
        fixture.detectChanges();

        expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
        let notice: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]');
        expect(notice).toBeNull();

        // Belegt, dass der Timer beim Aufräumen tatsächlich per clearTimeout() entfernt wurde:
        // ohne clearTimeout() würde dieser Tick den Zustand nachträglich noch auf "true" kippen.
        jasmine.clock().tick(5000);
        fixture.detectChanges();
        expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
        notice = fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]');
        expect(notice).toBeNull();
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });
});
