import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { SessionNoticeService } from '../../../core/services/session-notice.service';
import { SESSION_EXPIRED_MESSAGE } from '../../../core/messages/http-error-messages';

/**
 * Story-Test US-057 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-057-login-haengt-nach-erfolgreicher-anmeldung.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument — getrennt von den
 * generischen, tiefer gehenden Komponententests in `login-page.component.spec.ts` und den
 * verwandten Stories `us-043-formular-feedback-doppelsubmit-schutz.spec.ts` /
 * `us-044-http-error-handling.spec.ts`.
 *
 * Alle Tests verwenden bewusst `HttpTestingController` statt eines `AuthService`-Spys mit
 * synchronem `of(...)`: nur ein über `flush()` erst nach dem ursprünglichen `onSubmit()`-Aufruf
 * aufgelöster Request reproduziert das eigentliche Bug-Muster (Antwort trifft außerhalb eines von
 * Angular beobachteten Ereignisses ein, siehe Story Abschnitt 2/„Root Cause“). Nach `flush()` wird
 * ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ausgelöst — bewusst KEIN
 * zusätzlicher simulierter Klick/keine Tastatureingabe.
 */
describe('US-057: Login-Flow bleibt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen', () => {
  let http: HttpTestingController;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  function createSubmittedFixture(email: string, password: string): ComponentFixture<LoginPageComponent> {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ email, password });
    fixture.componentInstance['onSubmit']();
    // `onSubmit()` wird hier direkt aufgerufen statt per simuliertem Klick — die dadurch
    // synchron gesetzte `isSubmitting = true`-Zuweisung ist NICHT Teil des in dieser Story
    // behobenen Bugs (der betrifft ausschließlich die async `subscribe()`-Callbacks) und darf
    // daher regulär über einen manuellen `detectChanges()` sichtbar gemacht werden.
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    // Es existiert keine echte `/projects`-Route in `provideRouter([])` — die Navigation wird
    // gemockt, damit ausschließlich der Aufruf selbst (und nicht das Routing) geprüft wird.
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  it('Akzeptanzkriterium 1: nach erfolgreicher Anmeldung (mustChangePassword: false) navigiert die Anwendung ohne jede weitere Nutzerinteraktion zuverlässig zu /projects', () => {
    const fixture = createSubmittedFixture('admin@example.com', 'correct-horse');

    http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
    // Bewusst KEIN simulierter Klick/Tastatur-Event nach flush() — nur der reguläre CD-Zyklus, den
    // Zone.js in Produktion automatisch auslösen würde.
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
    expect(fixture.componentInstance['mustChangePassword']).toBeFalse();
  });

  it('Akzeptanzkriterium 2: nach erfolgreicher Anmeldung mit mustChangePassword: true erscheint ohne weitere Nutzerinteraktion das PasswordChangeModalComponent', () => {
    const fixture = createSubmittedFixture('neuernutzer@example.com', 'correct-horse');

    http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: true });
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-password-change-modal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('main.login')).toBeNull();
  });

  it('Akzeptanzkriterium 3: bei einer fehlgeschlagenen Anmeldung (401) verlässt der Button ohne weitere Nutzerinteraktion zuverlässig den Verarbeitungs-Zustand und die Fehlermeldung „E-Mail oder Passwort ist falsch.“ erscheint', () => {
    const fixture = createSubmittedFixture('admin@example.com', 'falsches-passwort');

    http.expectOne('/api/v1/auth/login').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    // `disabled` wird bewusst NICHT geprüft: Nach dem Fehlerfall leert `onSubmit()` das
    // Passwort-Feld, wodurch die Formular-Validierung (`Validators.required`) den Button erneut
    // sperrt — das ist beabsichtigtes Verhalten der Formular-Validierung (SPEC-00 §2), nicht der
    // hier zu behebende Verarbeitungs-Zustand. Entscheidend für „Verarbeitungs-Zustand verlassen“
    // sind `aria-busy` und das Label, die ausschließlich von `isSubmitting` abhängen.
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.textContent).toContain('Anmelden');
    expect(fixture.nativeElement.textContent).toContain('E-Mail oder Passwort ist falsch.');
    expect(fixture.componentInstance['form'].controls.password.value).toBe('');
  });

  it('Akzeptanzkriterium 4: ein automatisierter HttpTestingController-Test beweist für Erfolgs- und Fehlerfall, dass der Button nach flush() ohne zusätzliche simulierte Interaktion den Verarbeitungs-Zustand verlässt', () => {
    // Erfolgsfall
    let fixture = createSubmittedFixture('admin@example.com', 'correct-horse');
    let button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.getAttribute('aria-busy')).toBe('true');

    http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.disabled).toBeFalse();
    expect(button.getAttribute('aria-busy')).toBe('false');

    // Fehlerfall — frische Komponente, gleiche Testumgebung
    fixture = createSubmittedFixture('admin@example.com', 'falsches-passwort');
    button = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.getAttribute('aria-busy')).toBe('true');

    http.expectOne('/api/v1/auth/login').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    // `disabled` wird im Fehlerfall bewusst nicht geprüft (siehe Akzeptanzkriterium 3 oben) — der
    // Button ist hier durch das geleerte, wieder invalide Passwort-Feld gesperrt, nicht durch den
    // Verarbeitungs-Zustand.
    button = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.getAttribute('aria-busy')).toBe('false');
  });

  it('Akzeptanzkriterium 5: die bestehenden Schutzmechanismen aus US-043 (Doppel-Submit-Schutz) und US-044 (Sitzungsablauf-Hinweistext) bleiben durch die markForCheck()-Ergänzung unverändert nutzbar', () => {
    // US-043 Akzeptanzkriterium 3/5: ein zweiter Trigger während eines laufenden Requests darf
    // weiterhin keinen zweiten HTTP-Request auslösen — unverändert durch diese Story.
    const fixture = createSubmittedFixture('admin@example.com', 'correct-horse');
    fixture.componentInstance['onSubmit'](); // zweiter Trigger während des laufenden Requests
    http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledTimes(1);

    // US-044 Akzeptanzkriterium 2: der einmalige Sitzungsablauf-Hinweistext aus
    // `SessionNoticeService` bleibt unverändert nutzbar — unabhängig vom onSubmit()-Fix.
    const sessionNotice = TestBed.inject(SessionNoticeService);
    sessionNotice.set(SESSION_EXPIRED_MESSAGE);
    const noticeFixture = TestBed.createComponent(LoginPageComponent);
    noticeFixture.detectChanges();
    expect(noticeFixture.componentInstance['sessionExpiredMessage']).toBe(SESSION_EXPIRED_MESSAGE);
    expect(sessionNotice.consume()).toBeNull();
  });

  it('Akzeptanzkriterium 6: abschließender Integrationsnachweis — nach einem fehlgeschlagenen Versuch führt ein erneuter, korrigierter Login-Versuch ohne weitere Nutzerinteraktion zuverlässig zur Weiterleitung', () => {
    const fixture = createSubmittedFixture('admin@example.com', 'falsches-passwort');

    http.expectOne('/api/v1/auth/login').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    // `disabled` wird bewusst nicht geprüft (siehe Akzeptanzkriterium 3) — maßgeblich ist
    // `aria-busy`, das ausschließlich den Verarbeitungs-Zustand widerspiegelt.
    let button: HTMLButtonElement = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('E-Mail oder Passwort ist falsch.');

    // Korrigierter, zweiter Versuch — beweist, dass markForCheck() nicht nur beim ersten Request
    // greift, sondern bei jedem erneuten subscribe()-Zyklus zuverlässig funktioniert.
    fixture.componentInstance['form'].controls.password.setValue('richtiges-passwort');
    fixture.componentInstance['onSubmit']();
    http.expectOne('/api/v1/auth/login').flush({ token: 'fake-jwt-token', mustChangePassword: false });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
    button = fixture.nativeElement.querySelector('button.app-processing-button');
    expect(button.disabled).toBeFalse();
    expect(button.getAttribute('aria-busy')).toBe('false');
  });
});
