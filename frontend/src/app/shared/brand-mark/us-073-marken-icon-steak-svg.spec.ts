import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BrandMarkComponent } from './brand-mark.component';
import { AppNavigationComponent } from '../../core/navigation/app-navigation/app-navigation.component';
import { TokenStorageService } from '../../features/auth/token-storage.service';

/**
 * Story-Test US-073 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-073-marken-icon-steak-svg.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 3 (`frontend/public/icon.svg`/`favicon.ico` zeigen dieselbe Steak-Grafik) ist
 * bewusst NICHT Teil dieser Testklasse: beides sind reine, build-zeitliche Assets außerhalb des
 * von Karma/TestBed geladenen Angular-Komponentenbaums (siehe bereits US-053-Story-Test,
 * `us-053-app-identitaet-browser.spec.ts`) — dort direkt am Artefakt verifiziert (Story-Datei
 * „Anmerkungen des Agenten“). Akzeptanzkriterium 8 (kein bestehender Test bricht) ist kein eigener
 * Testfall, sondern wird durch den grünen Gesamtlauf von `ng test`/`ng lint`/`ng build` selbst
 * nachgewiesen (CLAUDE.md Abschnitt 2/3, qa.md Abschnitt 2).
 */
describe('US-073: Einheitliches Marken-Icon (Steak-SVG) app-weit statt abstraktem Drei-Kreise-Symbol', () => {
  it('Akzeptanzkriterium 1: BrandMarkComponent rendert das Steak-Icon (Farbverlauf #c96a45 -> #a8502f -> #6f2f1c) statt der drei Kreise', () => {
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.detectChanges();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg');

    // Keine der drei alten Rollenfarben (US-053, SPEC-00 §1.2) kommt mehr vor.
    const oldThreeCircleColors = ['#8b7cf6', '#2dd4bf', '#38bdf8'];
    const allFillsAndStrokes = Array.from(svg.querySelectorAll('*'))
      .flatMap((el) => [el.getAttribute('fill'), el.getAttribute('stroke')])
      .filter((value): value is string => value !== null)
      .map((value) => value.toLowerCase());
    for (const oldColor of oldThreeCircleColors) {
      expect(allFillsAndStrokes).not.toContain(oldColor, `alte Drei-Kreis-Farbe ${oldColor} darf nicht mehr vorkommen`);
    }
    expect(svg.querySelectorAll('circle').length).toBe(0);

    // Der dokumentierte Steak-Farbverlauf ist vorhanden.
    const gradientStops = Array.from(svg.querySelectorAll('linearGradient stop')).map((el) =>
      el.getAttribute('stop-color')?.toLowerCase(),
    );
    expect(gradientStops).toEqual(['#c96a45', '#a8502f', '#6f2f1c']);

    // Grillstreifen-Andeutung: mehrere Linien-Gruppen zusätzlich zur Steak-Grundform.
    expect(svg.querySelectorAll('g path').length).toBeGreaterThan(0);
  });

  it('Akzeptanzkriterium 2: die Sidebar-Brand-Zeile bindet app-brand-mark zusätzlich zum bestehenden Text "SlobSteak" ein', () => {
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
    const tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setToken('token-123');

    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const brandMarkComponents = fixture.debugElement.queryAll(By.directive(BrandMarkComponent));
    expect(brandMarkComponents.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.app-navigation__brand')?.textContent?.trim()).toBe('SlobSteak');

    tokenStorage.clearToken();
  });

  it('Akzeptanzkriterium 4: aria-hidden="true" und focusable="false" bleiben auf dem dekorativen Icon erhalten', () => {
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.detectChanges();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });
});
