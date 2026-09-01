import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { ProjectOverviewItem, ProjectsService } from '../../../features/projects/projects.service';
import { ProjectWorkspaceLayoutComponent } from '../../../features/workspace/project-workspace-layout/project-workspace-layout.component';
import { CurrentProjectContextService } from '../../services/current-project-context.service';
import { routes as appRoutes } from '../../../app.routes';
import { AppNavigationComponent } from './app-navigation.component';

@Component({ selector: 'app-us075-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

/**
 * Story-Test US-075 „Projekt-Kontext-Navigation als eingerückte Sidebar-Unterpunkte statt
 * horizontaler Tab-Leiste“ (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich
 * die in `docs/usecases/US-075-projekt-kontext-sidebar-unterpunkte.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument. Rein prozessuale/manuelle
 * Kriterien (automatisierter Test/Story-Test selbst, manueller Smoke-Test, „bestehende Tests bleiben
 * grün“) sind hier bewusst nicht als eigene Testfälle abgebildet — sie werden durch diese Datei
 * selbst bzw. den vollständigen `ng test`-Lauf erfüllt.
 *
 * Die vormals rollenabhängige `showMapTab`/`showDistributionTab`-Logik aus
 * `ProjectWorkspaceLayoutComponent` (US-019/US-031/US-041) ist unverändert in
 * `AppNavigationComponent.showMapSubItem`/`showDistributionSubItem` übernommen — Nachweis dafür
 * zusätzlich in `us-032-map-ui.spec.ts` (Map, generisch hier: Akzeptanzkriterium 1).
 */
describe('US-075: Projekt-Kontext-Navigation als eingerückte Sidebar-Unterpunkte statt horizontaler Tab-Leiste', () => {
  const projectRoutes = [
    { path: 'projects', component: DummyRouteComponent },
    { path: 'projects/:id/stakeholders', component: DummyRouteComponent },
    { path: 'projects/:id/map', component: DummyRouteComponent },
    { path: 'projects/:id/distribution', component: DummyRouteComponent },
  ];

  function configureSidebar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter(projectRoutes),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
    TestBed.inject(TokenStorageService).setToken('token-123');
  }

  async function renderSidebarAt(url: string, project: ProjectOverviewItem | null) {
    configureSidebar();
    await TestBed.inject(Router).navigateByUrl(url);
    if (project) {
      TestBed.inject(CurrentProjectContextService).setProject(project);
    }
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    return fixture;
  }

  function projectWithRole(role: string): ProjectOverviewItem {
    return { id: 'project-1', name: 'ERP-Einführung Rewe', role, stakeholderCount: 4 };
  }

  // Akzeptanzkriterium 1: eingerückter Block unterhalb der globalen Nav-Items — nicht-klickbares
  // Projekt-Label + Unterpunkte "Stakeholder-Liste"/"Map"/"Verteiler", rollenabhängig gemäß
  // vormaligem showMapTab/showDistributionTab.
  it('Akzeptanzkriterium 1: zeigt innerhalb eines Projekts das Projekt-Label sowie die rollenabhängigen Unterpunkte', async () => {
    const plFixture = await renderSidebarAt('/projects/project-1/stakeholders', projectWithRole('PL'));
    const nativeElement: HTMLElement = plFixture.nativeElement;

    const label = nativeElement.querySelector('.app-navigation__project-label');
    expect(label?.textContent?.trim()).toBe('ERP-Einführung Rewe');
    expect(label?.tagName.toLowerCase()).not.toBe('a');

    const subItemLabels = Array.from(nativeElement.querySelectorAll('.app-navigation__sub-item')).map((el) => el.textContent?.trim());
    expect(subItemLabels).toEqual(['Stakeholder-Liste', 'Map', 'Verteiler']);

    const userFixture = await renderSidebarAt('/projects/project-1/stakeholders', projectWithRole('User'));
    const userSubItemLabels = Array.from<Element>(userFixture.nativeElement.querySelectorAll('.app-navigation__sub-item')).map(
      (el) => el.textContent?.trim(),
    );
    expect(userSubItemLabels).toEqual(['Stakeholder-Liste']);

    const architectFixture = await renderSidebarAt('/projects/project-1/stakeholders', projectWithRole('Architect'));
    const architectSubItemLabels = Array.from<Element>(architectFixture.nativeElement.querySelectorAll('.app-navigation__sub-item')).map(
      (el) => el.textContent?.trim(),
    );
    expect(architectSubItemLabels).toEqual(['Stakeholder-Liste', 'Map']);
  });

  // Akzeptanzkriterium 2: aktiver Unterpunkt visuell hervorgehoben (routerLinkActive), analog zu
  // den globalen Nav-Items.
  it('Akzeptanzkriterium 2: hebt genau den zur aktuellen Route passenden Unterpunkt über routerLinkActive hervor', async () => {
    const fixture = await renderSidebarAt('/projects/project-1/map', projectWithRole('PL'));
    const nativeElement: HTMLElement = fixture.nativeElement;

    const activeLabels = Array.from(nativeElement.querySelectorAll('.app-navigation__sub-item.active')).map((el) => el.textContent?.trim());
    expect(activeLabels).toEqual(['Map']);

    const stakeholdersLink = nativeElement.querySelector('a[href="/projects/project-1/stakeholders"]');
    expect(stakeholdersLink?.classList.contains('active')).toBeFalse();
  });

  // Akzeptanzkriterium 3: die vormalige horizontale Tab-Pill-Leiste in
  // `ProjectWorkspaceLayoutComponent` ist vollständig entfallen (weder als Markup noch als
  // Sichtbarkeits-Logik der Komponente).
  it('Akzeptanzkriterium 3: ProjectWorkspaceLayoutComponent rendert keine tab-pills-Leiste mehr und kennt showMapTab/showDistributionTab nicht mehr', () => {
    const prototype = ProjectWorkspaceLayoutComponent.prototype as unknown as Record<string, unknown>;
    expect(prototype['showMapTab']).toBeUndefined();
    expect(prototype['showDistributionTab']).toBeUndefined();

    const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(projectWithRole('PL')));

    TestBed.resetTestingModule();
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

    expect(fixture.nativeElement.querySelector('.tab-pill')).toBeNull();
    expect(fixture.nativeElement.querySelector('.workspace-tabs')).toBeNull();
  });

  // Akzeptanzkriterium 4: der Projekt-Rollen-Badge bleibt sichtbar — hier: im Hauptbereich-Header
  // von `ProjectWorkspaceLayoutComponent` (etabliertes `.role-badge`-Muster, siehe Story-Anmerkung
  // „Design zeigt hierzu keine explizite Vorgabe“).
  it('Akzeptanzkriterium 4: der Projekt-Rollen-Badge bleibt im Hauptbereich-Header sichtbar', () => {
    const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(projectWithRole('PL')));

    TestBed.resetTestingModule();
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

    const badge = fixture.nativeElement.querySelector('.workspace-header .role-badge');
    expect(badge?.textContent?.trim()).toBe('PL');
  });

  // Akzeptanzkriterium 5: außerhalb eines Projekt-Kontexts (z. B. `/projects`) zeigt die Sidebar
  // ausschließlich die globalen Nav-Items, keinen Projekt-Block.
  it('Akzeptanzkriterium 5: zeigt außerhalb eines Projekt-Kontexts keinen Projekt-Block', async () => {
    const fixture = await renderSidebarAt('/projects', null);

    expect(fixture.nativeElement.querySelector('.app-navigation__project-block')).toBeNull();
    expect(fixture.nativeElement.querySelector('.app-navigation__project-label')).toBeNull();
  });

  // Akzeptanzkriterium 6: Direktnavigation per URL zu den drei Projekt-Unterseiten funktioniert
  // unverändert — reine Darstellungsänderung, keine Routing-Änderung. Strukturprüfung der
  // Routentabelle (analog `app.routes.spec.ts`) statt einer vollen Rendering-Integration, die die
  // schwergewichtigen realen Kind-Komponenten laden müsste.
  it('Akzeptanzkriterium 6: app.routes.ts enthält weiterhin unveränderte Kind-Routen für stakeholders/map/distribution', () => {
    const projectRoute = appRoutes.find((route) => route.path === 'projects/:id');
    const childPaths = projectRoute?.children?.map((child) => child.path) ?? [];

    expect(childPaths).toContain('stakeholders');
    expect(childPaths).toContain('map');
    expect(childPaths).toContain('distribution');
  });
});
