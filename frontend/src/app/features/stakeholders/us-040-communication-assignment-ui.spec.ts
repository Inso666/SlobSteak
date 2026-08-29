import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Stakeholder, StakeholdersService } from './stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { CommunicationAssignment, StakeholderCommunicationsService } from './stakeholder-communications.service';
import { AdminCommunicationType, AdminCommunicationTypesService } from '../admin/admin-communication-types.service';
import { StakeholderDetailComponent } from './stakeholder-detail/stakeholder-detail.component';

/**
 * Story-Test US-040 „Kommunikationszuordnung API + UI auf Stakeholder-Detailseite“ (Frontend-Anteil,
 * QA-Konvention `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich das einzige
 * Akzeptanzkriterium mit Frontend-Anteil (Akzeptanzkriterium 5 der Story-Datei) — die
 * Akzeptanzkriterien 1–4 (Endpunkte, Rollenprüfung) sind Backend-seitig abgedeckt
 * (`US040_CommunicationAssignmentUiTests.cs`). Generische, über die Akzeptanzkriterien
 * hinausgehende Komponententests bleiben in `communication-assignment-panel.component.spec.ts`.
 */
describe('US-040: Kommunikationszuordnung API + UI auf Stakeholder-Detailseite', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;
  let communicationsServiceSpy: jasmine.SpyObj<StakeholderCommunicationsService>;
  let communicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

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

  const existingAssignment: CommunicationAssignment = {
    communicationTypeId: 'type-1',
    communicationTypeName: 'Newsletter',
    communicationTypeIsActive: true,
    frequency: 'Weekly',
    channel: 'Email',
  };

  const activeCatalog: AdminCommunicationType[] = [{ id: 'type-1', name: 'Newsletter', isActive: true, createdAt: new Date().toISOString() }];

  function configure(role: string): void {
    TestBed.resetTestingModule();
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['getStakeholder', 'updateStakeholder', 'getDeletionImpact', 'deleteStakeholder']);
    stakeholdersServiceSpy.getStakeholder.and.returnValue(of(stakeholder));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
    assessmentsServiceSpy.getAssessments.and.returnValue(of([]));

    communicationsServiceSpy = jasmine.createSpyObj('StakeholderCommunicationsService', [
      'getAssignments',
      'assignCommunication',
      'updateAssignment',
      'removeAssignment',
    ]);
    communicationsServiceSpy.getAssignments.and.returnValue(of([existingAssignment]));

    communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of(activeCatalog));

    TestBed.configureTestingModule({
      imports: [StakeholderDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        { provide: StakeholderCommunicationsService, useValue: communicationsServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
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

  // Akzeptanzkriterium 5: die Stakeholder-Detailseite (S4) zeigt im Kommunikations-Bereich die
  // Liste bestehender Zuordnungen, gespeist aus GET .../communications.
  it('shows the list of existing communication assignments in the communication section', () => {
    configure('PL');
    const fixture = createComponent();

    expect(communicationsServiceSpy.getAssignments).toHaveBeenCalledWith('stakeholder-1');
    const communicationSlot = fixture.nativeElement.querySelector('.communication-slot');
    expect(communicationSlot?.textContent).toContain('Newsletter');
  });

  // Akzeptanzkriterium 5: das Auswahlformular besteht aus Katalog-Dropdown (aktive Einträge aus
  // US-037/US-038), Frequenz-Select, Kanal-Select und einem „Hinzufügen“-Button — sichtbar für eine
  // Rolle mit Schreibrecht (PL/Coreteam/Architect, Akzeptanzkriterium 4).
  it('shows the add form with an active-catalog dropdown, frequency select, channel select and an "Hinzufügen" button', () => {
    configure('PL');
    const fixture = createComponent();

    expect(communicationTypesServiceSpy.listActiveCommunicationTypes).toHaveBeenCalled();
    const addForm: HTMLFormElement = fixture.nativeElement.querySelector('.communication-slot .add-form');
    expect(addForm).not.toBeNull();

    const typeSelect = addForm.querySelector<HTMLSelectElement>('#communication-type');
    expect(Array.from(typeSelect?.options ?? []).some((option) => option.textContent?.trim() === 'Newsletter')).toBeTrue();

    expect(addForm.querySelector('#communication-frequency')).not.toBeNull();
    expect(addForm.querySelector('#communication-channel')).not.toBeNull();

    const submitButton = Array.from(addForm.querySelectorAll('button')).find((button) => (button as HTMLButtonElement).type === 'submit');
    expect(submitButton?.textContent).toContain('Kommunikationsart hinzufügen');
  });

  // Regressionscheck zu Akzeptanzkriterium 4: für Rolle User bleibt der Bereich rein lesend — kein
  // Auswahlformular, keine Bearbeiten-/Entfernen-Aktionen, aber weiterhin die Liste sichtbar.
  it('shows the list read-only without the add form for role User', () => {
    configure('User');
    const fixture = createComponent();

    const communicationSlot = fixture.nativeElement.querySelector('.communication-slot');
    expect(communicationSlot?.textContent).toContain('Newsletter');
    expect(communicationSlot?.querySelector('.add-form')).toBeNull();
  });
});
