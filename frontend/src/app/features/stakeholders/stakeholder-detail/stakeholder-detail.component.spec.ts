import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { StakeholderDetailComponent } from './stakeholder-detail.component';

describe('StakeholderDetailComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

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

    TestBed.configureTestingModule({
      imports: [StakeholderDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
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

  // Akzeptanzkriterium 2: Bearbeiten nur für PL/Coreteam/Architect, für User read-only.
  it('should hide edit for role User and show it for role PL/Coreteam/Architect', () => {
    let fixture = createComponent();
    expect(fixture.componentInstance['canEdit']).toBeFalse();

    for (const role of ['PL', 'Coreteam', 'Architect']) {
      configure(role);
      fixture = createComponent();
      expect(fixture.componentInstance['canEdit']).toBeTrue();
    }
  });

  it('should toggle the edit form and apply the updated stakeholder', () => {
    configure('PL');
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const updated: Stakeholder = { ...stakeholder, name: 'Neuer Name' };

    component['onEditClick']();
    expect(component['editing']).toBeTrue();

    component['onEditUpdated'](updated);
    expect(component['editing']).toBeFalse();
    expect(component['stakeholder']).toEqual(updated);
  });

  it('should cancel editing without changing the stakeholder', () => {
    configure('PL');
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onEditClick']();
    component['onEditCancelled']();

    expect(component['editing']).toBeFalse();
    expect(component['stakeholder']).toEqual(stakeholder);
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
