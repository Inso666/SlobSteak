import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminProject, AdminProjectsService } from '../admin-projects.service';
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
      providers: [{ provide: AdminProjectsService, useValue: adminProjectsServiceSpy }],
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

    expect(adminProjectsServiceSpy.createProject).toHaveBeenCalledWith('Neues Projekt', 'Beschreibung');
    expect(adminProjectsServiceSpy.listProjects).toHaveBeenCalledTimes(2);
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
});
