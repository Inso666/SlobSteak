import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppNavigationComponent } from '../../core/navigation/app-navigation/app-navigation.component';
import { TokenStorageService } from '../auth/token-storage.service';
import { adminGuard } from './admin.guard';
import { AdminProject, AdminProjectsService } from './admin-projects.service';
import { AdminUser, AdminUsersService } from './admin-users.service';
import { ProjectsAdminComponent } from './projects-admin/projects-admin.component';
import { UsersAdminComponent } from './users-admin/users-admin.component';

@Component({ selector: 'app-us046-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

const EXISTING_USERS: AdminUser[] = [
  {
    id: 'user-1',
    name: 'Max Mustermann',
    email: 'max@example.com',
    isSystemAdmin: false,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  },
];

const EXISTING_PROJECTS: AdminProject[] = [
  {
    id: 'project-1',
    name: 'Projekt Phoenix',
    description: null,
    status: 'Active',
    memberCount: 2,
    createdAt: '',
  },
];

/**
 * Story-Test US-046 „Admin-Bereich über globale Navigation erreichbar machen“. Jeder Testfall
 * bildet genau ein Akzeptanzkriterium aus der Story-Datei ab, in derselben Reihenfolge wie dort
 * gelistet (Konvention siehe .claude/agents/qa.md Abschnitt 1). Generische, über die
 * Akzeptanzkriterien hinausgehende Komponententests liegen getrennt in den jeweiligen
 * `*.component.spec.ts`-Dateien.
 */
describe('US-046: Admin-Bereich über globale Navigation erreichbar machen', () => {
  let tokenStorage: TokenStorageService;
  let router: Router;
  let adminUsersServiceSpy: jasmine.SpyObj<AdminUsersService>;
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;

  beforeEach(() => {
    adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', [
      'listUsers',
      'createUser',
      'resetPassword',
    ]);
    adminUsersServiceSpy.listUsers.and.returnValue(of(EXISTING_USERS));

    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', [
      'listProjects',
      'createProject',
      'listMemberships',
      'assignMember',
      'changeMemberRole',
      'removeMember',
    ]);
    adminProjectsServiceSpy.listProjects.and.returnValue(of(EXISTING_PROJECTS));
    adminProjectsServiceSpy.listMemberships.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: DummyRouteComponent },
          { path: 'projects', component: DummyRouteComponent },
          { path: 'admin/users', component: DummyRouteComponent },
          { path: 'admin/projects', component: DummyRouteComponent },
        ]),
        { provide: AdminUsersService, useValue: adminUsersServiceSpy },
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
      ],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
    tokenStorage.clearToken();
  });

  afterEach(() => tokenStorage.clearToken());

  it('Akzeptanzkriterium 1: globale Navigation zeigt „Admin" ausschließlich für isSystemAdmin = true', () => {
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const adminLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement | null;
    expect(adminLink).not.toBeNull();
    expect(adminLink?.textContent?.trim()).toBe('Admin');
  });

  it('Akzeptanzkriterium 1 (Gegenprobe): kein „Admin"-Eintrag für einen Nutzer ohne isSystemAdmin', () => {
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/admin/users"]')).toBeNull();
  });

  it('Akzeptanzkriterium 2: der „Admin"-Eintrag ist bei fehlender Berechtigung nicht im DOM vorhanden (nicht nur per CSS versteckt)', () => {
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.textContent?.trim() === 'Admin')).toBeFalse();
  });

  it('Akzeptanzkriterium 3: Klick auf „Admin" navigiert zu /admin/users', async () => {
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const adminLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement;
    adminLink.click();
    await fixture.whenStable();

    expect(router.url).toBe('/admin/users');
  });

  it('Akzeptanzkriterium 4: UsersAdminComponent bietet einen sichtbaren Sub-Navigations-Link zu „Projekte"', () => {
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();

    const projectsLink = fixture.nativeElement.querySelector(
      'a[href="/admin/projects"]',
    ) as HTMLAnchorElement | null;
    expect(projectsLink).not.toBeNull();
    expect(projectsLink?.textContent?.trim()).toBe('Projekte');
  });

  it('Akzeptanzkriterium 4: ProjectsAdminComponent bietet einen sichtbaren Sub-Navigations-Link zu „Nutzer"', () => {
    const fixture = TestBed.createComponent(ProjectsAdminComponent);
    fixture.detectChanges();

    const usersLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement | null;
    expect(usersLink).not.toBeNull();
    expect(usersLink?.textContent?.trim()).toBe('Nutzer');
  });

  it('Akzeptanzkriterium 5: der aktive Sub-Bereich ist in der Sub-Navigation visuell hervorgehoben (routerLinkActive)', async () => {
    await router.navigateByUrl('/admin/users');
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    // RouterLinkActive setzt die CSS-Klasse per `queueMicrotask` (siehe Angular-Quelltext) — erst
    // nach einem Microtask-Tick steht sie im DOM.
    await Promise.resolve();

    const usersLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement;
    const projectsLink = fixture.nativeElement.querySelector(
      'a[href="/admin/projects"]',
    ) as HTMLAnchorElement;

    expect(usersLink.classList.contains('active')).toBeTrue();
    expect(projectsLink.classList.contains('active')).toBeFalse();
  });

  it('Akzeptanzkriterium 6 (Regression): direkter Aufruf von /admin/users durch einen Nicht-Admin bleibt weiterhin durch adminGuard zu /login umgeleitet', () => {
    TestBed.resetTestingModule();
    const tokenStorageSpy = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', [
      'getClaims',
    ]);
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin: false });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).not.toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('Akzeptanzkriterium 6 (Regression): direkter Aufruf von /admin/projects durch einen Nicht-Admin bleibt weiterhin durch adminGuard zu /login umgeleitet', () => {
    TestBed.resetTestingModule();
    const tokenStorageSpy = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', [
      'getClaims',
    ]);
    tokenStorageSpy.getClaims.and.returnValue(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).not.toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });
});

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload) — reicht für `TokenStorageService.getClaims()`, das keine Signaturprüfung vornimmt. */
function fakeToken(claims: { isSystemAdmin: boolean }): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', ...claims }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
