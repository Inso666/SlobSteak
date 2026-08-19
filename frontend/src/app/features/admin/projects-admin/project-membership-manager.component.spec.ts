import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { AdminProjectMembership, AdminProjectsService } from '../admin-projects.service';
import { ProjectMembershipManagerComponent } from './project-membership-manager.component';

describe('ProjectMembershipManagerComponent', () => {
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;
  let adminUsersServiceSpy: jasmine.SpyObj<AdminUsersService>;

  const allUsers: AdminUser[] = [
    { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
    { id: 'user-2', name: 'Erika Musterfrau', email: 'erika@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
  ];

  const existingMemberships: AdminProjectMembership[] = [{ userId: 'user-1', userName: 'Max Mustermann', userEmail: 'max@example.com', role: 'PL' }];

  beforeEach(async () => {
    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', [
      'listProjects',
      'createProject',
      'listMemberships',
      'assignMember',
      'changeMemberRole',
      'removeMember',
    ]);
    adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
    adminProjectsServiceSpy.listMemberships.and.returnValue(of(existingMemberships));
    adminUsersServiceSpy.listUsers.and.returnValue(of(allUsers));

    await TestBed.configureTestingModule({
      imports: [ProjectMembershipManagerComponent],
      providers: [
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        { provide: AdminUsersService, useValue: adminUsersServiceSpy },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    return fixture;
  }

  it('should load memberships and all users on init', () => {
    const fixture = createComponent();

    expect(adminProjectsServiceSpy.listMemberships).toHaveBeenCalledWith('project-1');
    expect(fixture.componentInstance['memberships']).toEqual(existingMemberships);
  });

  it('should only offer users that are not already members in the assignable list', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance.assignableUsers).toEqual([allUsers[1]]);
  });

  it('should assign a member and reload the membership list', () => {
    adminProjectsServiceSpy.assignMember.and.returnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['assignForm'].setValue({ userId: 'user-2', role: 'Coreteam' });
    component['onAssignMember']();

    expect(adminProjectsServiceSpy.assignMember).toHaveBeenCalledWith('project-1', 'user-2', 'Coreteam');
    expect(adminProjectsServiceSpy.listMemberships).toHaveBeenCalledTimes(2);
  });

  it('should change a member role and reload the membership list', () => {
    adminProjectsServiceSpy.changeMemberRole.and.returnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onChangeRole'](existingMemberships[0], 'Architect');

    expect(adminProjectsServiceSpy.changeMemberRole).toHaveBeenCalledWith('project-1', 'user-1', 'Architect');
    expect(adminProjectsServiceSpy.listMemberships).toHaveBeenCalledTimes(2);
  });

  it('should not remove a member when the confirmation dialog is declined', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onRemoveMember'](existingMemberships[0]);

    expect(adminProjectsServiceSpy.removeMember).not.toHaveBeenCalled();
  });

  it('should remove a member and reload the membership list when confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    adminProjectsServiceSpy.removeMember.and.returnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onRemoveMember'](existingMemberships[0]);

    expect(adminProjectsServiceSpy.removeMember).toHaveBeenCalledWith('project-1', 'user-1');
    expect(adminProjectsServiceSpy.listMemberships).toHaveBeenCalledTimes(2);
  });

  it('should show an error message when removal fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    adminProjectsServiceSpy.removeMember.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onRemoveMember'](existingMemberships[0]);

    expect(component['errorMessage']).toContain('Max Mustermann');
  });
});
