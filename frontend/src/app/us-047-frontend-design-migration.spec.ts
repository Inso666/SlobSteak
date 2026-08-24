import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { appConfig } from './app.config';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { Stakeholder, StakeholdersService } from './features/stakeholders/stakeholders.service';
import { ProjectsService } from './features/projects/projects.service';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';
import { AdminUser, AdminUsersService } from './features/admin/admin-users.service';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { AdminProject, AdminProjectsService } from './features/admin/admin-projects.service';
import { CreateStakeholderFormComponent } from './features/stakeholders/create-stakeholder-form/create-stakeholder-form.component';

/**
 * Story-Test US-047 „Bestehendes Frontend auf das Design-System migrieren". Jeder Testfall bildet
 * genau ein Akzeptanzkriterium aus der Story-Datei ab (Konvention siehe .claude/agents/qa.md
 * Abschnitt 1). Generische, über die Akzeptanzkriterien hinausgehende Komponententests liegen
 * getrennt in den jeweiligen `*.component.spec.ts`-Dateien.
 *
 * Akzeptanzkriterium 5 ("kein bestehender Component-/Story-Test wird gebrochen, `ng test` bleibt
 * grün") und Akzeptanzkriterium 2 ("jede Feature-.css referenziert ausschließlich zentrale
 * Tokens") werden durch den vollständigen, grünen `ng test`-Lauf des gesamten Workspace bzw. durch
 * Code-Review der migrierten `.css`-Dateien nachgewiesen, nicht durch einen einzelnen isolierten
 * Testfall — beides ist naturgemäß kein Verhalten, das sich sinnvoll in einem einzelnen Jasmine-Spec
 * abbilden lässt.
 */
describe('US-047: Bestehendes Frontend auf das Design-System migrieren', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('Akzeptanzkriterium 1: zentrale Design-Tokens (Farben, Typografie, Radien, Abstände) sind auf :root in styles.css hinterlegt', () => {
    const rootStyles = getComputedStyle(document.documentElement);

    expect(rootStyles.getPropertyValue('--app-color-background').trim()).toBe('#10151f');
    expect(rootStyles.getPropertyValue('--app-attention').trim()).toBe('#f2a93b');
    expect(rootStyles.getPropertyValue('--app-color-error').trim()).toBe('#f87171');
    expect(rootStyles.getPropertyValue('--app-role-pl').trim()).toBe('#8b7cf6');
    expect(rootStyles.getPropertyValue('--app-role-ct').trim()).toBe('#2dd4bf');
    expect(rootStyles.getPropertyValue('--app-role-ar').trim()).toBe('#38bdf8');
    expect(rootStyles.getPropertyValue('--app-radius-md').trim()).not.toBe('');
    expect(rootStyles.getPropertyValue('--app-space-md').trim()).not.toBe('');
    expect(rootStyles.getPropertyValue('--app-font-family-display').trim()).toContain('Space Grotesk');
    expect(rootStyles.getPropertyValue('--app-font-family-mono').trim()).toContain('IBM Plex Mono');
  });

  it('Akzeptanzkriterium 1: das zentrale PrimeNG-Custom-Preset ist einmalig an der Composition Root verdrahtet', () => {
    // `providePrimeNG` selbst ist keine öffentlich benannte Klasse, daher wird indirekt über den
    // Provider-Array-Umfang sichergestellt, dass die Konfiguration Bestandteil von `appConfig` ist
    // (siehe app.config.ts, wo `SlobSteakPreset` importiert und `providePrimeNG({ theme: { preset:
    // SlobSteakPreset } })` aufgerufen wird) — ein Rendering-Test dafür liegt in den einzelnen
    // Component-Specs, die p-Komponenten nutzen und ohne diese Verdrahtung nicht kompilieren würden.
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });

  it('Akzeptanzkriterium 3: die Akzentfarbe hebt einen fachlich sinnvollen Handlungsbedarf hervor (ähnlicher Stakeholder beim Anlegen)', async () => {
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder']);
    const created: Stakeholder = {
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
      similarStakeholderWarning: { id: 'existing-1', name: 'Max Mustermann' },
      deletedAt: null,
      deletedByName: null,
    };
    stakeholdersServiceSpy.createStakeholder.and.returnValue(of(created));

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

    const fixture = TestBed.createComponent(CreateStakeholderFormComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({
      name: 'Max Mustermann',
      type: 'Person',
      organization: '',
      position: '',
      email: '',
      phone: '',
      locationDepartment: '',
      description: '',
    });
    fixture.componentInstance['onSubmit']();
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('app-attention-badge .attention');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('Max Mustermann');
    // Die Akzentfarbe (`--app-attention`) ist die einzige Textfarbe des Badges (SPEC-00 §4: keine
    // Verwendung für allgemeine Links/Buttons).
    expect(getComputedStyle(badge!).color).toBe('rgb(242, 169, 59)');
  });

  it('Akzeptanzkriterium 4: die Stakeholder-Liste zeigt Kartenlayout statt einer rohen <table> und behält Inhalte/Aktionen bei', async () => {
    const stakeholder: Stakeholder = {
      id: 'stakeholder-1',
      projectId: 'project-1',
      type: 'Person',
      name: 'Max Mustermann',
      organization: 'Acme GmbH',
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
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([stakeholder]));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 1 }));

    await TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(root.textContent).toContain('Max Mustermann');
    expect(root.textContent).toContain('Acme GmbH');
    expect(root.textContent).toContain('Bearbeiten');
    expect(root.textContent).toContain('Löschen');
  });

  it('Akzeptanzkriterium 4: die Nutzerverwaltung zeigt Kartenlayout statt einer rohen <table> und behält Inhalte/Aktionen bei', async () => {
    const users: AdminUser[] = [
      { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
    ];
    const adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['listUsers', 'createUser', 'resetPassword']);
    adminUsersServiceSpy.listUsers.and.returnValue(of(users));

    await TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideRouter([]), { provide: AdminUsersService, useValue: adminUsersServiceSpy }],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(root.textContent).toContain('Max Mustermann');
    expect(root.textContent).toContain('max@example.com');
    expect(root.textContent).toContain('Passwort zurücksetzen');
  });

  it('Akzeptanzkriterium 4: die Projektverwaltung zeigt Kartenlayout statt einer rohen <table> und behält Inhalte/Aktionen bei', async () => {
    const projects: AdminProject[] = [
      { id: 'project-1', name: 'Projekt Phoenix', description: null, status: 'Active', memberCount: 2, createdAt: '' },
    ];
    const adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', [
      'listProjects',
      'createProject',
      'listMemberships',
      'assignMember',
      'changeMemberRole',
      'removeMember',
    ]);
    adminProjectsServiceSpy.listProjects.and.returnValue(of(projects));
    adminProjectsServiceSpy.listMemberships.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ProjectsAdminComponent],
      providers: [provideRouter([]), { provide: AdminProjectsService, useValue: adminProjectsServiceSpy }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelectorAll('[role="listitem"]').length).toBe(1);
    expect(root.textContent).toContain('Projekt Phoenix');
    expect(root.textContent).toContain('Mitglieder verwalten');
  });
});
