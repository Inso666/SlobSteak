import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
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
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    // US-052: Dieser Guard hängt auf der Elternroute `projects/:id`, deren eigenes Kind
    // `access-denied` sein Umleitungsziel bei fehlender Berechtigung ist. Ohne diese Prüfung
    // re-evaluiert der Guard sich selbst für JEDE Navigation zu einem Kind dieser Elternroute —
    // also auch für sein eigenes Umleitungsziel: Ein abgelehnter Nutzer löst dadurch eine
    // Endlosschleife aus Redirects auf sich selbst aus (real reproduziert: >1000
    // `GET /api/v1/projects/{id}`-Requests binnen weniger Sekunden, Seite bleibt dauerhaft leer —
    // siehe Story-Datei „Anmerkungen des Agenten"). Die „Kein Zugriff"-Ansicht selbst zeigt keine
    // projektspezifischen Daten und muss daher für JEDEN authentifizierten Nutzer uneingeschränkt
    // erreichbar sein, sonst wäre sie als Fehler-Fallback nutzlos.
    if (state.url.endsWith('/access-denied')) {
      return true;
    }

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
