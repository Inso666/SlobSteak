import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { of } from 'rxjs';
import { App } from './app';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { Stakeholder, StakeholdersService } from './features/stakeholders/stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from './features/projects/projects.service';
import { MapPoint, MapService } from './features/map/map.service';
import { DistributionListPageComponent } from './features/distribution/distribution-list-page/distribution-list-page.component';
import {
  DistributionListResult,
  DistributionListRow,
  DistributionListService,
} from './features/distribution/distribution-list.service';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from './features/admin/admin-communication-types.service';
import { CommunicationTypesAdminComponent } from './features/admin/communication-types-admin/communication-types-admin.component';
import { AdminProject, AdminProjectsService } from './features/admin/admin-projects.service';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { AdminUser, AdminUsersService } from './features/admin/admin-users.service';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';

/**
 * Story-Test US-080 „Inhaltsbereich mit Innenabstand und Datenlisten im Surface-Panel mit
 * integrierter Fußzeile“ (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1).
 * Prüft ausschließlich die in `docs/usecases/US-080-inhaltsbereich-abstand-listen-panel.md`
 * gelisteten Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 2 (kein Bedienelement berührt die Viewport-Kante auf sechs konkreten
 * Screens) ist ein rein visuelles Layout-Kriterium, das sich nicht sinnvoll gegen die
 * Fenstergröße der Karma-Testumgebung verifizieren lässt (kein realer, screen-typischer Viewport
 * in `TestBed`) — analog zur Handhabung nicht code-prüfbarer Akzeptanzkriterien in
 * `us-047-frontend-design-migration.spec.ts`/`us-078-lesbare-gedaempfte-textfarben.spec.ts`. Es
 * wird strukturell durch Akzeptanzkriterium 1 (Innenabstand tatsächlich > 0, einmalig zentral
 * definiert, siehe unten) sowie durch den im PR dokumentierten manuellen Smoke-Test mit
 * Screenshots aller sechs Screens nachgewiesen. Akzeptanzkriterium 7 (manueller Smoke-Test) und 8
 * (Story-Test-Existenz, dieser Datei) sind ebenfalls Prozessnachweise ohne eigene Assertion.
 */
describe('US-080: Inhaltsbereich mit Innenabstand und Datenlisten im Surface-Panel mit integrierter Fußzeile', () => {
  // --- Hilfsfunktionen ------------------------------------------------------------------------

  /** Löst einen CSS-Custom-Property-Token (z. B. `--app-space-xl`) rechnerisch in Pixel auf,
   * indem er auf ein unsichtbares Probe-Element angewendet und dessen tatsächlich vom Browser
   * berechnete Breite ausgelesen wird — robust gegenüber der Rem-Basis, ohne den Wert im Test
   * erneut hart einzutippen. */
  function pxValueOfToken(token: string): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.width = `var(${token})`;
    document.body.appendChild(probe);
    const value = parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return value;
  }

  /** Löst einen Farb-Token (Hex oder rgba) in den vom Browser für `background-color` berechneten
   * `rgb(...)`/`rgba(...)`-String auf, indem er auf ein Probe-Element angewendet wird — robust
   * gegenüber Browser-spezifischer Farbserialisierung. */
  function backgroundColorOfToken(token: string): string {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.backgroundColor = `var(${token})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }

  // Akzeptanzkriterium 1: horizontal `--app-space-xl`, vertikal `--app-space-lg`/`--app-space-xl`,
  // an genau einer Stelle definiert (`.app-shell__content` in `app.css`) — kein Screen setzt den
  // Seitenrand zusätzlich lokal (siehe Story-Datei „Anmerkungen des Agenten“ zur Wahl von
  // `--app-space-lg` für die vertikale Komponente).
  it('Akzeptanzkriterium 1: der App-Shell-Inhaltsbereich erhält horizontal --app-space-xl und vertikal --app-space-lg/--app-space-xl Innenabstand', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const content: HTMLElement = fixture.nativeElement.querySelector('.app-shell__content');
    expect(content).not.toBeNull();

    const computed = getComputedStyle(content);
    const expectedHorizontal = pxValueOfToken('--app-space-xl');
    const expectedVerticalLg = pxValueOfToken('--app-space-lg');
    const expectedVerticalXl = pxValueOfToken('--app-space-xl');

    expect(expectedHorizontal).toBeGreaterThan(0);
    expect(parseFloat(computed.paddingLeft)).toBeCloseTo(expectedHorizontal, 1);
    expect(parseFloat(computed.paddingRight)).toBeCloseTo(expectedHorizontal, 1);

    const actualVertical = parseFloat(computed.paddingTop);
    expect(actualVertical).toBeGreaterThan(0);
    const matchesLg = Math.abs(actualVertical - expectedVerticalLg) < 0.5;
    const matchesXl = Math.abs(actualVertical - expectedVerticalXl) < 0.5;
    expect(matchesLg || matchesXl).toBeTrue();
    expect(parseFloat(computed.paddingBottom)).toBeCloseTo(actualVertical, 1);
  });

  // Akzeptanzkriterium 3: die geteilte Panel-Klasse in `frontend/src/styles.css` liefert
  // `background: var(--app-color-surface)`, `border: 1px solid var(--app-color-border)`,
  // `border-radius: 12px` (bzw. den bereits für exakt diesen Zweck vorgesehenen SPEC-00-Token
  // `--app-radius-lg`, siehe „Anmerkungen des Agenten“ zur Radius-Abweichung) und
  // `overflow: hidden` — einmal definiert, nicht je Feature dupliziert.
  it('Akzeptanzkriterium 3: die geteilte .list-panel-Klasse liefert Fläche, Rahmen, Radius und Clipping', () => {
    const probe = document.createElement('div');
    probe.className = 'list-panel';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe);

    expect(computed.backgroundColor).toBe(backgroundColorOfToken('--app-color-surface'));
    expect(computed.borderTopWidth).toBe('1px');
    expect(computed.borderTopStyle).toBe('solid');
    expect(parseFloat(computed.borderRadius)).toBeCloseTo(pxValueOfToken('--app-radius-lg'), 1);
    expect(computed.overflow).toBe('hidden');

    probe.remove();
  });

  // Akzeptanzkriterium 4 (Teil 1): die geteilte Fußzeilen-Klasse liefert `border-top`.
  it('Akzeptanzkriterium 4: die geteilte .list-panel__foot-Klasse liefert eine sichtbare border-top-Trennlinie', () => {
    const probe = document.createElement('div');
    probe.className = 'list-panel__foot';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe);

    expect(computed.borderTopWidth).toBe('1px');
    expect(computed.borderTopStyle).toBe('solid');

    probe.remove();
  });

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
    updatedAt: new Date().toISOString(),
    similarStakeholderWarning: null,
    deletedAt: null,
    deletedByName: null,
    communicationTypeNames: [],
  };

  describe('Akzeptanzkriterium 4 (Teil 2): Stakeholder-Liste, Verteiler und die drei Admin-Listen nutzen die Panel-Klasse', () => {
    it('Stakeholder-Liste: Tabellen-Container trägt .list-panel, Fußzeile mit gefilterter Anzahl sitzt innerhalb als .list-panel__foot', () => {
      const stakeholdersServiceSpy = jasmine.createSpyObj<StakeholdersService>('StakeholdersService', [
        'listStakeholders',
      ]);
      stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));
      const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
      projectsServiceSpy.getProject.and.returnValue(
        of({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 1 } as ProjectOverviewItem),
      );
      const mapServiceSpy = jasmine.createSpyObj<MapService>('MapService', ['getMapData']);
      mapServiceSpy.getMapData.and.returnValue(of([] as MapPoint[]));

      TestBed.configureTestingModule({
        imports: [StakeholderListComponent],
        providers: [
          provideRouter([]),
          { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: MapService, useValue: mapServiceSpy },
          {
            provide: ActivatedRoute,
            useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
          },
        ],
      });
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.sh-table-wrapper');
      expect(panel.classList.contains('list-panel')).toBeTrue();

      const foot: HTMLElement = fixture.nativeElement.querySelector('.sh-row-count');
      expect(foot.classList.contains('list-panel__foot')).toBeTrue();
      expect(panel.contains(foot)).toBeTrue();
    });

    function distributionRow(overrides: Partial<DistributionListRow>): DistributionListRow {
      return {
        stakeholderId: 'sh-1',
        name: 'Max Mustermann',
        organization: 'ACME GmbH',
        hasEmail: true,
        email: 'max@example.com',
        communicationTypeId: 'type-1',
        communicationTypeName: 'Newsletter',
        frequency: 'Weekly',
        channel: 'Email',
        ...overrides,
      };
    }

    it('Verteiler: Tabellen-Container trägt .list-panel, Fußzeile (Zusammenfassung + Aktionen) sitzt innerhalb als .list-panel__foot', () => {
      const distributionListServiceSpy = jasmine.createSpyObj<DistributionListService>(
        'DistributionListService',
        ['getDistributionList'],
      );
      const result: DistributionListResult = {
        rows: [distributionRow({})],
        totalStakeholderCount: 1,
      };
      distributionListServiceSpy.getDistributionList.and.returnValue(of(result));
      const communicationTypesServiceSpy = jasmine.createSpyObj<AdminCommunicationTypesService>(
        'AdminCommunicationTypesService',
        ['listActiveCommunicationTypes'],
      );
      communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(
        of([{ id: 'type-1', name: 'Newsletter', isActive: true, createdAt: '2026-01-01' }]),
      );

      TestBed.configureTestingModule({
        imports: [DistributionListPageComponent],
        providers: [
          provideRouter([]),
          { provide: DistributionListService, useValue: distributionListServiceSpy },
          { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
          { provide: Clipboard, useValue: jasmine.createSpyObj('Clipboard', ['copy']) },
          {
            provide: ActivatedRoute,
            useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
          },
        ],
      });
      const fixture = TestBed.createComponent(DistributionListPageComponent);
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.dl-table-wrapper');
      expect(panel.classList.contains('list-panel')).toBeTrue();

      const foot: HTMLElement = fixture.nativeElement.querySelector('.dl-foot-row');
      expect(foot.classList.contains('list-panel__foot')).toBeTrue();
      expect(panel.contains(foot)).toBeTrue();
    });

    it('Admin — Kommunikationsarten: Listen-Panel trägt .list-panel (bereits mit border-radius/Hintergrund aus US-065)', () => {
      const communicationTypesServiceSpy = jasmine.createSpyObj<AdminCommunicationTypesService>(
        'AdminCommunicationTypesService',
        ['listCommunicationTypes'],
      );
      const existingTypes: AdminCommunicationType[] = [
        { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: '2026-01-01' },
      ];
      communicationTypesServiceSpy.listCommunicationTypes.and.returnValue(of(existingTypes));

      TestBed.configureTestingModule({
        imports: [CommunicationTypesAdminComponent],
        providers: [
          provideRouter([]),
          { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        ],
      });
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.catalog-panel');
      expect(panel).not.toBeNull();
      expect(panel.classList.contains('list-panel')).toBeTrue();
    });

    it('Admin — Projekte: Tabellen-Container trägt .list-panel', () => {
      const adminProjectsServiceSpy = jasmine.createSpyObj<AdminProjectsService>('AdminProjectsService', [
        'listProjects',
      ]);
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
      adminProjectsServiceSpy.listProjects.and.returnValue(of(existingProjects));

      TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [
          provideRouter([]),
          { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        ],
      });
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.ap-table-wrapper');
      expect(panel).not.toBeNull();
      expect(panel.classList.contains('list-panel')).toBeTrue();
    });

    it('Admin — Nutzer: Tabellen-Container trägt .list-panel', () => {
      const adminUsersServiceSpy = jasmine.createSpyObj<AdminUsersService>('AdminUsersService', ['listUsers']);
      const existingUsers: AdminUser[] = [
        {
          id: 'user-1',
          name: 'Max Mustermann',
          email: 'max@example.com',
          isSystemAdmin: false,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        },
      ];
      adminUsersServiceSpy.listUsers.and.returnValue(of(existingUsers));

      TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideRouter([]), { provide: AdminUsersService, useValue: adminUsersServiceSpy }],
      });
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.au-table-wrapper');
      expect(panel).not.toBeNull();
      expect(panel.classList.contains('list-panel')).toBeTrue();
    });
  });

  // Akzeptanzkriterium 5: die Fußzeile der Stakeholder-Liste nennt zusätzlich die gefilterte
  // Anzahl im Muster „N Stakeholder insgesamt · M angezeigt (gefiltert)“; ist kein Filter aktiv,
  // entfällt der Zusatz. (Bereits durch `stakeholder-list.component.spec.ts` abgedeckt — hier
  // zusätzlich als eigener, story-zugeordneter Nachweis.)
  it('Akzeptanzkriterium 5: Stakeholder-Liste-Fußzeile zeigt "N Stakeholder insgesamt" ohne Filter und ergänzt "M angezeigt (gefiltert)" mit aktivem Filter', (done) => {
    const stakeholdersServiceSpy = jasmine.createSpyObj<StakeholdersService>('StakeholdersService', [
      'listStakeholders',
    ]);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));
    const projectsServiceSpy = jasmine.createSpyObj<ProjectsService>('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(
      of({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 1 } as ProjectOverviewItem),
    );
    const mapServiceSpy = jasmine.createSpyObj<MapService>('MapService', ['getMapData']);
    mapServiceSpy.getMapData.and.returnValue(of([] as MapPoint[]));

    TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: MapService, useValue: mapServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();

    const footWithoutFilter: string = fixture.nativeElement.querySelector('.sh-row-count').textContent;
    expect(footWithoutFilter).toContain('1 Stakeholder insgesamt');
    expect(footWithoutFilter).not.toContain('angezeigt (gefiltert)');

    // Der Filter-Wertewechsel läuft über einen 300ms-Debounce (siehe
    // `stakeholder-list.component.ts`), analog zum bestehenden Test in
    // `stakeholder-list.component.spec.ts` Akzeptanzkriterium 3.
    fixture.componentInstance['filterForm'].controls.search.setValue('Max');
    setTimeout(() => {
      fixture.detectChanges();
      const footWithFilter: string = fixture.nativeElement.querySelector('.sh-row-count').textContent;
      expect(footWithFilter).toContain('angezeigt (gefiltert)');
      done();
    }, 350);
  });
});
