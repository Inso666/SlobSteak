import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HTTP_INTERCEPTORS_ORDER } from '../../app.config';
import { authInterceptor } from '../../features/auth/auth.interceptor';
import { TokenStorageService } from '../../features/auth/token-storage.service';
import { ProjectsService } from '../../features/projects/projects.service';
import { StakeholdersService } from '../../features/stakeholders/stakeholders.service';
import { AdminUsersService } from '../../features/admin/admin-users.service';
import { AdminProjectsService } from '../../features/admin/admin-projects.service';
import { UsersAdminComponent } from '../../features/admin/users-admin/users-admin.component';
import { ProjectsAdminComponent } from '../../features/admin/projects-admin/projects-admin.component';
import { ProjectOverviewComponent } from '../../features/projects/project-overview/project-overview.component';
import { ProjectWorkspaceLayoutComponent } from '../../features/workspace/project-workspace-layout/project-workspace-layout.component';
import { StakeholderListComponent } from '../../features/stakeholders/stakeholder-list/stakeholder-list.component';
import { LOAD_ERROR_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../messages/http-error-messages';
import { SessionNoticeService } from '../services/session-notice.service';
import { httpErrorInterceptor } from './http-error.interceptor';

/** Leere Test-Route für `/login`, damit `router.navigateByUrl('/login')` unten eine reale
 * Navigation auslösen kann, um den Ausgangszustand „Nutzer ist bereits auf /login“ herzustellen. */
@Component({ selector: 'app-test-login-stub', template: '', standalone: true })
class LoginStubComponent {}

/**
 * Story-Test US-044 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * fünf in `docs/usecases/US-044-globales-http-error-handling.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument — getrennt von den generischen Unit-/Komponententests
 * in `http-error.interceptor.spec.ts` und den einzelnen `*.component.spec.ts`-Dateien.
 */
describe('US-044: Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung', () => {
  it('Akzeptanzkriterium 1: httpErrorInterceptor ist in app.config.ts nach authInterceptor registriert', () => {
    expect(HTTP_INTERCEPTORS_ORDER).toContain(authInterceptor);
    expect(HTTP_INTERCEPTORS_ORDER).toContain(httpErrorInterceptor);
    expect(HTTP_INTERCEPTORS_ORDER.indexOf(authInterceptor)).toBeLessThan(HTTP_INTERCEPTORS_ORDER.indexOf(httpErrorInterceptor));
  });

  describe('Akzeptanzkriterium 2: 401 löscht das Token und leitet mit sichtbarem Hinweistext zu /login weiter', () => {
    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let router: Router;

    beforeEach(() => {
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
    });

    afterEach(() => httpTestingController.verify());

    it('clears the token, navigates to /login and sets the visible hint text', () => {
      const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
      const sessionNotice = TestBed.inject(SessionNoticeService);

      httpClient.get('/api/v1/projects').subscribe({ error: () => undefined });
      httpTestingController.expectOne('/api/v1/projects').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(tokenStorageSpy.clearToken).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
      expect(sessionNotice.consume()).toBe(SESSION_EXPIRED_MESSAGE);
      expect(SESSION_EXPIRED_MESSAGE).toBe('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
    });

    it('does not redirect a second time when the user is already on /login', async () => {
      await router.navigateByUrl('/login');
      const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

      httpClient.get('/api/v1/projects').subscribe({ error: () => undefined });
      httpTestingController.expectOne('/api/v1/projects').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  it('Akzeptanzkriterium 3: 403 löst keinen Redirect aus, reicht den Fehler durch und protokolliert URL + Status', () => {
    const tokenStorageSpy = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['clearToken']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });

    const httpClient = TestBed.inject(HttpClient);
    const httpTestingController = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const consoleErrorSpy = spyOn(console, 'error');

    let observedError: unknown;
    httpClient.get('/api/v1/projects/project-1/stakeholders').subscribe({ error: (error) => (observedError = error) });
    httpTestingController.expectOne('/api/v1/projects/project-1/stakeholders').flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(tokenStorageSpy.clearToken).not.toHaveBeenCalled();
    expect((observedError as HttpErrorResponse).status).toBe(403);
    expect(consoleErrorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/403/));
    expect(consoleErrorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/\/api\/v1\/projects\/project-1\/stakeholders/));

    httpTestingController.verify();
  });

  describe('Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Ansicht bei den fünf betroffenen GET-Ladevorgängen', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('stakeholder-list.component.ts (loadStakeholders)', () => {
      const stakeholdersServiceSpy = jasmine.createSpyObj<StakeholdersService>('StakeholdersService', ['listStakeholders']);
      stakeholdersServiceSpy.listStakeholders.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
      projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 }));

      TestBed.configureTestingModule({
        imports: [StakeholderListComponent],
        providers: [
          provideRouter([]),
          { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    });

    it('project-overview.component.ts (ngOnInit)', () => {
      const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['listMyProjects']);
      projectsServiceSpy.listMyProjects.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      // Wird bei isSystemAdmin === false nicht aufgerufen, muss aber als Provider vorhanden sein,
      // da AdminProjectsService sonst beim Komponenten-Aufbau versucht, den echten HttpClient zu
      // injizieren (der in diesem Testmodul bewusst nicht bereitgestellt wird).
      const adminProjectsServiceSpy = jasmine.createSpyObj<AdminProjectsService>('AdminProjectsService', ['listProjects']);

      TestBed.configureTestingModule({
        imports: [ProjectOverviewComponent],
        providers: [
          provideRouter([]),
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        ],
      });
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    });

    it('project-workspace-layout.component.ts (ngOnInit)', () => {
      const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
      projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      TestBed.configureTestingModule({
        imports: [ProjectWorkspaceLayoutComponent],
        providers: [
          provideRouter([]),
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        ],
      });
      const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    });

    it('users-admin.component.ts (loadUsers)', () => {
      const adminUsersServiceSpy = jasmine.createSpyObj<AdminUsersService>('AdminUsersService', ['listUsers']);
      adminUsersServiceSpy.listUsers.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [{ provide: AdminUsersService, useValue: adminUsersServiceSpy }],
      });
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    });

    it('projects-admin.component.ts (loadProjects)', () => {
      const adminProjectsServiceSpy = jasmine.createSpyObj<AdminProjectsService>('AdminProjectsService', ['listProjects']);
      adminProjectsServiceSpy.listProjects.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [{ provide: AdminProjectsService, useValue: adminProjectsServiceSpy }],
      });
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    });
  });

  it('Akzeptanzkriterium 5: Interceptor + Komponente wirken über HttpTestingController end-to-end zusammen (401 löscht Token, navigiert zu /login)', () => {
    const tokenStorageSpy = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['clearToken']);

    TestBed.configureTestingModule({
      imports: [ProjectWorkspaceLayoutComponent],
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenStorageService, useValue: tokenStorageSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
      ],
    });

    const httpTestingController = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    httpTestingController.expectOne('/api/v1/projects/project-1').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorageSpy.clearToken).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);

    httpTestingController.verify();
  });
});
