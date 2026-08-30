import { TestBed } from '@angular/core/testing';
import { QuadrantChartComponent } from './quadrant-chart/quadrant-chart.component';

/**
 * Story-Test US-060 „Zoom-Cluster-Buttons auf der Map sichtbar und auffindbar machen" (Frontend-
 * Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die in
 * `docs/usecases/US-060-map-zoom-buttons-sichtbar.md` gelisteten Akzeptanzkriterien, in derselben
 * Reihenfolge wie im Story-Dokument:
 *
 * - Akzeptanzkriterium 1 + 3 (automatisierbarer Teil): sichtbares Icon-Kindelement je Button.
 *   Die Bewertung „Button-Größe vergleichbar mit anderen PrimeNG-Icon-Buttons" ist per TestBed
 *   nicht messbar (reines Layout-/CSS-Rendering) — dafür siehe Akzeptanzkriterium 4 (manueller
 *   Smoke-Test mit Screenshot, PR-Beschreibung).
 * - Akzeptanzkriterium 2: Klick auf die Buttons löst weiterhin exakt Zoom-In/-Out/Reset aus — der
 *   Fix ändert nur das Icon-Markup, nicht die Klick-Verdrahtung.
 * - Akzeptanzkriterium 4 (manueller Smoke-Test) und 6 (bestehende Tests bleiben grün) sind nicht
 *   Teil dieses automatisierten Story-Tests (siehe PR-Beschreibung bzw. vollständiger `ng test`-Lauf).
 */
describe('US-060: Zoom-Cluster-Buttons auf der Map sichtbar und auffindbar machen', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [QuadrantChartComponent] });
    const fixture = TestBed.createComponent(QuadrantChartComponent);
    fixture.componentInstance.points = [];
    fixture.componentInstance.perspective = 'PL';
    fixture.detectChanges();
    return fixture;
  }

  function zoomButton(
    fixture: ReturnType<typeof createComponent>,
    ariaLabel: string,
  ): HTMLButtonElement {
    const button = fixture.nativeElement.querySelector(
      `.zoom-cluster button[aria-label="${ariaLabel}"]`,
    );
    if (!button) {
      throw new Error(`Zoom-Cluster-Button mit aria-label "${ariaLabel}" nicht gefunden.`);
    }
    return button;
  }

  // Akzeptanzkriterium 1 + 3: alle drei Zoom-Cluster-Buttons besitzen ein sichtbares
  // Icon-Kindelement (`pi-plus`/`pi-minus`/`pi-refresh`) im DOM — vorher war der Button-Inhalt
  // komplett leer, da `icon="…"` kein Input der `[pButton]`-Attribut-Direktive ist.
  it('renders a pi-plus/pi-minus/pi-refresh icon child element for each of the three zoom-cluster buttons', () => {
    const fixture = createComponent();

    const zoomInButton = zoomButton(fixture, 'Vergrößern');
    const zoomOutButton = zoomButton(fixture, 'Verkleinern');
    const resetButton = zoomButton(fixture, 'Ansicht zurücksetzen');

    expect(zoomInButton.querySelector('.pi.pi-plus')).not.toBeNull();
    expect(zoomOutButton.querySelector('.pi.pi-minus')).not.toBeNull();
    expect(resetButton.querySelector('.pi.pi-refresh')).not.toBeNull();
  });

  // Akzeptanzkriterium 2: Funktionalität (Zoom-In/-Out/Reset) bleibt unverändert erhalten — Klick
  // auf jeden der drei Buttons löst weiterhin exakt die zugehörige, bereits seit US-036 bestehende
  // Zoom-Methode aus.
  it('keeps zoom-in/-out/reset behavior unchanged after the icon markup fix', () => {
    const fixture = createComponent();
    const instance = fixture.componentInstance as unknown as { zoomLevel: number };

    zoomButton(fixture, 'Vergrößern').click();
    fixture.detectChanges();
    expect(instance.zoomLevel).toBe(1.5);

    zoomButton(fixture, 'Vergrößern').click();
    fixture.detectChanges();
    expect(instance.zoomLevel).toBe(2);

    zoomButton(fixture, 'Verkleinern').click();
    fixture.detectChanges();
    expect(instance.zoomLevel).toBe(1.5);

    zoomButton(fixture, 'Ansicht zurücksetzen').click();
    fixture.detectChanges();
    expect(instance.zoomLevel).toBe(1);
  });
});
