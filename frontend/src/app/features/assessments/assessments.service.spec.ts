import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssessmentRole, AssessmentsService } from './assessments.service';

/**
 * `updatePosition` ist die einzige neue, nicht-triviale Logik dieser Datei (US-036
 * Akzeptanzkriterium 3) — eine reine Passthrough-Methode wie `getAssessments`/`upsertAssessment`
 * (bereits über Component-Spys in `assessment-tabs.component.spec.ts` indirekt abgedeckt) bräuchte
 * keinen eigenen Test; die Versions-Auflösung vor dem Schreiben (siehe Klassendoku
 * `updatePosition`) dagegen schon (frontend.md Abschnitt 4 / CLAUDE.md Kernregel 2).
 */
describe('AssessmentsService.updatePosition', () => {
  let service: AssessmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssessmentsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssessmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches the current version via GET .../assessments and sends it as expectedVersion on PUT', () => {
    let result: AssessmentRole | undefined;
    service.updatePosition('sh-1', 'PL', { influence: 40, interest: 60 }).subscribe((role) => (result = role));

    const getReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments');
    expect(getReq.request.method).toBe('GET');
    getReq.flush([
      { role: 'PL', status: 'ASSESSED', influence: 10, interest: 10, notes: null, updatedByName: 'Alice', updatedAt: '2026-01-01', version: 3 },
      { role: 'Coreteam', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
    ] as AssessmentRole[]);

    const putReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments/PL');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ influence: 40, interest: 60, expectedVersion: 3 });

    const updated: AssessmentRole = {
      role: 'PL',
      status: 'ASSESSED',
      influence: 40,
      interest: 60,
      notes: null,
      updatedByName: 'Alice',
      updatedAt: '2026-01-02',
      version: 4,
    };
    putReq.flush(updated);

    expect(result).toEqual(updated);
  });

  it('omits expectedVersion when the role has not been assessed yet (no version to conflict against)', () => {
    service.updatePosition('sh-1', 'Architect', { influence: 5, interest: 5 }).subscribe();

    const getReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments');
    getReq.flush([
      { role: 'Architect', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
    ] as AssessmentRole[]);

    const putReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments/Architect');
    expect(putReq.request.body).toEqual({ influence: 5, interest: 5, expectedVersion: undefined });
    putReq.flush({} as AssessmentRole);
  });

  it('propagates a 409 conflict from the PUT call to the subscriber', () => {
    let error: unknown;
    service.updatePosition('sh-1', 'PL', { influence: 40, interest: 60 }).subscribe({ error: (err) => (error = err) });

    const getReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments');
    getReq.flush([
      { role: 'PL', status: 'ASSESSED', influence: 10, interest: 10, notes: null, updatedByName: 'Alice', updatedAt: '2026-01-01', version: 3 },
    ] as AssessmentRole[]);

    const putReq = httpMock.expectOne('/api/v1/stakeholders/sh-1/assessments/PL');
    putReq.flush({ modifiedBy: 'Bob', modifiedAt: '2026-01-03' }, { status: 409, statusText: 'Conflict' });

    expect((error as { status: number }).status).toBe(409);
  });
});
