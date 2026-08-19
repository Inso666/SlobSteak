import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProjectsService } from '../../features/projects/projects.service';

/**
 * Guard-Fabrik (US-019): sperrt eine Projekt-Workspace-Route auf die übergebenen projektbezogenen
 * Rollen (`PL`/`Coreteam`/`Architect`/`User`), geprüft anhand der tatsächlichen Rolle des
 * angemeldeten Nutzers *in diesem Projekt* (nicht der instanzweiten `isSystemAdmin`-Eigenschaft —
 * ein Admin ohne eigene Projektzuweisung hat laut PRD Abschnitt 2.3 keinen fachlichen Zugriff).
 * Rein clientseitiger Platzhalter-Guard (Akzeptanzkriterium 3/4): der zugrunde liegende
 * API-Aufruf bleibt ohnehin serverseitig durch US-007 geschützt. Bei fehlender Berechtigung (oder
 * fehlender Mitgliedschaft, z. B. 404) wird auf die „Kein Zugriff“-Ansicht umgeleitet statt die
 * Navigation stillschweigend zu blockieren (Akzeptanzkriterium 5).
 */
export function roleGuard(allowedRoles: readonly string[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const projectsService = inject(ProjectsService);
    const router = inject(Router);

    const projectId = route.paramMap.get('id') ?? route.parent?.paramMap.get('id');
    if (!projectId) {
      return router.createUrlTree(['/projects']);
    }

    return projectsService.getProject(projectId).pipe(
      map((project) => (allowedRoles.includes(project.role) ? true : router.createUrlTree(['/projects', projectId, 'access-denied']))),
      catchError(() => of(router.createUrlTree(['/projects', projectId, 'access-denied']))),
    );
  };
}
