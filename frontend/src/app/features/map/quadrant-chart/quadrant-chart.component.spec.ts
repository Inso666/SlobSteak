import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MapComparisonEntry, MapPoint } from '../map.service';
import { QuadrantChartComponent } from './quadrant-chart.component';

describe('QuadrantChartComponent', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [QuadrantChartComponent] });
    const fixture = TestBed.createComponent(QuadrantChartComponent);
    return fixture;
  }

  // Akzeptanzkriterium 1: vier bei 50/50 visuell getrennte Quadranten mit den vorgegebenen
  // Beschriftungen — unabhängig davon, ob Punkte vorhanden sind.
  it('should render the four quadrant labels and the 0-100 axis ticks', () => {
    const fixture = createComponent();
    fixture.componentInstance.points = [];
    fixture.componentInstance.perspective = 'PL';
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const text = nativeElement.textContent ?? '';

    expect(text).toContain('Eng betreuen');
    expect(text).toContain('Zufriedenstellen');
    expect(text).toContain('Informiert halten');
    expect(text).toContain('Beobachten');
    expect(nativeElement.querySelectorAll('.grid-line').length).toBe(2);
  });

  // Akzeptanzkriterium 5 (Leerzustand): leere Datenmenge rendert keine Punkte, aber weiterhin
  // Achsen/Quadranten (informativer leerer Koordinatenraum, SPEC-04 §3.6).
  it('should render no points for an empty data set', () => {
    const fixture = createComponent();
    fixture.componentInstance.points = [];
    fixture.componentInstance.perspective = 'PL';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.map-point').length).toBe(0);
  });

  // Akzeptanzkriterium 3: jeder Stakeholder aus der Map-Query wird als Punkt gerendert, korrekt an
  // Einfluss/Interesse positioniert (Prozent-Koordinaten, 0-100-Skala).
  it('should render one focusable, correctly positioned point per stakeholder for a non-empty data set', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 },
      { stakeholderId: 'sh-2', name: 'Erika Beispiel', influence: 10, interest: 20 },
    ];

    const fixture = createComponent();
    fixture.componentInstance.points = points;
    fixture.componentInstance.perspective = 'Architect';
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point');
    expect(buttons.length).toBe(2);
    expect(buttons[0].style.left).toBe('80%');
    expect(buttons[0].style.bottom).toBe('60%');
    expect(buttons[0].classList).toContain('map-point--architect');
    expect(buttons[0].getAttribute('aria-label')).toContain('Max Mustermann');
    expect(buttons[0].tagName).toBe('BUTTON');
  });

  // Akzeptanzkriterium 3: Klick auf einen Punkt emittiert dessen `stakeholderId` — die Navigation
  // zur Stakeholder-Detailseite (US-026) übernimmt die aufrufende Seite (`StakeholderMapPageComponent`).
  it('should emit pointSelected with the stakeholderId on click', () => {
    const points: MapPoint[] = [{ stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 80, interest: 60 }];
    const fixture = createComponent();
    fixture.componentInstance.points = points;
    fixture.componentInstance.perspective = 'PL';
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.pointSelected.subscribe((id) => (emitted = id));

    fixture.debugElement.query(By.css('.map-point')).nativeElement.click();

    expect(emitted).toBe('sh-1');
  });

  describe('compare mode (US-034)', () => {
    const comparisonEntries: MapComparisonEntry[] = [
      {
        stakeholderId: 'sh-both',
        name: 'Beide Sichten',
        primary: { influence: 30, interest: 40 },
        secondary: { influence: 75, interest: 20 },
      },
      {
        stakeholderId: 'sh-primary-only',
        name: 'Nur eigene Sicht',
        primary: { influence: 15, interest: 15 },
        secondary: null,
      },
      {
        stakeholderId: 'sh-secondary-only',
        name: 'Nur Vergleichssicht',
        primary: null,
        secondary: { influence: 90, interest: 85 },
      },
    ];

    function createCompareComponent() {
      const fixture = createComponent();
      fixture.componentInstance.perspective = 'PL';
      fixture.componentInstance.compareMode = true;
      fixture.componentInstance.comparePerspective = 'Architect';
      fixture.componentInstance.comparisonEntries = comparisonEntries;
      fixture.detectChanges();
      return fixture;
    }

    // Akzeptanzkriterium 2: Stakeholder mit Assessment in beiden Perspektiven erhalten zwei
    // visuell unterschiedene Punkte (Kreis für die eigene, Diamant für die Vergleichssicht) sowie
    // eine Verbindungslinie zwischen ihnen.
    it('should render two distinctly shaped points and a connection line for a stakeholder rated in both perspectives', () => {
      const fixture = createCompareComponent();

      const ownButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point:not(.map-point--compare)');
      const compareButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point--compare');
      const lines = fixture.nativeElement.querySelectorAll('.connection-line');

      expect(Array.from(ownButtons).some((button) => button.getAttribute('aria-label')?.includes('Beide Sichten'))).toBeTrue();
      expect(Array.from(compareButtons).some((button) => button.getAttribute('aria-label')?.includes('Beide Sichten'))).toBeTrue();
      expect(lines.length).toBe(1);

      const line = lines[0] as unknown as SVGLineElement;
      expect(line.getAttribute('x1')).toBe('30');
      expect(line.getAttribute('y1')).toBe('60'); // 100 - interest(40)
      expect(line.getAttribute('x2')).toBe('75');
      expect(line.getAttribute('y2')).toBe('80'); // 100 - interest(20)
    });

    // Akzeptanzkriterium 3: Stakeholder mit Assessment nur in einer der beiden Perspektiven zeigen
    // genau einen Punkt ohne Verbindungslinie.
    it('should render exactly one point without a connection line for stakeholders rated in only one perspective', () => {
      const fixture = createCompareComponent();

      const ownButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point:not(.map-point--compare)');
      const compareButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point--compare');

      expect(Array.from(ownButtons).some((button) => button.getAttribute('aria-label')?.includes('Nur eigene Sicht'))).toBeTrue();
      expect(Array.from(compareButtons).some((button) => button.getAttribute('aria-label')?.includes('Nur eigene Sicht'))).toBeFalse();

      expect(Array.from(compareButtons).some((button) => button.getAttribute('aria-label')?.includes('Nur Vergleichssicht'))).toBeTrue();
      expect(Array.from(ownButtons).some((button) => button.getAttribute('aria-label')?.includes('Nur Vergleichssicht'))).toBeFalse();

      // Insgesamt genau eine Verbindungslinie (für „Beide Sichten") — keine für die beiden
      // Einzel-Perspektiven-Stakeholder.
      expect(fixture.nativeElement.querySelectorAll('.connection-line').length).toBe(1);
    });

    // Akzeptanzkriterium 4: Legende erklärt die Farb-/Formcodierung je Rolle, konsistent zur
    // Punktkodierung im Chart (gleiche Rollen-Modifier-Klassen).
    it('should render a legend explaining the color/shape coding, consistent with the chart', () => {
      const fixture = createCompareComponent();

      const legend: HTMLElement = fixture.nativeElement.querySelector('.legend');
      expect(legend).not.toBeNull();
      expect(legend.textContent).toContain('Legende');
      expect(legend.textContent).toContain('PL — deine Sicht');
      expect(legend.textContent).toContain('Architect — Vergleich');
      expect(legend.textContent).toContain('Verbindungslinie');

      expect(legend.querySelector('.legend__swatch--circle.legend__swatch--pl')).not.toBeNull();
      expect(legend.querySelector('.legend__swatch--diamond.legend__swatch--architect')).not.toBeNull();
    });

    it('should not render a legend outside compare mode', () => {
      const fixture = createComponent();
      fixture.componentInstance.perspective = 'PL';
      fixture.componentInstance.points = [];
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.legend')).toBeNull();
    });

    // Akzeptanzkriterium 5: Hover über eine Verbindungslinie zeigt ein Tooltip mit der konkreten
    // Differenz, z. B. „Einfluss: PL 30 vs. Architect 75".
    it('should show the connection-line tooltip with the concrete difference on hover', () => {
      const fixture = createCompareComponent();

      const connectionGroup = fixture.debugElement.query(By.css('.connection'));
      connectionGroup.triggerEventHandler('mouseenter', {});
      fixture.detectChanges();

      const tooltipText: string = fixture.nativeElement.querySelector('.connection-tooltip').textContent;
      expect(tooltipText).toContain('Einfluss: PL 30 vs. Architect 75');
      expect(tooltipText).toContain('Interesse: PL 40 vs. Architect 20');

      connectionGroup.triggerEventHandler('mouseleave', {});
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.connection-tooltip')).toBeNull();
    });

    // Akzeptanzkriterium 5: Klick auf eine Verbindungslinie zeigt dieselbe Differenz — bleibt
    // sichtbar auch ohne Hover (per Tastatur/Klick "gepinnt").
    it('should show and keep showing the tooltip when the connection line is clicked, and toggle it off on a second click', () => {
      const fixture = createCompareComponent();

      const connectionGroup = fixture.debugElement.query(By.css('.connection'));
      connectionGroup.triggerEventHandler('click', {});
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.connection-tooltip')?.textContent).toContain('Einfluss: PL 30 vs. Architect 75');

      connectionGroup.triggerEventHandler('click', {});
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.connection-tooltip')).toBeNull();
    });

    it('should also allow activating the tooltip via keyboard (Enter)', () => {
      const fixture = createCompareComponent();

      const connectionGroup = fixture.debugElement.query(By.css('.connection'));
      connectionGroup.triggerEventHandler('keydown.enter', {});
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.connection-tooltip')).not.toBeNull();
    });
  });
});
