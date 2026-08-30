import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MapComparisonEntry, MapPoint, MapService, PerspectiveRole } from './map.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { Stakeholder, StakeholdersService } from '../stakeholders/stakeholders.service';
import { StakeholderMapPageComponent } from './stakeholder-map-page/stakeholder-map-page.component';

/**
 * Story-Test US-034 „Vergleichsmodus-UI (zwei Punkte, Verbindungslinie, Legende, Diff)"
 * (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die
 * fünf in `docs/usecases/US-034-map-vergleich-ui.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument. Generische Rendering-/Verhaltenstests bleiben in
 * `quadrant-chart.component.spec.ts`, `stakeholder-map-page.component.spec.ts` und
 * `comparison-mode-toggle.component.spec.ts`/`connection-line-tooltip.component.spec.ts`.
 */
describe('US-034: Vergleichsmodus-UI (zwei Punkte, Verbindungslinie, Legende, Diff)', () => {
  const points: MapPoint[] = [
    { stakeholderId: 'sh-both', name: 'Beide Sichten', influence: 30, interest: 40 },
    { stakeholderId: 'sh-primary-only', name: 'Nur eigene Sicht', influence: 15, interest: 15 },
  ];

  const comparisonEntries: MapComparisonEntry[] = [
    {
      stakeholderId: 'sh-both',
      name: 'Beide Sichten',
      primary: { influence: 30, interest: 40 },
      secondary: { influence: 75, interest: 20 },
    },
    {
      stakeholderId: 'sh-primary-only',
      name: 'Nur eigene Sicht',
      primary: { influence: 15, interest: 15 },
      secondary: null,
    },
    {
      stakeholderId: 'sh-secondary-only',
      name: 'Nur Vergleichssicht',
      primary: null,
      secondary: { influence: 90, interest: 85 },
    },
  ];

  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  function configurePage(): void {
    TestBed.resetTestingModule();
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of(points));
    mapServiceSpy.getComparisonData.and.returnValue(of(comparisonEntries));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 3 } as ProjectOverviewItem));

    // US-063: `StakeholderMapPageComponent` lädt jetzt zusätzlich die Gesamtzahl der Projekt-
    // Stakeholder — gemockt statt gegen echtes HTTP, wie in `.claude/agents/frontend.md` Abschnitt 4
    // gefordert (keine reale Netzwerkanfrage aus einem Komponententest).
    const stakeholdersServiceSpy = jasmine.createSpyObj<StakeholdersService>('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of(points.map((point) => ({ id: point.stakeholderId }) as Stakeholder)));

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

  /** Aktiviert den Vergleichsmodus und wählt „Architect" als Vergleichsperspektive — entspricht
   * dem Bedienen des Schalters (`ComparisonModeToggleComponent`, eigenständig getestet) sowie der
   * Auswahl im zweiten, nativen `<select>` (`comparePerspective`, siehe Klassendoku
   * `StakeholderMapPageComponent`). */
  function enableCompareMode(fixture: ComponentFixture<StakeholderMapPageComponent>, comparePerspective: PerspectiveRole = 'Architect'): void {
    fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
    fixture.componentInstance['filterForm'].controls.comparePerspective.setValue(comparePerspective);
    fixture.detectChanges();
  }

  // Akzeptanzkriterium 1: Ein zweites Dropdown aktiviert eine Vergleichsperspektive und ruft
  // GET .../map/compare auf.
  it('activates a comparison perspective via the second dropdown and calls GET .../map/compare', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    mapServiceSpy.getMapData.calls.reset();

    // Vor dem Aktivieren ist das zweite Dropdown nicht im DOM (SPEC-04 §1: nur sichtbar, solange
    // `compareMode === true`).
    expect(fixture.nativeElement.querySelector('#comparePerspective')).toBeNull();

    fixture.componentInstance['filterForm'].controls.compareMode.setValue(true);
    fixture.detectChanges();

    const compareSelect: HTMLSelectElement = fixture.nativeElement.querySelector('#comparePerspective');
    expect(compareSelect).not.toBeNull();
    expect(mapServiceSpy.getComparisonData).not.toHaveBeenCalled();

    fixture.componentInstance['filterForm'].controls.comparePerspective.setValue('Architect');

    expect(mapServiceSpy.getComparisonData).toHaveBeenCalledWith('project-1', 'PL', 'Architect');
  });

  // Akzeptanzkriterium 2: Für Stakeholder mit Assessment in beiden Perspektiven werden zwei
  // visuell unterschiedene Punkte (Form/Farbe je Rolle) sowie eine Verbindungslinie gerendert.
  it('renders two visually distinct points and a connection line for a stakeholder rated in both perspectives', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    enableCompareMode(fixture);

    const ownPoints: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point:not(.map-point--compare)');
    const comparePoints: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point--compare');

    const ownPointForBoth = Array.from(ownPoints).find((el) => el.getAttribute('aria-label')?.includes('Beide Sichten'));
    const comparePointForBoth = Array.from(comparePoints).find((el) => el.getAttribute('aria-label')?.includes('Beide Sichten'));

    expect(ownPointForBoth).toBeDefined();
    expect(comparePointForBoth).toBeDefined();
    // Unterschiedliche Form (eigener Kreis vs. Vergleichs-Diamant) über unterschiedliche
    // CSS-Klassen abgebildet — dieselbe Rollenfarbe würde sonst keine visuelle Unterscheidung
    // zwischen den beiden Sichten desselben Stakeholders zulassen.
    expect(ownPointForBoth!.classList.contains('map-point--compare')).toBeFalse();
    expect(comparePointForBoth!.classList.contains('map-point--compare')).toBeTrue();

    expect(fixture.nativeElement.querySelectorAll('.connection-line').length).toBe(1);
  });

  // Akzeptanzkriterium 3: Für Stakeholder mit Assessment nur in einer der beiden Perspektiven wird
  // genau ein Punkt ohne Verbindungslinie gerendert.
  it('renders exactly one point without a connection line for stakeholders rated in only one of the two perspectives', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    enableCompareMode(fixture);

    const allPoints: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.map-point'));

    const pointsForPrimaryOnly = allPoints.filter((el) => el.getAttribute('aria-label')?.includes('Nur eigene Sicht'));
    const pointsForSecondaryOnly = allPoints.filter((el) => el.getAttribute('aria-label')?.includes('Nur Vergleichssicht'));

    expect(pointsForPrimaryOnly.length).toBe(1);
    expect(pointsForPrimaryOnly[0].classList.contains('map-point--compare')).toBeFalse();

    expect(pointsForSecondaryOnly.length).toBe(1);
    expect(pointsForSecondaryOnly[0].classList.contains('map-point--compare')).toBeTrue();

    // Nur der doppelt bewertete Stakeholder erhält eine Verbindungslinie — genau eine insgesamt.
    expect(fixture.nativeElement.querySelectorAll('.connection-line').length).toBe(1);
  });

  // Akzeptanzkriterium 4: Eine Legende erklärt die Farb-/Formcodierung je Rolle.
  it('renders a legend explaining the color/shape coding per role', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    enableCompareMode(fixture);

    const legend: HTMLElement = fixture.nativeElement.querySelector('.legend');
    expect(legend).not.toBeNull();
    expect(legend.textContent).toContain('Legende');
    expect(legend.textContent).toContain('PL');
    expect(legend.textContent).toContain('Architect');

    // Punktkodierung ist konsistent zwischen Legende und Chart (gleiche Rollen-Modifier-Klassen,
    // siehe Story-Technische-Hinweise „Punktkodierung ist konsistent").
    expect(legend.querySelector('.legend__swatch--pl')).not.toBeNull();
    expect(legend.querySelector('.legend__swatch--architect')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.map-point--pl:not(.map-point--compare)')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.map-point--compare.map-point--architect')).not.toBeNull();
  });

  // Akzeptanzkriterium 5: Hover/Klick auf eine Verbindungslinie zeigt ein Tooltip/Popover mit der
  // konkreten Differenz, z. B. „Einfluss: PL 30 vs. Architect 75".
  it('shows a tooltip/popover with the concrete difference on hover and on click of a connection line', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    enableCompareMode(fixture);

    const connectionGroup = fixture.debugElement.query(By.css('.connection'));
    expect(connectionGroup).not.toBeNull();

    // Hover.
    connectionGroup.triggerEventHandler('mouseenter', {});
    fixture.detectChanges();
    let tooltipText: string = fixture.nativeElement.querySelector('.connection-tooltip').textContent;
    expect(tooltipText).toContain('Einfluss: PL 30 vs. Architect 75');
    expect(tooltipText).toContain('Interesse: PL 40 vs. Architect 20');

    connectionGroup.triggerEventHandler('mouseleave', {});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.connection-tooltip')).toBeNull();

    // Klick (bleibt sichtbar ohne Hover — Barrierefreiheits-Alternative für Tastatur/Touch).
    connectionGroup.triggerEventHandler('click', {});
    fixture.detectChanges();
    tooltipText = fixture.nativeElement.querySelector('.connection-tooltip').textContent;
    expect(tooltipText).toContain('Einfluss: PL 30 vs. Architect 75');
  });
});
