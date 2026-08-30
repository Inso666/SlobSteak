import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MapPoint, MapService } from './map.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { AssessmentRole, AssessmentsService } from '../assessments/assessments.service';
import { Stakeholder, StakeholdersService } from '../stakeholders/stakeholders.service';
import { StakeholderMapPageComponent } from './stakeholder-map-page/stakeholder-map-page.component';

/**
 * Story-Test US-036 „Drag & Drop UI inkl. Zoom/Pan" (Frontend-Anteil, Konvention siehe
 * `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die sechs in
 * `docs/usecases/US-036-map-dragdrop-ui.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument. Generische Rendering-/Interaktionstests (Pixel→Prozent-
 * Umrechnung, Tastatur-Alternative, Zoom-Grenzwerte) bleiben in
 * `draggable-point.component.spec.ts` bzw. `quadrant-chart.component.spec.ts`.
 */
describe('US-036: Drag & Drop UI inkl. Zoom/Pan', () => {
  const points: MapPoint[] = [{ stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 30, interest: 40 }];

  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;

  function configurePage(role: string, mapPoints: MapPoint[] = points): void {
    TestBed.resetTestingModule();
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of(mapPoints));
    mapServiceSpy.getComparisonData.and.returnValue(of([]));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['updatePosition', 'upsertAssessment', 'getAssessments']);
    assessmentsServiceSpy.updatePosition.and.returnValue(of({} as AssessmentRole));
    assessmentsServiceSpy.upsertAssessment.and.returnValue(of({} as AssessmentRole));

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
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  function chartOf(fixture: ComponentFixture<StakeholderMapPageComponent>) {
    return fixture.debugElement.query(By.css('app-quadrant-chart'));
  }

  // Akzeptanzkriterium 1: Drag & Drop ist ausschließlich für Punkte aktiv, die (a) der eigenen
  // Rolle entsprechen UND (b) im Vergleichsmodus die primäre Perspektive sind; die sekundäre
  // Vergleichsperspektive ist nie draggable, auch bei zufälliger Rollenübereinstimmung.
  it('activates drag & drop only for points that are both the own role and (in compare mode) the primary perspective — never for the secondary one, even on a coincidental role match', () => {
    configurePage('Architect');
    mapServiceSpy.getComparisonData.and.returnValue(
      of([{ stakeholderId: 'sh-1', name: 'Max Mustermann', primary: { influence: 30, interest: 40 }, secondary: { influence: 70, interest: 60 } }]),
    );
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    // Vergleichsmodus: primäre Sicht = eigene Rolle "Architect", Vergleichssicht zufällig auch
    // "Architect" (F3.3 Edge Case).
    fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
    fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');
    fixture.detectChanges();

    const ownButton: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point:not(.map-point--compare)');
    const compareButton: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point--compare');

    expect(ownButton.classList).not.toContain('map-point--locked');
    expect(compareButton.classList).toContain('map-point--locked');
  });

  // Akzeptanzkriterium 2: nicht-draggable Punkte sind visuell erkennbar (reduzierte Deckkraft
  // und/oder gesperrter Cursor).
  it('visually marks non-draggable points as locked', () => {
    configurePage('Coreteam');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    // "Meine Sicht" auf eine andere als die eigene Rolle umschalten — erst NACH ngOnInit (das die
    // Standardauswahl auf die eigene Rolle setzt), sonst überschreibt ngOnInit diese Auswahl wieder.
    fixture.componentInstance['filterForm'].controls.ownPerspective.setValue('Architect');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');
    expect(button.classList).toContain('map-point--locked');
  });

  // Akzeptanzkriterium 3: nach Loslassen wird PUT .../assessments/{role} mit den neuen Werten und
  // der aktuellen expectedVersion aufgerufen (Echtzeit-Anzeige während des Ziehens: siehe
  // `draggable-point.component.spec.ts`).
  it('calls the assessment update endpoint with the new values after releasing a drag', () => {
    configurePage('PL');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    chartOf(fixture).triggerEventHandler('pointMoved', { stakeholderId: 'sh-1', perspectiveRole: 'PL', influence: 66, interest: 77 });

    expect(assessmentsServiceSpy.updatePosition).toHaveBeenCalledWith('sh-1', 'PL', { influence: 66, interest: 77 });
  });

  // Akzeptanzkriterium 4: liefert der Server 409 Conflict, erscheint derselbe Konfliktdialog wie
  // in US-029 (Wiederverwendung von AssessmentConflictDialog).
  it('shows the reused AssessmentConflictDialog on a 409 conflict response', () => {
    configurePage('PL');
    assessmentsServiceSpy.updatePosition.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { modifiedBy: 'Erika', modifiedAt: '2026-08-29T10:00:00Z' } })),
    );
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    chartOf(fixture).triggerEventHandler('pointMoved', { stakeholderId: 'sh-1', perspectiveRole: 'PL', influence: 66, interest: 77 });
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('app-assessment-conflict-dialog'));
    expect(dialog).not.toBeNull();
    expect(dialog.componentInstance.modifiedBy).toBe('Erika');
    expect(dialog.componentInstance.modifiedAt).toBe('2026-08-29T10:00:00Z');

    dialog.triggerEventHandler('overwrite', undefined);
    expect(assessmentsServiceSpy.upsertAssessment).toHaveBeenCalledWith('sh-1', 'PL', { influence: 66, interest: 77 });
  });

  // Akzeptanzkriterium 5: Zoom/Pan ermöglicht das präzise Greifen nah beieinanderliegender Punkte
  // — Komponententest mit zwei Punkten bei identischer Position 50/50.
  it('keeps two points at the identical 50/50 position individually draggable after zooming in', () => {
    const overlapping: MapPoint[] = [
      { stakeholderId: 'sh-a', name: 'Punkt A', influence: 50, interest: 50 },
      { stakeholderId: 'sh-b', name: 'Punkt B', influence: 50, interest: 50 },
    ];
    configurePage('PL', overlapping);
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const chart = chartOf(fixture);
    (chart.componentInstance as unknown as { zoomIn(): void }).zoomIn();
    fixture.detectChanges();

    chart.triggerEventHandler('pointMoved', { stakeholderId: 'sh-b', perspectiveRole: 'PL', influence: 80, interest: 20 });

    expect(assessmentsServiceSpy.updatePosition).toHaveBeenCalledWith('sh-b', 'PL', { influence: 80, interest: 20 });
    expect(assessmentsServiceSpy.updatePosition).not.toHaveBeenCalledWith('sh-a', jasmine.anything(), jasmine.anything());
  });

  // Akzeptanzkriterium 6 (Edge Case): ein Nutzer mit Rolle Coreteam, der die Map in Perspektive
  // "Architect" betrachtet (nicht seine eigene), kann nie einen Punkt verschieben — auch wenn
  // technisch ein Coreteam-Assessment existiert.
  it('never allows a Coreteam user viewing the Architect perspective to move a point, even though a Coreteam assessment technically exists', () => {
    configurePage('Coreteam');
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    // "Meine Sicht" auf eine andere als die eigene Rolle umschalten — erst NACH ngOnInit (siehe
    // Kommentar im vorherigen Testfall).
    fixture.componentInstance['filterForm'].controls.ownPerspective.setValue('Architect');
    fixture.detectChanges();

    const chart = chartOf(fixture);
    expect(chart.componentInstance.currentUserRole).toBe('Coreteam');
    expect(chart.componentInstance.perspective).toBe('Architect');
    expect((chart.componentInstance as unknown as { ownPointsDraggable: boolean }).ownPointsDraggable).toBeFalse();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');
    expect(button.classList).toContain('map-point--locked');
  });
});
