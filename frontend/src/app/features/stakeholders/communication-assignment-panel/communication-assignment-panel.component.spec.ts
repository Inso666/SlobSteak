import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminCommunicationType, AdminCommunicationTypesService } from '../../admin/admin-communication-types.service';
import { CommunicationAssignment, StakeholderCommunicationsService } from '../stakeholder-communications.service';
import { CommunicationAssignmentPanelComponent } from './communication-assignment-panel.component';

describe('CommunicationAssignmentPanelComponent', () => {
  let communicationsServiceSpy: jasmine.SpyObj<StakeholderCommunicationsService>;
  let communicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

  const existingAssignment: CommunicationAssignment = {
    communicationTypeId: 'type-1',
    communicationTypeName: 'Newsletter',
    communicationTypeIsActive: true,
    frequency: 'Weekly',
    channel: 'Email',
  };

  const activeCatalog: AdminCommunicationType[] = [
    { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: new Date().toISOString() },
    { id: 'type-2', name: 'Statusbericht', isActive: true, createdAt: new Date().toISOString() },
  ];

  function configure(): void {
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
      imports: [CommunicationAssignmentPanelComponent],
      providers: [
        { provide: StakeholderCommunicationsService, useValue: communicationsServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
      ],
    });
  }

  function createComponent(currentUserRole: string | null) {
    const fixture = TestBed.createComponent(CommunicationAssignmentPanelComponent);
    fixture.componentInstance.stakeholderId = 'stakeholder-1';
    fixture.componentInstance.currentUserRole = currentUserRole;
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => configure());

  it('should load the existing assignments and the active catalog on init', () => {
    const fixture = createComponent('PL');

    expect(communicationsServiceSpy.getAssignments).toHaveBeenCalledWith('stakeholder-1');
    expect(communicationTypesServiceSpy.listActiveCommunicationTypes).toHaveBeenCalled();
    expect(fixture.componentInstance['assignments']).toEqual([existingAssignment]);
    expect(fixture.componentInstance['catalog']).toEqual(activeCatalog);
  });

  it('should show the panel for role PL/Coreteam/Architect with the add form visible', () => {
    for (const role of ['PL', 'Coreteam', 'Architect']) {
      const fixture = createComponent(role);
      expect(fixture.componentInstance['canManage']).toBeTrue();
      expect(fixture.nativeElement.querySelector('.add-form')).not.toBeNull();
    }
  });

  it('should hide the add form and row actions for role User, while keeping the list read-only', () => {
    const fixture = createComponent('User');

    expect(fixture.componentInstance['canManage']).toBeFalse();
    expect(fixture.nativeElement.querySelector('.add-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.communication-assignment-actions')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Newsletter');
  });

  it('should not call assignCommunication when the add form is invalid', () => {
    const fixture = createComponent('PL');
    fixture.componentInstance['addForm'].patchValue({ communicationTypeId: '' });

    fixture.componentInstance['onAdd']();

    expect(communicationsServiceSpy.assignCommunication).not.toHaveBeenCalled();
  });

  it('should assign a communication type and reload the list on valid submit', () => {
    communicationsServiceSpy.assignCommunication.and.returnValue(of({ ...existingAssignment, communicationTypeId: 'type-2' }));
    const fixture = createComponent('PL');
    fixture.componentInstance['addForm'].setValue({ communicationTypeId: 'type-2', frequency: 'Monthly', channel: 'Meeting' });

    fixture.componentInstance['onAdd']();

    expect(communicationsServiceSpy.assignCommunication).toHaveBeenCalledWith('stakeholder-1', 'type-2', { frequency: 'Monthly', channel: 'Meeting' });
    expect(communicationsServiceSpy.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should show an inline conflict message on 409 without clearing the form', () => {
    communicationsServiceSpy.assignCommunication.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = createComponent('PL');
    fixture.componentInstance['addForm'].setValue({ communicationTypeId: 'type-2', frequency: 'Weekly', channel: 'Email' });

    fixture.componentInstance['onAdd']();

    expect(fixture.componentInstance['addErrorMessage']).toBe('Diese Kommunikationsart ist diesem Stakeholder bereits zugeordnet.');
    expect(fixture.componentInstance['addForm'].getRawValue().communicationTypeId).toBe('type-2');
  });

  it('should not call assignCommunication a second time while a request is still pending', () => {
    const fixture = createComponent('PL');
    fixture.componentInstance['addForm'].setValue({ communicationTypeId: 'type-2', frequency: 'Weekly', channel: 'Email' });
    fixture.componentInstance['isAdding'] = true;

    fixture.componentInstance['onAdd']();

    expect(communicationsServiceSpy.assignCommunication).not.toHaveBeenCalled();
  });

  it('should update an assignment via onSaveEdit and reload the list', () => {
    communicationsServiceSpy.updateAssignment.and.returnValue(of({ ...existingAssignment, frequency: 'Quarterly' }));
    const fixture = createComponent('PL');
    const component = fixture.componentInstance;

    component['onStartEdit'](existingAssignment);
    component['editForm'].setValue({ frequency: 'Quarterly', channel: 'Report' });
    component['onSaveEdit']();

    expect(communicationsServiceSpy.updateAssignment).toHaveBeenCalledWith('stakeholder-1', 'type-1', { frequency: 'Quarterly', channel: 'Report' });
    expect(component['editingCommunicationTypeId']).toBeNull();
  });

  it('should remove an assignment via onRemove and reload the list', () => {
    communicationsServiceSpy.removeAssignment.and.returnValue(of(undefined));
    const fixture = createComponent('PL');

    fixture.componentInstance['onRemove'](existingAssignment);

    expect(communicationsServiceSpy.removeAssignment).toHaveBeenCalledWith('stakeholder-1', 'type-1');
    expect(communicationsServiceSpy.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should not call removeAssignment a second time while a removal for that row is still pending', () => {
    const fixture = createComponent('PL');
    fixture.componentInstance['removingIds'].add('type-1');

    fixture.componentInstance['onRemove'](existingAssignment);

    expect(communicationsServiceSpy.removeAssignment).not.toHaveBeenCalled();
  });

  it('should show a load error message when the assignment list fails to load', () => {
    communicationsServiceSpy.getAssignments.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = createComponent('PL');

    expect(fixture.componentInstance['loadError']).not.toBeNull();
    expect(fixture.componentInstance['assignmentsState']).toBe('error');
  });
});
