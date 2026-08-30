import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DraggablePointComponent } from './draggable-point/draggable-point.component';

/**
 * Story-Test US-064 „Einheitlicher, tokenisierter Opacity-Wert für gesperrte Map-Punkte"
 * (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die
 * in `docs/usecases/US-064-map-opacity-token-vereinheitlichen.md` gelisteten Akzeptanzkriterien,
 * in derselben Reihenfolge wie im Story-Dokument. Generische Rendering-/Interaktionstests bleiben
 * in `draggable-point.component.spec.ts`, `us-034-map-vergleich-ui.spec.ts` und
 * `us-036-map-dragdrop-ui.spec.ts`.
 */
describe('US-064: Einheitlicher, tokenisierter Opacity-Wert für gesperrte Map-Punkte', () => {
  function createPoint(draggable: boolean, extraClasses: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [DraggablePointComponent] });
    const fixture = TestBed.createComponent(DraggablePointComponent);
    fixture.componentInstance.influence = 30;
    fixture.componentInstance.interest = 40;
    fixture.componentInstance.ariaLabel = 'Max Mustermann — Einfluss 30, Interesse 40.';
    fixture.componentInstance.extraClasses = extraClasses;
    fixture.componentInstance.draggable = draggable;
    fixture.componentInstance.surfaceRef = {
      nativeElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 200,
          height: 200,
          right: 200,
          bottom: 200,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
    } as ElementRef<HTMLElement>;
    fixture.detectChanges();
    return fixture;
  }

  function opacityOf(button: HTMLButtonElement): string {
    return getComputedStyle(button).opacity;
  }

  // Akzeptanzkriterium 1/6: beide Sperr-Gründe (Vergleichspunkt UND eigener Punkt bei Rollen-/
  // Perspektiven-Mismatch) sind auf denselben Deckkraft-Wert vereinheitlicht.
  it('renders the compare point and the locked own point with the identical opacity value', () => {
    // Deckkraft wird jeweils sofort nach Erzeugung des Fixtures ausgelesen (statt beide Fixtures
    // erst anzulegen und danach zu vergleichen) — `TestBed.resetTestingModule()` für das zweite
    // Fixture entfernt das zuvor gerenderte Host-Element aus dem DOM-Container der Testumgebung,
    // wodurch `getComputedStyle` auf dem dann losgelösten ersten Button keinen Wert mehr liefert.
    const compareFixture = createPoint(false, 'map-point--architect map-point--compare');
    const compareButton: HTMLButtonElement =
      compareFixture.nativeElement.querySelector('.map-point');
    expect(compareButton.classList).toContain('map-point--locked');
    const compareOpacity = opacityOf(compareButton);

    const lockedOwnFixture = createPoint(false, 'map-point--architect');
    const lockedOwnButton: HTMLButtonElement =
      lockedOwnFixture.nativeElement.querySelector('.map-point');
    expect(lockedOwnButton.classList).toContain('map-point--locked');
    const lockedOwnOpacity = opacityOf(lockedOwnButton);

    expect(compareOpacity).toBe(lockedOwnOpacity);
    expect(compareOpacity).toBe('0.72');
  });

  // Akzeptanzkriterium 2: der vereinheitlichte Wert ist als benanntes CSS-Custom-Property/Token
  // definiert (`--app-map-point-locked-opacity`), nicht als wiederholtes Zahlen-Literal — die
  // tatsächlich gerenderte Deckkraft entspricht exakt dem zentral in `styles.css` definierten
  // Token-Wert.
  it('resolves the locked opacity from the central --app-map-point-locked-opacity token', () => {
    const tokenValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--app-map-point-locked-opacity')
      .trim();
    expect(tokenValue).toBe('0.72');

    const fixture = createPoint(false, 'map-point--pl');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');
    expect(opacityOf(button)).toBe(tokenValue);
  });

  // Akzeptanzkriterium 5: keine ungewollte Änderung an anderen, nicht mit „gesperrt" zusammen-
  // hängenden Opacity-Werten — ein ziehbarer (nicht gesperrter) Punkt bleibt vollständig deckend.
  it('leaves a draggable (non-locked) point fully opaque', () => {
    const fixture = createPoint(true, 'map-point--pl');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');

    expect(button.classList).not.toContain('map-point--locked');
    expect(opacityOf(button)).toBe('1');
  });

  // Wichtige Invariante (Story Abschnitt 4): der Vergleichs-Diamant behält seine Form-Unterscheidung
  // (Rotation/Radius) unverändert bei — diese Story betrifft ausschließlich die Opacity.
  it('keeps the compare diamond shape (rotation) unaffected by the opacity unification', () => {
    const fixture = createPoint(false, 'map-point--architect map-point--compare');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');

    expect(getComputedStyle(button).transform).toContain('matrix');
    expect(button.classList).toContain('map-point--compare');
  });
});
