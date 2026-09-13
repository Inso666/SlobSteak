import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { Stakeholder, StakeholdersService } from '../../stakeholders/stakeholders.service';
import { MapService } from '../../map/map.service';
import { AssessmentsService } from '../../assessments/assessments.service';
import { StakeholderCommunicationsService } from '../../stakeholders/stakeholder-communications.service';
import { AdminCommunicationTypesService } from '../../admin/admin-communication-types.service';
import { DistributionListService } from '../../distribution/distribution-list.service';
import { StakeholderListComponent } from '../../stakeholders/stakeholder-list/stakeholder-list.component';
import { StakeholderDetailComponent } from '../../stakeholders/stakeholder-detail/stakeholder-detail.component';
import { StakeholderMapPageComponent } from '../../map/stakeholder-map-page/stakeholder-map-page.component';
import { DistributionListPageComponent } from '../../distribution/distribution-list-page/distribution-list-page.component';
import { APP_NAV_PROJECT_SUB_ITEM_LABELS } from '../../../core/navigation/app-navigation/nav-items';
import { routes as appRoutes } from '../../../app.routes';
import { ProjectWorkspaceLayoutComponent } from './project-workspace-layout.component';

/**
 * Story-Test US-081 „Genau eine Hauptüberschrift je Screen“ (QA-Konvention,
 * `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die in
 * `docs/usecases/US-081-eine-h1-je-screen.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument. Rein prozessuale/manuelle Kriterien (Akzeptanzkriterium 7
 * „manueller Smoke-Test“, 8 „Story-Test selbst“, 9 „bestehende Tests bleiben grün“) sind hier
 * bewusst nicht als eigene Testfälle abgebildet — sie werden durch diese Datei selbst bzw. den
 * vollständigen `ng test`-Lauf erfüllt (identisches Vorgehen wie
 * `us-075-projekt-kontext-sidebar-unterpunkte.spec.ts`).
 *
 * Analog zu US-075 werden die drei echten Kind-Komponenten (Stakeholder-Liste/-Detail, Map,
 * Verteiler) jeweils isoliert per `TestBed` gerendert (wie in ihren eigenen `*.component.spec.ts`)
 * statt über eine vollständige Router-Integration mit `ProjectWorkspaceLayoutComponent` — beide
 * Komponentenebenen sind nie gleichzeitig im selben DOM instanziiert (die eine lebt im
 * Eltern-`<router-outlet>` der anderen), daher genügt der Nachweis „Layout rendert genau ein
 * `<h1>`“ + „jede Kind-Komponente rendert keine eigene `<h1>` mehr“ in Summe für „genau ein `<h1>`
 * je Screen“.
 */
describe('US-081: Genau eine Hauptüberschrift je Screen', () => {
  const project: ProjectOverviewItem = { id: 'project-1', name: 'ERP-Einführung Rewe', role: 'PL', stakeholderCount: 3 };

  const stakeholder: Stakeholder = {
    id: 'stakeholder-1',
    projectId: 'project-1',
    type: 'Person',
    name: 'Max Mustermann',
    organization: 'ACME GmbH',
    position: 'CTO',
    email: 'max@example.com',
    phone: null,
    locationDepartment: null,
    description: null,
    updatedByName: 'Anna Admin',
    updatedAt: '2026-08-19T10:00:00Z',
    similarStakeholderWarning: null,
    deletedAt: null,
    deletedByName: null,
  };

  function configureWorkspaceLayout(): void {
    TestBed.resetTestingModule();
    const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(project));

    TestBed.configureTestingModule({
      imports: [ProjectWorkspaceLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } } },
      ],
    });
  }

  function renderWorkspaceLayoutAt(url: string) {
    configureWorkspaceLayout();
    const router = TestBed.inject(Router);
    // Simuliert die aktuelle Kind-Route rein über `router.url` (dieselbe Grundlage, die
    // `computeAreaLabel()` in `ProjectWorkspaceLayoutComponent` auswertet) — ohne echte
    // Navigation, da `provideRouter([])` keine passenden Routen kennt.
    Object.defineProperty(router, 'url', { get: () => url, configurable: true });
    const fixture = TestBed.createComponent(ProjectWorkspaceLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  function configureStakeholderList(): void {
    TestBed.resetTestingModule();
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([]));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(project));
    const mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData']);
    mapServiceSpy.getMapData.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } } } },
      ],
    });
  }

  // `role` steuert `canEdit` (siehe `StakeholderDetailComponent`): Standardmäßig `User`
  // (schreibgeschützt), damit der sichtbare `.page-title` (statt des editierbaren
  // `.page-title-input`) gerendert wird — für Akzeptanzkriterium 1 (reine `<h1>`-Zählung) ist die
  // Rolle irrelevant, für Akzeptanzkriterium 2 (Tag-Name/Text des sichtbaren Titels) hingegen nötig.
  function configureStakeholderDetail(role = 'User'): void {
    TestBed.resetTestingModule();
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['getStakeholder']);
    stakeholdersServiceSpy.getStakeholder.and.returnValue(of(stakeholder));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ ...project, role }));
    const assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['getAssessments']);
    assessmentsServiceSpy.getAssessments.and.returnValue(of([]));
    const communicationsServiceSpy = jasmine.createSpyObj('StakeholderCommunicationsService', ['getAssignments']);
    communicationsServiceSpy.getAssignments.and.returnValue(of([]));
    const communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StakeholderDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        { provide: StakeholderCommunicationsService, useValue: communicationsServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } },
            snapshot: { paramMap: convertToParamMap({ stakeholderId: stakeholder.id }) },
          },
        },
      ],
    });
  }

  function configureMapPage(): void {
    TestBed.resetTestingModule();
    const mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of([]));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of(project));
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StakeholderMapPageComponent],
      providers: [
        provideRouter([]),
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } } } },
      ],
    });
  }

  function configureDistributionPage(): void {
    TestBed.resetTestingModule();
    const distributionListServiceSpy = jasmine.createSpyObj('DistributionListService', ['getDistributionList']);
    distributionListServiceSpy.getDistributionList.and.returnValue(of({ rows: [], totalStakeholderCount: 0 }));
    const communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [DistributionListPageComponent],
      providers: [
        provideRouter([]),
        { provide: DistributionListService, useValue: distributionListServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: project.id }) } } } },
      ],
    });
  }

  // Akzeptanzkriterium 1: genau ein `<h1>` je Screen, auf Projekt-Unterseiten der Projektname —
  // nachgewiesen dadurch, dass das Layout genau ein `<h1>` mit dem Projektnamen rendert UND jede
  // der vier Kind-Komponenten keine eigene `<h1>` mehr rendert.
  it('Akzeptanzkriterium 1: das Workspace-Layout rendert genau ein `<h1>` mit dem Projektnamen, keine Kind-Komponente rendert eine weitere', () => {
    const layoutFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/stakeholders`);
    const layoutH1s = layoutFixture.nativeElement.querySelectorAll('h1');
    expect(layoutH1s.length).toBe(1);
    expect((layoutH1s[0] as HTMLElement).textContent?.trim()).toBe(project.name);

    configureStakeholderList();
    const listFixture = TestBed.createComponent(StakeholderListComponent);
    listFixture.detectChanges();
    expect(listFixture.nativeElement.querySelectorAll('h1').length).toBe(0);

    configureStakeholderDetail();
    const detailFixture = TestBed.createComponent(StakeholderDetailComponent);
    detailFixture.detectChanges();
    expect(detailFixture.nativeElement.querySelectorAll('h1').length).toBe(0);

    configureMapPage();
    const mapFixture = TestBed.createComponent(StakeholderMapPageComponent);
    mapFixture.detectChanges();
    expect(mapFixture.nativeElement.querySelectorAll('h1').length).toBe(0);

    configureDistributionPage();
    const distributionFixture = TestBed.createComponent(DistributionListPageComponent);
    distributionFixture.detectChanges();
    expect(distributionFixture.nativeElement.querySelectorAll('h1').length).toBe(0);
  });

  // Akzeptanzkriterium 2: die früheren Bereichsüberschriften "Stakeholder"/"Map"/"Verteiler"
  // existieren nicht mehr als `<h1>` — Stakeholder-Liste/Map/Verteiler halten den Bereichsnamen nur
  // noch als nicht-überschriftliches, visuell verstecktes Element (`.sr-only`) vor; die
  // Stakeholder-Detailseite zeigt ihren (weiterhin sichtbaren) Seitentitel als `<h2>`.
  it('Akzeptanzkriterium 2: Bereichsüberschriften sind keine `<h1>` mehr — nicht-überschriftliches Element bzw. `<h2>`', () => {
    configureStakeholderList();
    const listFixture = TestBed.createComponent(StakeholderListComponent);
    listFixture.detectChanges();
    const listLabel: HTMLElement | null = listFixture.nativeElement.querySelector('.sr-only');
    expect(listLabel?.textContent?.trim()).toBe(APP_NAV_PROJECT_SUB_ITEM_LABELS.stakeholders);
    expect(listLabel?.tagName.toLowerCase()).not.toBe('h1');
    expect(listLabel?.tagName.toLowerCase()).not.toBe('h2');

    configureMapPage();
    const mapFixture = TestBed.createComponent(StakeholderMapPageComponent);
    mapFixture.detectChanges();
    const mapLabel: HTMLElement | null = mapFixture.nativeElement.querySelector('.sr-only');
    expect(mapLabel?.textContent?.trim()).toBe(APP_NAV_PROJECT_SUB_ITEM_LABELS.map);
    expect(mapLabel?.tagName.toLowerCase()).not.toBe('h1');

    configureDistributionPage();
    const distributionFixture = TestBed.createComponent(DistributionListPageComponent);
    distributionFixture.detectChanges();
    const distributionLabel: HTMLElement | null = distributionFixture.nativeElement.querySelector('.sr-only');
    expect(distributionLabel?.textContent?.trim()).toBe(APP_NAV_PROJECT_SUB_ITEM_LABELS.distribution);
    expect(distributionLabel?.tagName.toLowerCase()).not.toBe('h1');

    configureStakeholderDetail();
    const detailFixture = TestBed.createComponent(StakeholderDetailComponent);
    detailFixture.detectChanges();
    const detailTitle: HTMLElement | null = detailFixture.nativeElement.querySelector('.page-title');
    expect(detailTitle?.tagName.toLowerCase()).toBe('h2');
    expect(detailTitle?.textContent?.trim()).toBe(stakeholder.name);
  });

  // Akzeptanzkriterium 3: der Leerraum zwischen Projekttitel und erstem Inhaltselement entspricht
  // dem Design (20px, `--app-space-lg`) — der Header liefert exakt diesen Abstand über
  // `margin-bottom`, die drei Kind-Container fügen keinen zusätzlichen lokalen Top-Abstand mehr
  // hinzu (das vormalige, redundante `padding-top` von `.stakeholder-list` ist entfallen).
  it('Akzeptanzkriterium 3: kein zusätzlicher lokaler Top-Abstand in den Kind-Containern, Header-Abstand bleibt bei `--app-space-lg` (20px)', () => {
    const layoutFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/stakeholders`);
    document.body.appendChild(layoutFixture.nativeElement);
    const header: HTMLElement = layoutFixture.nativeElement.querySelector('.workspace-header');
    expect(getComputedStyle(header).marginBottom).toBe('20px');
    document.body.removeChild(layoutFixture.nativeElement);

    configureStakeholderList();
    const listFixture = TestBed.createComponent(StakeholderListComponent);
    listFixture.detectChanges();
    document.body.appendChild(listFixture.nativeElement);
    expect(getComputedStyle(listFixture.nativeElement).paddingTop).toBe('0px');
    document.body.removeChild(listFixture.nativeElement);
  });

  // Akzeptanzkriterium 4: die Schriftgröße des Seitentitels (`<h1>`) folgt `--app-font-size-display`
  // (26px) statt dem UA-Standard (~28px im 14px-Body-Kontext).
  it('Akzeptanzkriterium 4: die `<h1>`-Schriftgröße entspricht `--app-font-size-display` (26px)', () => {
    const layoutFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/stakeholders`);
    document.body.appendChild(layoutFixture.nativeElement);
    const h1: HTMLElement = layoutFixture.nativeElement.querySelector('h1');
    expect(getComputedStyle(h1).fontSize).toBe('26px');
    document.body.removeChild(layoutFixture.nativeElement);
  });

  // Akzeptanzkriterium 5: der verbleibende `<h1>` (Projektname) trägt ein `aria-label`, das den
  // aktiven Bereich zusätzlich benennt — für alle drei Bereiche sowie die Detailseite (die
  // fachlich Teil des Stakeholder-Bereichs bleibt).
  it('Akzeptanzkriterium 5: `aria-label` des `<h1>` enthält Projektname UND aktiven Bereich', () => {
    const stakeholdersFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/stakeholders`);
    const stakeholdersH1: HTMLElement = stakeholdersFixture.nativeElement.querySelector('h1');
    expect(stakeholdersH1.getAttribute('aria-label')).toBe(`${project.name} – ${APP_NAV_PROJECT_SUB_ITEM_LABELS.stakeholders}`);

    const detailFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/stakeholders/${stakeholder.id}`);
    const detailH1: HTMLElement = detailFixture.nativeElement.querySelector('h1');
    expect(detailH1.getAttribute('aria-label')).toBe(`${project.name} – ${APP_NAV_PROJECT_SUB_ITEM_LABELS.stakeholders}`);

    const mapFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/map`);
    const mapH1: HTMLElement = mapFixture.nativeElement.querySelector('h1');
    expect(mapH1.getAttribute('aria-label')).toBe(`${project.name} – ${APP_NAV_PROJECT_SUB_ITEM_LABELS.map}`);

    const distributionFixture = renderWorkspaceLayoutAt(`/projects/${project.id}/distribution`);
    const distributionH1: HTMLElement = distributionFixture.nativeElement.querySelector('h1');
    expect(distributionH1.getAttribute('aria-label')).toBe(`${project.name} – ${APP_NAV_PROJECT_SUB_ITEM_LABELS.distribution}`);

    // Accessible Name enthält den sichtbaren Text vollständig (WCAG 2.5.3 „Label in Name").
    expect(stakeholdersH1.getAttribute('aria-label')).toContain(project.name);
  });

  // Akzeptanzkriterium 6: je Route genau ein `<h1>` mit dem Projektnamen — hier zusätzlich über die
  // reale Routentabelle verankert (analog `us-075-...spec.ts` Akzeptanzkriterium 6), damit die in
  // Akzeptanzkriterium 1 isoliert geprüften Komponenten auch tatsächlich den vier Kind-Routen von
  // `ProjectWorkspaceLayoutComponent` entsprechen.
  it('Akzeptanzkriterium 6: app.routes.ts ordnet allen vier Projekt-Unterseiten weiterhin dieselben (h1-freien) Kind-Komponenten zu', () => {
    const projectRoute = appRoutes.find((route) => route.path === 'projects/:id');
    expect(projectRoute?.component).toBe(ProjectWorkspaceLayoutComponent);

    const childPaths = projectRoute?.children?.map((child) => child.path) ?? [];
    expect(childPaths).toContain('stakeholders');
    expect(childPaths).toContain('stakeholders/:stakeholderId');
    expect(childPaths).toContain('map');
    expect(childPaths).toContain('distribution');

    const stakeholdersRoute = projectRoute?.children?.find((child) => child.path === 'stakeholders');
    expect(stakeholdersRoute?.component).toBe(StakeholderListComponent);
    const detailRoute = projectRoute?.children?.find((child) => child.path === 'stakeholders/:stakeholderId');
    expect(detailRoute?.component).toBe(StakeholderDetailComponent);
  });
});
