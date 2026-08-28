import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';

/**
 * Story-Test US-049 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich den
 * Frontend-Anteil (Akzeptanzkriterium 5) aus
 * `docs/usecases/US-049-kaltstart-performance-erster-request.md` — getrennt von den generischen
 * Komponententests in `login-page.component.spec.ts`.
 *
 * Der Backend-Anteil (Akzeptanzkriterien 1–4) ist als eigener Story-Test in
 * `tests/SlobSteak.Api.Tests/UserStories/US049_KaltstartPerformanceErsterRequestTests.cs`
 * abgedeckt (qa.md Abschnitt 1: „Betrifft eine Story beide Seiten, existiert je ein Story-Test pro
 * Seite; beide zusammen decken alle Akzeptanzkriterien ab, ohne Lücken oder Doppelungen“).
 * Akzeptanzkriterium 6 (kein bestehender Test bricht) ist kein eigener Testfall, sondern wird durch
 * den grünen Gesamtlauf von `ng test` selbst nachgewiesen.
 *
 * Beide Tests verwenden bewusst `HttpTestingController` mit einem echten, noch ausstehenden Request
 * (kein `flush()` vor Ablauf des Schwellenwerts) statt eines synchronen `AuthService`-Spys — nur so
 * lässt sich der zeitbasierte Zustandsübergang (`isTakingLonger`) realistisch nachstellen.
 * `fakeAsync()`/`tick()` sind in diesem zonelosen Projekt nicht nutzbar (siehe US-057-Kommentare in
 * `login-page.component.spec.ts`), daher `jasmine.clock()`.
 */
describe('US-049: Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart (Frontend-Anteil)', () => {
  let http: HttpTestingController;
  let navigateSpy: jasmine.Spy;

  function createSubmittedFixture(): ComponentFixture<LoginPageComponent> {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ email: 'user@example.com', password: 'correct-horse' });
    fixture.componentInstance['onSubmit']();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  it('Akzeptanzkriterium 5: reagiert der Login-Request länger als 3s, erhält der Nutzer eine sichtbare, erkennbare Rückmeldung, dass der Request bereits ungewöhnlich lange läuft', () => {
    jasmine.clock().install();
    try {
      const fixture = createSubmittedFixture();

      expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]')).toBeNull();

      jasmine.clock().tick(2999);
      fixture.detectChanges();
      expect(fixture.componentInstance['isTakingLonger']).toBeFalse();

      jasmine.clock().tick(1);
      fixture.detectChanges();
      expect(fixture.componentInstance['isTakingLonger']).toBeTrue();
      const notice: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]');
      expect(notice).not.toBeNull();
      expect(notice?.textContent).toContain('dauert ungewöhnlich lange');

      // Der Zustand ist ehrlich: sobald der Request tatsächlich beantwortet ist, verschwindet der
      // Hinweis wieder (kein dauerhaft "hängender" Eindruck).
      http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
      fixture.detectChanges();

      expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
      expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('Akzeptanzkriterium 5: löst der Login-Request vor Ablauf der 3s auf, erscheint zu keinem Zeitpunkt eine „dauert lange"-Rückmeldung — der Anknüpfungspunkt unterscheidet zuverlässig zwischen „Formular wartet" und „Request läuft bereits ungewöhnlich lange"', () => {
    jasmine.clock().install();
    try {
      const fixture = createSubmittedFixture();

      jasmine.clock().tick(50);
      http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
      fixture.detectChanges();

      expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]')).toBeNull();

      // Belegt, dass der Timer beim Aufräumen tatsächlich per clearTimeout() entfernt wurde (nicht
      // nur, dass er zufällig noch nicht gefeuert hat) — ein weiterer Tick über die 3s-Schwelle
      // hinaus darf den bereits abgeschlossenen Request nicht nachträglich als "taking longer"
      // markieren.
      jasmine.clock().tick(5000);
      fixture.detectChanges();
      expect(fixture.componentInstance['isTakingLonger']).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-testid="login-taking-longer-notice"]')).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
