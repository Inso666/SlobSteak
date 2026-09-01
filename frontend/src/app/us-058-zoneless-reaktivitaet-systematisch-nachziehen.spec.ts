import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AdminProject, AdminProjectMembership } from './features/admin/admin-projects.service';
import { AdminUser } from './features/admin/admin-users.service';
import { ProjectMembershipManagerComponent } from './features/admin/projects-admin/project-membership-manager.component';
import { ProjectsAdminComponent } from './features/admin/projects-admin/projects-admin.component';
import { UsersAdminComponent } from './features/admin/users-admin/users-admin.component';
import { PasswordChangeModalComponent } from './features/auth/password-change-modal/password-change-modal.component';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { Stakeholder } from './features/stakeholders/stakeholders.service';

/**
 * Story-Test US-058 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-058-zoneless-reaktivitaet-systematisch-nachziehen.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument. Ein Testfall je Komponente
 * (fünf Fundstellen) statt fünf getrennter Dateien, da alle fünf exakt dasselbe Verhaltensmuster
 * gegen dieselbe Root Cause prüfen — konsistent mit dem bereits etablierten Präzedenzfall
 * `us-050-verlaesslicher-lade-zustand-listen.spec.ts` (ein Story-Test, mehrere Fundstellen).
 *
 * Root Cause (bereits in US-050/US-051/US-057 etabliert): Das Frontend läuft ohne `zone.js`
 * (zoneless). Eine reine Feldzuweisung/Set-Mutation in einem `subscribe()`-Callback markiert die
 * Komponente nicht automatisch für die nächste Change-Detection-Runde.
 *
 * Alle Tests verwenden bewusst `HttpTestingController` statt eines Service-Spys mit synchronem
 * `of(...)`: nur ein über `flush()` erst nach dem ursprünglichen Aufruf aufgelöster Request
 * reproduziert das eigentliche Bug-Muster (Antwort trifft außerhalb eines von Angular beobachteten
 * Ereignisses ein). Nach `flush()` wird ausschließlich der reguläre `fixture.detectChanges()`-
 * Zyklus ausgelöst — bewusst KEIN zusätzlicher simulierter Klick.
 */
describe('US-058: Zoneless-Reaktivität systematisch nachziehen', () => {
  describe('Akzeptanzkriterium 1/2 — users-admin.component.ts: onCreateUser', () => {
    let http: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [UsersAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function createLoadedFixture(): ComponentFixture<UsersAdminComponent> {
      const fixture = TestBed.createComponent(UsersAdminComponent);
      fixture.detectChanges();
      http.expectOne('/api/v1/admin/users').flush([]);
      fixture.detectChanges();
      // Das Formular lebt seit US-056 in einem per Button geöffneten `p-dialog` — geöffnet, um
      // dasselbe Formularverhalten wie zuvor zu prüfen (Verhalten selbst unverändert).
      fixture.componentInstance['openCreateDialog']();
      fixture.detectChanges();
      return fixture;
    }

    it('Erfolgsfall: die Liste zeigt den neu angelegten Nutzer ohne weitere Interaktion', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });
      // Reactive-Forms-Direktiven markieren die Komponente beim Schreiben eines Formularwerts
      // bereits selbst für die nächste Change-Detection-Runde — dieser `detectChanges()`-Aufruf
      // „verbraucht“ diese unabhängige Markierung, damit die folgende Prüfung ausschließlich das
      // `markForCheck()` im `subscribe()`-Callback selbst testet, nicht eine zufällige Nebenwirkung
      // des vorherigen `setValue()`.
      fixture.detectChanges();

      component['onCreateUser']();
      http.expectOne({ url: '/api/v1/admin/users', method: 'POST' }).flush({
        id: 'user-1',
        name: 'Neuer Nutzer',
        email: 'neu@example.com',
        isSystemAdmin: false,
        mustChangePassword: true,
        createdAt: '',
      } as AdminUser);
      http.expectOne({ url: '/api/v1/admin/users', method: 'GET' }).flush([{ id: 'user-1', name: 'Neuer Nutzer', email: 'neu@example.com', isSystemAdmin: false, mustChangePassword: true, createdAt: '' } as AdminUser]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Neuer Nutzer');
      expect(component['isCreatingUser']).toBeFalse();
    });

    it('Fehlerfall: die Fehlermeldung erscheint und der Button verlässt zuverlässig den Verarbeitungs-Zustand', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neuer Nutzer', email: 'neu@example.com', initialPassword: 'initial-pass' });
      // Siehe Kommentar im Erfolgsfall-Test oben — verbraucht die durch `setValue()` selbst
      // ausgelöste Markierung, bevor der eigentliche `subscribe()`-Callback getestet wird.
      fixture.detectChanges();

      component['onCreateUser']();
      http.expectOne({ url: '/api/v1/admin/users', method: 'POST' }).flush(
        { error: 'CONFLICT' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Diese E-Mail-Adresse wird bereits verwendet.');
      expect(component['isCreatingUser']).toBeFalse();
    });
  });

  describe('Akzeptanzkriterium 1/2 — projects-admin.component.ts: onCreateProject', () => {
    let http: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ProjectsAdminComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function createLoadedFixture(): ComponentFixture<ProjectsAdminComponent> {
      const fixture = TestBed.createComponent(ProjectsAdminComponent);
      fixture.detectChanges();
      http.expectOne('/api/v1/admin/projects').flush([]);
      fixture.detectChanges();
      // Das Formular lebt seit US-056 in einem per Button geöffneten `p-dialog` — geöffnet, um
      // dasselbe Formularverhalten wie zuvor zu prüfen (Verhalten selbst unverändert).
      fixture.componentInstance['openCreateDialog']();
      fixture.detectChanges();
      return fixture;
    }

    it('Erfolgsfall: die Liste zeigt das neu angelegte Projekt ohne weitere Interaktion', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neues Projekt', description: '' });
      fixture.detectChanges();

      component['onCreateProject']();
      http.expectOne({ url: '/api/v1/admin/projects', method: 'POST' }).flush({
        id: 'project-1',
        name: 'Neues Projekt',
        description: null,
        status: 'Active',
        memberCount: 0,
        createdAt: '',
      } as AdminProject);
      http.expectOne({ url: '/api/v1/admin/projects', method: 'GET' }).flush([
        { id: 'project-1', name: 'Neues Projekt', description: null, status: 'Active', memberCount: 0, createdAt: '' } as AdminProject,
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Neues Projekt');
      expect(component['isCreatingProject']).toBeFalse();
    });

    it('Fehlerfall: die Fehlermeldung erscheint und der Button verlässt zuverlässig den Verarbeitungs-Zustand', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;
      component['createForm'].setValue({ name: 'Neues Projekt', description: '' });
      // Verbraucht die durch `setValue()` selbst ausgelöste Markierung (siehe Kommentar bei
      // `onCreateUser` oben), bevor der eigentliche `subscribe()`-Callback getestet wird.
      fixture.detectChanges();

      component['onCreateProject']();
      http.expectOne({ url: '/api/v1/admin/projects', method: 'POST' }).flush(
        { error: 'INTERNAL' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Projekt konnte nicht angelegt werden.');
      expect(component['isCreatingProject']).toBeFalse();
    });
  });

  describe('Akzeptanzkriterium 1/2 — project-membership-manager.component.ts: onAssignMember/onChangeRole/onRemoveMember', () => {
    let http: HttpTestingController;
    const existingMembership: AdminProjectMembership = { userId: 'user-1', userName: 'Max Mustermann', userEmail: 'max@example.com', role: 'PL' };

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ProjectMembershipManagerComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function createLoadedFixture(): ComponentFixture<ProjectMembershipManagerComponent> {
      const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
      fixture.componentRef.setInput('projectId', 'project-1');
      fixture.detectChanges();
      http.expectOne('/api/v1/admin/users').flush([]);
      http.expectOne('/api/v1/admin/projects/project-1/memberships').flush([existingMembership]);
      fixture.detectChanges();
      return fixture;
    }

    it('onAssignMember-Fehlerfall: die Fehlermeldung erscheint ohne weitere Interaktion', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;
      component['assignForm'].setValue({ userId: 'user-2', role: 'Coreteam' });
      // Verbraucht die durch `setValue()` selbst ausgelöste Markierung (siehe Kommentar bei
      // `onCreateUser` oben), bevor der eigentliche `subscribe()`-Callback getestet wird.
      fixture.detectChanges();

      component['onAssignMember']();
      http.expectOne({ url: '/api/v1/admin/projects/project-1/memberships', method: 'POST' }).flush(
        { error: 'INTERNAL' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Nutzer konnte nicht zugewiesen werden.');
      expect(component['isAssigning']).toBeFalse();
    });

    it('onChangeRole-Fehlerfall: die Fehlermeldung erscheint ohne weitere Interaktion', () => {
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;

      component['onChangeRole'](existingMembership, 'Architect');
      http.expectOne({ url: '/api/v1/admin/projects/project-1/memberships/user-1', method: 'PATCH' }).flush(
        { error: 'INTERNAL' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Rolle für Max Mustermann konnte nicht geändert werden.');
      expect(component['changingRoleUserIds'].size).toBe(0);
    });

    it('onRemoveMember-Erfolgsfall: die Mitgliederliste aktualisiert sich ohne weitere Interaktion', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const fixture = createLoadedFixture();
      const component = fixture.componentInstance;

      component['onRemoveMember'](existingMembership);
      http.expectOne({ url: '/api/v1/admin/projects/project-1/memberships/user-1', method: 'DELETE' }).flush(null);
      http.expectOne('/api/v1/admin/projects/project-1/memberships').flush([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Noch keine Mitglieder zugewiesen.');
      expect(component['removingMemberUserIds'].size).toBe(0);
    });
  });

  describe('Akzeptanzkriterium 1/2 — stakeholder-list.component.ts: getProject, restoreStakeholder, listStakeholders', () => {
    let http: HttpTestingController;

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
      deletedAt: '2026-08-19T12:00:00Z',
      deletedByName: 'Peter PL',
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [StakeholderListComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('getProject: die Rollen-abhängige Papierkorb-Umschaltfläche erscheint ohne weitere Interaktion, sobald die Rolle PL geladen ist', () => {
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();
      http.expectOne('/api/v1/projects/project-1/stakeholders').flush([]);
      http.expectOne('/api/v1/projects/project-1').flush({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 0 });
      // US-072: Rolle `PL` trägt eine eigene Perspektive — die Komponente lädt „Meine Bewertung“
      // zusätzlich client-seitig über die Map-Query-API (US-031) nach.
      http.expectOne('/api/v1/projects/project-1/map?perspective=PL').flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance['showDeletedToggle']).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Gelöschte anzeigen');
    });

    it('restoreStakeholder-Erfolgsfall: die Papierkorb-Liste aktualisiert sich ohne weitere Interaktion', () => {
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();
      http.expectOne('/api/v1/projects/project-1/stakeholders').flush([stakeholder]);
      http.expectOne('/api/v1/projects/project-1').flush({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 1 });
      http.expectOne('/api/v1/projects/project-1/map?perspective=PL').flush([]);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['onToggleDeleted'](true);
      http.expectOne('/api/v1/projects/project-1/stakeholders?deleted=true').flush([stakeholder]);
      fixture.detectChanges();

      component['onRestore'](stakeholder);
      http.expectOne('/api/v1/stakeholders/stakeholder-1/restore').flush(null);
      http.expectOne('/api/v1/projects/project-1/stakeholders?deleted=true').flush([]);
      // US-072: Restore lädt zusätzlich die (weiterhin sichtbare) aktive Liste neu — beide
      // Listen koexistieren, statt sich gegenseitig zu ersetzen (Akzeptanzkriterium 4).
      http.expectOne('/api/v1/projects/project-1/stakeholders').flush([]);
      // US-072: Restore lädt außerdem „Meine Bewertung“ neu — die Map-Query-API liefert nur
      // aktive Stakeholder, ein wiederhergestellter Stakeholder fehlte sonst fälschlich weiterhin
      // in `assessmentByStakeholderId` (im manuellen Smoke-Test dieser Story beobachtet).
      http.expectOne('/api/v1/projects/project-1/map?perspective=PL').flush([]);
      fixture.detectChanges();

      expect(component['restoringStakeholderIds'].size).toBe(0);
      expect(component['deletedStakeholders']).toEqual([]);
      expect(fixture.nativeElement.querySelector('.sh-trash-section .sh-empty-row')?.textContent).toContain('Papierkorb ist leer.');
    });

    it('listStakeholders-Fehlerfall: die konsistente Fehlermeldung erscheint ohne weitere Interaktion', () => {
      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();
      http.expectOne('/api/v1/projects/project-1/stakeholders').flush(
        { error: 'INTERNAL' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      http.expectOne('/api/v1/projects/project-1').flush({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 0 });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.load-error')).not.toBeNull();
    });
  });

  describe('Akzeptanzkriterium 1/2 — password-change-modal.component.ts: onSubmit', () => {
    let http: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [PasswordChangeModalComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('Erfolgsfall: die Komponente emittiert passwordChanged ohne weitere Interaktion', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const emitSpy = spyOn(component.passwordChanged, 'emit');
      component['form'].controls.newPassword.setValue('new-super-secret');
      component['form'].controls.confirmPassword.setValue('new-super-secret');
      fixture.detectChanges();

      component['onSubmit']();
      http.expectOne({ url: '/api/v1/auth/password', method: 'PATCH' }).flush(null);
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
      expect(component['isSubmitting']).toBeFalse();
    });

    it('Fehlerfall: die Fehlermeldung erscheint und der Button verlässt zuverlässig den Verarbeitungs-Zustand', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component['form'].controls.newPassword.setValue('new-super-secret');
      component['form'].controls.confirmPassword.setValue('new-super-secret');
      // Verbraucht die durch `setValue()` selbst ausgelöste Markierung (siehe Kommentar bei
      // `onCreateUser` oben), bevor der eigentliche `subscribe()`-Callback getestet wird.
      fixture.detectChanges();

      component['onSubmit']();
      http.expectOne({ url: '/api/v1/auth/password', method: 'PATCH' }).flush(
        { error: 'INTERNAL' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Passwort konnte nicht geändert werden. Bitte erneut versuchen.');
      expect(component['isSubmitting']).toBeFalse();
    });
  });
});
