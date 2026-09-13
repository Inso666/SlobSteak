import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';
import { Password } from 'primeng/password';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../auth.service';
import { PasswordChangeModalComponent } from '../password-change-modal/password-change-modal.component';
import { TokenStorageService } from '../token-storage.service';
import { routes } from '../../../app.routes';

/**
 * Story-Test US-089 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-089-login-layout-deutsches-passwort-feedback.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 2 (Kartenbreite/-radius/-innenabstand/-schatten) und der Brand-/Tagline-Anteil
 * von Akzeptanzkriterium 4 sind reine Design-Werte ohne eigenständige, in dieser Umgebung
 * PrimeNG-theme-unabhängig prüfbare Fachlogik (die Werte hängen an PrimeNG-v18-Design-Tokens, siehe
 * Kommentare in `login-page.component.css`/`styles.css`) — die Story selbst verlangt dafür laut
 * Akzeptanzkriterium 9 einen manuellen Smoke-Test mit Screenshot-Nachweis statt eines
 * automatisierten Tests (Akzeptanzkriterium 8 zählt nur Zentrierung, Button-Breite,
 * Passwort-Feedback und Redirect explizit als automatisiert zu belegen auf). Der
 * Feld-Label-/Eingabefeld-Anteil von Akzeptanzkriterium 4 wird bewusst NICHT umgesetzt — siehe
 * „Anmerkungen des Agenten" in der Story-Datei (SPEC-00 §2 schreibt eine screen-übergreifend
 * einheitliche Formularfeld-/Label-Optik vor, die Login namentlich einschließt; ein
 * Login-spezifischer Abweichwert hätte diese Invariante gebrochen, CLAUDE.md Abschnitt 6). Ein
 * eigener Testfall würde hier lediglich den absichtlich beibehaltenen Ist-Zustand dokumentieren –
 * das übernehmen stattdessen die bestehenden, unverändert grün bleibenden US-047/US-054-Tests.
 * Akzeptanzkriterium 9 (manueller Smoke-Test) und Akzeptanzkriterium 10 (dieser Story-Test selbst)
 * sind Prozessnachweise, siehe PR-Text. Akzeptanzkriterium 11 (bestehende Tests bleiben grün) wird
 * durch den vollständigen grünen `ng test`-Lauf selbst nachgewiesen (CLAUDE.md Abschnitt 2/3).
 */
describe('US-089: Login-Kartenlayout, volle Anmelden-Breite, deutsches Passwort-Feedback, Redirect angemeldeter Nutzer', () => {
  describe('Login-Seite', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
      authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

      await TestBed.configureTestingModule({
        imports: [LoginPageComponent],
        providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
      }).compileComponents();
    });

    it('Akzeptanzkriterium 1: die Login-Karte wird über die zentrierende `.login`-Klasse horizontal UND vertikal im Viewport zentriert', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      const main: HTMLElement = fixture.nativeElement.querySelector('main.login');
      expect(main).not.toBeNull();

      const styles = getComputedStyle(main);
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('column');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
      // `min-height: 100vh` statt des zuvor hier gesetzten `margin: var(--app-space-xl) auto`
      // (das nur horizontal zentrierte, siehe Story Befund 1) — ein positiver Wert genügt als
      // Nachweis, dass die Regel überhaupt greift (der exakte Pixelwert hängt vom
      // Testfenster-Viewport ab).
      expect(parseFloat(styles.minHeight)).toBeGreaterThan(0);
    });

    it('Akzeptanzkriterium 3: die "Anmelden"-Schaltfläche trägt die Voll-Breite-Klasse `app-processing-button--full-width` statt nur inhaltsbreit zu rendern', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
      expect(button).not.toBeNull();
      expect(button.classList).toContain('app-processing-button--full-width');
      expect(button.textContent).toContain('Anmelden');
    });

    it('Akzeptanzkriterium 7: rendert im abgemeldeten Zustand weiterhin ohne Sidebar (kein `app-navigation`-Element)', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-navigation')).toBeNull();
    });
  });

  describe('Passwort-Änderungs-Dialog', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
      authServiceSpy = jasmine.createSpyObj('AuthService', ['changePassword']);

      await TestBed.configureTestingModule({
        imports: [PasswordChangeModalComponent],
        providers: [{ provide: AuthService, useValue: authServiceSpy }],
      }).compileComponents();
    });

    it('Akzeptanzkriterium 5: das Stärke-Meter-Feld ("Neues Passwort", `[feedback]="true"`) zeigt deutschsprachige promptLabel/weakLabel/mediumLabel/strongLabel statt des englischen Standardtexts', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();

      const passwordInstances = fixture.debugElement.queryAll(By.directive(Password)).map((debugEl) => debugEl.injector.get(Password));
      // Zwei `p-password`-Felder im Dialog ("Neues Passwort" mit Feedback, "Passwort bestätigen"
      // ohne) — genau eines davon hat `[feedback]="true"` (SPEC-01 §2.3, bewusst unverändert
      // beibehalten, siehe Template-Kommentar).
      const feedbackField = passwordInstances.find((instance) => instance.feedback());
      expect(feedbackField).withContext('Erwarte genau ein p-password-Feld mit [feedback]="true" im Dialog').toBeTruthy();

      expect(feedbackField!.promptLabel()).toBe('Passwort eingeben');
      expect(feedbackField!.weakLabel()).toBe('Schwach');
      expect(feedbackField!.mediumLabel()).toBe('Mittel');
      expect(feedbackField!.strongLabel()).toBe('Stark');

      // Regressionsschutz gegen den ursprünglich gemeldeten englischen Standardtext (Issue #132).
      expect(feedbackField!.promptLabel()).not.toBe('Enter a password');
      expect(feedbackField!.weakLabel()).not.toBe('Weak');
      expect(feedbackField!.mediumLabel()).not.toBe('Medium');
      expect(feedbackField!.strongLabel()).not.toBe('Strong');
    });
  });

  describe('Redirect angemeldeter Nutzer:innen (Nebenbefund, Akzeptanzkriterium 6)', () => {
    let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

    beforeEach(() => {
      tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getToken']);

      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
      });
    });

    function loginRouteGuard(): CanActivateFn {
      const loginRoute = routes.find((route) => route.path === 'login');
      const guard = loginRoute?.canActivate?.[0];
      if (!guard) {
        throw new Error('Erwartete canActivate-Guard-Konfiguration auf der `login`-Route wurde nicht gefunden.');
      }
      return guard as CanActivateFn;
    }

    it('Akzeptanzkriterium 6: leitet bereits angemeldete Nutzer:innen von /login auf /projects weiter, statt einen leeren Inhaltsbereich zu zeigen', () => {
      tokenStorageSpy.getToken.and.returnValue('some-token');

      const guard = loginRouteGuard();
      const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));

      expect((result as UrlTree).toString()).toBe('/projects');
    });

    it('Akzeptanzkriterium 6 (Gegenprobe): lässt /login unverändert erreichbar, solange keine Session besteht', () => {
      tokenStorageSpy.getToken.and.returnValue(null);

      const guard = loginRouteGuard();
      const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));

      expect(result).toBeTrue();
    });

    it('Akzeptanzkriterium 6: `/` leitet über `redirectTo: \'login\'` auf dieselbe, guard-geschützte Route weiter — kein zweiter, separat zu pflegender Guard nötig', () => {
      const emptyRoute = routes.find((route) => route.path === '');
      expect(emptyRoute?.redirectTo).toBe('login');
    });
  });
});
