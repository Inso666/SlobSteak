import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { EditStakeholderFormComponent } from './edit-stakeholder-form.component';

describe('EditStakeholderFormComponent', () => {
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
    deletedAt: null,
    deletedByName: null,
  };

  beforeEach(async () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder', 'updateStakeholder']);

    await TestBed.configureTestingModule({
      imports: [EditStakeholderFormComponent],
      providers: [{ provide: StakeholdersService, useValue: stakeholdersServiceSpy }],
    }).compileComponents();
  });

  function createComponent(): ReturnType<typeof TestBed.createComponent<EditStakeholderFormComponent>> {
    const fixture = TestBed.createComponent(EditStakeholderFormComponent);
    fixture.componentRef.setInput('stakeholder', stakeholder);
    fixture.detectChanges();
    return fixture;
  }

  it('should pre-fill the form from the given stakeholder (Akzeptanzkriterium 1)', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['form'].getRawValue()).toEqual(
      jasmine.objectContaining({ name: 'Max Mustermann', organization: 'ACME GmbH', position: 'CTO' }),
    );
  });

  it('should display who last modified the stakeholder and when (Akzeptanzkriterium 4)', () => {
    const fixture = createComponent();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Anna Admin');
  });

  it('should hide the position field for type Organization', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['isOrganization']).toBeFalse();
    component['form'].controls.type.setValue('Organization');
    expect(component['isOrganization']).toBeTrue();
  });

  it('should call updateStakeholder with the current form values on submit', () => {
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(of({ ...stakeholder, name: 'Neuer Name' }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['form'].controls.name.setValue('Neuer Name');
    component['onSubmit']();

    expect(stakeholdersServiceSpy.updateStakeholder).toHaveBeenCalledWith(
      'stakeholder-1',
      jasmine.objectContaining({ name: 'Neuer Name' }),
    );
  });

  it('should emit updated on success', () => {
    const updatedStakeholder = { ...stakeholder, name: 'Neuer Name' };
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(of(updatedStakeholder));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.updated, 'emit');

    component['onSubmit']();

    expect(emitSpy).toHaveBeenCalledWith(updatedStakeholder);
  });

  it('should emit cancelled when cancel is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.cancelled, 'emit');

    component['onCancel']();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should show an error when the stakeholder was already deleted (404)', () => {
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onSubmit']();

    expect(component['errorMessage']).toContain('gelöscht');
  });
});
