import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssessmentRole } from '../assessments.service';
import { AssessmentTabsComponent } from './assessment-tabs.component';

/**
 * Story-Test US-069 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-069-assessment-tabs-markforcheck.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument.
 *
 * Root Cause (bereits in US-050/US-051/US-052/US-057/US-058/US-059 etabliert): Das Frontend läuft
 * ohne `zone.js` (zoneless). Eine reine Feldzuweisung von `this.roles` in einem `subscribe()`-
 * Callback markiert die Komponente nicht automatisch für die nächste Change-Detection-Runde.
 * `AssessmentTabsComponent` war nicht Teil der in US-058 dokumentierten, systematisch
 * durchsuchten Fundstellen (Issue #103).
 *
 * Alle Tests verwenden bewusst `HttpTestingController` statt eines Service-Spys mit synchronem
 * `of(...)` für {@link AssessmentsService.getAssessments}: nur ein über `flush()` erst nach dem
 * ursprünglichen Aufruf aufgelöster Request reproduziert das eigentliche Bug-Muster (Antwort trifft
 * außerhalb eines von Angular beobachteten Ereignisses ein). Nach `flush()` wird ausschließlich der
 * reguläre `fixture.detectChanges()`-Zyklus ausgelöst — bewusst KEIN zusätzlicher simulierter Klick
 * oder sonstige Interaktion, bevor der Endzustand geprüft wird.
 */
describe('US-069: AssessmentTabsComponent zuverlässig bei Erstaufruf rendern', () => {
  let http: HttpTestingController;

  const rolesWithAssessedPl: AssessmentRole[] = [
    {
      role: 'PL',
      status: 'ASSESSED',
      influence: 40,
      interest: 60,
      notes: 'PL-Notiz',
      updatedByName: 'Peter PL',
      updatedAt: '2026-08-19T10:00:00Z',
      version: 1,
    },
    { role: 'Coreteam', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
    { role: 'Architect', status: 'NO_ROLE_ASSIGNED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentTabsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function createFixture(currentUserRole: string | null): ComponentFixture<AssessmentTabsComponent> {
    const fixture = TestBed.createComponent(AssessmentTabsComponent);
    fixture.componentInstance.stakeholderId = 'stakeholder-1';
    fixture.componentInstance.currentUserRole = currentUserRole;
    fixture.detectChanges();
    return fixture;
  }

  function flushAssessments(roles: AssessmentRole[]): void {
    http.expectOne('/api/v1/stakeholders/stakeholder-1/assessments').flush(roles);
  }

  // Akzeptanzkriterium 1: Bei frischem Seitenaufruf (kein vorheriger Tab-Klick) zeigt der
  // standardmäßig aktive Tab (PL) die vorhandenen Werte, sobald GET .../assessments geantwortet
  // hat — ohne eine unabhängige, zusätzliche Interaktion.
  it('zeigt Slider-Werte, „Zuletzt geändert von/am“ und Notizen des aktiven Tabs ohne zusätzliche Interaktion', () => {
    const fixture = createFixture('PL');

    flushAssessments(rolesWithAssessedPl);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Peter PL');
    // Notizfeld ist ein Textarea-Reactive-Forms-Control: der Wert steht in der Formular- und DOM-
    // Property, nicht als Kindtext im textContent — deshalb Prüfung über form.getRawValue().
    expect(fixture.componentInstance['form'].getRawValue()).toEqual({ influence: 40, interest: 60, notes: 'PL-Notiz' });
  });

  // Akzeptanzkriterium 2: Verhalten beim manuellen Tab-Wechsel bleibt unverändert korrekt.
  it('zeigt beim manuellen Wechsel auf einen anderen Tab weiterhin die korrekten Werte', () => {
    const fixture = createFixture('PL');

    flushAssessments(rolesWithAssessedPl);
    fixture.detectChanges();

    fixture.componentInstance['onSelectTab']('Coreteam');
    fixture.detectChanges();

    expect(fixture.componentInstance['activeRole']?.status).toBe('NOT_ASSESSED');
    expect(fixture.nativeElement.textContent).toContain('Noch nicht bewertet.');
  });

  // Akzeptanzkriterium 3: Für einen Stakeholder ohne vorhandenes Assessment der aktiven Rolle zeigt
  // der Tab weiterhin zuverlässig den „noch nicht bewertet“-Zustand, direkt nach dem Erstaufruf.
  it('zeigt den „noch nicht bewertet“-Zustand zuverlässig, wenn die aktive Rolle kein Assessment hat', () => {
    const rolesWithoutAssessment: AssessmentRole[] = [
      { role: 'PL', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
      { role: 'Coreteam', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
      { role: 'Architect', status: 'NO_ROLE_ASSIGNED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
    ];
    const fixture = createFixture('PL');

    flushAssessments(rolesWithoutAssessment);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Noch nicht bewertet.');
  });

  // Akzeptanzkriterium 4: Automatisierter Test via HttpTestingController + flush() (kein
  // synchrones of(...)) belegt den korrekten Endzustand direkt nach dem asynchronen Response, ohne
  // vorherigen Tab-Wechsel — durch die obigen Tests bereits strukturell erfüllt; dieser Test prüft
  // zusätzlich explizit, dass der reine reguläre detectChanges()-Zyklus (ohne jede weitere
  // Interaktion) ausreicht, um den Endzustand zu zeigen.
  it('rendert den Endzustand allein durch den regulären detectChanges()-Zyklus nach flush()', () => {
    const fixture = createFixture('PL');

    flushAssessments(rolesWithAssessedPl);
    fixture.detectChanges();

    expect(fixture.componentInstance['roles']).toEqual(rolesWithAssessedPl);
    expect(fixture.nativeElement.textContent).toContain('Peter PL');
  });
});
