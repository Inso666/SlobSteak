import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { StakeholderListComponent } from './stakeholder-list.component';

describe('StakeholderListComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

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
  };

  beforeEach(async () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'listStakeholders',
      'createStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
    ]);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));

    await TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();
    return fixture;
  }

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
});
