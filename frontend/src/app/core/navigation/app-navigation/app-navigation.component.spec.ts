import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { AppNavigationComponent } from './app-navigation.component';
import { APP_NAV_LINKS } from './nav-items';

/**
 * Generische Komponententests für {@link AppNavigationComponent} — technische Details, die über
 * die in den Story-Dateien gelisteten Akzeptanzkriterien hinausgehen. Der dedizierte,
 * AC-für-AC-Nachweis liegt getrennt in `us-045-app-navigation.spec.ts` (Sichtbarkeit/Abmelden),
 * `../../../features/admin/us-046-admin-navigation.spec.ts` (Admin-Eintrag) und
 * `us-055-vertikale-navigation-sidebar.spec.ts` (Sidebar/Drawer-Umschaltung) — Konvention siehe
 * .claude/agents/qa.md Abschnitt 1.
 */
describe('AppNavigationComponent', () => {
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter([]),
        // US-055: Chrome Headless startet standardmäßig mit einem 800×600-Fenster, unterhalb des
        // 960px-Sidebar/Drawer-Breakpoints — ohne diesen Stub würden diese (nicht
        // responsive-spezifischen) Tests den mobilen, initial geschlossenen Drawer statt der
        // Desktop-Sidebar treffen. Das eigentliche Responsive-Verhalten wird gezielt in
        // `us-055-vertikale-navigation-sidebar.spec.ts` geprüft.
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => tokenStorage.clearToken());

  it('should create', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render exactly the configured static nav links from nav-items.ts for a non-admin session (no Admin entry)', () => {
    tokenStorage.setToken('token-123');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.app-navigation__links a');
    expect(links.length).toBe(APP_NAV_LINKS.length);
    expect((links[0] as HTMLAnchorElement).textContent?.trim()).toBe(APP_NAV_LINKS[0].label);
  });

  it('should not throw when destroyed', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(() => fixture.destroy()).not.toThrow();
  });
});
