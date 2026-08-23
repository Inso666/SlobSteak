import { Component } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TokenStorageService } from '../../features/auth/token-storage.service';
import { SESSION_EXPIRED_MESSAGE } from '../messages/http-error-messages';
import { SessionNoticeService } from '../services/session-notice.service';
import { httpErrorInterceptor } from './http-error.interceptor';

/** Leere Test-Route für `/login`, damit `router.navigateByUrl('/login')` in den Testfällen unten
 * eine reale Navigation auslösen kann (nur zum Vorbereiten des Ausgangszustands „bereits auf
 * /login“, nicht Teil des zu testenden Interceptor-Verhaltens). */
@Component({ selector: 'app-test-login-stub', template: '', standalone: true })
class LoginStubComponent {}

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
  let router: Router;

  function configure(): void {
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['clearToken']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  beforeEach(() => configure());

  afterEach(() => httpTestingController.verify());

  it('clears the token and redirects to /login with a visible hint text on 401', async () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const sessionNotice = TestBed.inject(SessionNoticeService);

    let observedError: unknown;
    httpClient.get('/api/v1/projects').subscribe({ error: (error) => (observedError = error) });

    httpTestingController.expectOne('/api/v1/projects').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorageSpy.clearToken).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(sessionNotice.consume()).toBe(SESSION_EXPIRED_MESSAGE);
    expect((observedError as { status: number }).status).toBe(401);
  });

  it('does not redirect again when a 401 occurs while already on /login', async () => {
    await router.navigateByUrl('/login');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    httpClient.post('/api/v1/auth/login', { email: 'a@b.de', password: 'wrong' }).subscribe({ error: () => undefined });
    httpTestingController.expectOne('/api/v1/auth/login').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorageSpy.clearToken).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not redirect on 403 but logs and passes the error through unchanged (Akzeptanzkriterium 3)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    const consoleErrorSpy = spyOn(console, 'error');

    let observedError: unknown;
    httpClient.get('/api/v1/projects/project-1').subscribe({ error: (error) => (observedError = error) });

    httpTestingController.expectOne('/api/v1/projects/project-1').flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(tokenStorageSpy.clearToken).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect((observedError as { status: number }).status).toBe(403);
    expect(consoleErrorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/403/));
    expect(consoleErrorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/\/api\/v1\/projects\/project-1/));
  });

  it('passes a generic 5xx error through unchanged without redirecting or logging as a 403', () => {
    const navigateSpy = spyOn(router, 'navigate');
    const consoleErrorSpy = spyOn(console, 'error');

    let observedError: unknown;
    httpClient.get('/api/v1/projects').subscribe({ error: (error) => (observedError = error) });

    httpTestingController.expectOne('/api/v1/projects').flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(tokenStorageSpy.clearToken).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect((observedError as { status: number }).status).toBe(500);
  });
});
