import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminUser, AdminUsersService } from '../admin-users.service';
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
    adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
    adminUsersServiceSpy.listUsers.and.returnValue(of(existingUsers));

    await TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [{ provide: AdminUsersService, useValue: adminUsersServiceSpy }],
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

    component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });
    component['onCreateUser']();

    expect(adminUsersServiceSpy.createUser).toHaveBeenCalledWith('Neuer Nutzer', 'neu@example.com', 'initial-pass');
    expect(adminUsersServiceSpy.listUsers).toHaveBeenCalledTimes(2);
  });

  it('should show an inline error on the email field when the email is already in use (409)', () => {
    adminUsersServiceSpy.createUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });
    component['onCreateUser']();

    expect(component['createErrorMessage']).toBe('Diese E-Mail-Adresse wird bereits verwendet.');
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
});
