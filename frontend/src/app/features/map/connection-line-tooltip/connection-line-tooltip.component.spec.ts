import { TestBed } from '@angular/core/testing';
import { ConnectionDiff, ConnectionLineTooltipComponent } from './connection-line-tooltip.component';

describe('ConnectionLineTooltipComponent', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [ConnectionLineTooltipComponent] });
    return TestBed.createComponent(ConnectionLineTooltipComponent);
  }

  it('should render nothing when no data is set', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.connection-tooltip')).toBeNull();
  });

  // Akzeptanzkriterium 5: Tooltip zeigt die konkrete Differenz, z. B. „Einfluss: PL 30 vs. Architect 75".
  it('should render the stakeholder name and the concrete influence/interest difference between both perspectives', () => {
    const data: ConnectionDiff = {
      stakeholderName: 'Max Mustermann',
      primaryRole: 'PL',
      secondaryRole: 'Architect',
      primaryInfluence: 30,
      secondaryInfluence: 75,
      primaryInterest: 40,
      secondaryInterest: 20,
    };

    const fixture = createComponent();
    fixture.componentInstance.data = data;
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Max Mustermann');
    expect(text).toContain('Einfluss: PL 30 vs. Architect 75');
    expect(text).toContain('Interesse: PL 40 vs. Architect 20');
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('should position itself using the given left/top percentages', () => {
    const fixture = createComponent();
    fixture.componentInstance.data = {
      stakeholderName: 'Max Mustermann',
      primaryRole: 'PL',
      secondaryRole: 'Architect',
      primaryInfluence: 30,
      secondaryInfluence: 75,
      primaryInterest: 40,
      secondaryInterest: 20,
    };
    fixture.componentInstance.leftPercent = 55;
    fixture.componentInstance.topPercent = 30;
    fixture.detectChanges();

    const tooltip: HTMLElement = fixture.nativeElement.querySelector('.connection-tooltip');
    expect(tooltip.style.left).toBe('55%');
    expect(tooltip.style.top).toBe('30%');
  });
});
