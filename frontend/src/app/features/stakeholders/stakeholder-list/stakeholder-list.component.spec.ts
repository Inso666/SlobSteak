import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { StakeholderListComponent } from './stakeholder-list.component';

describe('StakeholderListComponent', () => {
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

  const deletedStakeholder: Stakeholder = {
    ...stakeholder,
    id: 'stakeholder-2',
    name: 'Gelöschter Stakeholder',
    deletedAt: '2026-08-19T12:00:00Z',
    deletedByName: 'Peter PL',
  };

  function configure(role: string): void {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'listStakeholders',
      'createStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
      'restoreStakeholder',
    ]);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => configure('User'));

  it('should resolve the projectId and load stakeholders on init (Akzeptanzkriterium 1)', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['projectId']).toBe('project-1');
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { search: undefined, type: undefined });
    expect(fixture.componentInstance['stakeholders']).toEqual([stakeholder]);
  });

  it('should reload with the search filter after a debounce (Akzeptanzkriterium 2)', (done) => {
    const fixture = createComponent();
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    fixture.componentInstance['filterForm'].controls.search.setValue('mustermann');

    setTimeout(() => {
      expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { search: 'mustermann', type: undefined });
      done();
    }, 350);
  });

  it('should reload with the type filter after a debounce', (done) => {
    const fixture = createComponent();
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    fixture.componentInstance['filterForm'].controls.type.setValue('Organization');

    setTimeout(() => {
      expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { search: undefined, type: 'Organization' });
      done();
    }, 350);
  });

  it('should show a consistent load-error message when the stakeholder list fails to load (US-044 Akzeptanzkriterium 4)', () => {
    stakeholdersServiceSpy.listStakeholders.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = createComponent();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  it('should reload the list when a stakeholder is created', () => {
    const fixture = createComponent();
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    fixture.componentInstance['onCreated']();

    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalled();
  });

  it('should set and clear the editing stakeholder', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onEdit'](stakeholder);
    expect(component['editingStakeholder']).toEqual(stakeholder);

    component['onEditCancelled']();
    expect(component['editingStakeholder']).toBeNull();
  });

  it('should reload the list and stop editing when a stakeholder is updated', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['editingStakeholder'] = stakeholder;
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    component['onEditUpdated']();

    expect(component['editingStakeholder']).toBeNull();
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalled();
  });

  it('should set and clear the deleting stakeholder, closing an open edit form', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['editingStakeholder'] = stakeholder;

    component['onDeleteClick'](stakeholder);
    expect(component['deletingStakeholder']).toEqual(stakeholder);
    expect(component['editingStakeholder']).toBeNull();

    component['onDeleteCancelled']();
    expect(component['deletingStakeholder']).toBeNull();
  });

  it('should reload the list and stop deleting when a stakeholder is deleted', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component['deletingStakeholder'] = stakeholder;
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    component['onDeleted']();

    expect(component['deletingStakeholder']).toBeNull();
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalled();
  });

  // US-024 Akzeptanzkriterium 3: Umschalter „Gelöschte anzeigen“ ist nur für Rolle PL sichtbar.
  it('should hide the "Gelöschte anzeigen" toggle for role User', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['showDeletedToggle']).toBeFalse();
  });

  it('should show the "Gelöschte anzeigen" toggle for role PL and load the deleted view when activated', () => {
    configure('PL');
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([deletedStakeholder]));
    const fixture = createComponent();

    expect(fixture.componentInstance['showDeletedToggle']).toBeTrue();

    stakeholdersServiceSpy.listStakeholders.calls.reset();
    fixture.componentInstance['onToggleDeleted'](true);

    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { deleted: true });
    expect(fixture.componentInstance['stakeholders']).toEqual([deletedStakeholder]);
  });

  // US-024 Akzeptanzkriterium 4: Restore-Button aktualisiert die Liste ohne vollständigen Reload.
  it('should restore a stakeholder and reload the (deleted) list', () => {
    configure('PL');
    const fixture = createComponent();
    fixture.componentInstance['showDeleted'] = true;
    stakeholdersServiceSpy.restoreStakeholder.and.returnValue(of(undefined));
    stakeholdersServiceSpy.listStakeholders.calls.reset();

    fixture.componentInstance['onRestore'](deletedStakeholder);

    expect(stakeholdersServiceSpy.restoreStakeholder).toHaveBeenCalledWith('stakeholder-2');
    expect(stakeholdersServiceSpy.listStakeholders).toHaveBeenCalledWith('project-1', { deleted: true });
  });
});
