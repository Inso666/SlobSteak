import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminProject, AdminProjectMembership } from '../../features/admin/admin-projects.service';
import { AdminUser } from '../../features/admin/admin-users.service';
import { ProjectMembershipManagerComponent } from '../../features/admin/projects-admin/project-membership-manager.component';
import { ProjectsAdminComponent } from '../../features/admin/projects-admin/projects-admin.component';
import { UsersAdminComponent } from '../../features/admin/users-admin/users-admin.component';
import { ProjectOverviewComponent } from '../../features/projects/project-overview/project-overview.component';
import { TokenStorageService } from '../../features/auth/token-storage.service';
import { LOAD_ERROR_MESSAGE } from '../../core/messages/http-error-messages';
import { SlobSteakPreset } from '../../core/theme/slobsteak-preset';

/**
 * Story-Test US-050 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-050-verlaesslicher-lade-zustand-listen.md` gelisteten Akzeptanzkriterien,
 * in derselben Reihenfolge wie im Story-Dokument — getrennt von den generischen, tiefer gehenden
 * Komponententests in den einzelnen `*.component.spec.ts`-Dateien und von
 * `view-state.component.spec.ts` (Verhalten des gemeinsamen Bausteins selbst).
 */
describe('US-050: Verlässlicher Lade-Zustand statt fälschlicher Leer-/Stale-Darstellung auf Listen-/Übersichtsseiten', () => {
  const myProjects = [{ id: 'project-1', name: 'Mein Projekt', role: 'PL', stakeholderCount: 3 }];
  const allProjects: AdminProject[] = [{ id: 'project-1', name: 'Mein Projekt', description: null, status: 'Active', memberCount: 1, createdAt: '' }];
  const existingUsers: AdminUser[] = [{ id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' }];
  const allUsers: AdminUser[] = [
    { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
    { id: 'user-2', name: 'Erika Musterfrau', email: 'erika@example.com', isSystemAdmin: false, mustChangePassword: false, createdAt: '' },
  ];
  const existingMemberships: AdminProjectMembership[] = [{ userId: 'user-1', userName: 'Max Mustermann', userEmail: 'max@example.com', role: 'PL' }];

  afterEach(() => TestBed.resetTestingModule());

  it('Akzeptanzkriterium 1: jede der fünf betroffenen Stellen zeigt den @empty-Text ausschließlich nach tatsächlich leerer Antwort, nie während der Request noch läuft', () => {
    // Stelle 1: /projects „Meine Projekte“
    TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenStorageService, useValue: jasmine.createSpyObj('TokenStorageService', { getClaims: { sub: 'u', isSystemAdmin: false } }) },
      ],
    });
    let fixture: ComponentFixture<unknown> = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    let http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/projects').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Du bist noch keinem Projekt zugewiesen.');
    http.verify();
    TestBed.resetTestingModule();

    // Stelle 2: /admin/users Nutzerliste
    TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/users').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Keine Nutzer angelegt.');
    http.verify();
    TestBed.resetTestingModule();

    // Stelle 3: /admin/projects Projektliste
    TestBed.configureTestingModule({
      imports: [ProjectsAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/projects').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Es existieren noch keine Projekte.');
    http.verify();
    TestBed.resetTestingModule();

    // Stelle 4 + 5: /admin/projects → „Mitglieder verwalten“ (potenzielle Nutzer + Mitgliederliste)
    TestBed.configureTestingModule({
      imports: [ProjectMembershipManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select#userId')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/users').flush([]);
    http.expectOne('/api/v1/admin/projects/project-1/memberships').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select#userId option')?.textContent).toContain('Keine weiteren Nutzer verfügbar');
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('Noch keine Mitglieder zugewiesen.');
    http.verify();
  });

  it('Akzeptanzkriterium 2: nach Abschluss des Requests erscheinen die Daten ohne jede weitere Nutzerinteraktion (kein Klick/keine Tastatureingabe nach flush())', () => {
    TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/users').flush(existingUsers);
    // Bewusst KEIN simulierter Klick/Tastatur-Event zwischen flush() und der folgenden Prüfung —
    // nur der reguläre Change-Detection-Zyklus, den Zone.js in Produktion automatisch auslöst.
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.user-card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Max Mustermann');
    http.verify();
  });

  it('Akzeptanzkriterium 3: /projects „Meine Projekte“ zeigt zugewiesene Projekte unmittelbar nach dem Laden, unabhängig vom noch ladenden Tab „Alle Projekte“', () => {
    TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenStorageService, useValue: jasmine.createSpyObj('TokenStorageService', { getClaims: { sub: 'u', isSystemAdmin: true } }) },
      ],
    });
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    // Nur „Meine Projekte“ antwortet — „Alle Projekte“ (Tab, der aktuell nicht aktiv ist) bleibt
    // absichtlich noch offen, um die historische Ursache des Bugs nachzustellen (US-050 §2).
    http.expectOne('/api/v1/projects').flush(myProjects);
    fixture.detectChanges();

    expect(fixture.componentInstance['activeTab']).toBe('mine');
    expect(fixture.nativeElement.querySelectorAll('.project-card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Mein Projekt');

    http.expectOne('/api/v1/admin/projects').flush(allProjects);
    http.verify();
  });

  it('Akzeptanzkriterium 4: /admin/users — die Nutzerliste ist beim Laden der Seite gefüllt, ohne dass eine Eingabe im Formular nötig ist', () => {
    TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/admin/users').flush(existingUsers);
    fixture.detectChanges();

    // Bewusst keinerlei Eingabe in `createForm` — die Liste muss unabhängig davon gefüllt sein.
    expect(fixture.componentInstance['createForm'].pristine).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.user-card').length).toBe(1);
    http.verify();
  });

  it('Akzeptanzkriterium 5: /admin/projects — die Projektliste ist beim Laden der Seite gefüllt, ohne dass eine Eingabe im Formular nötig ist', () => {
    TestBed.configureTestingModule({
      imports: [ProjectsAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/admin/projects').flush(allProjects);
    fixture.detectChanges();

    expect(fixture.componentInstance['createForm'].pristine).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.project-card').length).toBe(1);
    http.verify();
  });

  it('Akzeptanzkriterium 6: /admin/projects → „Mitglieder verwalten“ — die Liste potenzieller Nutzer ist beim ersten Öffnen bereits gefüllt, ohne erneute Auswahl', () => {
    TestBed.configureTestingModule({
      imports: [ProjectMembershipManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/admin/users').flush(allUsers);
    http.expectOne('/api/v1/admin/projects/project-1/memberships').flush(existingMemberships);
    // Bewusst kein erneutes „Öffnen“/Neu-Selektieren — nur der reguläre Change-Detection-Zyklus.
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select#userId');
    expect(select).not.toBeNull();
    expect(select.querySelectorAll('option[value="user-2"]').length).toBe(1);
    http.verify();
  });

  it('Akzeptanzkriterium 7: /admin/projects → „Hinzufügen“ — die Mitgliederliste aktualisiert sich unmittelbar nach erfolgreicher Zuweisung, ohne weitere Interaktion', () => {
    TestBed.configureTestingModule({
      imports: [ProjectMembershipManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ProjectMembershipManagerComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/users').flush(allUsers);
    http.expectOne('/api/v1/admin/projects/project-1/memberships').flush(existingMemberships);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['assignForm'].setValue({ userId: 'user-2', role: 'Coreteam' });
    component['onAssignMember']();

    http.expectOne({ url: '/api/v1/admin/projects/project-1/memberships', method: 'POST' }).flush(null);
    const updatedMemberships: AdminProjectMembership[] = [...existingMemberships, { userId: 'user-2', userName: 'Erika Musterfrau', userEmail: 'erika@example.com', role: 'Coreteam' }];
    http.expectOne({ url: '/api/v1/admin/projects/project-1/memberships', method: 'GET' }).flush(updatedMemberships);
    // Bewusst kein weiterer Klick/keine weitere Auswahl nach dem Reload-Request.
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.member-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Erika Musterfrau');
    http.verify();
  });

  it('Akzeptanzkriterium 8: der neue Ladezustand nutzt ausschließlich `<p-skeleton>` in den SPEC-00-Tokens `color.surface-hover`/`color.surface`/`radius.md` — keine lokal erfundene Lade-Darstellung', () => {
    TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    // Solange der Request läuft, wird die Ladedarstellung ausschließlich über `<p-skeleton>`
    // gerendert — kein Spinner, kein Text-Platzhalter als Ersatz.
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);

    // Farbe/Radius kommen zentral aus dem PrimeNG-Preset (`color.surface-hover` = `#1D2536`,
    // identisch zu `--app-color-surface-hover` in `styles.css`) statt aus einem lokalen Hex-Wert
    // in einer der fünf Verwendungsstellen.
    expect(SlobSteakPreset.components?.skeleton?.root?.background).toBe('#1D2536');

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/users').flush([]);
    http.verify();
  });

  it('Akzeptanzkriterium 9: die bestehende US-044-Fehlerbehandlung (`loadError`) bleibt unverändert nutzbar und koexistiert mit dem neuen `ViewState`', () => {
    TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/admin/users').flush('Server Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    // US-044: die bestehende, komponentenweite Fehlermeldung bleibt unverändert gesetzt …
    expect(fixture.componentInstance['loadError']).toBe(LOAD_ERROR_MESSAGE);
    expect(fixture.nativeElement.querySelector('.load-error')?.textContent).toBe(LOAD_ERROR_MESSAGE);
    // … und der neue `ViewState` zeigt konsistent `error`, ohne Skeleton/Empty-Text daneben.
    expect(fixture.componentInstance['usersState']).toBe('error');
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();

    http.verify();
  });
});
