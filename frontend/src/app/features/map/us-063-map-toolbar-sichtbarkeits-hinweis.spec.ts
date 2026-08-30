import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MapComparisonEntry, MapPoint, MapService } from './map.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { Stakeholder, StakeholdersService } from '../stakeholders/stakeholders.service';
import { StakeholderMapPageComponent } from './stakeholder-map-page/stakeholder-map-page.component';

/**
 * Story-Test US-063 „Toolbar-Hinweistext ‚X von Y Stakeholdern sichtbar' auf der Map ergänzen"
 * (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die
 * in `docs/usecases/US-063-map-toolbar-sichtbarkeits-hinweis.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 6 (Story-Test) ist dieser Test selbst. Akzeptanzkriterium 7 (bestehende
 * `StakeholderMapPageComponent`-Tests bleiben grün) wird durch den vollständigen `ng test`-Lauf
 * nachgewiesen, nicht durch einen eigenen Testfall hier.
 */
describe('US-063: Toolbar-Hinweistext „X von Y Stakeholdern sichtbar" auf der Map ergänzen', () => {
  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

  function stakeholder(id: string, name: string): Stakeholder {
    return {
      id,
      projectId: 'project-1',
      type: 'Person',
      name,
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
    };
  }

  function configurePage(points: MapPoint[], allStakeholders: Stakeholder[], comparisonEntries: MapComparisonEntry[] = []): void {
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of(points));
    mapServiceSpy.getComparisonData.and.returnValue(of(comparisonEntries));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: allStakeholders.length } as ProjectOverviewItem));

    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of(allStakeholders));

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

  function infoText(fixture: ReturnType<typeof TestBed.createComponent>): string | undefined {
    return fixture.nativeElement.querySelector('span.info-text.mono')?.textContent?.trim();
  }

  // Akzeptanzkriterium 1: rechts in der Toolbar erscheint der Hinweistext im vorgegebenen Format
  // (SPEC-04 §1: `span.info-text.mono`).
  it('renders the visibility hint as span.info-text.mono in the toolbar', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
      { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
    ];
    configurePage(points, [stakeholder('sh-1', 'Max Mustermann'), stakeholder('sh-2', 'Erika Beispiel')]);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    expect(infoText(fixture)).toBe('2 von 2 Stakeholdern sichtbar');
  });

  // Akzeptanzkriterium 2/3/5 (Fall „alle Stakeholder bewertet"): visibleCount entspricht der
  // Anzahl der geladenen Punkte der gewählten Perspektive, totalCount der Gesamtzahl aller
  // nicht-gelöschten Projekt-Stakeholder — hier identisch (visibleCount === totalCount).
  it('shows visibleCount === totalCount when every stakeholder has an assessment in the selected perspective', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
      { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
    ];
    const allStakeholders = [stakeholder('sh-1', 'Max Mustermann'), stakeholder('sh-2', 'Erika Beispiel')];
    configurePage(points, allStakeholders);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['visibleCount']).toBe(2);
    expect(fixture.componentInstance['totalCount']).toBe(2);
    expect(infoText(fixture)).toBe('2 von 2 Stakeholdern sichtbar');
  });

  // Akzeptanzkriterium 2/3/5 (Fall „mindestens ein unbewerteter Stakeholder"): totalCount zählt
  // auch einen Stakeholder ohne Bewertung in der gewählten Perspektive mit, visibleCount bleibt
  // kleiner als totalCount.
  it('shows visibleCount < totalCount when at least one project stakeholder has no assessment in the selected perspective', () => {
    const points: MapPoint[] = [{ stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 }];
    const allStakeholders = [
      stakeholder('sh-1', 'Max Mustermann'),
      stakeholder('sh-2', 'Erika Beispiel'),
      stakeholder('sh-3', 'Ohne Bewertung'),
    ];
    configurePage(points, allStakeholders);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['visibleCount']).toBe(1);
    expect(fixture.componentInstance['totalCount']).toBe(3);
    expect(infoText(fixture)).toBe('1 von 3 Stakeholdern sichtbar');
  });

  // Akzeptanzkriterium 4 (Perspektiv-Wechsel): der Hinweistext aktualisiert sich zuverlässig, wenn
  // „Meine Sicht" auf eine Perspektive mit anderer Punktzahl wechselt.
  it('updates the hint text when the own-perspective dropdown changes to a perspective with a different point count', () => {
    const plPoints: MapPoint[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
      { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
    ];
    const allStakeholders = [stakeholder('sh-1', 'Max Mustermann'), stakeholder('sh-2', 'Erika Beispiel'), stakeholder('sh-3', 'Ohne Bewertung')];
    configurePage(plPoints, allStakeholders);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    expect(infoText(fixture)).toBe('2 von 3 Stakeholdern sichtbar');

    mapServiceSpy.getMapData.and.returnValue(of([plPoints[0]]));
    fixture.componentInstance['filterForm'].controls.ownPerspective.setValue('Coreteam');
    fixture.detectChanges();

    expect(infoText(fixture)).toBe('1 von 3 Stakeholdern sichtbar');
  });

  // Akzeptanzkriterium 4 (Vergleichsmodus): im Vergleichsmodus zählt visibleCount die
  // Comparison-Entries (primäre Perspektive) statt der Einzelperspektiven-Punkte.
  it('switches the hint text to count comparison entries once compare mode is switched on', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
      { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 20, interest: 30 },
    ];
    const comparisonEntries: MapComparisonEntry[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', primary: { influence: 80, interest: 60 }, secondary: { influence: 30, interest: 20 } },
    ];
    const allStakeholders = [stakeholder('sh-1', 'Max Mustermann'), stakeholder('sh-2', 'Erika Beispiel')];
    configurePage(points, allStakeholders, comparisonEntries);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    expect(infoText(fixture)).toBe('2 von 2 Stakeholdern sichtbar');

    fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
    fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');
    fixture.detectChanges();

    expect(infoText(fixture)).toBe('1 von 2 Stakeholdern sichtbar');
  });
});
