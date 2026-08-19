import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholderDeletionImpact, StakeholdersService } from '../stakeholders.service';
import { DeleteStakeholderDialogComponent } from './delete-stakeholder-dialog.component';

describe('DeleteStakeholderDialogComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

  const stakeholder: Stakeholder = {
    id: 'stakeholder-1',
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
  };

  const impact: StakeholderDeletionImpact = { assessmentCount: 2, communicationAssignmentCount: 1 };

  beforeEach(async () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'createStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
    ]);
    stakeholdersServiceSpy.getDeletionImpact.and.returnValue(of(impact));

    await TestBed.configureTestingModule({
      imports: [DeleteStakeholderDialogComponent],
      providers: [{ provide: StakeholdersService, useValue: stakeholdersServiceSpy }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(DeleteStakeholderDialogComponent);
    fixture.componentRef.setInput('stakeholder', stakeholder);
    fixture.detectChanges();
    return fixture;
  }

  it('should load the deletion impact on init (Akzeptanzkriterium 2)', () => {
    const fixture = createComponent();

    expect(stakeholdersServiceSpy.getDeletionImpact).toHaveBeenCalledWith('stakeholder-1');
    expect(fixture.componentInstance['impact']).toEqual(impact);
  });

  it('should display the impact counts (Akzeptanzkriterium 6)', () => {
    const fixture = createComponent();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('2');
    expect(text).toContain('1');
  });

  it('should call deleteStakeholder and emit deleted on confirm', () => {
    stakeholdersServiceSpy.deleteStakeholder.and.returnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.deleted, 'emit');

    component['onConfirm']();

    expect(stakeholdersServiceSpy.deleteStakeholder).toHaveBeenCalledWith('stakeholder-1');
    expect(emitSpy).toHaveBeenCalledWith('stakeholder-1');
  });

  it('should emit cancelled when cancel is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.cancelled, 'emit');

    component['onCancel']();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should show an error message when deletion fails', () => {
    stakeholdersServiceSpy.deleteStakeholder.and.returnValue(throwError(() => new Error('fail')));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onConfirm']();

    expect(component['errorMessage']).toContain('nicht gelöscht');
  });

  it('should show an error message when loading the impact fails', () => {
    stakeholdersServiceSpy.getDeletionImpact.and.returnValue(throwError(() => new Error('fail')));

    const fixture = createComponent();

    expect(fixture.componentInstance['errorMessage']).toContain('nicht ermittelt');
  });
});
