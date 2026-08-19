import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
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

  it('should show the map tab for PL/Coreteam/Architect but hide it for User (Akzeptanzkriterium 3)', () => {
    configure({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showMapTab']).toBeFalse();
  });

  it('should show the map tab for a non-User role', () => {
    configure({ id: 'project-1', name: 'Projekt', role: 'Architect', stakeholderCount: 0 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showMapTab']).toBeTrue();
  });

  it('should show the distribution tab only for PL/Coreteam (Akzeptanzkriterium 4)', () => {
    configure({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 0 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showDistributionTab']).toBeTrue();
  });

  it('should hide the distribution tab for Architect', () => {
    configure({ id: 'project-1', name: 'Projekt', role: 'Architect', stakeholderCount: 0 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showDistributionTab']).toBeFalse();
  });

  it('should hide the distribution tab for User', () => {
    configure({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showDistributionTab']).toBeFalse();
  });
});
