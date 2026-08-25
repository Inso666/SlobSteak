import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminProject, AdminProjectsService } from '../admin-projects.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProjectsAdminComponent } from './projects-admin.component';

describe('ProjectsAdminComponent', () => {
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;

  const existingProjects: AdminProject[] = [
    {
      id: 'project-1',
      name: 'Projekt Phoenix',
      description: null,
      status: 'Active',
      memberCount: 2,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', [
      'listProjects',
      'createProject',
      'listMemberships',
      'assignMember',
      'changeMemberRole',
      'removeMember',
    ]);
    adminProjectsServiceSpy.listProjects.and.returnValue(of(existingProjects));
    adminProjectsServiceSpy.listMemberships.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ProjectsAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
      ],
    }).compileComponents();
  });

  it('should create and load the project list on init', () => {
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();

    expect(adminProjectsServiceSpy.listProjects).toHaveBeenCalled();
    expect(fixture.componentInstance['projects']).toEqual(existingProjects);
  });

  it('should not call createProject when the create form is invalid', () => {
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onCreateProject']();

    expect(adminProjectsServiceSpy.createProject).not.toHaveBeenCalled();
  });

  it('should create a project and reload the list on valid submit', () => {
    adminProjectsServiceSpy.createProject.and.returnValue(of(existingProjects[0]));
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({ name: 'Neues Projekt', description: 'Beschreibung' });
    component['onCreateProject']();

    expect(adminProjectsServiceSpy.createProject).toHaveBeenCalledWith(
      'Neues Projekt',
      'Beschreibung',
    );
    expect(adminProjectsServiceSpy.listProjects).toHaveBeenCalledTimes(2);
  });

  it('should show a consistent load-error message when the project list fails to load (US-044 Akzeptanzkriterium 4)', () => {
    adminProjectsServiceSpy.listProjects.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  it('should toggle the selected project on select and deselect', () => {
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onSelectProject'](existingProjects[0]);
    expect(component['selectedProjectId']).toBe('project-1');

    component['onSelectProject'](existingProjects[0]);
    expect(component['selectedProjectId']).toBeNull();
  });

  describe('US-050: diskreter Ladezustand statt fälschlicher Leer-Darstellung', () => {
    // Diese Tests brauchen den echten `HttpClient` (samt `HttpTestingController`) statt der
    // Spy-Provider aus dem äußeren `beforeEach` oben — `resetTestingModule()` verhindert, dass die
    // dort bereits registrierten Spy-Provider (insb. `AdminProjectsService`) unbemerkt weiterwirken.
    beforeEach(() => TestBed.resetTestingModule());

    it('shows the loading state before the response arrives, then the projects without any further interaction after flush()', () => {
      TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['projectsState']).toBe('loading');
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.project-card').length).toBe(0);

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/admin/projects').flush(existingProjects);
      fixture.detectChanges();

      expect(fixture.componentInstance['projectsState']).toBe('content');
      const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.project-card');
      expect(cards.length).toBe(existingProjects.length);
      expect(cards[0].textContent).toContain(existingProjects[0].name);

      httpTestingController.verify();
    });

    it('shows the empty state only after the request resolved with an actually empty result, not while it is still pending', () => {
      TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/admin/projects').flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance['projectsState']).toBe('empty');
      expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Es existieren noch keine Projekte.');

      httpTestingController.verify();
    });
  });
});
