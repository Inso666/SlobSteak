import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { authGuard } from '../../../features/auth/auth.guard';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { AppNavigationComponent } from './app-navigation.component';

@Component({ selector: 'app-us045-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

/**
 * Story-Test US-045 „Globale Navigation (Shell) inkl. Abmelden-Funktion“. Jeder Testfall bildet
 * genau ein Akzeptanzkriterium aus der Story-Datei ab, in derselben Reihenfolge wie dort gelistet
 * (Konvention siehe .claude/agents/qa.md Abschnitt 1). Generische, über die Akzeptanzkriterien
 * hinausgehende Komponententests liegen getrennt in `app-navigation.component.spec.ts`.
 */
describe('US-045: Globale Navigation (Shell) inkl. Abmelden-Funktion', () => {
  let tokenStorage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter([
          { path: 'login', component: DummyRouteComponent },
          { path: 'projects', component: DummyRouteComponent, canActivate: [authGuard] },
        ]),
        // US-055: erzwingt die Desktop-Sidebar statt des mobilen Drawers, siehe Begründung in
        // `app-navigation.component.spec.ts`.
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
    tokenStorage.clearToken();
  });

  afterEach(() => tokenStorage.clearToken());

  it('Akzeptanzkriterium 1: Navigation ist bei fehlendem Session-Token nicht sichtbar (z. B. auf /login)', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('Akzeptanzkriterium 1: Navigation ist sichtbar, sobald ein gültiges Session-Token vorhanden ist', () => {
    tokenStorage.setToken('token-123');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).not.toBeNull();
  });

  it('Akzeptanzkriterium 1: Navigation bleibt auf /login ausgeblendet, selbst wenn noch ein Token im Storage liegt (kein Guard verhindert den manuellen Aufruf von /login durch einen angemeldeten Nutzer)', async () => {
    tokenStorage.setToken('token-123');
    await router.navigateByUrl('/login');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('Akzeptanzkriterium 2: enthält mindestens „Projektübersicht" (Link zu /projects) und „Abmelden"', () => {
    tokenStorage.setToken('token-123');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const projectsLink = fixture.nativeElement.querySelector(
      'a[href="/projects"]',
    ) as HTMLAnchorElement | null;
    expect(projectsLink).not.toBeNull();
    expect(projectsLink?.textContent?.trim()).toBe('Projektübersicht');

    const logoutButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    expect(logoutButton?.textContent?.trim()).toBe('Abmelden');
  });

  it('Akzeptanzkriterium 3: Sichtbarkeit reagiert auf einen Navigationswechsel (Login) ohne manuellen Reload', async () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();

    tokenStorage.setToken('token-123');
    await router.navigateByUrl('/projects');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).not.toBeNull();
  });

  it('Akzeptanzkriterium 3: Sichtbarkeit reagiert auf einen Navigationswechsel (Logout) ohne manuellen Reload', async () => {
    tokenStorage.setToken('token-123');
    await router.navigateByUrl('/projects');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).not.toBeNull();

    tokenStorage.clearToken();
    await router.navigateByUrl('/login');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('Akzeptanzkriterium 4: Klick auf „Abmelden" ruft TokenStorageService.clearToken() auf und navigiert zu /login', () => {
    tokenStorage.setToken('token-123');
    const clearTokenSpy = spyOn(tokenStorage, 'clearToken').and.callThrough();
    const navigateSpy = spyOn(router, 'navigate').and.callThrough();
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    logoutButton.click();

    expect(clearTokenSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('Akzeptanzkriterium 5: nach ausgelöstem Logout führt ein erneuter Aufruf einer geschützten Route über authGuard zurück zu /login', () => {
    tokenStorage.setToken('token-123');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    logoutButton.click();

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('Akzeptanzkriterium 6: Komponententest deckt Sichtbarkeits- und Logout-Verhalten vollständig ab', () => {
    // Ohne Token: nicht sichtbar/nicht im DOM.
    const hiddenFixture = TestBed.createComponent(AppNavigationComponent);
    hiddenFixture.detectChanges();
    expect(hiddenFixture.nativeElement.querySelector('nav')).toBeNull();

    // Mit Token: sichtbar.
    tokenStorage.setToken('token-123');
    const clearTokenSpy = spyOn(tokenStorage, 'clearToken').and.callThrough();
    const navigateSpy = spyOn(router, 'navigate').and.callThrough();
    const visibleFixture = TestBed.createComponent(AppNavigationComponent);
    visibleFixture.detectChanges();
    expect(visibleFixture.nativeElement.querySelector('nav')).not.toBeNull();

    // Klick auf Abmelden: löst clearToken() und Navigation zu /login aus.
    const logoutButton = visibleFixture.nativeElement.querySelector('button') as HTMLButtonElement;
    logoutButton.click();
    expect(clearTokenSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
