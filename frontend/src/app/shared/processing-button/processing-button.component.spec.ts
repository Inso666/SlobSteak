import { TestBed } from '@angular/core/testing';
import { ProcessingButtonComponent } from './processing-button.component';

describe('ProcessingButtonComponent', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [ProcessingButtonComponent] });
    const fixture = TestBed.createComponent(ProcessingButtonComponent);
    fixture.componentRef.setInput('label', 'Speichern');
    fixture.componentRef.setInput('submittingLabel', 'Wird gespeichert…');
    return fixture;
  }

  it('should show the normal label and an enabled button by default', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.textContent).toContain('Speichern');
    expect(button.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.app-processing-button__spinner')).toBeNull();
  });

  // Akzeptanzkriterium 2: ein reines [disabled] ohne visuellen Unterschied gilt nicht als erfüllt —
  // isSubmitting muss sowohl den Button sperren als auch Text/Spinner sichtbar verändern.
  it('should disable the button and show the submitting label with a spinner while isSubmitting', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Wird gespeichert…');
    expect(button.textContent).not.toContain('Speichern');
    expect(fixture.nativeElement.querySelector('.app-processing-button__spinner')).not.toBeNull();
  });

  it('should additionally respect an externally disabled state (e.g. invalid form)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Speichern');
  });

  it('should render the given button type', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.type).toBe('submit');
  });
});
