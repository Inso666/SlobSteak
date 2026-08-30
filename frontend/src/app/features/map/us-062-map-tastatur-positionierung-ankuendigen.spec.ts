import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MapPoint, MapService } from './map.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { AssessmentRole, AssessmentsService } from '../assessments/assessments.service';
import { StakeholderMapPageComponent } from './stakeholder-map-page/stakeholder-map-page.component';

/**
 * Story-Test US-062 „Tastatur-Positionierung eigener Map-Punkte für Screenreader-Nutzer:innen
 * zuverlässig ankündigen" (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1).
 * Prüft ausschließlich die in `docs/usecases/US-062-map-tastatur-positionierung-ankuendigen.md`
 * gelisteten Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 1 (Reproduktion gegen einen laufenden `docker-compose`-Stack) ist ein
 * manueller Nachweis, kein automatisiert prüfbares Verhalten — Ergebnis siehe Story-Datei
 * „Anmerkungen des Agenten" sowie PR-Beschreibung. Akzeptanzkriterium 4 (zusätzliche visuelle
 * Ursache) entfällt, da die Reproduktion keine weitere Ursache ergeben hat (dokumentiert ebenda).
 * Akzeptanzkriterium 7 (bestehende Tests bleiben grün) wird durch den vollständigen `ng test`-Lauf
 * nachgewiesen, nicht durch einen eigenen Testfall hier.
 *
 * Generische, komponenteninterne Rendering-/Umrechnungslogik (Pixel→Prozent, Zoom-Grenzwerte,
 * Maus-Drag) bleibt in `draggable-point.component.spec.ts` bzw. `quadrant-chart.component.spec.ts`
 * — dieser Test prüft die Story über die vollständige Seite (`StakeholderMapPageComponent`), damit
 * echte, gerenderte Tastatur-Events (nicht direkte Methodenaufrufe) auf einem tatsächlich
 * fokussierten, ziehbaren Punkt-Button verifiziert werden (Akzeptanzkriterium 5).
 */
describe('US-062: Tastatur-Positionierung eigener Map-Punkte für Screenreader-Nutzer:innen zuverlässig ankündigen', () => {
  const points: MapPoint[] = [{ stakeholderId: 'sh-1', name: 'Erika Musterfrau', influence: 30, interest: 40 }];

  let mapServiceSpy: jasmine.SpyObj<MapService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;

  function configurePage(): void {
    mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of(points));
    mapServiceSpy.getComparisonData.and.returnValue(of([]));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(
      of({
        id: 'project-1',
        name: 'Projekt',
        role: 'PL',
        stakeholderCount: 1,
      } as ProjectOverviewItem),
    );

    assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', [
      'updatePosition',
      'upsertAssessment',
      'getAssessments',
    ]);
    assessmentsServiceSpy.updatePosition.and.returnValue(of({} as AssessmentRole));
    assessmentsServiceSpy.upsertAssessment.and.returnValue(of({} as AssessmentRole));

    TestBed.configureTestingModule({
      imports: [StakeholderMapPageComponent],
      providers: [
        provideRouter([]),
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  function ownPointButton(fixture: ComponentFixture<StakeholderMapPageComponent>): HTMLButtonElement {
    return fixture.debugElement.query(By.css('.map-point:not(.map-point--compare)')).nativeElement as HTMLButtonElement;
  }

  /** Dispatcht ein echtes `keydown`-Event mit `key`/`shiftKey` auf dem fokussierten Button — statt
   * die (`protected`) `onKeydown`-Methode direkt aufzurufen, damit Akzeptanzkriterium 5
   * („Pfeiltasten-Sequenz auf einem fokussierten, ziehbaren Punkt") auch die Template-Bindung
   * `(keydown)="onKeydown($event)"` mit abdeckt. */
  function pressKey(button: HTMLButtonElement, key: string, shiftKey = false): void {
    button.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
  }

  // Akzeptanzkriterium 2: Das `aria-label` des fokussierten Punkt-`<button>` spiegelt während einer
  // unbestätigten Tastatur-Bewegung (`livePosition !== null`) die aktuellen Live-Werte wider, nicht
  // nur die zuletzt bestätigten `@Input`-Werte.
  it('reflects the current live influence/interest values in the aria-label while an arrow-key move is still unconfirmed', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const button = ownPointButton(fixture);
    button.focus();
    expect(button.getAttribute('aria-label')).toContain('Einfluss 30, Interesse 40');

    pressKey(button, 'ArrowRight');
    fixture.detectChanges();

    expect(button.getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 40.');
  });

  // Akzeptanzkriterium 5: eine vollständige Pfeiltasten-Sequenz auf dem fokussierten, ziehbaren
  // Punkt — das `aria-label`-Attribut wird nach jedem einzelnen Tastendruck geprüft.
  it('updates the aria-label after every single key press of an arrow-key sequence, including a Shift-stepped move', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const button = ownPointButton(fixture);
    button.focus();

    pressKey(button, 'ArrowRight');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 40.');

    pressKey(button, 'ArrowUp');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 41.');

    pressKey(button, 'ArrowRight', true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 41 · Interesse 41.');

    pressKey(button, 'ArrowDown');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 41 · Interesse 40.');
  });

  // Akzeptanzkriterium 3 (Bestätigung): Nach `Enter` kehrt das `aria-label` zum korrekten,
  // NEU bestätigten Endzustand zurück — die Positionsänderung wurde tatsächlich übernommen.
  it('returns the aria-label to the newly confirmed end state after Enter commits the move', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const button = ownPointButton(fixture);
    button.focus();
    pressKey(button, 'ArrowRight');
    pressKey(button, 'ArrowRight');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toContain('Wird verschoben');

    pressKey(button, 'Enter');
    fixture.detectChanges();

    expect(assessmentsServiceSpy.updatePosition).toHaveBeenCalledWith('sh-1', 'PL', { influence: 32, interest: 40 });
    expect(button.getAttribute('aria-label')).toBe('Erika Musterfrau — Einfluss 32, Interesse 40. Öffnet die Stakeholder-Detailseite.');
  });

  // Akzeptanzkriterium 3 (Verwerfen): Nach `Escape` kehrt das `aria-label` zum unveränderten,
  // ursprünglich bestätigten Stand zurück — kein Speichervorgang wird ausgelöst.
  it('returns the aria-label to the original, unchanged end state after Escape discards the move', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const button = ownPointButton(fixture);
    button.focus();
    pressKey(button, 'ArrowUp');
    pressKey(button, 'ArrowUp');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toContain('Wird verschoben');

    pressKey(button, 'Escape');
    fixture.detectChanges();

    expect(assessmentsServiceSpy.updatePosition).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('Erika Musterfrau — Einfluss 30, Interesse 40. Öffnet die Stakeholder-Detailseite.');
  });

  // Akzeptanzkriterium 3 (Fokusverlust): `blur` bestätigt eine noch offene Bewegung analog zu
  // `Enter` — auch hier kehrt das `aria-label` zum korrekten, neu bestätigten Endzustand zurück.
  it('returns the aria-label to the newly confirmed end state after a blur commits the move', () => {
    configurePage();
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();

    const button = ownPointButton(fixture);
    button.focus();
    pressKey(button, 'ArrowLeft');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toContain('Wird verschoben');

    button.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(assessmentsServiceSpy.updatePosition).toHaveBeenCalledWith('sh-1', 'PL', { influence: 29, interest: 40 });
    expect(button.getAttribute('aria-label')).toBe('Erika Musterfrau — Einfluss 29, Interesse 40. Öffnet die Stakeholder-Detailseite.');
  });
});
