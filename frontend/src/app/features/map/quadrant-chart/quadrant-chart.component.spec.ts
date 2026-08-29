import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MapPoint } from '../map.service';
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
});
