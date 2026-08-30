import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Stakeholder } from '../stakeholders/stakeholders.service';
import { DistributionListService, DistributionListWireEntry } from './distribution-list.service';

/**
 * `DistributionListService` verbindet zwei Requests (US-041-Verteilerliste + Stakeholderliste) zu
 * einem angereicherten Zeilenmodell (siehe Klassendoku `getDistributionList`/`DistributionListRow`)
 * — diese nicht-triviale Join-Logik ist der Grund für einen eigenen Service-Test (frontend.md
 * Abschnitt 4 / CLAUDE.md Kernregel 2), analog zu `assessments.service.spec.ts`.
 */
describe('DistributionListService.getDistributionList', () => {
  let service: DistributionListService;
  let httpMock: HttpTestingController;

  function stakeholder(overrides: Partial<Stakeholder>): Stakeholder {
    return {
      id: 'sh-1',
      projectId: 'project-1',
      type: 'Person',
      name: 'Max Mustermann',
      organization: null,
      position: null,
      email: null,
      phone: null,
      locationDepartment: null,
      description: null,
      updatedByName: 'Anna Admin',
      updatedAt: '2026-08-19T10:00:00Z',
      similarStakeholderWarning: null,
      deletedAt: null,
      deletedByName: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DistributionListService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DistributionListService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('enriches each distribution-list entry with the organization of the matching stakeholder', () => {
    let result: unknown;
    service.getDistributionList('project-1').subscribe((rows) => (result = rows));

    const entries: DistributionListWireEntry[] = [
      {
        stakeholderId: 'sh-1',
        name: 'Max Mustermann',
        stakeholderType: 'Person',
        hasEmail: true,
        email: 'max@example.com',
        communicationTypeId: 'type-1',
        communicationTypeName: 'Newsletter',
        frequency: 'Weekly',
        channel: 'Email',
      },
    ];

    httpMock.expectOne('/api/v1/projects/project-1/distribution-list').flush(entries);
    httpMock
      .expectOne('/api/v1/projects/project-1/stakeholders')
      .flush([stakeholder({ id: 'sh-1', organization: 'ACME GmbH' })]);

    expect(result).toEqual([
      {
        stakeholderId: 'sh-1',
        name: 'Max Mustermann',
        organization: 'ACME GmbH',
        hasEmail: true,
        email: 'max@example.com',
        communicationTypeId: 'type-1',
        communicationTypeName: 'Newsletter',
        frequency: 'Weekly',
        channel: 'Email',
      },
    ]);
  });

  it('falls back to null organization when no matching stakeholder is found in the join', () => {
    let result: unknown;
    service.getDistributionList('project-1').subscribe((rows) => (result = rows));

    const entries: DistributionListWireEntry[] = [
      {
        stakeholderId: 'sh-missing',
        name: 'Unbekannt',
        stakeholderType: 'Person',
        hasEmail: false,
        email: null,
        communicationTypeId: 'type-1',
        communicationTypeName: 'Newsletter',
        frequency: 'Weekly',
        channel: 'Email',
      },
    ];

    httpMock.expectOne('/api/v1/projects/project-1/distribution-list').flush(entries);
    httpMock.expectOne('/api/v1/projects/project-1/stakeholders').flush([]);

    expect((result as { organization: string | null }[])[0].organization).toBeNull();
  });

  it('sends every set filter as its own query parameter and omits unset ones', () => {
    service
      .getDistributionList('project-1', {
        communicationTypeId: 'type-1',
        frequency: 'Weekly',
        channel: 'Email',
        stakeholderType: 'Person',
      })
      .subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/v1/projects/project-1/distribution-list' && request.method === 'GET',
    );
    expect(req.request.params.get('communicationTypeId')).toBe('type-1');
    expect(req.request.params.get('frequency')).toBe('Weekly');
    expect(req.request.params.get('channel')).toBe('Email');
    expect(req.request.params.get('stakeholderType')).toBe('Person');
    req.flush([]);
    httpMock.expectOne('/api/v1/projects/project-1/stakeholders').flush([]);
  });

  it('omits query parameters entirely when no filter is set', () => {
    service.getDistributionList('project-1').subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/v1/projects/project-1/distribution-list',
    );
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
    httpMock.expectOne('/api/v1/projects/project-1/stakeholders').flush([]);
  });
});
