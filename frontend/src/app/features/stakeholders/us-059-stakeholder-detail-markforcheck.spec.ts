import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AssessmentsService } from '../assessments/assessments.service';
import { AdminCommunicationTypesService } from '../admin/admin-communication-types.service';
import { Stakeholder } from './stakeholders.service';
import { StakeholderCommunicationsService } from './stakeholder-communications.service';
import { StakeholderDetailComponent } from './stakeholder-detail/stakeholder-detail.component';

/**
 * Story-Test US-059 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-059-stakeholder-detail-markforcheck.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument.
 *
 * Root Cause (bereits in US-050/US-051/US-052/US-057/US-058 etabliert): Das Frontend läuft ohne
 * `zone.js` (zoneless). Eine reine Feldzuweisung in einem `subscribe()`-Callback markiert die
 * Komponente nicht automatisch für die nächste Change-Detection-Runde. `StakeholderDetailComponent`
 * wurde von der „systematischen“ US-058-Bereinigung nicht erfasst (Issue #61/#81).
 *
 * Alle Tests verwenden bewusst `HttpTestingController` statt eines Service-Spys mit synchronem
 * `of(...)` für {@link StakeholdersService.getStakeholder} und {@link ProjectsService.getProject}:
 * nur ein über `flush()` erst nach dem ursprünglichen Aufruf aufgelöster Request reproduziert das
 * eigentliche Bug-Muster (Antwort trifft außerhalb eines von Angular beobachteten Ereignisses ein).
 * Nach `flush()` wird ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ausgelöst —
 * bewusst KEIN zusätzlicher simulierter Klick oder sonstige Interaktion. Die von den Kind-
 * Komponenten ({@link AssessmentTabsComponent}, {@link CommunicationAssignmentPanelComponent})
 * benötigten Services bleiben Spies mit synchronem `of([])`, da deren Rendering nicht Gegenstand
 * dieser Story ist (deren eigene HTTP-Aufrufe sind nicht die zu prüfende Root Cause).
 */
describe('US-059: StakeholderDetailComponent zuverlässig rendern (Assessment-Bereich, Stammdaten)', () => {
  let http: HttpTestingController;

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

  beforeEach(async () => {
    const assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', [
      'getAssessments',
      'upsertAssessment',
    ]);
    assessmentsServiceSpy.getAssessments.and.returnValue(of([]));

    const stakeholderCommunicationsServiceSpy = jasmine.createSpyObj(
      'StakeholderCommunicationsService',
      ['getAssignments', 'assignCommunication', 'updateAssignment', 'removeAssignment'],
    );
    stakeholderCommunicationsServiceSpy.getAssignments.and.returnValue(of([]));

    const adminCommunicationTypesServiceSpy = jasmine.createSpyObj(
      'AdminCommunicationTypesService',
      ['listActiveCommunicationTypes'],
    );
    adminCommunicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [StakeholderDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        {
          provide: StakeholderCommunicationsService,
          useValue: stakeholderCommunicationsServiceSpy,
        },
        { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } },
            snapshot: { paramMap: convertToParamMap({ stakeholderId: 'stakeholder-1' }) },
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function createFixture(): ComponentFixture<StakeholderDetailComponent> {
    const fixture = TestBed.createComponent(StakeholderDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushProject(role: string): void {
    http
      .expectOne('/api/v1/projects/project-1')
      .flush({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 });
  }

  // Akzeptanzkriterium 1: Der Inhaltsbereich zeigt Name, Typ, Organisation und alle
  // Stammdatenfelder zuverlässig — ohne dass eine unabhängige, zusätzliche Interaktion nötig ist.
  it('zeigt nach dem Laden Name, Typ, Organisation und Stammdaten ohne zusätzliche Interaktion', () => {
    const fixture = createFixture();

    http.expectOne('/api/v1/stakeholders/stakeholder-1').flush(stakeholder);
    flushProject('User');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Max Mustermann');
    expect(text).toContain('Person');
    expect(text).toContain('ACME GmbH');
    expect(text).toContain('CTO');
    expect(text).toContain('max@example.com');
  });

  // Akzeptanzkriterium 2: Für Rollen PL/Coreteam/Architect erscheint der Assessment-Bereich
  // (Überschrift + AssessmentTabsComponent) zuverlässig unter denselben Bedingungen.
  for (const role of ['PL', 'Coreteam', 'Architect']) {
    it(`zeigt den Assessment-Bereich für Rolle ${role} ohne zusätzliche Interaktion`, () => {
      const fixture = createFixture();

      http.expectOne('/api/v1/stakeholders/stakeholder-1').flush(stakeholder);
      flushProject(role);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Assessment');
      expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).not.toBeNull();
    });
  }

  // Akzeptanzkriterium 3: Für Rolle User bleibt der Assessment-Bereich weiterhin vollständig aus
  // dem DOM entfernt (US-030 Akzeptanzkriterium 3) — reiner Regressionscheck, keine Änderung an der
  // Sichtbarkeitsregel selbst.
  it('entfernt den Assessment-Bereich für Rolle User weiterhin vollständig aus dem DOM', () => {
    const fixture = createFixture();

    http.expectOne('/api/v1/stakeholders/stakeholder-1').flush(stakeholder);
    flushProject('User');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).toBeNull();
  });

  // Akzeptanzkriterium 4: Ein nicht existierender oder soft-gelöschter Stakeholder zeigt
  // zuverlässig die „Nicht gefunden“-Ansicht, nicht einen leeren Inhaltsbereich.
  it('zeigt die „Nicht gefunden“-Ansicht zuverlässig, wenn der Stakeholder nicht geladen werden kann', () => {
    const fixture = createFixture();

    http
      .expectOne('/api/v1/stakeholders/stakeholder-1')
      .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    flushProject('PL');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stakeholder nicht gefunden.');
    expect(fixture.debugElement.query(By.css('.stakeholder-detail'))).toBeNull();
  });
});
