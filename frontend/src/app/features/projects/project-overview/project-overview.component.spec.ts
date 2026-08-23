import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProjectOverviewComponent } from './project-overview.component';

describe('ProjectOverviewComponent', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  const myProjects: ProjectOverviewItem[] = [{ id: 'project-1', name: 'Mein Projekt', role: 'PL', stakeholderCount: 3 }];
  const allProjects: AdminProject[] = [
    { id: 'project-1', name: 'Mein Projekt', description: null, status: 'Active', memberCount: 1, createdAt: '' },
    { id: 'project-2', name: 'Fremdes Projekt', description: null, status: 'Active', memberCount: 0, createdAt: '' },
  ];

  function configure(isSystemAdmin: boolean) {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects']);
    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects']);
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);
    projectsServiceSpy.listMyProjects.and.returnValue(of(myProjects));
    adminProjectsServiceSpy.listProjects.and.returnValue(of(allProjects));
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin });

    TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });
  }

  it('should load own projects on init', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    expect(projectsServiceSpy.listMyProjects).toHaveBeenCalled();
    expect(fixture.componentInstance['myProjects']).toEqual(myProjects);
  });

  it('should not load all projects for a non-admin user', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    expect(adminProjectsServiceSpy.listProjects).not.toHaveBeenCalled();
    expect(fixture.componentInstance['isSystemAdmin']).toBeFalse();
  });

  it('should additionally load all projects for a system admin', () => {
    configure(true);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    expect(adminProjectsServiceSpy.listProjects).toHaveBeenCalled();
    expect(fixture.componentInstance['allProjects']).toEqual(allProjects);
    expect(fixture.componentInstance['isSystemAdmin']).toBeTrue();
  });

  it('should show a consistent load-error message when own projects fail to load (US-044 Akzeptanzkriterium 4)', () => {
    configure(false);
    projectsServiceSpy.listMyProjects.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  it('should show a consistent load-error message when all projects fail to load for a system admin', () => {
    configure(true);
    adminProjectsServiceSpy.listProjects.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  it('should switch the active tab on selection', () => {
    configure(true);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['activeTab']).toBe('mine');
    component['onSelectTab']('all');
    expect(component['activeTab']).toBe('all');
  });

  it('should navigate to the project workspace route when a project is opened', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance['onOpenProject']('project-1');

    expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'project-1']);
  });

  it('should navigate to the admin projects page when creating a new project', () => {
    configure(true);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance['onCreateProject']();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/projects']);
  });
});
