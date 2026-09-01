import { TestBed } from '@angular/core/testing';
import { RoleProgressRingComponent } from './role-progress-ring.component';

describe('RoleProgressRingComponent', () => {
  async function createComponent(roleCode: 'pl' | 'ct' | 'ar', roleLabel: string, percent: number) {
    await TestBed.configureTestingModule({
      imports: [RoleProgressRingComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(RoleProgressRingComponent);
    fixture.componentRef.setInput('roleCode', roleCode);
    fixture.componentRef.setInput('roleLabel', roleLabel);
    fixture.componentRef.setInput('percent', percent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the role label and percent as visible text', async () => {
    const fixture = await createComponent('pl', 'PL', 75);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('PL');
    expect(text).toContain('75%');
  });

  it('renders a fully filled ring (no dash offset) at 100%', async () => {
    const fixture = await createComponent('ct', 'CT', 100);

    const valueCircle: SVGCircleElement = fixture.nativeElement.querySelector('.ring-value');
    expect(valueCircle.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('renders an empty ring (full dash offset = circumference) at 0%', async () => {
    const fixture = await createComponent('ar', 'AR', 0);

    const valueCircle: SVGCircleElement = fixture.nativeElement.querySelector('.ring-value');
    const dashArray = Number(valueCircle.getAttribute('stroke-dasharray'));
    const dashOffset = Number(valueCircle.getAttribute('stroke-dashoffset'));
    expect(dashOffset).toBeCloseTo(dashArray, 5);
  });
});
