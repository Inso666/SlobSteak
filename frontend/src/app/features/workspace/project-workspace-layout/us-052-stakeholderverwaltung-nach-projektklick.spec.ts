import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { AccessDeniedComponent } from '../access-denied/access-denied.component';
import { roleGuard } from '../../../core/guards/role.guard';
import { ProjectWorkspaceLayoutComponent } from './project-workspace-layout.component';

/** Schlanker Platzhalter für den realen `stakeholders`-Kind-Route-Inhalt — genügt, um zu belegen,
 * dass das `router-outlet` im Erfolgsfall tatsächlich rendert, ohne die schwergewichtige echte
 * `StakeholderListComponent` (mit eigenen Service-Abhängigkeiten) einzubinden. */
@Component({ selector: 'app-test-stakeholders-stub', standalone: true, template: 'Stakeholder-Liste-Stub' })
class StakeholdersStubComponent {}

/**
 * Story-Test US-052 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-052-stakeholderverwaltung-nach-projektklick.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument.
 *
 * Verwendet bewusst `RouterTestingHarness` (statt eines manuell erzeugten `ProjectWorkspaceLayoutComponent`-
 * Fixtures mit gemocktem `ActivatedRoute`, wie es die übrigen Komponententests dieses Repos tun):
 * Der eigentliche Bug/Fix betrifft das Zusammenspiel zwischen `roleGuard` (läuft VOR der
 * Komponenten-Erzeugung) und dem verschachtelten `<router-outlet>` innerhalb von
 * `ProjectWorkspaceLayoutComponent` — das ist nur über eine echte, vollständige
 * Router-Navigation mit echter Outlet-Verschachtelung beobachtbar, nicht über eine isoliert
 * erzeugte Komponente mit gemocktem `ActivatedRoute`.
 */
describe('US-052: Stakeholderverwaltung nach Projektauswahl zuverlässig anzeigen', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  const authorizedProject: ProjectOverviewItem = { id: 'project-1', name: 'Projekt Alpha', role: 'PL', stakeholderCount: 3 };

  const routes: Routes = [
    {
      path: 'projects/:id',
      component: ProjectWorkspaceLayoutComponent,
      canActivate: [roleGuard(['PL', 'Coreteam', 'Architect', 'User'])],
      children: [
        { path: '', redirectTo: 'stakeholders', pathMatch: 'full' },
        { path: 'stakeholders', component: StakeholdersStubComponent },
        { path: 'access-denied', component: AccessDeniedComponent },
      ],
    },
  ];

  beforeEach(() => {
    projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);

    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: ProjectsService, useValue: projectsServiceSpy }],
    });
  });

  it('Akzeptanzkriterium 1: ein Projektmitglied mit gültiger Rolle sieht nach Klick auf sein Projekt zuverlässig die Stakeholderverwaltung als Standard-Tab', async () => {
    projectsServiceSpy.getProject.and.returnValue(of(authorizedProject));

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/project-1');

    expect(harness.routeNativeElement?.querySelector('.workspace-header h1')?.textContent).toContain('Projekt Alpha');
    // US-075: die vormalige `.workspace-tabs`-Leiste ist entfallen (Navigation liegt seither in der
    // Sidebar, `AppNavigationComponent`) — der eigentliche AC-Nachweis dieses Tests bleibt das
    // gerenderte Kind-`router-outlet` (Stakeholder-Liste), nicht die (nicht mehr existierende) Tab-Leiste.
    expect(harness.routeNativeElement?.querySelector('app-test-stakeholders-stub')?.textContent).toContain('Stakeholder-Liste-Stub');
    expect(harness.routeNativeElement?.querySelector('app-access-denied')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('.load-error')).toBeNull();
  });

  it('Akzeptanzkriterium 2: ein Nutzer ohne Mitgliedschaft (roleGuard leitet um UND der eigene Ladevorgang der Komponente schlägt zeitgleich fehl) sieht die "Kein Zugriff"-Meldung statt der generischen Lade-Fehlermeldung oder einer leeren Seite', async () => {
    // Ein einziger Spy für BEIDE Aufrufer (roleGuard UND ProjectWorkspaceLayoutComponent.ngOnInit)
    // bildet exakt das reale Bug-Szenario ab: derselbe nicht-berechtigte Nutzer scheitert an
    // beiden, unabhängig voneinander ausgelösten getProject()-Aufrufen gleichermaßen.
    projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/project-1');

    expect(harness.routeNativeElement?.querySelector('app-access-denied')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle in diesem Projekt.');
    expect(harness.routeNativeElement?.querySelector('.load-error')).toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain(LOAD_ERROR_MESSAGE);
  });

  it('Akzeptanzkriterium 3: der eigene, mit dem Guard doppelte getProject()-Aufruf blockiert das Rendering des router-outlet nicht mehr — und löst insbesondere KEINE Endlosschleife aus Redirects mehr aus', async () => {
    projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/project-1');

    // Trotz fehlgeschlagenem eigenem Ladevorgang der Layout-Komponente (kein `project`, `header`/
    // `tabs` bleiben entsprechend ungerendert) rendert das `router-outlet` weiterhin die vom Guard
    // angesteuerte Kind-Route.
    expect(harness.routeNativeElement?.querySelector('.workspace-header')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('app-access-denied')).not.toBeNull();

    // Real reproduziert (siehe Story „Anmerkungen des Agenten"): vor der Guard-Korrektur
    // re-evaluierte `roleGuard` sich selbst für jede Navigation zu seinem eigenen
    // Umleitungsziel `access-denied` erneut — über 1000 identische `getProject()`-Aufrufe binnen
    // weniger Sekunden gegen einen echten laufenden Stack. Genau EIN Aufruf durch den Guard (für
    // die ursprüngliche `stakeholders`-Zielroute) plus genau EIN Aufruf durch den eigenen
    // `ngOnInit()` der Layout-Komponente — nicht mehr, nicht endlos.
    expect(projectsServiceSpy.getProject).toHaveBeenCalledTimes(2);
  });

  it('Akzeptanzkriterium 4: automatisierter Test bildet exakt das Szenario ab — Guard-Umleitung zu access-denied UND zeitgleich fehlschlagender eigener Ladevorgang ergeben die "Kein Zugriff"-Meldung im DOM, nicht LOAD_ERROR_MESSAGE anstelle der gesamten Seite', async () => {
    projectsServiceSpy.getProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const harness = await RouterTestingHarness.create();
    const activatedComponent = await harness.navigateByUrl('/projects/project-1', ProjectWorkspaceLayoutComponent);

    expect(activatedComponent).toBeInstanceOf(ProjectWorkspaceLayoutComponent);
    expect((activatedComponent as ProjectWorkspaceLayoutComponent)['loadError']).toBe(LOAD_ERROR_MESSAGE);
    expect((activatedComponent as ProjectWorkspaceLayoutComponent)['showLoadError']).toBeFalse();
    expect(harness.routeNativeElement?.querySelector('app-access-denied')).not.toBeNull();
  });
});
