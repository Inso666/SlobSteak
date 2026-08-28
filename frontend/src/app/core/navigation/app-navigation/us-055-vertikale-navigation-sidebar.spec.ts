import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { AppNavigationComponent } from './app-navigation.component';

@Component({ selector: 'app-us055-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

/**
 * Story-Test US-055 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-055-vertikale-navigation-sidebar.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument. Generische Sichtbarkeits-/Admin-Eintrag-Tests
 * bleiben in `us-045-app-navigation.spec.ts`/`us-046-admin-navigation.spec.ts`.
 *
 * Steuert `BreakpointObserver` bewusst über ein kontrollierbares `Subject` statt sich auf die
 * tatsächliche Fenstergröße des Test-Browsers zu verlassen (Chrome Headless startet standardmäßig
 * mit 800×600, zufällig bereits unterhalb des 960px-Breakpoints) — nur so lassen sich Desktop- und
 * Mobile-Zustand deterministisch und unabhängig vom Testausführungs-Environment prüfen.
 */
describe('US-055: Globale Navigation als vertikale Sidebar statt horizontaler Kopfleiste', () => {
  let tokenStorage: TokenStorageService;
  let breakpointMatches: Subject<{ matches: boolean }>;

  beforeEach(() => {
    breakpointMatches = new Subject<{ matches: boolean }>();

    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter([
          { path: 'login', component: DummyRouteComponent },
          { path: 'projects', component: DummyRouteComponent },
        ]),
        { provide: BreakpointObserver, useValue: { observe: () => breakpointMatches.asObservable() } },
      ],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setToken('token-123');
  });

  afterEach(() => tokenStorage.clearToken());

  it('Akzeptanzkriterium 1: die Hauptnavigation ist auf Desktop-Breite eine feste, vertikale <aside>-Sidebar, keine horizontale Kopfleiste', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    breakpointMatches.next({ matches: false });
    fixture.detectChanges();

    const aside: HTMLElement | null = fixture.nativeElement.querySelector('aside.app-navigation');
    expect(aside).not.toBeNull();
    expect(aside?.tagName.toLowerCase()).toBe('aside');
    expect(getComputedStyle(aside!).flexDirection).toBe('column');
    // Keine horizontale Kopfleiste mehr: kein Wurzelelement mit der alten Zeilen-Anordnung.
    expect(fixture.nativeElement.querySelector('.app-navigation__menu-trigger')).toBeNull();
  });

  it('Akzeptanzkriterium 2: alle bisherigen Navigationspunkte (Projektübersicht, Admin, Abmelden) sind vorhanden und funktional unverändert', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    breakpointMatches.next({ matches: false });
    fixture.detectChanges();

    const projectsLink: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[href="/projects"]');
    const logoutButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.app-navigation__logout');
    expect(projectsLink?.textContent?.trim()).toBe('Projektübersicht');
    expect(logoutButton?.textContent?.trim()).toBe('Abmelden');
  });

  it('Akzeptanzkriterium 3: unterhalb 960px klappt die Sidebar zu einem p-drawer mit Hamburger-Trigger zusammen', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    breakpointMatches.next({ matches: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside.app-navigation')).toBeNull();
    const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector('.app-navigation__menu-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('Menü öffnen');

    // Drawer startet geschlossen — Klick auf den Trigger öffnet ihn.
    expect(fixture.componentInstance['drawerOpen']()).toBeFalse();
    trigger!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['drawerOpen']()).toBeTrue();
  });

  it('Akzeptanzkriterium 4: derselbe Navigations-Inhalt (kein Screen-lokales Overriding) wird sowohl im Desktop- als auch im Mobile-Zustand über denselben ngTemplateOutlet gerendert', () => {
    const desktopFixture = TestBed.createComponent(AppNavigationComponent);
    desktopFixture.detectChanges();
    breakpointMatches.next({ matches: false });
    desktopFixture.detectChanges();
    const desktopLinks = Array.from(desktopFixture.nativeElement.querySelectorAll('.app-navigation__links a')).map(
      (el) => (el as HTMLAnchorElement).textContent?.trim(),
    );

    breakpointMatches.next({ matches: true });
    desktopFixture.detectChanges();
    const trigger: HTMLButtonElement = desktopFixture.nativeElement.querySelector('.app-navigation__menu-trigger');
    trigger.click();
    desktopFixture.detectChanges();
    const mobileLinks = Array.from(desktopFixture.nativeElement.querySelectorAll('.app-navigation__links a')).map(
      (el) => (el as HTMLAnchorElement).textContent?.trim(),
    );

    expect(mobileLinks).toEqual(desktopLinks);
    expect(desktopLinks.length).toBeGreaterThan(0);
  });

  it('Akzeptanzkriterium 5: aria-label="Hauptnavigation" bleibt in beiden Zuständen erhalten', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    breakpointMatches.next({ matches: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Hauptnavigation"]')).not.toBeNull();

    breakpointMatches.next({ matches: true });
    fixture.detectChanges();
    // Ein geschlossener p-drawer rendert seinen Inhalt nicht — erst nach dem Öffnen ist die
    // innere <nav>-Landmarke im DOM prüfbar.
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.app-navigation__menu-trigger');
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav[aria-label="Hauptnavigation"]')).not.toBeNull();
  });
});
