import { TestBed } from '@angular/core/testing';
import { AttentionBadgeComponent } from './attention-badge.component';

describe('AttentionBadgeComponent', () => {
  it('should render the given text', async () => {
    await TestBed.configureTestingModule({
      imports: [AttentionBadgeComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(AttentionBadgeComponent);
    fixture.componentRef.setInput('text', 'Ähnlicher Stakeholder existiert bereits: Max Mustermann');
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Ähnlicher Stakeholder existiert bereits: Max Mustermann');
  });
});
