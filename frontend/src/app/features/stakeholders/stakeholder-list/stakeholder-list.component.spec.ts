import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { MapPoint, MapService } from '../../map/map.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { StakeholderListComponent } from './stakeholder-list.component';

/**
 * US-072 (Issue #100): Tabellen-Umbau statt Karten-Raster. Bearbeiten/Löschen sind seit dieser
 * Story ausschließlich über die Detailseite erreichbar (US-022/US-023) und daher hier nicht mehr
 * Teil dieser Komponente — die zugehörigen früheren Tests entfallen ersatzlos (Verhalten bleibt
 * auf der Detailseite, siehe `stakeholder-detail.component.spec.ts`, unverändert geprüft).
 */
describe('StakeholderListComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let mapServiceSpy: jasmine.SpyObj<MapService>;

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
    communicationTypeNames: ['Statusbericht', 'Newsletter'],
  };

  const deletedStakeholder: Stakeholder = {
    ...stakeholder,
    id: 'stakeholder-2',
    name: 'Gelöschter Stakeholder',
    deletedAt: '2026-08-19T12:00:00Z',
    deletedByName: 'Peter PL',
    communicationTypeNames: [],
  };

  function configure(role: string): void {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'listStakeholders',
      'createStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
      'restoreStakeholder',
    ]);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of([]));

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
  }

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => configure('User'));

  // Akzeptanzkriterium 1: Tabellen-Struktur mit Name(+Typ-Icon)/Organisation/Aktualisiert;
  // Kommunikation/Meine Bewertung entfallen für Rolle `User` (siehe eigene Beschreibung unten).
  it('should resolve the projectId, load stakeholders on init and render them as a table (Akzeptanzkriterium 1)', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['projectId']).toBe('project-1');
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { search: undefined, type: undefined });
    expect(fixture.componentInstance['stakeholders']).toEqual([stakeholder]);

    const table = fixture.nativeElement.querySelector('table.sh-table');
    expect(table).not.toBeNull();
    const headers: string[] = Array.from(fixture.nativeElement.querySelectorAll('table.sh-table thead th')).map(
      (th) => (th as HTMLElement).textContent?.trim() ?? '',
    );
    expect(headers).toEqual(['Name', 'Organisation', 'Aktualisiert']);
    expect(fixture.nativeElement.querySelector('.sh-type-icon')).not.toBeNull();
  });

  it('should show the Kommunikation/Meine Bewertung columns for perspective-bearing roles (Akzeptanzkriterium 1/6)', () => {
    configure('PL');
    const fixture = createComponent();

    const headers: string[] = Array.from(fixture.nativeElement.querySelectorAll('table.sh-table thead th')).map(
      (th) => (th as HTMLElement).textContent?.trim() ?? '',
    );
    expect(headers).toEqual(['Name', 'Organisation', 'Kommunikation', 'Meine Bewertung', 'Aktualisiert']);
    const chips: string[] = Array.from(fixture.nativeElement.querySelectorAll('.sh-chip')).map((el) => (el as HTMLElement).textContent?.trim());
    expect(chips).toEqual(['Statusbericht', 'Newsletter']);
  });

  it('should show "– noch nicht bewertet" when no map entry exists for the stakeholder, and the joined value otherwise (Akzeptanzkriterium 1)', () => {
    configure('PL');
    mapServiceSpy.getMapData.and.returnValue(of([]));
    let fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.sh-none')?.textContent).toContain('noch nicht bewertet');

    const point: MapPoint = { stakeholderId: 'stakeholder-1', name: 'Max Mustermann', influence: 88, interest: 82 };
    mapServiceSpy.getMapData.and.returnValue(of([point]));
    fixture = createComponent();

    expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'PL');
    expect(fixture.nativeElement.querySelector('.sh-assess-cell__values')?.textContent).toContain('E 88 · I 82');
  });

  // Akzeptanzkriterium 2: Zeilen sind klickbar und navigieren zur Detailseite; kein Bearbeiten-/
  // Löschen-Button mehr in der Zeile.
  it('should navigate to the detail page when a row is clicked, and show no edit/delete row actions (Akzeptanzkriterium 2)', () => {
    const fixture = createComponent();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    const row: HTMLElement = fixture.nativeElement.querySelector('tr.sh-row');
    row.click();

    expect(router.navigate).toHaveBeenCalledWith([stakeholder.id], jasmine.any(Object));
    expect(fixture.nativeElement.querySelector('button[severity="danger"]')).toBeNull();
  });

  // Akzeptanzkriterium 3: Zeilenzahl-Anzeige.
  it('should show a row-count line with the total and, once filtered, the displayed count (Akzeptanzkriterium 3)', (done) => {
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.sh-row-count').textContent).toContain('1 Stakeholder insgesamt');
    expect(fixture.nativeElement.querySelector('.sh-row-count').textContent).not.toContain('angezeigt (gefiltert)');

    fixture.componentInstance['filterForm'].controls.search.setValue('mustermann');
    setTimeout(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sh-row-count').textContent).toContain('angezeigt (gefiltert)');
      done();
    }, 350);
  });

  it('should hide the "Gelöschte anzeigen" toggle for role User', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance['showDeletedToggle']).toBeFalse();
  });

  // Akzeptanzkriterium 4: Papierkorb-Bereich zusätzlich unterhalb der Liste, beide gleichzeitig
  // sichtbar.
  it('should show the deleted-toggle for role PL and load the deleted panel alongside the active list when activated (Akzeptanzkriterium 4)', () => {
    configure('PL');
    stakeholdersServiceSpy.listStakeholders.and.callFake((_projectId: string, filters: { deleted?: boolean } = {}) =>
      of(filters.deleted ? [deletedStakeholder] : [stakeholder]),
    );
    const fixture = createComponent();
    expect(fixture.componentInstance['showDeletedToggle']).toBeTrue();
    expect(fixture.nativeElement.querySelector('.sh-trash-section')).toBeNull();

    fixture.componentInstance['onToggleDeleted'](true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sh-trash-section')).not.toBeNull();
    // Aktive Liste bleibt weiterhin sichtbar — kein gegenseitiges Ausblenden.
    expect(fixture.nativeElement.querySelector('table.sh-table')).not.toBeNull();
    expect(fixture.componentInstance['stakeholders']).toEqual([stakeholder]);
    expect(fixture.componentInstance['deletedStakeholders']).toEqual([deletedStakeholder]);
  });

  it('should restore a stakeholder and reload both the deleted and the active list (US-024 Akzeptanzkriterium 4)', () => {
    configure('PL');
    stakeholdersServiceSpy.restoreStakeholder.and.returnValue(of(undefined));
    const fixture = createComponent();
    fixture.componentInstance['showDeleted'] = true;
    fixture.componentInstance['deletedStakeholders'] = [deletedStakeholder];
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    fixture.componentInstance['onRestore'](deletedStakeholder);

    expect(stakeholdersServiceSpy.restoreStakeholder).toHaveBeenCalledWith('stakeholder-2');
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { deleted: true });
  });

  // Akzeptanzkriterium 5: „Stakeholder anlegen“ über Toolbar-Button + Dialog.
  it('should open the create dialog via the toolbar button and close it (and reload) on success (Akzeptanzkriterium 5)', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['createDialogVisible']()).toBeFalse();
    fixture.componentInstance['openCreateDialog']();
    expect(fixture.componentInstance['createDialogVisible']()).toBeTrue();

    stakeholdersServiceSpy.listStakeholders.calls.reset();
    fixture.componentInstance['onCreated']();

    expect(fixture.componentInstance['createDialogVisible']()).toBeFalse();
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalled();
  });

  it('should show a consistent load-error message when the stakeholder list fails to load (US-044 Akzeptanzkriterium 4)', () => {
    stakeholdersServiceSpy.listStakeholders.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = createComponent();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });
});
