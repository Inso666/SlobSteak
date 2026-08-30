import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DraggablePointComponent } from './draggable-point.component';

/** Baut ein minimales, aber typkompatibles `PointerEvent`-ähnliches Objekt, das direkt an die
 * (`protected`) Handler-Methoden übergeben wird — statt echte Browser-Pointer-Events zu
 * dispatchen, deren `setPointerCapture` unter Karma/ChromeHeadless ohne echten Hardware-Pointer
 * eine `DOMException` würfe. Für die reine Umrechnungslogik (Ziel dieser Tests) genügt ein
 * Objekt mit `clientX`/`clientY`/`pointerId` sowie no-op-Stubs für `target`/`preventDefault`/
 * `stopPropagation`. */
function pointerEvent(clientX: number, clientY: number, overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    clientX,
    clientY,
    pointerId: 1,
    target: { setPointerCapture: () => undefined } as unknown as EventTarget,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    ...overrides,
  } as PointerEvent;
}

function keyboardEvent(key: string, shiftKey = false): KeyboardEvent {
  return { key, shiftKey, preventDefault: () => undefined } as KeyboardEvent;
}

describe('DraggablePointComponent', () => {
  function createComponent(draggable: boolean) {
    TestBed.configureTestingModule({ imports: [DraggablePointComponent] });
    const fixture = TestBed.createComponent(DraggablePointComponent);
    fixture.componentInstance.influence = 30;
    fixture.componentInstance.interest = 40;
    fixture.componentInstance.ariaLabel = 'Max Mustermann — Einfluss 30, Interesse 40.';
    fixture.componentInstance.extraClasses = 'map-point--pl';
    fixture.componentInstance.draggable = draggable;
    // 200x200-Referenzfläche ab (0,0) — vereinfacht die erwarteten Prozentwerte (1px = 0.5%).
    fixture.componentInstance.surfaceRef = {
      nativeElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }) },
    } as ElementRef<HTMLElement>;
    fixture.detectChanges();
    return fixture;
  }

  // US-036 Akzeptanzkriterium 2: Klassen-/Cursor-Signalisierung für ziehbare vs. gesperrte Punkte.
  it('renders the button with the given classes and aria-label, and marks a non-draggable point as locked', () => {
    const fixture = createComponent(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');

    expect(button.classList).toContain('map-point--pl');
    expect(button.classList).toContain('map-point--locked');
    expect(button.getAttribute('aria-label')).toBe('Max Mustermann — Einfluss 30, Interesse 40.');
    expect(button.style.left).toBe('30%');
    expect(button.style.bottom).toBe('40%');
  });

  it('does not mark a draggable point as locked', () => {
    const fixture = createComponent(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');
    expect(button.classList).not.toContain('map-point--locked');
  });

  // Klick-zu-Navigation (US-032) bleibt für gesperrte wie ziehbare Punkte unverändert erhalten.
  it('emits activated on a plain click regardless of draggable', () => {
    const fixture = createComponent(false);
    let activated = false;
    fixture.componentInstance.activated.subscribe(() => (activated = true));

    fixture.debugElement.query(By.css('.map-point')).nativeElement.click();

    expect(activated).toBeTrue();
  });

  describe('pointer drag (US-036 Akzeptanzkriterium 3)', () => {
    it('does nothing on pointerdown/move/up when not draggable', () => {
      const fixture = createComponent(false);
      let dragEndValue: unknown;
      fixture.componentInstance.dragEnd.subscribe((value) => (dragEndValue = value));

      const instance = fixture.componentInstance as unknown as {
        onPointerDown(e: PointerEvent): void;
        onPointerMove(e: PointerEvent): void;
        onPointerUp(e: PointerEvent): void;
      };
      instance.onPointerDown(pointerEvent(100, 100));
      instance.onPointerMove(pointerEvent(150, 50));
      instance.onPointerUp(pointerEvent(150, 50));

      expect(dragEndValue).toBeUndefined();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.map-point__live')).toBeNull();
    });

    it('converts pointer position to influence/interest in real time and emits dragEnd on release', () => {
      const fixture = createComponent(true);
      const liveValues: { influence: number; interest: number }[] = [];
      let dragEndValue: { influence: number; interest: number } | undefined;
      fixture.componentInstance.dragEnd.subscribe((value) => (dragEndValue = value));

      const instance = fixture.componentInstance as unknown as {
        onPointerDown(e: PointerEvent): void;
        onPointerMove(e: PointerEvent): void;
        onPointerUp(e: PointerEvent): void;
      };

      // 200x200-Fläche: x=150 -> 75% Einfluss; y=50 -> 100 - 25% = 75% Interesse (y wächst nach unten).
      instance.onPointerDown(pointerEvent(150, 50));
      fixture.detectChanges();
      liveValues.push({ influence: fixture.componentInstance['displayInfluence'], interest: fixture.componentInstance['displayInterest'] });
      expect(fixture.nativeElement.querySelector('.map-point__live').textContent).toContain('Einfluss 75');

      instance.onPointerMove(pointerEvent(100, 100));
      fixture.detectChanges();
      expect(fixture.componentInstance['displayInfluence']).toBe(50);
      expect(fixture.componentInstance['displayInterest']).toBe(50);

      instance.onPointerUp(pointerEvent(100, 100));
      fixture.detectChanges();

      expect(dragEndValue).toEqual({ influence: 50, interest: 50 });
      // Nach dem Loslassen fällt die Anzeige auf die (noch unveränderten) @Input-Werte zurück —
      // die aufrufende Seite übernimmt die neuen Werte optimistisch in die Datenquelle.
      expect(fixture.componentInstance['displayInfluence']).toBe(30);
      expect(fixture.nativeElement.querySelector('.map-point__live')).toBeNull();
    });

    it('clamps the converted position to [0, 100] at the edges of the surface', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onPointerDown(e: PointerEvent): void };

      instance.onPointerDown(pointerEvent(-50, 400));

      expect(fixture.componentInstance['displayInfluence']).toBe(0);
      expect(fixture.componentInstance['displayInterest']).toBe(0);
    });

    it('does not emit a click-navigation right after releasing a drag', () => {
      const fixture = createComponent(true);
      let activated = false;
      fixture.componentInstance.activated.subscribe(() => (activated = true));
      const instance = fixture.componentInstance as unknown as { onPointerDown(e: PointerEvent): void; onPointerUp(e: PointerEvent): void };

      instance.onPointerDown(pointerEvent(150, 50));
      instance.onPointerUp(pointerEvent(150, 50));
      fixture.debugElement.query(By.css('.map-point')).nativeElement.click();

      expect(activated).toBeFalse();
    });
  });

  describe('keyboard alternative (SPEC-04 §2.3, WCAG 2.1 AA)', () => {
    it('ignores arrow keys when not draggable', () => {
      const fixture = createComponent(false);
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));

      expect(fixture.componentInstance['displayInfluence']).toBe(30);
    });

    it('moves by 1 on an arrow key and by 10 with Shift, without committing until Enter', () => {
      const fixture = createComponent(true);
      let dragEndValue: unknown;
      fixture.componentInstance.dragEnd.subscribe((value) => (dragEndValue = value));
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));
      expect(fixture.componentInstance['displayInfluence']).toBe(31);
      expect(dragEndValue).toBeUndefined();

      instance.onKeydown(keyboardEvent('ArrowUp', true));
      expect(fixture.componentInstance['displayInterest']).toBe(50);
      expect(dragEndValue).toBeUndefined();

      instance.onKeydown(keyboardEvent('Enter'));
      expect(dragEndValue).toEqual({ influence: 31, interest: 50 });
    });

    it('discards the pending change on Escape', () => {
      const fixture = createComponent(true);
      let dragEndValue: unknown;
      fixture.componentInstance.dragEnd.subscribe((value) => (dragEndValue = value));
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));
      instance.onKeydown(keyboardEvent('Escape'));

      expect(fixture.componentInstance['displayInfluence']).toBe(30);
      expect(dragEndValue).toBeUndefined();
    });

    it('commits a pending change on blur', () => {
      const fixture = createComponent(true);
      let dragEndValue: unknown;
      fixture.componentInstance.dragEnd.subscribe((value) => (dragEndValue = value));
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void; onBlur(): void };

      instance.onKeydown(keyboardEvent('ArrowLeft'));
      instance.onBlur();

      expect(dragEndValue).toEqual({ influence: 29, interest: 40 });
    });
  });

  // US-062: das `aria-label` des Punkt-`<button>` muss während einer unbestätigten Bewegung die
  // Live-Werte widerspiegeln (nicht nur den zuletzt bestätigten `@Input`-Stand aus `ariaLabel`),
  // damit ein Screenreader jede Pfeiltasten-Bewegung ankündigt, und nach Bestätigung/Verwerfen
  // zuverlässig zum korrekten Endzustand zurückkehren.
  describe('live aria-label announcement during an active move (US-062, SPEC-04 §2.3 WCAG 2.1 AA)', () => {
    function button(fixture: ReturnType<typeof createComponent>): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.map-point');
    }

    it('keeps the confirmed aria-label while the point is not being moved', () => {
      const fixture = createComponent(true);
      expect(button(fixture).getAttribute('aria-label')).toBe('Max Mustermann — Einfluss 30, Interesse 40.');
    });

    it('updates the aria-label to the live values after every single arrow-key press', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));
      fixture.detectChanges();
      expect(button(fixture).getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 40.');

      instance.onKeydown(keyboardEvent('ArrowUp'));
      fixture.detectChanges();
      expect(button(fixture).getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 41.');

      instance.onKeydown(keyboardEvent('ArrowDown', true));
      fixture.detectChanges();
      expect(button(fixture).getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 31 · Interesse 31.');
    });

    it('returns the aria-label to the newly confirmed (@Input) state after Enter commits the move', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));
      instance.onKeydown(keyboardEvent('Enter'));
      // Die aufrufende Seite übernimmt die neuen Werte optimistisch synchron in denselben
      // dragEnd-Handler-Aufruf (SPEC-04 §2.2) — hier durch direktes Aktualisieren der @Inputs
      // nachgebildet, bevor die nächste Change-Detection läuft.
      fixture.componentInstance.influence = 31;
      fixture.componentInstance.ariaLabel = 'Max Mustermann — Einfluss 31, Interesse 40.';
      fixture.detectChanges();

      expect(button(fixture).getAttribute('aria-label')).toBe('Max Mustermann — Einfluss 31, Interesse 40.');
    });

    it('returns the aria-label to the original (unchanged) @Input state after Escape discards the move', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void };

      instance.onKeydown(keyboardEvent('ArrowRight'));
      instance.onKeydown(keyboardEvent('ArrowUp'));
      fixture.detectChanges();
      expect(button(fixture).getAttribute('aria-label')).toContain('Wird verschoben');

      instance.onKeydown(keyboardEvent('Escape'));
      fixture.detectChanges();

      expect(button(fixture).getAttribute('aria-label')).toBe('Max Mustermann — Einfluss 30, Interesse 40.');
    });

    it('returns the aria-label to the confirmed state after blur commits the move', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onKeydown(e: KeyboardEvent): void; onBlur(): void };

      instance.onKeydown(keyboardEvent('ArrowLeft'));
      instance.onBlur();
      fixture.componentInstance.influence = 29;
      fixture.componentInstance.ariaLabel = 'Max Mustermann — Einfluss 29, Interesse 40.';
      fixture.detectChanges();

      expect(button(fixture).getAttribute('aria-label')).toBe('Max Mustermann — Einfluss 29, Interesse 40.');
    });

    it('also announces live values during an active mouse drag, using the same wording as the visual .map-point__live status', () => {
      const fixture = createComponent(true);
      const instance = fixture.componentInstance as unknown as { onPointerDown(e: PointerEvent): void };

      // 200x200-Fläche: x=150 -> 75% Einfluss; y=50 -> 75% Interesse (siehe Pointer-Drag-Tests oben).
      instance.onPointerDown(pointerEvent(150, 50));
      fixture.detectChanges();

      expect(button(fixture).getAttribute('aria-label')).toBe('Wird verschoben: Einfluss 75 · Interesse 75.');
      expect(fixture.nativeElement.querySelector('.map-point__live').textContent.trim()).toBe('Einfluss 75 · Interesse 75');
    });
  });
});
