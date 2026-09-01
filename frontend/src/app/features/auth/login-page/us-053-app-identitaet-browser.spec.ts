import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../auth.service';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

/**
 * Story-Test US-053 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-053-app-identitaet-browser.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 1 (`<title>` in `frontend/src/index.html`) und Akzeptanzkriterium 2
 * (`favicon.ico`/`icon.svg` zeigen ein SlobSteak-eigenes Icon statt des Angular-Standardicons)
 * sind bewusst NICHT Teil dieser Testklasse: `index.html` und die Icon-Dateien sind reine,
 * build-zeitliche Assets außerhalb des von Karma/TestBed geladenen Angular-Komponentenbaums —
 * `document.title` würde in einem Karma-Test ohnehin nur den Titel von Karmas eigener
 * Test-Runner-Seite widerspiegeln, nicht den von `index.html`, und Binärdateien lassen sich nicht
 * sinnvoll gegen eine DOM-Assertion prüfen. Beide Kriterien wurden stattdessen direkt am Artefakt
 * verifiziert (Datei-Inhalt von `index.html` bzw. das gerenderte Icon selbst, siehe Story-Datei
 * „Anmerkungen des Agenten"). Akzeptanzkriterium 5 (kein bestehender Test bricht) ist kein eigener
 * Testfall, sondern wird durch den grünen Gesamtlauf von `ng test`/`ng lint`/`ng build` selbst
 * nachgewiesen (CLAUDE.md Abschnitt 2/3, qa.md Abschnitt 2).
 */
describe('US-053: App-Identität im Browser (Tab-Titel, Favicon, Marken-Icon)', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();
  });

  it('Akzeptanzkriterium 3: das wiederverwendbare Marken-Icon steht als eigenständiges Angular-Bauteil zur Verfügung und wird auf der Login-Seite eingesetzt', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const brandMark = fixture.debugElement.nativeElement.querySelector('app-brand-mark');
    expect(brandMark).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('SlobSteak');

    // Das Icon selbst ist eine eigenständige, wiederverwendbare Komponente (nicht nur inline auf
    // der Login-Seite dupliziertes Markup) — direkter Nachweis über den Komponententyp.
    const brandMarkComponents = fixture.debugElement.queryAll(By.directive(BrandMarkComponent));
    expect(brandMarkComponents.length).toBe(1);
  });

  it('Akzeptanzkriterium 4 (seit US-073 überholt): das Icon-Design verwendet eine dokumentierte, keine frei erfundene Farbe', () => {
    // US-073 (Issue #98, QA-Design-Abgleich vom 30.08.2026): das hier ursprünglich geprüfte
    // Drei-Kreise-Icon (SPEC-00-Rollenfarben) wurde durch die in
    // `docs/design/S2-Projektuebersicht-Wireframe.html` (12 Artboards, übereinstimmend) vorgegebene
    // Steak-Grafik ersetzt — deren Farbverlauf ist bewusst eine dokumentierte Marken-/
    // Illustrationsfarbe statt eines SPEC-00-Tokens (US-073 „Wichtige Invarianten“). Die
    // ursprüngliche Kernaussage von Akzeptanzkriterium 4 — keine frei erfundene Farbe, sondern eine
    // aus einer verbindlichen Quelle abgeleitete — bleibt geprüft, nur die Quelle wechselt von
    // SPEC-00 zu docs/design. Keine bisher geprüfte fachliche Aussage geht verloren (CLAUDE.md
    // Abschnitt 3).
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.detectChanges();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    const documentedBrandGradient = ['#c96a45', '#a8502f', '#6f2f1c'];
    const gradientStops = Array.from(svg.querySelectorAll('linearGradient stop')).map(
      (el) => el.getAttribute('stop-color')?.toLowerCase() ?? '',
    );

    expect(gradientStops).toEqual(documentedBrandGradient);
  });
});
