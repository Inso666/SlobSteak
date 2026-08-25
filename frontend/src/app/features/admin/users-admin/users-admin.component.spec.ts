import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { UsersAdminComponent } from './users-admin.component';

describe('UsersAdminComponent', () => {
  let adminUsersServiceSpy: jasmine.SpyObj<AdminUsersService>;

  const existingUsers: AdminUser[] = [
    {
      id: 'user-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      isSystemAdmin: false,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', [
      'listUsers',
      'createUser',
      'resetPassword',
    ]);
    adminUsersServiceSpy.listUsers.and.returnValue(of(existingUsers));

    await TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AdminUsersService, useValue: adminUsersServiceSpy },
      ],
    }).compileComponents();
  });

  it('should create and load the user list on init', () => {
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    expect(adminUsersServiceSpy.listUsers).toHaveBeenCalled();
    expect(fixture.componentInstance['users']).toEqual(existingUsers);
  });

  it('should not call createUser when the create form is invalid', () => {
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onCreateUser']();

    expect(adminUsersServiceSpy.createUser).not.toHaveBeenCalled();
  });

  it('should create a user and reload the list on valid submit', () => {
    adminUsersServiceSpy.createUser.and.returnValue(of(existingUsers[0]));
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({
      name: 'Neuer Nutzer',
      email: 'neu@example.com',
      initialPassword: 'initial-pass',
    });
    component['onCreateUser']();

    expect(adminUsersServiceSpy.createUser).toHaveBeenCalledWith(
      'Neuer Nutzer',
      'neu@example.com',
      'initial-pass',
    );
    expect(adminUsersServiceSpy.listUsers).toHaveBeenCalledTimes(2);
  });

  it('should show an inline error on the email field when the email is already in use (409)', () => {
    adminUsersServiceSpy.createUser.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({
      name: 'Neuer Nutzer',
      email: 'neu@example.com',
      initialPassword: 'initial-pass',
    });
    component['onCreateUser']();

    expect(component['createErrorMessage']).toBe('Diese E-Mail-Adresse wird bereits verwendet.');
  });

  it('should show a consistent load-error message when the user list fails to load (US-044 Akzeptanzkriterium 4)', () => {
    adminUsersServiceSpy.listUsers.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
  });

  it('should reset a user password and show a success confirmation', () => {
    adminUsersServiceSpy.resetPassword.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onResetPassword'](existingUsers[0]);

    expect(adminUsersServiceSpy.resetPassword).toHaveBeenCalledWith('user-1', jasmine.any(String));
    expect(component['resetPasswordMessage']).toContain('Max Mustermann');
  });

  describe('US-050: diskreter Ladezustand statt fälschlicher Leer-Darstellung', () => {
    // Diese beiden Tests brauchen den echten `HttpClient` (samt `HttpTestingController`) statt der
    // Spy-Provider aus dem äußeren `beforeEach` oben — `resetTestingModule()` verhindert, dass die
    // dort bereits registrierten Spy-Provider (insb. `AdminUsersService`) unbemerkt weiterwirken.
    beforeEach(() => TestBed.resetTestingModule());

    it('shows the loading state before the response arrives, then the users without any further interaction after flush()', () => {
      TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance['usersState']).toBe('loading');
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.user-card').length).toBe(0);

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/admin/users').flush(existingUsers);
      fixture.detectChanges();

      expect(fixture.componentInstance['usersState']).toBe('content');
      const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.user-card');
      expect(cards.length).toBe(existingUsers.length);
      expect(cards[0].textContent).toContain(existingUsers[0].name);

      httpTestingController.verify();
    });

    it('shows the empty state only after the request resolved with an actually empty result, not while it is still pending', () => {
      TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });

      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

      const httpTestingController = TestBed.inject(HttpTestingController);
      httpTestingController.expectOne('/api/v1/admin/users').flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance['usersState']).toBe('empty');
      expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Keine Nutzer angelegt.');

      httpTestingController.verify();
    });
  });
});
