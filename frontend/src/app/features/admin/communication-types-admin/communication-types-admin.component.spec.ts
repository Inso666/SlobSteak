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

  it('should not call createCommunicationType when the inline add form is invalid', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).not.toHaveBeenCalled();
  });

  it('should create a communication type via the inline add row and reload the list on valid submit', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(of(existingTypes[0]));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openInlineAdd']();
    component['createForm'].setValue({ name: 'Statusbericht' });
    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).toHaveBeenCalledWith('Statusbericht');
    expect(adminCommunicationTypesServiceSpy.listCommunicationTypes).toHaveBeenCalledTimes(2);
    expect(component['isAddingType']).toBeFalse();
  });

  it('should show an inline duplicate-name error on 409 without collapsing the inline add row', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openInlineAdd']();
    component['createForm'].setValue({ name: 'Newsletter' });
    component['onCreateType']();

    expect(component['createErrorMessage']).toBe('Diese Bezeichnung wird bereits verwendet.');
    expect(component['isAddingType']).toBeTrue();
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

  it('should open the combined edit dialog pre-filled with the current name and active status', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);

    expect(component['editDialogVisible']()).toBeTrue();
    expect(component['editForm'].getRawValue()).toEqual({ name: 'Newsletter', active: true });
  });

  it('should rename a communication type via the combined edit dialog and reload the list when only the name changed', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...existingTypes[0], name: 'Rundbrief' }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Rundbrief', active: true });
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
    expect(adminCommunicationTypesServiceSpy.setActive).not.toHaveBeenCalled();
    expect(adminCommunicationTypesServiceSpy.listCommunicationTypes).toHaveBeenCalledTimes(2);
  });

  it('should toggle a communication type from active to inactive via the combined edit dialog when only the active status changed', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...existingTypes[0], isActive: false }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Newsletter', active: false });
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).not.toHaveBeenCalled();
  });

  it('should toggle a communication type from inactive to active via the combined edit dialog', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...existingTypes[1], isActive: true }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[1]);
    component['editForm'].setValue({ name: 'Pressemitteilung', active: true });
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-2', true);
  });

  it('should rename and toggle sequentially when both name and active status changed in the combined edit dialog', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...existingTypes[0], name: 'Rundbrief' }));
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...existingTypes[0], name: 'Rundbrief', isActive: false }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Rundbrief', active: false });
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
    expect(component['editDialogVisible']()).toBeFalse();
  });

  it('should not call setActive when neither name nor active status changed in the combined edit dialog', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Newsletter', active: true });
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).not.toHaveBeenCalled();
    expect(adminCommunicationTypesServiceSpy.setActive).not.toHaveBeenCalled();
    expect(component['editDialogVisible']()).toBeFalse();
  });

  it('should show an inline duplicate-name error on rename 409 without closing the combined edit dialog', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Pressemitteilung', active: true });
    component['onSubmitEdit']();

    expect(component['editErrorMessage']).toBe('Diese Bezeichnung wird bereits verwendet.');
    expect(component['editDialogVisible']()).toBeTrue();
  });

  it('should not call onSubmitEdit a second time while a save request is still pending', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEditDialog'](existingTypes[0]);
    component['editForm'].setValue({ name: 'Rundbrief', active: true });
    component['isSavingEdit'] = true;
    component['onSubmitEdit']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).not.toHaveBeenCalled();
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
      expect(fixture.nativeElement.querySelectorAll('.catalog-row').length).toBe(0);

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/communication-types').flush(existingTypes);
      fixture.detectChanges();

      expect(fixture.componentInstance['typesState']).toBe('content');
      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catalog-row');
      expect(rows.length).toBe(existingTypes.length);
      expect(rows[0].textContent).toContain(existingTypes[0].name);

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
