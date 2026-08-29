import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminCommunicationType, AdminCommunicationTypesService } from '../admin-communication-types.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { CommunicationTypesAdminComponent } from './communication-types-admin.component';

describe('CommunicationTypesAdminComponent', () => {
  let adminCommunicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

  const existingTypes: AdminCommunicationType[] = [
    { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: new Date().toISOString() },
    { id: 'type-2', name: 'Pressemitteilung', isActive: false, createdAt: new Date().toISOString() },
  ];

  beforeEach(async () => {
    adminCommunicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', [
      'listCommunicationTypes',
      'createCommunicationType',
      'renameCommunicationType',
      'setActive',
    ]);
    adminCommunicationTypesServiceSpy.listCommunicationTypes.and.returnValue(of(existingTypes));

    await TestBed.configureTestingModule({
      imports: [CommunicationTypesAdminComponent],
      providers: [provideRouter([]), { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy }],
    }).compileComponents();
  });

  it('should create and load the communication type list on init', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    expect(adminCommunicationTypesServiceSpy.listCommunicationTypes).toHaveBeenCalled();
    expect(fixture.componentInstance['communicationTypes']).toEqual(existingTypes);
  });

  it('should not call createCommunicationType when the create form is invalid', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).not.toHaveBeenCalled();
  });

  it('should create a communication type and reload the list on valid submit', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(of(existingTypes[0]));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({ name: 'Statusbericht' });
    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).toHaveBeenCalledWith('Statusbericht');
    expect(adminCommunicationTypesServiceSpy.listCommunicationTypes).toHaveBeenCalledTimes(2);
  });

  it('should show an inline duplicate-name error on 409 without closing the create dialog', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openCreateDialog']();
    component['createForm'].setValue({ name: 'Newsletter' });
    component['onCreateType']();

    expect(component['createErrorMessage']).toBe('Diese Bezeichnung wird bereits verwendet.');
    expect(component['createDialogVisible']()).toBeTrue();
  });

  it('should not call createCommunicationType a second time while a create request is still pending', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(of(existingTypes[0]));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({ name: 'Statusbericht' });
    component['isCreatingType'] = true;
    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).not.toHaveBeenCalled();
  });

  it('should open the rename dialog pre-filled with the current name', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openRenameDialog'](existingTypes[0]);

    expect(component['renameDialogVisible']()).toBeTrue();
    expect(component['renameForm'].getRawValue().name).toBe('Newsletter');
  });

  it('should rename a communication type and reload the list on valid submit', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...existingTypes[0], name: 'Rundbrief' }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openRenameDialog'](existingTypes[0]);
    component['renameForm'].setValue({ name: 'Rundbrief' });
    component['onRenameType']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
    expect(adminCommunicationTypesServiceSpy.listCommunicationTypes).toHaveBeenCalledTimes(2);
  });

  it('should show an inline duplicate-name error on rename 409 without closing the dialog', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openRenameDialog'](existingTypes[0]);
    component['renameForm'].setValue({ name: 'Pressemitteilung' });
    component['onRenameType']();

    expect(component['renameErrorMessage']).toBe('Diese Bezeichnung wird bereits verwendet.');
    expect(component['renameDialogVisible']()).toBeTrue();
  });

  it('should toggle a communication type from active to inactive via setActive(false)', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...existingTypes[0], isActive: false }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onToggleActive'](existingTypes[0]);

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
  });

  it('should toggle a communication type from inactive to active via setActive(true)', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...existingTypes[1], isActive: true }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onToggleActive'](existingTypes[1]);

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-2', true);
  });

  it('should not call setActive a second time while a toggle request for that row is still pending', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['togglingIds'].add('type-1');
    component['onToggleActive'](existingTypes[0]);

    expect(adminCommunicationTypesServiceSpy.setActive).not.toHaveBeenCalled();
  });

  it('should show a consistent load-error message when the list fails to load (US-044 Akzeptanzkriterium 4)', () => {
    adminCommunicationTypesServiceSpy.listCommunicationTypes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  describe('US-050: diskreter Ladezustand statt fälschlicher Leer-Darstellung', () => {
    // Diese Tests brauchen den echten `HttpClient` (samt `HttpTestingController`) statt der
    // Spy-Provider aus dem äußeren `beforeEach` oben — `resetTestingModule()` verhindert, dass die
    // dort bereits registrierten Spy-Provider (insb. `AdminCommunicationTypesService`) unbemerkt
    // weiterwirken.
    beforeEach(() => TestBed.resetTestingModule());

    it('shows the loading state before the response arrives, then the entries without any further interaction after flush()', () => {
      TestBed.configureTestingModule({
        imports: [CommunicationTypesAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['typesState']).toBe('loading');
      expect(fixture.nativeElement.querySelectorAll('.communication-type-card').length).toBe(0);

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/communication-types').flush(existingTypes);
      fixture.detectChanges();

      expect(fixture.componentInstance['typesState']).toBe('content');
      const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.communication-type-card');
      expect(cards.length).toBe(existingTypes.length);
      expect(cards[0].textContent).toContain(existingTypes[0].name);

      httpTestingController.verify();
    });

    it('shows the empty state only after the request resolved with an actually empty result, not while it is still pending', () => {
      TestBed.configureTestingModule({
        imports: [CommunicationTypesAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/communication-types').flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance['typesState']).toBe('empty');
      expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Es sind noch keine Kommunikationsarten angelegt.');

      httpTestingController.verify();
    });
  });
});
