import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Stakeholder, StakeholdersService } from './stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { StakeholderCommunicationsService } from './stakeholder-communications.service';
import { AdminCommunicationTypesService } from '../admin/admin-communication-types.service';
import { StakeholderDetailComponent } from './stakeholder-detail/stakeholder-detail.component';

/**
 * Story-Test US-030 „Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten)“
 * (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich das
 * einzige Akzeptanzkriterium mit Frontend-Anteil (Akzeptanzkriterium 3 der Story-Datei) — die
 * Akzeptanzkriterien 1, 2 und 4 sind server- bzw. bereits bestehend-Routing-seitig abgedeckt
 * (`AssessmentController_UserRoleTests.cs` bzw. `roleGuard(['PL','Coreteam','Architect'])` auf der
 * Map-Route in `app.routes.ts`, unverändert seit US-019/US-026). Generische Komponententests bleiben
 * in `stakeholder-detail.component.spec.ts` bzw. `assessment-tabs.component.spec.ts`.
 */
describe('US-030: Server-seitige Sichtbarkeitsregel für Rolle User (Assessment-Daten)', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;

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

  function configure(role: string): void {
    TestBed.resetTestingModule();
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'getStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
    ]);
    stakeholdersServiceSpy.getStakeholder.and.returnValue(of(stakeholder));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
    assessmentsServiceSpy.getAssessments.and.returnValue(of([]));

    const stakeholderCommunicationsServiceSpy = jasmine.createSpyObj('StakeholderCommunicationsService', [
      'getAssignments',
      'assignCommunication',
      'updateAssignment',
      'removeAssignment',
    ]);
    stakeholderCommunicationsServiceSpy.getAssignments.and.returnValue(of([]));

    const adminCommunicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
    adminCommunicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StakeholderDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        { provide: StakeholderCommunicationsService, useValue: stakeholderCommunicationsServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } },
            snapshot: { paramMap: convertToParamMap({ stakeholderId: 'stakeholder-1' }) },
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 3: Assessment-Tabs sind für Rolle User vollständig aus dem DOM entfernt
  // (nicht nur per CSS versteckt), gesteuert über `@if` auf Basis der vom Backend gelieferten Rolle
  // (`ProjectsService.getProject(...).role`) — keine reine CSS-Klasse.
  it('should remove [data-testid="assessment-tabs"] entirely from the DOM for role User', () => {
    configure('User');
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).toBeNull();
    expect(assessmentsServiceSpy.getAssessments).not.toHaveBeenCalled();
  });

  // Akzeptanzkriterium 3 (Regressionscheck, Punkt 4 der Frontend-Aufgabenstellung): für
  // PL/Coreteam/Architect bleibt das bestehende Verhalten aus US-029 unverändert — die Tabs sind
  // weiterhin im DOM vorhanden.
  it('should keep [data-testid="assessment-tabs"] in the DOM for roles PL, Coreteam and Architect', () => {
    for (const role of ['PL', 'Coreteam', 'Architect']) {
      configure(role);
      const fixture = createComponent();

      expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).not.toBeNull();
    }
  });
});
