import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AssessmentRole, AssessmentsService } from '../assessments.service';
import { AssessmentTabsComponent } from './assessment-tabs.component';

describe('AssessmentTabsComponent', () => {
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;

  const roles: AssessmentRole[] = [
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

  function createComponent(currentUserRole: string | null) {
    assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
    assessmentsServiceSpy.getAssessments.and.returnValue(of(roles));

    TestBed.configureTestingModule({
      imports: [AssessmentTabsComponent],
      providers: [{ provide: AssessmentsService, useValue: assessmentsServiceSpy }],
    });

    const fixture = TestBed.createComponent(AssessmentTabsComponent);
    fixture.componentInstance.stakeholderId = 'stakeholder-1';
    fixture.componentInstance.currentUserRole = currentUserRole;
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 1: drei Tabs, gespeist aus GET .../assessments.
  it('should load the three role tabs on init', () => {
    const fixture = createComponent('PL');

    expect(assessmentsServiceSpy.getAssessments).toHaveBeenCalledWith('stakeholder-1');
    expect(fixture.componentInstance['roleTabs']).toEqual(['PL', 'Coreteam', 'Architect']);
    expect(fixture.componentInstance['roles']).toEqual(roles);
  });

  // Akzeptanzkriterium 2: Formular ist mit den Werten der aktiven Rolle inkl. Notizen befüllt.
  it('should populate the form with the active (assessed) role values', () => {
    const fixture = createComponent('PL');

    expect(fixture.componentInstance['form'].getRawValue()).toEqual({ influence: 40, interest: 60, notes: 'PL-Notiz' });
  });

  // Akzeptanzkriterium 3: nur der eigene Tab ist editierbar, übrige sind read-only.
  it('should enable the form only for the own role tab', () => {
    const fixture = createComponent('PL');

    expect(fixture.componentInstance['isOwnRole']).toBeTrue();
    expect(fixture.componentInstance['form'].enabled).toBeTrue();

    fixture.componentInstance['onSelectTab']('Coreteam');

    expect(fixture.componentInstance['isOwnRole']).toBeFalse();
  });

  it('should save with the current version as expectedVersion for an assessed tab', () => {
    const fixture = createComponent('PL');
    assessmentsServiceSpy.upsertAssessment.and.returnValue(of(roles[0]));
    assessmentsServiceSpy.getAssessments.calls.reset();

    fixture.componentInstance['onSave']();

    expect(assessmentsServiceSpy.upsertAssessment).toHaveBeenCalledWith('stakeholder-1', 'PL', {
      influence: 40,
      interest: 60,
      notes: 'PL-Notiz',
      expectedVersion: 1,
    });
    expect(assessmentsServiceSpy.getAssessments).toHaveBeenCalled();
  });

  // Akzeptanzkriterium 4: 409 ASSESSMENT_MODIFIED zeigt den Konfliktdialog; „Trotzdem speichern“
  // sendet erneut ohne expectedVersion, „Abbrechen“ lädt neu.
  it('should show the conflict dialog on 409 and resolve via overwrite or cancel', () => {
    const fixture = createComponent('PL');
    assessmentsServiceSpy.upsertAssessment.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { modifiedBy: 'Peter PL', modifiedAt: '2026-08-19T11:00:00Z' } })),
    );

    fixture.componentInstance['onSave']();

    expect(fixture.componentInstance['conflict']).toEqual({ modifiedBy: 'Peter PL', modifiedAt: '2026-08-19T11:00:00Z' });

    assessmentsServiceSpy.upsertAssessment.and.returnValue(of(roles[0]));
    fixture.componentInstance['onConflictOverwrite']();
    expect(assessmentsServiceSpy.upsertAssessment).toHaveBeenCalledWith(
      'stakeholder-1',
      'PL',
      jasmine.objectContaining({ expectedVersion: undefined }),
    );

    fixture.componentInstance['conflict'] = { modifiedBy: 'Peter PL', modifiedAt: '2026-08-19T11:00:00Z' };
    assessmentsServiceSpy.getAssessments.calls.reset();
    fixture.componentInstance['onConflictCancelled']();
    expect(fixture.componentInstance['conflict']).toBeNull();
    expect(assessmentsServiceSpy.getAssessments).toHaveBeenCalled();
  });

  // Akzeptanzkriterium 5: NOT_ASSESSED zeigt „Jetzt bewerten“-CTA, klickbar nur für die eigene Rolle.
  it('should only allow starting an assessment for the own role when NOT_ASSESSED', () => {
    const fixture = createComponent('Coreteam');
    fixture.componentInstance['onSelectTab']('Coreteam');

    expect(fixture.componentInstance['activeRole']?.status).toBe('NOT_ASSESSED');
    expect(fixture.componentInstance['isOwnRole']).toBeTrue();
    expect(fixture.componentInstance['assessing']).toBeFalse();

    fixture.componentInstance['onStartAssessing']();
    expect(fixture.componentInstance['assessing']).toBeTrue();
  });

  // Akzeptanzkriterium 6: NO_ROLE_ASSIGNED zeigt einen Hinweis ohne Eingabemöglichkeit.
  it('should expose NO_ROLE_ASSIGNED status without enabling the form', () => {
    const fixture = createComponent('PL');
    fixture.componentInstance['onSelectTab']('Architect');

    expect(fixture.componentInstance['activeRole']?.status).toBe('NO_ROLE_ASSIGNED');
    expect(fixture.componentInstance['form'].enabled).toBeFalse();
  });
});
