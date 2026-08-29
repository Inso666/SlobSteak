import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectOverviewItem, ProjectsService } from '../../features/projects/projects.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  const project: ProjectOverviewItem = { id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 };

  beforeEach(() => {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ProjectsService, useValue: projectsServiceSpy }],
    });
  });

  function routeSnapshotWithId(id: string): ActivatedRouteSnapshot {
    return { paramMap: { get: (key: string) => (key === 'id' ? id : null) } } as unknown as ActivatedRouteSnapshot;
  }

  function childRouteSnapshotWithParentId(id: string): ActivatedRouteSnapshot {
    return {
      paramMap: { get: () => null },
      parent: { paramMap: { get: (key: string) => (key === 'id' ? id : null) } },
    } as unknown as ActivatedRouteSnapshot;
  }

  /** US-052: der Guard liest inzwischen `state.url` (siehe dortige Anmerkung zur
   * Endlosschleife) — ein reales `RouterStateSnapshot` hat immer eine `url`, ein leeres `{}` wie
   * zuvor in diesen Tests ist daher kein realistischer Fake mehr. */
  function stateWithUrl(url: string): RouterStateSnapshot {
    return { url } as unknown as RouterStateSnapshot;
  }

  it('should allow activation when the user has one of the allowed roles in the project', (done) => {
    projectsServiceSpy.getProject.and.returnValue(of({ ...project, role: 'PL' }));

    const result$ = TestBed.runInInjectionContext(() =>
      roleGuard(['PL', 'Coreteam'])(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/stakeholders')),
    );

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('should redirect to access-denied when the role is not allowed', (done) => {
    projectsServiceSpy.getProject.and.returnValue(of({ ...project, role: 'User' }));

    const result$ = TestBed.runInInjectionContext(() =>
      roleGuard(['PL', 'Coreteam'])(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/stakeholders')),
    );

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect((result as UrlTree).toString()).toBe('/projects/project-1/access-denied');
      done();
    });
  });

  it('should redirect to access-denied when the project lookup fails (e.g. no membership)', (done) => {
    projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const result$ = TestBed.runInInjectionContext(() =>
      roleGuard(['PL', 'Coreteam'])(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/stakeholders')),
    );

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect((result as UrlTree).toString()).toBe('/projects/project-1/access-denied');
      done();
    });
  });

  it('should resolve the project id from the parent route for child routes', (done) => {
    projectsServiceSpy.getProject.and.returnValue(of({ ...project, role: 'PL' }));

    const result$ = TestBed.runInInjectionContext(() =>
      roleGuard(['PL'])(childRouteSnapshotWithParentId('project-1'), stateWithUrl('/projects/project-1/map')),
    );

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect(projectsServiceSpy.getProject).toHaveBeenCalledWith('project-1');
      expect(result).toBeTrue();
      done();
    });
  });

  it('should redirect to /projects when no project id can be resolved at all', () => {
    const routeWithoutId = { paramMap: { get: () => null } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(['PL'])(routeWithoutId, stateWithUrl('/projects/undefined')));

    expect((result as UrlTree).toString()).toBe('/projects');
  });

  it('US-052: should allow activation unconditionally (no getProject call) when the target URL is the guard\'s own access-denied redirect target, to prevent an infinite redirect loop', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PL'])(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/access-denied')),
    );

    expect(result).toBeTrue();
    expect(projectsServiceSpy.getProject).not.toHaveBeenCalled();
  });
});
