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

  it('Akzeptanzkriterium 4: das Icon-Design verwendet ausschließlich in SPEC-00 definierte Farb-Tokens, keine neu erfundene Farbe', () => {
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.detectChanges();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    // SPEC-00 §1.2: color.background (#10151F) sowie die drei bereits definierten Rollenfarben
    // color.role-pl/ct/ar (#8B7CF6/#2DD4BF/#38BDF8) — dieselbe Farbsprache wie das ebenfalls in
    // SPEC-00 §1.3 spezifizierte Perspektiven-Radar.
    const specTokenColors = ['#10151f', '#8b7cf6', '#2dd4bf', '#38bdf8'];
    const usedFills = Array.from(svg.querySelectorAll('rect, circle')).map((el) => el.getAttribute('fill')?.toLowerCase() ?? '');

    expect(usedFills.length).toBeGreaterThan(0);
    for (const fill of usedFills) {
      expect(specTokenColors).toContain(fill, `Farbe ${fill} ist kein in SPEC-00 §1.2 definiertes Token`);
    }
  });
});
