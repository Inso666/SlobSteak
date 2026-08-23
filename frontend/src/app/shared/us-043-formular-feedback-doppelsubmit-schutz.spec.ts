import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../features/stakeholders/stakeholders.service';
import { CreateStakeholderFormComponent } from '../features/stakeholders/create-stakeholder-form/create-stakeholder-form.component';
import { EditStakeholderFormComponent } from '../features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component';
import { DeleteStakeholderDialogComponent } from '../features/stakeholders/delete-stakeholder-dialog/delete-stakeholder-dialog.component';
import { StakeholderListComponent } from '../features/stakeholders/stakeholder-list/stakeholder-list.component';
import { ProjectsService, ProjectOverviewItem } from '../features/projects/projects.service';
import { AssessmentRole, AssessmentsService } from '../features/assessments/assessments.service';
import { AssessmentTabsComponent } from '../features/assessments/assessment-tabs/assessment-tabs.component';
import { AdminUser, AdminUsersService } from '../features/admin/admin-users.service';
import { UsersAdminComponent } from '../features/admin/users-admin/users-admin.component';
import { AdminProject, AdminProjectMembership, AdminProjectsService } from '../features/admin/admin-projects.service';
import { ProjectsAdminComponent } from '../features/admin/projects-admin/projects-admin.component';
import { ProjectMembershipManagerComponent } from '../features/admin/projects-admin/project-membership-manager.component';
import { LoginPageComponent } from '../features/auth/login-page/login-page.component';
import { AuthService } from '../features/auth/auth.service';
import { PasswordChangeModalComponent } from '../features/auth/password-change-modal/password-change-modal.component';

/**
 * Story-Test US-043 (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1): prüft
 * ausschließlich die in der Story-Datei gelisteten Akzeptanzkriterien, ein Testblock je Kriterium,
 * in derselben Reihenfolge wie im Story-Dokument. Generische Komponenten-Unit-Tests bleiben in den
 * jeweiligen `*.component.spec.ts`-Dateien.
 */
describe('US-043 Einheitliches Verarbeitungs-Feedback & Doppel-Submit-Schutz', () => {
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
    deletedAt: null,
    deletedByName: null,
  };

  const deletedStakeholder: Stakeholder = { ...stakeholder, id: 'stakeholder-2', deletedAt: '2026-08-20T10:00:00Z', deletedByName: 'Peter PL' };

  function fillCreateForm(component: CreateStakeholderFormComponent): void {
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
  }

  // ---------------------------------------------------------------------------------------------
  // Akzeptanzkriterium 1: isSubmitting-Flag (oder gleichwertiges Signal) ab Request-Start `true`.
  // ---------------------------------------------------------------------------------------------
  describe('Akzeptanzkriterium 1: isSubmitting-Flag ab Request-Start', () => {
    it('CreateStakeholderFormComponent (Stakeholder anlegen) setzt isSubmitting sofort und nach Antwort wieder zurück', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
      const subject = new Subject<Stakeholder>();
      spy.createStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [CreateStakeholderFormComponent],
        providers: [
          { provide: StakeholdersService, useValue: spy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillCreateForm(component);

      expect(component['isSubmitting']).toBeFalse();
      component['onSubmit']();
      expect(component['isSubmitting']).toBeTrue();

      subject.next(stakeholder);
      expect(component['isSubmitting']).toBeFalse();
    });

    it('EditStakeholderFormComponent (Stakeholder bearbeiten) setzt isSubmitting sofort und nach Antwort wieder zurück', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['updateStakeholder']);
      const subject = new Subject<Stakeholder>();
      spy.updateStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({ imports: [EditStakeholderFormComponent], providers: [{ provide: StakeholdersService, useValue: spy }] });
      const fixture = TestBed.createComponent(EditStakeholderFormComponent);
      fixture.componentRef.setInput('stakeholder', stakeholder);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component['isSubmitting']).toBeFalse();
      component['onSubmit']();
      expect(component['isSubmitting']).toBeTrue();

      subject.next(stakeholder);
      expect(component['isSubmitting']).toBeFalse();
    });

    it('DeleteStakeholderDialogComponent (Löschen bestätigen) setzt isSubmitting sofort und nach Antwort wieder zurück', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['getDeletionImpact', 'deleteStakeholder']);
      spy.getDeletionImpact.and.returnValue(of({ assessmentCount: 0, communicationAssignmentCount: 0 }));
      const subject = new Subject<void>();
      spy.deleteStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({ imports: [DeleteStakeholderDialogComponent], providers: [{ provide: StakeholdersService, useValue: spy }] });
      const fixture = TestBed.createComponent(DeleteStakeholderDialogComponent);
      fixture.componentRef.setInput('stakeholder', stakeholder);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component['isSubmitting']).toBeFalse();
      component['onConfirm']();
      expect(component['isSubmitting']).toBeTrue();

      subject.next();
      expect(component['isSubmitting']).toBeFalse();
    });

    it('StakeholderListComponent (Wiederherstellen) markiert die betroffene Zeile sofort und hebt die Markierung nach Antwort wieder auf', () => {
      const stakeholdersSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders', 'restoreStakeholder']);
      stakeholdersSpy.listStakeholders.and.returnValue(of([deletedStakeholder]));
      const subject = new Subject<void>();
      stakeholdersSpy.restoreStakeholder.and.returnValue(subject.asObservable());
      const projectsSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
      projectsSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 1 } as ProjectOverviewItem));

      TestBed.configureTestingModule({
        imports: [StakeholderListComponent],
        providers: [
          provideRouter([]),
          { provide: StakeholdersService, useValue: stakeholdersSpy },
          { provide: ProjectsService, useValue: projectsSpy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['showDeleted'] = true;

      expect(component['restoringStakeholderIds'].has(deletedStakeholder.id)).toBeFalse();
      component['onRestore'](deletedStakeholder);
      expect(component['restoringStakeholderIds'].has(deletedStakeholder.id)).toBeTrue();

      subject.next();
      expect(component['restoringStakeholderIds'].has(deletedStakeholder.id)).toBeFalse();
    });

    it('AssessmentTabsComponent (Assessment speichern) setzt isSaving sofort und nach Antwort wieder zurück', () => {
      const roles: AssessmentRole[] = [
        { role: 'PL', status: 'ASSESSED', influence: 40, interest: 60, notes: '', updatedByName: 'Peter', updatedAt: '2026-08-19T10:00:00Z', version: 1 },
      ];
      const spy = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
      spy.getAssessments.and.returnValue(of(roles));
      const subject = new Subject<AssessmentRole>();
      spy.upsertAssessment.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({ imports: [AssessmentTabsComponent], providers: [{ provide: AssessmentsService, useValue: spy }] });
      const fixture = TestBed.createComponent(AssessmentTabsComponent);
      fixture.componentInstance.stakeholderId = 'stakeholder-1';
      fixture.componentInstance.currentUserRole = 'PL';
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component['isSaving']).toBeFalse();
      component['onSave']();
      expect(component['isSaving']).toBeTrue();

      subject.next(roles[0]);
      expect(component['isSaving']).toBeFalse();
    });

    it('UsersAdminComponent (Nutzer anlegen, Passwort zurücksetzen) setzt die jeweiligen Flags sofort und nach Antwort wieder zurück', () => {
      const existingUser: AdminUser = { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: true, createdAt: '' };
      const spy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
      spy.listUsers.and.returnValue(of([existingUser]));
      const createSubject = new Subject<AdminUser>();
      spy.createUser.and.returnValue(createSubject.asObservable());
      const resetSubject = new Subject<void>();
      spy.resetPassword.and.returnValue(resetSubject.asObservable());

      TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideRouter([]), { provide: AdminUsersService, useValue: spy }],
      });
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });

      expect(component['isCreatingUser']).toBeFalse();
      component['onCreateUser']();
      expect(component['isCreatingUser']).toBeTrue();
      createSubject.next(existingUser);
      expect(component['isCreatingUser']).toBeFalse();

      expect(component['resettingUserIds'].has(existingUser.id)).toBeFalse();
      component['onResetPassword'](existingUser);
      expect(component['resettingUserIds'].has(existingUser.id)).toBeTrue();
      resetSubject.next();
      expect(component['resettingUserIds'].has(existingUser.id)).toBeFalse();
    });

    it('ProjectsAdminComponent (Projekt anlegen) setzt isCreatingProject sofort und nach Antwort wieder zurück', () => {
      const spy = jasmine.createSpyObj('AdminProjectsService', ['listProjects', 'createProject']);
      spy.listProjects.and.returnValue(of([] as AdminProject[]));
      const subject = new Subject<AdminProject>();
      spy.createProject.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [provideRouter([]), { provide: AdminProjectsService, useValue: spy }],
      });
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neues Projekt', description: '' });

      expect(component['isCreatingProject']).toBeFalse();
      component['onCreateProject']();
      expect(component['isCreatingProject']).toBeTrue();

      subject.next({ id: 'project-1', name: 'Neues Projekt', description: null, status: 'Active', memberCount: 0, createdAt: '' });
      expect(component['isCreatingProject']).toBeFalse();
    });

    it('ProjectMembershipManagerComponent (Hinzufügen/Entfernen/Rolle ändern) setzt die jeweiligen Flags sofort und nach Antwort wieder zurück', () => {
      const allUsers: AdminUser[] = [{ id: 'user-2', name: 'Erika Musterfrau', email: 'erika@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' }];
      const membership: AdminProjectMembership = { userId: 'user-1', userName: 'Max Mustermann', userEmail: 'max@example.com', role: 'PL' };
      const projectsSpy = jasmine.createSpyObj('AdminProjectsService', ['listMemberships', 'assignMember', 'changeMemberRole', 'removeMember']);
      const usersSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers']);
      usersSpy.listUsers.and.returnValue(of(allUsers));
      projectsSpy.listMemberships.and.returnValue(of([membership]));
      const assignSubject = new Subject<void>();
      projectsSpy.assignMember.and.returnValue(assignSubject.asObservable());
      const roleSubject = new Subject<void>();
      projectsSpy.changeMemberRole.and.returnValue(roleSubject.asObservable());
      const removeSubject = new Subject<void>();
      projectsSpy.removeMember.and.returnValue(removeSubject.asObservable());
      spyOn(window, 'confirm').and.returnValue(true);

      TestBed.configureTestingModule({
        imports: [ProjectMembershipManagerComponent],
        providers: [
          { provide: AdminProjectsService, useValue: projectsSpy },
          { provide: AdminUsersService, useValue: usersSpy },
        ],
      });
      const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
      fixture.componentRef.setInput('projectId', 'project-1');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['assignForm'].setValue({ userId: 'user-2', role: 'Coreteam' });
      expect(component['isAssigning']).toBeFalse();
      component['onAssignMember']();
      expect(component['isAssigning']).toBeTrue();
      assignSubject.next();
      expect(component['isAssigning']).toBeFalse();

      expect(component['changingRoleUserIds'].has(membership.userId)).toBeFalse();
      component['onChangeRole'](membership, 'Architect');
      expect(component['changingRoleUserIds'].has(membership.userId)).toBeTrue();
      roleSubject.next();
      expect(component['changingRoleUserIds'].has(membership.userId)).toBeFalse();

      expect(component['removingMemberUserIds'].has(membership.userId)).toBeFalse();
      component['onRemoveMember'](membership);
      expect(component['removingMemberUserIds'].has(membership.userId)).toBeTrue();
      removeSubject.next();
      expect(component['removingMemberUserIds'].has(membership.userId)).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Akzeptanzkriterium 2: Button gesperrt UND sichtbar veränderter Zustand (Text/Spinner).
  // ---------------------------------------------------------------------------------------------
  describe('Akzeptanzkriterium 2: Button gesperrt und sichtbar veränderter Zustand während isSubmitting', () => {
    it('zeigt am Beispiel „Stakeholder anlegen“ Textwechsel und [disabled] statt eines reinen [disabled] ohne visuellen Unterschied', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
      const subject = new Subject<Stakeholder>();
      spy.createStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [CreateStakeholderFormComponent],
        providers: [
          { provide: StakeholdersService, useValue: spy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillCreateForm(component);
      fixture.detectChanges();

      const buttonBefore: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      expect(buttonBefore.disabled).toBeFalse();
      expect(buttonBefore.textContent).toContain('Anlegen');
      expect(buttonBefore.textContent).not.toContain('Wird angelegt');

      // Ein echter Klick (statt eines direkten Methodenaufrufs) löst den nativen `submit`-Event
      // der `<form>` aus, über den auch `(ngSubmit)` gebunden ist.
      buttonBefore.click();
      fixture.detectChanges();
      const buttonDuring: HTMLButtonElement = fixture.nativeElement.querySelector('button');

      expect(buttonDuring.disabled).toBeTrue();
      expect(buttonDuring.textContent).toContain('Wird angelegt');
      expect(fixture.nativeElement.querySelector('.app-processing-button__spinner')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Akzeptanzkriterium 3: ein zweiter Klick/ngSubmit während eines laufenden Requests löst
  // nachweislich keinen zweiten HTTP-Request aus — verifiziert über HttpTestingController.
  // ---------------------------------------------------------------------------------------------
  describe('Akzeptanzkriterium 3: Doppel-Trigger löst nachweislich keinen zweiten HTTP-Request aus', () => {
    afterEach(() => {
      TestBed.inject(HttpTestingController).verify();
    });

    it('create-stakeholder-form: zwei ngSubmit während des ersten Requests führen zu genau einem ausstehenden POST', () => {
      TestBed.configureTestingModule({
        imports: [CreateStakeholderFormComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillCreateForm(component);

      component['onSubmit'](); // erster Trigger
      component['onSubmit'](); // zweiter Trigger während der erste noch aussteht

      const httpMock = TestBed.inject(HttpTestingController);
      const requests = httpMock.match('/api/v1/projects/project-1/stakeholders');
      expect(requests.length).toBe(1);
      requests[0].flush(stakeholder);
    });

    it('assessment-tabs: zwei ngSubmit während des ersten Requests führen zu genau einem ausstehenden PUT', () => {
      const roles: AssessmentRole[] = [
        { role: 'PL', status: 'ASSESSED', influence: 40, interest: 60, notes: '', updatedByName: 'Peter', updatedAt: '2026-08-19T10:00:00Z', version: 1 },
      ];
      TestBed.configureTestingModule({
        imports: [AssessmentTabsComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      const fixture = TestBed.createComponent(AssessmentTabsComponent);
      fixture.componentInstance.stakeholderId = 'stakeholder-1';
      fixture.componentInstance.currentUserRole = 'PL';
      fixture.detectChanges();

      const httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne('/api/v1/stakeholders/stakeholder-1/assessments').flush(roles);

      fixture.componentInstance['onSave'](); // erster Trigger
      fixture.componentInstance['onSave'](); // zweiter Trigger während der erste noch aussteht

      const requests = httpMock.match('/api/v1/stakeholders/stakeholder-1/assessments/PL');
      expect(requests.length).toBe(1);
      requests[0].flush(roles[0]);

      // Erfolgreiches Speichern lädt die Assessments neu (siehe AssessmentTabsComponent) — dieser
      // Folge-Request ist nicht Gegenstand dieses Akzeptanzkriteriums, wird hier aber abgeschlossen,
      // damit HttpTestingController.verify() in afterEach nicht auf einen offenen Request läuft.
      httpMock.expectOne('/api/v1/stakeholders/stakeholder-1/assessments').flush(roles);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Akzeptanzkriterium 4: isSubmitting wird sowohl im next- als auch im error-Callback zurückgesetzt.
  // ---------------------------------------------------------------------------------------------
  describe('Akzeptanzkriterium 4: isSubmitting wird im next- UND im error-Fall zurückgesetzt', () => {
    it('setzt isSubmitting nach einem erfolgreichen Request zurück (next)', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
      const subject = new Subject<Stakeholder>();
      spy.createStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [CreateStakeholderFormComponent],
        providers: [
          { provide: StakeholdersService, useValue: spy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillCreateForm(component);

      component['onSubmit']();
      expect(component['isSubmitting']).toBeTrue();
      subject.next(stakeholder);

      expect(component['isSubmitting']).toBeFalse();
    });

    it('setzt isSubmitting nach einem fehlgeschlagenen Request zurück (error), sodass ein erneuter Versuch möglich ist', () => {
      const spy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
      const subject = new Subject<Stakeholder>();
      spy.createStakeholder.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [CreateStakeholderFormComponent],
        providers: [
          { provide: StakeholdersService, useValue: spy },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });
      const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillCreateForm(component);

      component['onSubmit']();
      expect(component['isSubmitting']).toBeTrue();
      subject.error(new Error('Netzwerkfehler'));

      expect(component['isSubmitting']).toBeFalse();

      // Ein erneuter Versuch ohne Neuladen der Seite ist danach möglich.
      spy.createStakeholder.calls.reset();
      spy.createStakeholder.and.returnValue(of(stakeholder));
      component['onSubmit']();

      expect(spy.createStakeholder).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Akzeptanzkriterium 5: login-page und password-change-modal folgen demselben sichtbaren Muster
  // (Textwechsel/Spinner statt nur [disabled]).
  // ---------------------------------------------------------------------------------------------
  describe('Akzeptanzkriterium 5: login-page und password-change-modal zeigen dasselbe sichtbare Muster', () => {
    it('login-page zeigt während isSubmitting einen Textwechsel und Spinner statt nur [disabled]', () => {
      const authSpy = jasmine.createSpyObj('AuthService', ['login']);
      const subject = new Subject<{ mustChangePassword: boolean }>();
      authSpy.login.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [LoginPageComponent],
        providers: [provideRouter([]), { provide: AuthService, useValue: authSpy }],
      });
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
      fixture.detectChanges();

      // Ein echter Klick (statt eines direkten Methodenaufrufs) löst den nativen `submit`-Event
      // der `<form>` aus, über den auch `(ngSubmit)` gebunden ist.
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      button.click();
      fixture.detectChanges();

      expect(button.disabled).toBeTrue();
      expect(button.textContent).toContain('Wird angemeldet');
      expect(fixture.nativeElement.querySelector('.app-processing-button__spinner')).not.toBeNull();

      subject.next({ mustChangePassword: false });
    });

    it('password-change-modal zeigt während isSubmitting einen Textwechsel und Spinner statt nur [disabled]', () => {
      const authSpy = jasmine.createSpyObj('AuthService', ['changePassword']);
      const subject = new Subject<void>();
      authSpy.changePassword.and.returnValue(subject.asObservable());

      TestBed.configureTestingModule({
        imports: [PasswordChangeModalComponent],
        providers: [{ provide: AuthService, useValue: authSpy }],
      });
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['form'].controls.newPassword.setValue('new-super-secret');
      fixture.detectChanges();

      // Ein echter Klick (statt eines direkten Methodenaufrufs) löst den nativen `submit`-Event
      // der `<form>` aus, über den auch `(ngSubmit)` gebunden ist.
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      button.click();
      fixture.detectChanges();

      expect(button.disabled).toBeTrue();
      expect(button.textContent).toContain('Wird geändert');
      expect(fixture.nativeElement.querySelector('.app-processing-button__spinner')).not.toBeNull();

      subject.next();
    });
  });
});
