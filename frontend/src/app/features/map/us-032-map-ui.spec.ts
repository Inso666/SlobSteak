import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { MapPoint, MapService } from './map.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { Stakeholder, StakeholdersService } from '../stakeholders/stakeholders.service';
import { StakeholderMapPageComponent } from './stakeholder-map-page/stakeholder-map-page.component';
import { ProjectWorkspaceLayoutComponent } from '../workspace/project-workspace-layout/project-workspace-layout.component';

/**
 * Story-Test US-032 „Map-UI Quadranten-Diagramm mit Perspektiv-Dropdown“ (Frontend-Anteil,
 * Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die fünf in
 * `docs/usecases/US-032-map-ui.md` gelisteten Akzeptanzkriterien, in derselben Reihenfolge wie im
 * Story-Dokument. Generische Rendering-/Verhaltenstests bleiben in
 * `quadrant-chart.component.spec.ts` bzw. `stakeholder-map-page.component.spec.ts`.
 *
 * Akzeptanzkriterium 4 (Tab „Map“ ausgeblendet für Rolle `User`) ist bereits seit US-019 in
 * {@link ProjectWorkspaceLayoutComponent} umgesetzt und in `project-workspace-layout.component.spec.ts`
 * generisch abgedeckt — diese Story ändert daran nichts (kein neuer Code), der Test hier bestätigt
 * die AC dennoch explizit für diese Story, statt sie unverifiziert vorauszusetzen.
 */
describe('US-032: Map-UI Quadranten-Diagramm mit Perspektiv-Dropdown', () => {
  const points: MapPoint[] = [
    { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
    { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
  ];

  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  function configurePage(role: string, mapPoints: MapPoint[] = points): void {
    TestBed.resetTestingModule();
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData']);
    mapServiceSpy.getMapData.and.returnValue(of(mapPoints));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 2 } as ProjectOverviewItem));

    // US-063: `StakeholderMapPageComponent` lädt jetzt zusätzlich die Gesamtzahl der Projekt-
    // Stakeholder — gemockt statt gegen echtes HTTP, wie in `.claude/agents/frontend.md` Abschnitt 4
    // gefordert (keine reale Netzwerkanfrage aus einem Komponententest).
    const stakeholdersServiceSpy = jasmine.createSpyObj<StakeholdersService>('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of(mapPoints.map((point) => ({ id: point.stakeholderId }) as Stakeholder)));

    TestBed.configureTestingModule({
      imports: [StakeholderMapPageComponent],
      providers: [
        provideRouter([]),
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  // Akzeptanzkriterium 1: X-Achse „Einfluss" (0-100), Y-Achse „Interesse" (0-100); bei 50/50 sind
  // vier Quadranten visuell getrennt und mit den vier vorgegebenen Begriffen beschriftet.
  it('renders the 0-100 influence/interest axes and the four labeled, 50/50-separated quadrants', () => {
    configurePage('PL');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Einfluss');
    expect(text).toContain('Interesse');
    expect(text).toContain('Eng betreuen');
    expect(text).toContain('Zufriedenstellen');
    expect(text).toContain('Informiert halten');
    expect(text).toContain('Beobachten');

    // Achsen-Ticks belegen den vollen 0-100-Bereich.
    expect(text).toContain('100');
    expect(text).toContain('0');

    // Zwei gestrichelte Trennlinien bei 50/50 (visuelle Quadranten-Trennung).
    expect(fixture.nativeElement.querySelectorAll('.grid-line').length).toBe(2);
  });

  // Akzeptanzkriterium 2: Ein Dropdown wählt die Perspektive (PL/Coreteam/Architect); Standard =
  // eigene Projekt-Rolle des angemeldeten Nutzers.
  it('defaults the perspective dropdown to the user\'s own project role and offers all three perspectives', () => {
    configurePage('Coreteam');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#ownPerspective');
    const optionValues = Array.from(select.options).map((option) => option.value);

    expect(optionValues).toEqual(['PL', 'Coreteam', 'Architect']);
    expect(select.value).toBe('Coreteam');
    expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'Coreteam');
  });

  // Akzeptanzkriterium 3: Jeder Punkt repräsentiert einen Stakeholder aus der Map-Query (US-031);
  // Klick auf einen Punkt navigiert zur Stakeholder-Detailseite (US-026).
  it('renders one point per stakeholder from the map query and navigates to the stakeholder detail page on click', () => {
    configurePage('PL');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    const pointButtons = fixture.nativeElement.querySelectorAll('.map-point');
    expect(pointButtons.length).toBe(points.length);

    fixture.debugElement.query(By.css('.map-point')).nativeElement.click();

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'project-1', 'stakeholders', 'sh-1']);
  });

  // Akzeptanzkriterium 4: Tab „Map" ist in der Sidebar/Workspace-Navigation für Rolle `User`
  // ausgeblendet (seit US-019 umgesetzt, hier für diese Story erneut verifiziert).
  it('hides the "Map" workspace tab for role User but shows it for PL/Coreteam/Architect', () => {
    TestBed.resetTestingModule();
    const workspaceProjectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
    workspaceProjectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 }));

    TestBed.configureTestingModule({
      imports: [ProjectWorkspaceLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: workspaceProjectsServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
      ],
    });

    const userFixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    userFixture.detectChanges();
    expect(userFixture.nativeElement.querySelector('a[routerLink="map"]')).toBeNull();

    for (const role of ['PL', 'Coreteam', 'Architect']) {
      TestBed.resetTestingModule();
      const projectRoleServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
      projectRoleServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 0 }));

      TestBed.configureTestingModule({
        imports: [ProjectWorkspaceLayoutComponent],
        providers: [
          provideRouter([]),
          { provide: ProjectsService, useValue: projectRoleServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        ],
      });

      const roleFixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
      roleFixture.detectChanges();
      expect(roleFixture.nativeElement.querySelector('a[routerLink="map"]')).not.toBeNull();
    }
  });

  // Akzeptanzkriterium 5: Komponententest deckt Rendering mit leerer Datenmenge (Leerzustand) und
  // mit mindestens einem Punkt ab.
  it('renders a dedicated empty-state for zero points and the chart with points for a non-empty result', () => {
    configurePage('PL', []);
    const emptyFixture = TestBed.createComponent(StakeholderMapPageComponent);
    emptyFixture.detectChanges();

    expect(emptyFixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(emptyFixture.nativeElement.querySelectorAll('.map-point').length).toBe(0);

    configurePage('PL', points);
    const filledFixture = TestBed.createComponent(StakeholderMapPageComponent);
    filledFixture.detectChanges();

    expect(filledFixture.nativeElement.querySelector('.empty-state')).toBeNull();
    expect(filledFixture.nativeElement.querySelectorAll('.map-point').length).toBe(points.length);
  });
});
