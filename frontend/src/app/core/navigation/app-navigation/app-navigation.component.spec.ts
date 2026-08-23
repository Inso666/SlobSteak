import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { AppNavigationComponent } from './app-navigation.component';
import { APP_NAV_LINKS } from './nav-items';

/**
 * Generische Komponententests für {@link AppNavigationComponent} — technische Details, die über
 * die in der Story-Datei gelisteten Akzeptanzkriterien hinausgehen (z. B. Erweiterbarkeit der
 * Nav-Item-Konfiguration für US-046). Der dedizierte, AC-für-AC-Nachweis liegt getrennt in
 * `us-045-app-navigation.spec.ts` (Konvention siehe .claude/agents/qa.md Abschnitt 1).
 */
describe('AppNavigationComponent', () => {
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [provideRouter([])],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => tokenStorage.clearToken());

  it('should create', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render exactly the configured nav links from nav-items.ts (Erweiterbarkeit für US-046)', () => {
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
