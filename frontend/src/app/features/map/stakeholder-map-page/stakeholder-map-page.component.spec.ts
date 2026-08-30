import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MapComparisonEntry, MapPoint, MapService } from '../map.service';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { Stakeholder, StakeholdersService } from '../../stakeholders/stakeholders.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { StakeholderMapPageComponent } from './stakeholder-map-page.component';

describe('StakeholderMapPageComponent', () => {
  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

  const points: MapPoint[] = [
    { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
    { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
  ];

  const comparisonEntries: MapComparisonEntry[] = [
    { stakeholderId: 'sh-1', name: 'Max Mustermann', primary: { influence: 80, interest: 60 }, secondary: { influence: 30, interest: 20 } },
  ];

  // US-063: standardmäßig genauso viele Projekt-Stakeholder wie Punkte, damit bestehende Tests
  // (die keine eigene Aussage über totalCount/visibleCount treffen) unverändert bleiben.
  const allStakeholders: Stakeholder[] = [points[0], points[1]].map(
    (point) =>
      ({
        id: point.stakeholderId,
        projectId: 'project-1',
        type: 'Person',
        name: point.name,
        organization: null,
        position: null,
        email: null,
        phone: null,
        locationDepartment: null,
        description: null,
        updatedByName: 'Tester',
        updatedAt: '2026-08-30T00:00:00Z',
        similarStakeholderWarning: null,
        deletedAt: null,
        deletedByName: null,
      }) as Stakeholder,
  );

  function configure(role: string, stakeholders: Stakeholder[] = allStakeholders): void {
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of(points));
    mapServiceSpy.getComparisonData.and.returnValue(of(comparisonEntries));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 2 } as ProjectOverviewItem));

    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of(stakeholders));

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

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 2: Standardauswahl ist die eigene Projekt-Rolle des angemeldeten Nutzers.
  it('should default the perspective dropdown to the current project role and load its map data', () => {
    configure('Architect');
    const fixture = createComponent();

    expect(fixture.componentInstance['selectedPerspective']).toBe('Architect');
    expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'Architect');
  });

  // Akzeptanzkriterium 2: Wechsel im Dropdown lädt die Map für die neu gewählte Perspektive neu.
  it('should reload map data when the perspective dropdown changes', () => {
    configure('PL');
    const fixture = createComponent();
    mapServiceSpy.getMapData.calls.reset();

    fixture.componentInstance['filterForm'].controls.ownPerspective.setValue('Coreteam');

    expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'Coreteam');
  });

  // Akzeptanzkriterium 5 (Leerzustand): keine Punkte in der gewählten Perspektive.
  it('should show the empty-state message when the map has no points for the selected perspective', () => {
    configure('PL');
    mapServiceSpy.getMapData.and.returnValue(of([]));
    const fixture = createComponent();

    expect(fixture.componentInstance['viewState']).toBe('empty');
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Für diese Perspektive liegen noch keine Bewertungen vor.');
    expect(fixture.nativeElement.querySelector('app-quadrant-chart')).toBeNull();
  });

  // Akzeptanzkriterium 5 (nicht leer): mindestens ein Punkt wird an den Chart durchgereicht.
  it('should pass the loaded points through to the quadrant chart when at least one point exists', () => {
    configure('PL');
    const fixture = createComponent();

    expect(fixture.componentInstance['viewState']).toBe('content');
    const chart = fixture.debugElement.query(By.css('app-quadrant-chart'));
    expect(chart).not.toBeNull();
    expect(chart.componentInstance.points).toEqual(points);
  });

  it('should show the shared load-error message and offer a retry after a failed load', () => {
    configure('PL');
    mapServiceSpy.getMapData.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = createComponent();

    expect(fixture.componentInstance['viewState']).toBe('error');
    expect(fixture.nativeElement.querySelector('.load-error')?.textContent).toContain(LOAD_ERROR_MESSAGE);

    mapServiceSpy.getMapData.and.returnValue(of(points));
    mapServiceSpy.getMapData.calls.reset();
    fixture.debugElement.query(By.css('.load-error button')).nativeElement.click();

    expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'PL');
  });

  // Akzeptanzkriterium 3: Klick auf einen Punkt navigiert zur Stakeholder-Detailseite (US-026).
  it('should navigate to the stakeholder detail route when a point is selected', () => {
    configure('PL');
    const fixture = createComponent();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture.debugElement.query(By.css('app-quadrant-chart')).triggerEventHandler('pointSelected', 'sh-1');

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'project-1', 'stakeholders', 'sh-1']);
  });

  describe('compare mode (US-034)', () => {
    it('should start with compareMode off and the comparePerspective control disabled', () => {
      configure('PL');
      const fixture = createComponent();

      expect(fixture.componentInstance['filterForm'].controls.compareMode.value).toBeFalse();
      expect(fixture.componentInstance['filterForm'].controls.comparePerspective.disabled).toBeTrue();
    });

    // Dokumentierte Abweichung von SPEC-04 §2.1 (siehe Komponentendoku): die aktuelle
    // `ownPerspective` ist keine wählbare `comparePerspective`-Option (US-033 lehnt
    // `primary === secondary` mit 400 ab).
    it('should exclude the currently selected ownPerspective from the compare-perspective options', () => {
      configure('PL');
      const fixture = createComponent();

      expect(fixture.componentInstance['comparePerspectiveOptions']).toEqual(['Coreteam', 'Architect']);
    });

    // Akzeptanzkriterium 1: Aktivieren des Schalters gibt `comparePerspective` frei; erst die
    // Auswahl einer Vergleichsperspektive ruft `GET .../map/compare` auf.
    it('should enable comparePerspective when compareMode is switched on and call getComparisonData once a perspective is chosen', () => {
      configure('PL');
      const fixture = createComponent();
      mapServiceSpy.getMapData.calls.reset();

      fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
      expect(fixture.componentInstance['filterForm'].controls.comparePerspective.disabled).toBeFalse();
      expect(mapServiceSpy.getComparisonData).not.toHaveBeenCalled();

      fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');
      expect(mapServiceSpy.getComparisonData).toHaveBeenCalledWith('project-1', 'PL', 'Architect');
    });

    // Deaktivieren des Schalters setzt comparePerspective zurück und deaktiviert das Feld wieder;
    // der Chart erhält wieder Einzelperspektiven-Punkte statt Vergleichsdaten.
    it('should reset and disable comparePerspective again when compareMode is switched off, and reload the single-perspective points', () => {
      configure('PL');
      const fixture = createComponent();
      fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
      fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');
      mapServiceSpy.getMapData.calls.reset();

      fixture.componentInstance['filterForm'].controls.compareMode.setValue(false);

      expect(fixture.componentInstance['filterForm'].controls.comparePerspective.value).toBeNull();
      expect(fixture.componentInstance['filterForm'].controls.comparePerspective.disabled).toBeTrue();
      expect(mapServiceSpy.getMapData).toHaveBeenCalledWith('project-1', 'PL');
    });

    it('should pass the comparison entries and both perspectives through to the quadrant chart', () => {
      configure('PL');
      const fixture = createComponent();
      fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
      fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');
      fixture.detectChanges();

      const chart = fixture.debugElement.query(By.css('app-quadrant-chart'));
      expect(chart.componentInstance.compareMode).toBeTrue();
      expect(chart.componentInstance.comparisonEntries).toEqual(comparisonEntries);
      expect(chart.componentInstance.comparePerspective).toBe('Architect');
    });

    it('should reset an ownPerspective selection that would collide with the currently chosen comparePerspective', () => {
      configure('PL');
      const fixture = createComponent();
      fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
      fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Coreteam');

      fixture.componentInstance['filterForm'].controls.ownPerspective.setValue('Coreteam');

      expect(fixture.componentInstance['filterForm'].controls.comparePerspective.value).toBeNull();
    });
  });
});
