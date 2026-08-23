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
    authServiceSpy.login.and.returnValue(throwError(() => new Error('Unauthorized')));
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component['form'].setValue({ email: 'user@example.com', password: 'wrong-password' });
    component['onSubmit']();

    expect(component['errorMessage']).toBe('E-Mail oder Passwort ist falsch.');
    expect(component['form'].controls.password.value).toBe('');
    expect(component['mustChangePassword']).toBeFalse();
  });
});
