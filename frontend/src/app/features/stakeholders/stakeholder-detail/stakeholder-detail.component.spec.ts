import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { AssessmentsService } from '../../assessments/assessments.service';
import { StakeholderCommunicationsService } from '../stakeholder-communications.service';
import { AdminCommunicationTypesService } from '../../admin/admin-communication-types.service';
import { StakeholderDetailComponent } from './stakeholder-detail.component';

describe('StakeholderDetailComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService>;
  let stakeholderCommunicationsServiceSpy: jasmine.SpyObj<StakeholderCommunicationsService>;
  let adminCommunicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

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

    stakeholderCommunicationsServiceSpy = jasmine.createSpyObj('StakeholderCommunicationsService', [
      'getAssignments',
      'assignCommunication',
      'updateAssignment',
      'removeAssignment',
    ]);
    stakeholderCommunicationsServiceSpy.getAssignments.and.returnValue(of([]));

    adminCommunicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
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

  beforeEach(() => configure('User'));

  // Akzeptanzkriterium 1: Kopfbereich zeigt Name, Typ, Organisation, „zuletzt geändert von/am“.
  it('should load and expose the stakeholder for the header', () => {
    const fixture = createComponent();

    expect(stakeholdersServiceSpy.getStakeholder).toHaveBeenCalledWith('stakeholder-1');
    expect(fixture.componentInstance['stakeholder']).toEqual(stakeholder);
    expect(fixture.componentInstance['notFound']).toBeFalse();
  });

  // Akzeptanzkriterium 2: Bearbeiten (Stammdatenfelder direkt editierbar) nur für
  // PL/Coreteam/Architect, für User read-only.
  it('should mark canEdit false for role User and true for role PL/Coreteam/Architect', () => {
    let fixture = createComponent();
    expect(fixture.componentInstance['canEdit']).toBeFalse();

    for (const role of ['PL', 'Coreteam', 'Architect']) {
      configure(role);
      fixture = createComponent();
      expect(fixture.componentInstance['canEdit']).toBeTrue();
    }
  });

  // US-071 Akzeptanzkriterium 2/3: für canEdit=true sind Name/Typ als editierbare Felder im
  // Kopfbereich vorhanden, die Stammdaten-Panel-Felder enthalten kein Name-/Typ-Eingabefeld mehr
  // (keine Dopplung, Issue #102).
  it('should render editable name/type/organization fields in the header for role PL and no name/type inputs in the Stammdaten panel', () => {
    configure('PL');
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('input.page-title-input'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('select[data-testid="type-badge"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('input.org-line-input'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-position'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.panel input[formControlName="name"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.panel select[formControlName="type"]'))).toBeNull();
  });

  // US-071 Akzeptanzkriterium 5: Typ-Badge-Pille im Namens-Header, getrennt von der
  // Fließtext-Meta-Zeile — auch für nicht-editierende Nutzer sichtbar.
  it('should render a separate type badge next to the name for role without edit rights', () => {
    const fixture = createComponent();

    const badge = fixture.debugElement.query(By.css('[data-testid="type-badge"]'));
    expect(badge).not.toBeNull();
    expect((badge.nativeElement as HTMLElement).textContent).toContain('Person');
    expect(fixture.debugElement.query(By.css('.page-title-input'))).toBeNull();
  });

  // US-071 Akzeptanzkriterium 6: für Nutzer ohne Bearbeitungsrecht bleiben die Stammdatenfelder
  // reiner, nicht editierbarer Text (kein Rückschritt).
  it('should keep the Stammdaten fields as read-only text for role User', () => {
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('#f-position'))).toBeNull();
    expect(fixture.debugElement.query(By.css('dl.master-data'))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('CTO');
  });

  // US-071 Akzeptanzkriterium 1: Zwei-Spalten-Layout — Stammdaten- und Kommunikations-Panel links,
  // Assessment-Panel rechts.
  it('should place the Stammdaten and Kommunikationszuordnungen panels in the left column and Assessment in the right column', () => {
    configure('PL');
    const fixture = createComponent();

    const leftPanelTitles = fixture.debugElement
      .queryAll(By.css('.col-left .panel-title'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    const rightPanelTitles = fixture.debugElement
      .queryAll(By.css('.col-right .panel-title'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());

    expect(leftPanelTitles).toEqual(['Stammdaten', 'Kommunikationszuordnungen']);
    expect(rightPanelTitles).toEqual(['Assessment']);
  });

  it('should apply the updated stakeholder after the Stammdaten form saved', () => {
    configure('PL');
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const updated: Stakeholder = { ...stakeholder, name: 'Neuer Name' };

    component['onEditUpdated'](updated);

    expect(component['stakeholder']).toEqual(updated);
  });

  // Akzeptanzkriterium 4: CTA „Löschen“ nur für PL/Admin(mit PL-Zuweisung) sichtbar.
  it('should show the delete CTA only for role PL', () => {
    let fixture = createComponent();
    expect(fixture.componentInstance['canDelete']).toBeFalse();

    configure('Coreteam');
    fixture = createComponent();
    expect(fixture.componentInstance['canDelete']).toBeFalse();

    configure('PL');
    fixture = createComponent();
    expect(fixture.componentInstance['canDelete']).toBeTrue();
  });

  it('should navigate back to the stakeholder list after deletion', () => {
    configure('PL');
    const fixture = createComponent();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture.componentInstance['onDeleteClick']();
    fixture.componentInstance['onDeleted']();

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'project-1', 'stakeholders']);
  });

  // US-030 Akzeptanzkriterium 3: Assessment-Tabs sind für Rolle User vollständig aus dem DOM
  // entfernt (nicht nur per CSS versteckt) — für PL/Coreteam/Architect bleibt das bestehende
  // Verhalten aus US-029 unverändert (Regressionscheck).
  it('should remove the assessment tabs from the DOM for role User and keep them for role PL/Coreteam/Architect', () => {
    let fixture = createComponent();
    expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).toBeNull();
    expect(fixture.componentInstance['canViewAssessments']).toBeFalse();

    for (const role of ['PL', 'Coreteam', 'Architect']) {
      configure(role);
      fixture = createComponent();
      expect(fixture.componentInstance['canViewAssessments']).toBeTrue();
      expect(fixture.debugElement.query(By.css('[data-testid="assessment-tabs"]'))).not.toBeNull();
    }
  });

  // Akzeptanzkriterium 5: Aufruf mit der ID eines soft-gelöschten (oder unbekannten) Stakeholders
  // liefert eine „Nicht gefunden“-Ansicht.
  it('should show the not-found state when the stakeholder cannot be loaded (404)', () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'getStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
    ]);
    stakeholdersServiceSpy.getStakeholder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    TestBed.overrideProvider(StakeholdersService, { useValue: stakeholdersServiceSpy });

    const fixture = createComponent();

    expect(fixture.componentInstance['notFound']).toBeTrue();
    expect(fixture.componentInstance['stakeholder']).toBeNull();
  });
});
