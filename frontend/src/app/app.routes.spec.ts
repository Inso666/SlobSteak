import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from './features/projects/projects.service';
import { routes } from './app.routes';

/**
 * Regressionstest zu US-030 Akzeptanzkriterium 4 (Frontend-Anteil): stellt sicher, dass die
 * Map-Route weiterhin über den in `app.routes.ts` konfigurierten `roleGuard` gegen Rolle `User`
 * gesperrt ist. Kein Ersatz für den in der Story-Datei dokumentierten offenen Backend-Punkt (der
 * Map-Query-Endpoint aus US-031 existiert noch nicht und kann daher serverseitig noch nicht
 * gesperrt werden) — dieser Test deckt ausschließlich die bereits bestehende, seit US-019/US-026
 * unveränderte Frontend-Navigationssperre ab, damit ein künftiger Refactor der Routentabelle sie
 * nicht versehentlich entfernt.
 */
describe('app.routes: Map-Route Zugriffsschutz (US-030 AC4, Frontend-Anteil)', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  beforeEach(() => {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ProjectsService, useValue: projectsServiceSpy }],
    });
  });

  function mapRouteGuard(): CanActivateFn {
    const projectRoute = routes.find((route) => route.path === 'projects/:id');
    const mapRoute = projectRoute?.children?.find((child) => child.path === 'map');
    const guard = mapRoute?.canActivate?.[0];
    if (!guard) {
      throw new Error('Erwartete canActivate-Guard-Konfiguration auf der Map-Route wurde nicht gefunden.');
    }
    return guard as CanActivateFn;
  }

  function routeSnapshotWithId(id: string): ActivatedRouteSnapshot {
    return { paramMap: { get: (key: string) => (key === 'id' ? id : null) } } as unknown as ActivatedRouteSnapshot;
  }

  function projectWithRole(role: string): ProjectOverviewItem {
    return { id: 'project-1', name: 'Projekt', role, stakeholderCount: 0 };
  }

  /** US-052: `roleGuard` liest inzwischen `state.url` (Schutz gegen einen Redirect auf sich
   * selbst, siehe dortige Anmerkung) — ein `{}`-Fake ohne `url` ist daher kein realistisches
   * `RouterStateSnapshot` mehr. */
  function stateWithUrl(url: string): RouterStateSnapshot {
    return { url } as unknown as RouterStateSnapshot;
  }

  it('should deny activation of the map route for role User (redirect to access-denied)', (done) => {
    projectsServiceSpy.getProject.and.returnValue(of(projectWithRole('User')));

    const guard = mapRouteGuard();
    const result$ = TestBed.runInInjectionContext(() => guard(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/map')));

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect((result as UrlTree).toString()).toBe('/projects/project-1/access-denied');
      done();
    });
  });

  it('should allow activation of the map route for role PL', (done) => {
    projectsServiceSpy.getProject.and.returnValue(of(projectWithRole('PL')));

    const guard = mapRouteGuard();
    const result$ = TestBed.runInInjectionContext(() => guard(routeSnapshotWithId('project-1'), stateWithUrl('/projects/project-1/map')));

    (result$ as ReturnType<typeof of>).subscribe((result: unknown) => {
      expect(result).toBeTrue();
      done();
    });
  });
});
