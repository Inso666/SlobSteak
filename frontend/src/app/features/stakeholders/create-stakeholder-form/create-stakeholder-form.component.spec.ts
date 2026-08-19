import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { CreateStakeholderFormComponent } from './create-stakeholder-form.component';

describe('CreateStakeholderFormComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

  const createdStakeholder: Stakeholder = {
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
    similarStakeholderWarning: null,
  };

  beforeEach(async () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
    stakeholdersServiceSpy.createStakeholder.and.returnValue(of(createdStakeholder));

    await TestBed.configureTestingModule({
      imports: [CreateStakeholderFormComponent],
      providers: [
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    }).compileComponents();
  });

  it('should not submit when the form is invalid (Akzeptanzkriterium 5)', () => {
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.name.setValue('');

    fixture.componentInstance['onSubmit']();

    expect(stakeholdersServiceSpy.createStakeholder).not.toHaveBeenCalled();
  });

  it('should disable saving when the email is invalid (Akzeptanzkriterium 5)', () => {
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: 'keine-email',
      phone: '',
      locationDepartment: '',
      description: '',
    });

    expect(component['form'].invalid).toBeTrue();
  });

  it('should hide the position field for type Organization (Akzeptanzkriterium 5)', () => {
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['isOrganization']).toBeFalse();
    component['form'].controls.type.setValue('Organization');
    expect(component['isOrganization']).toBeTrue();
  });

  it('should submit with the projectId resolved from the parent route', () => {
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: '',
      phone: '',
      locationDepartment: '',
      description: '',
    });
    component['onSubmit']();

    expect(stakeholdersServiceSpy.createStakeholder).toHaveBeenCalledWith(
      'project-1',
      jasmine.objectContaining({ name: 'Max Mustermann', type: 'Person' }),
    );
  });

  it('should add the created stakeholder to the session list on success (Akzeptanzkriterium 6)', () => {
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: '',
      phone: '',
      locationDepartment: '',
      description: '',
    });
    component['onSubmit']();

    expect(component['createdStakeholders']).toEqual([createdStakeholder]);
  });

  it('should show the similar-stakeholder warning without blocking creation (Akzeptanzkriterium 4)', () => {
    stakeholdersServiceSpy.createStakeholder.and.returnValue(
      of({ ...createdStakeholder, similarStakeholderWarning: { id: 'existing-1', name: 'Max Mustermann' } }),
    );
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: '',
      phone: '',
      locationDepartment: '',
      description: '',
    });
    component['onSubmit']();

    expect(component['lastSimilarWarning']).toContain('Max Mustermann');
    expect(component['createdStakeholders'].length).toBe(1);
  });

  it('should show an inline error when the name is rejected by the server', () => {
    stakeholdersServiceSpy.createStakeholder.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'NAME_REQUIRED' } })),
    );
    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: '',
      phone: '',
      locationDepartment: '',
      description: '',
    });
    component['onSubmit']();

    expect(component['errorMessage']).toBe('Der Name darf nicht leer sein.');
  });
});
