import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { httpErrorInterceptor } from '../../../core/interceptors/http-error.interceptor';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { CurrentProjectContextService } from '../../../core/services/current-project-context.service';
import { ProjectWorkspaceLayoutComponent } from './project-workspace-layout.component';

describe('ProjectWorkspaceLayoutComponent', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  function configure(project: ProjectOverviewItem) {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(project));

    TestBed.configureTestingModule({
      imports: [ProjectWorkspaceLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } },
        },
      ],
    });
  }

  it('should load the project and expose it for the header (Akzeptanzkriterium 1)', () => {
    configure({ id: 'project-1', name: 'Projekt Phoenix', role: 'PL', stakeholderCount: 2 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(projectsServiceSpy.getProject).toHaveBeenCalledWith('project-1');
    expect(fixture.componentInstance['project']?.name).toBe('Projekt Phoenix');
    expect(fixture.componentInstance['project']?.role).toBe('PL');
  });

  // US-075: die vormals hier getesteten `showMapTab`/`showDistributionTab`-Getter sind mit der
  // horizontalen Tab-Leiste entfallen — dieselbe Rollenregel wird jetzt von `AppNavigationComponent`
  // für die Sidebar-Unterpunkte ausgewertet (siehe `us-075-projekt-kontext-sidebar-unterpunkte.spec.ts`).
  // Diese Komponente ist stattdessen die einzige Quelle für den geteilten Projekt-Kontext-Zustand.
  it('publishes the loaded project into CurrentProjectContextService for the sidebar to read (US-075)', () => {
    configure({ id: 'project-1', name: 'Projekt Phoenix', role: 'PL', stakeholderCount: 2 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    const context = TestBed.inject(CurrentProjectContextService);
    expect(context.project()?.name).toBe('Projekt Phoenix');
    expect(context.project()?.role).toBe('PL');
  });

  it('clears CurrentProjectContextService when the component is destroyed (US-075)', () => {
    configure({ id: 'project-1', name: 'Projekt Phoenix', role: 'PL', stakeholderCount: 2 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    const context = TestBed.inject(CurrentProjectContextService);
    expect(context.project()).not.toBeNull();

    fixture.destroy();

    expect(context.project()).toBeNull();
  });

  it('clears CurrentProjectContextService when the project fails to load (US-075)', () => {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    TestBed.configureTestingModule({
      imports: [ProjectWorkspaceLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
      ],
    });
    const context = TestBed.inject(CurrentProjectContextService);
    context.setProject({ id: 'stale-project', name: 'Veraltet', role: 'PL', stakeholderCount: 0 });

    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(context.project()).toBeNull();
  });

  it('should show a consistent load-error message when the project fails to load (US-044 Akzeptanzkriterium 4)', () => {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
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

  // US-044 Akzeptanzkriterium 5: End-to-End-Zusammenspiel von httpErrorInterceptor und Komponente
  // über die echte HttpClient-Pipeline (nicht nur isoliert im Interceptor-Test), mit einem
  // simulierten 401-Response über HttpTestingController statt eines gemockten ProjectsService.
  describe('with the real httpErrorInterceptor wired in (Akzeptanzkriterium 5)', () => {
    let httpTestingController: HttpTestingController;
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;
    let router: Router;

    beforeEach(() => {
      tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['clearToken']);

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

      httpTestingController = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
    });

    afterEach(() => httpTestingController.verify());

    it('clears the token and navigates to /login on a simulated 401 response', () => {
      const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

      const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
      fixture.detectChanges();

      httpTestingController.expectOne('/api/v1/projects/project-1').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(tokenStorageSpy.clearToken).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
