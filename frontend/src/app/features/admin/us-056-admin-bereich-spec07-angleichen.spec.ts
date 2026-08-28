import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { AdminProject, AdminProjectMembership, AdminProjectsService } from './admin-projects.service';
import { AdminUser, AdminUsersService } from './admin-users.service';
import { ProjectMembershipManagerComponent } from './projects-admin/project-membership-manager.component';
import { ProjectsAdminComponent } from './projects-admin/projects-admin.component';
import { UsersAdminComponent } from './users-admin/users-admin.component';
import { TokenStorageService } from '../auth/token-storage.service';

/** Schlanker Ersatz für `AccessDeniedComponent`/`login` — genügt als `adminGuard`-Umleitungsziel,
 * ohne dessen eigene Abhängigkeiten hier mitschleppen zu müssen. */
@Component({ selector: 'app-test-login-stub', standalone: true, template: 'Login-Stub' })
class LoginStubComponent {}

const ADMIN_ROUTES: Routes = [
  { path: 'login', component: LoginStubComponent },
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: UsersAdminComponent },
      { path: 'projects', component: ProjectsAdminComponent },
    ],
  },
];

/**
 * Story-Test US-056 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-056-admin-bereich-spec07-angleichen.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument.
 *
 * Nicht als eigener Testfall abgebildet, da nicht laufzeitbeobachtbar bzw. bereits anderweitig
 * verifiziert:
 * - Akzeptanzkriterium 4 (`AdminSubNavComponent` abgelöst/Abweichung dokumentiert) — struktureller
 *   Fakt (Datei gelöscht), siehe Abweichungs-Dokumentation in `admin-page.component.ts`.
 * - Akzeptanzkriterium 5 (ausschließlich SPEC-00-Tokens) — statische Code-Eigenschaft, per
 *   Review/keine hartcodierten Hex-/px-Werte in den geänderten `.css`-Dateien dieser Story.
 * - Akzeptanzkriterium 6/7 (bestehende Tests grün, `ng test`/`ng lint`/`ng build` grün) — durch den
 *   vollständigen Testlauf/Lint/Build dieser Story selbst nachgewiesen (siehe PR-Beschreibung).
 */
describe('US-056: Admin-Bereich gemäß SPEC-07 angleichen (Tab-Host mit Dialog-Formularen)', () => {
  describe('Akzeptanzkriterium 1: Nutzerverwaltung und Projektverwaltung sind über einen gemeinsamen Tab-Host erreichbar', () => {
    beforeEach(() => {
      const adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
      adminUsersServiceSpy.listUsers.and.returnValue(of([]));
      const adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects', 'createProject', 'listMemberships']);
      adminProjectsServiceSpy.listProjects.and.returnValue(of([]));

      TestBed.configureTestingModule({
        providers: [
          provideRouter(ADMIN_ROUTES),
          { provide: AdminUsersService, useValue: adminUsersServiceSpy },
          { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
          { provide: TokenStorageService, useValue: jasmine.createSpyObj('TokenStorageService', { getClaims: { sub: 'admin-1', isSystemAdmin: true } }) },
        ],
      });
    });

    it('/admin landet ohne weitere Navigation im Tab „Nutzer“, gerendert innerhalb desselben Tab-Host', async () => {
      const harness = await RouterTestingHarness.create();
      const activatedComponent = await harness.navigateByUrl('/admin', AdminPageComponent);

      expect(activatedComponent).toBeInstanceOf(AdminPageComponent);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Admin-Bereich');
      expect(harness.routeNativeElement?.querySelector('app-users-admin')).not.toBeNull();
      expect(harness.routeNativeElement?.querySelector('app-projects-admin')).toBeNull();
    });

    it('Wechsel zu /admin/projects rendert im selben Tab-Host den Tab „Projekte“', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin/projects');

      expect(harness.routeNativeElement?.querySelector('app-projects-admin')).not.toBeNull();
      expect(harness.routeNativeElement?.querySelector('app-users-admin')).toBeNull();
      expect(harness.routeNativeElement?.querySelector('a[href="/admin/projects"].active')).not.toBeNull();
    });

    it('ein Nutzer ohne isSystemAdmin wird weiterhin durch adminGuard zu /login umgeleitet (Regression, Akzeptanzkriterium 3)', async () => {
      TestBed.resetTestingModule();
      const adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
      adminUsersServiceSpy.listUsers.and.returnValue(of([]));

      TestBed.configureTestingModule({
        providers: [
          provideRouter(ADMIN_ROUTES),
          { provide: AdminUsersService, useValue: adminUsersServiceSpy },
          { provide: TokenStorageService, useValue: jasmine.createSpyObj('TokenStorageService', { getClaims: { sub: 'user-1', isSystemAdmin: false } }) },
        ],
      });

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin');

      expect(TestBed.inject(Router).url).toBe('/login');
    });
  });

  describe('Akzeptanzkriterium 2: „Nutzer anlegen“ öffnet als p-dialog statt dauerhaft sichtbar', () => {
    let adminUsersServiceSpy: jasmine.SpyObj<AdminUsersService>;
    const existingUsers: AdminUser[] = [
      { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
    ];

    beforeEach(async () => {
      adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
      adminUsersServiceSpy.listUsers.and.returnValue(of(existingUsers));

      await TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideRouter([]), { provide: AdminUsersService, useValue: adminUsersServiceSpy }],
      }).compileComponents();
    });

    it('das Formular ist beim Öffnen der Seite nicht im DOM vorhanden, sondern erscheint erst nach Klick auf „Nutzer anlegen“', () => {
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input#name')).toBeNull();
      // Regression Akzeptanzkriterium 3: die Nutzerliste selbst bleibt unabhängig vom Dialog sichtbar.
      expect(fixture.nativeElement.textContent).toContain('Max Mustermann');
      // US-016 Akzeptanzkriterium: „Passwort zurücksetzen“ bleibt eine Zeilenaktion ohne eigenen Dialog.
      expect(fixture.nativeElement.textContent).toContain('Passwort zurücksetzen');

      const trigger = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (button) => (button as HTMLButtonElement).textContent?.trim() === 'Nutzer anlegen',
      ) as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input#name')).not.toBeNull();
    });

    it('Formularinhalt/Validierung/Verhalten bleiben unverändert: gültiges Absenden im geöffneten Dialog legt den Nutzer an und schließt den Dialog wieder', () => {
      adminUsersServiceSpy.createUser.and.returnValue(of(existingUsers[0]));
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openCreateDialog']();
      fixture.detectChanges();
      expect(component['createDialogVisible']()).toBeTrue();

      component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });
      component['onCreateUser']();

      expect(adminUsersServiceSpy.createUser).toHaveBeenCalledWith('Neuer Nutzer', 'neu@example.com', 'initial-pass');
      expect(component['createDialogVisible']()).toBeFalse();
    });
  });

  describe('Akzeptanzkriterium 2: „Projekt anlegen“ öffnet als p-dialog statt dauerhaft sichtbar', () => {
    let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;
    const existingProjects: AdminProject[] = [
      { id: 'project-1', name: 'Projekt Phoenix', description: null, status: 'Active', memberCount: 2, createdAt: '' },
    ];

    beforeEach(async () => {
      adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects', 'createProject', 'listMemberships']);
      adminProjectsServiceSpy.listProjects.and.returnValue(of(existingProjects));
      adminProjectsServiceSpy.listMemberships.and.returnValue(of([]));

      await TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [provideRouter([]), { provide: AdminProjectsService, useValue: adminProjectsServiceSpy }],
      }).compileComponents();
    });

    it('das Formular ist beim Öffnen der Seite nicht im DOM vorhanden, sondern erscheint erst nach Klick auf „Projekt anlegen“', () => {
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input#name')).toBeNull();
      // Regression Akzeptanzkriterium 3: die Projektliste selbst bleibt unabhängig vom Dialog sichtbar.
      expect(fixture.nativeElement.textContent).toContain('Projekt Phoenix');

      const trigger = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (button) => (button as HTMLButtonElement).textContent?.trim() === 'Projekt anlegen',
      ) as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input#name')).not.toBeNull();
    });

    it('Formularinhalt/Validierung/Verhalten bleiben unverändert: gültiges Absenden im geöffneten Dialog legt das Projekt an und schließt den Dialog wieder', () => {
      adminProjectsServiceSpy.createProject.and.returnValue(of(existingProjects[0]));
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openCreateDialog']();
      fixture.detectChanges();
      expect(component['createDialogVisible']()).toBeTrue();

      component['createForm'].setValue({ name: 'Neues Projekt', description: '' });
      component['onCreateProject']();

      expect(adminProjectsServiceSpy.createProject).toHaveBeenCalledWith('Neues Projekt', null);
      expect(component['createDialogVisible']()).toBeFalse();
    });
  });

  describe('Akzeptanzkriterium 2: „Mitglied zuweisen“ öffnet als p-dialog statt dauerhaft sichtbar', () => {
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
      adminProjectsServiceSpy.listMemberships.and.returnValue(of(existingMemberships));
      adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
      adminUsersServiceSpy.listUsers.and.returnValue(of(allUsers));

      await TestBed.configureTestingModule({
        imports: [ProjectMembershipManagerComponent],
        providers: [
          { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
          { provide: AdminUsersService, useValue: adminUsersServiceSpy },
        ],
      }).compileComponents();
    });

    function createFixture() {
      const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
      fixture.componentRef.setInput('projectId', 'project-1');
      fixture.detectChanges();
      return fixture;
    }

    it('das Formular ist beim Öffnen des Panels nicht im DOM vorhanden, sondern erscheint erst nach Klick auf „Mitglied hinzufügen“', () => {
      const fixture = createFixture();

      expect(fixture.nativeElement.querySelector('select#userId')).toBeNull();
      // Regression Akzeptanzkriterium 3: die Mitgliederliste selbst bleibt unabhängig vom Dialog sichtbar.
      expect(fixture.nativeElement.textContent).toContain('Max Mustermann');

      const trigger = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (button) => (button as HTMLButtonElement).textContent?.trim() === 'Mitglied hinzufügen',
      ) as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('select#userId')).not.toBeNull();
    });

    it('Formularinhalt/Validierung/Verhalten bleiben unverändert: gültiges Absenden im geöffneten Dialog weist das Mitglied zu und schließt den Dialog wieder', () => {
      adminProjectsServiceSpy.assignMember.and.returnValue(of(undefined));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component['openAssignDialog']();
      fixture.detectChanges();
      expect(component['assignDialogVisible']()).toBeTrue();

      component['assignForm'].setValue({ userId: 'user-2', role: 'Coreteam' });
      component['onAssignMember']();

      expect(adminProjectsServiceSpy.assignMember).toHaveBeenCalledWith('project-1', 'user-2', 'Coreteam');
      expect(component['assignDialogVisible']()).toBeFalse();
    });
  });
});
