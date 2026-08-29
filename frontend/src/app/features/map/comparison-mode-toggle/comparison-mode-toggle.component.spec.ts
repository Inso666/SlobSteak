import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComparisonModeToggleComponent } from './comparison-mode-toggle.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ComparisonModeToggleComponent],
  template: `<app-comparison-mode-toggle [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<boolean>(false, { nonNullable: true });
}

describe('ComparisonModeToggleComponent', () => {
  function createHost() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should render the "Vergleichsmodus" label', () => {
    const fixture = createHost();
    expect(fixture.nativeElement.querySelector('label').textContent).toContain('Vergleichsmodus');
  });

  // Akzeptanzkriterium 1: der Schalter ist als Reactive-Forms-Steuerelement einsetzbar (kein
  // Template-driven-Forms-Ansatz, frontend.md Abschnitt 2) und reflektiert den Formularwert.
  it('should reflect the bound FormControl value (ControlValueAccessor.writeValue)', () => {
    const fixture = createHost();
    fixture.componentInstance.control.setValue(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBeTrue();
  });

  it('should update the bound FormControl when the toggle is switched by the user', () => {
    const fixture = createHost();

    const toggleComponent = fixture.debugElement.children[0].componentInstance as ComparisonModeToggleComponent;
    (toggleComponent as unknown as { onToggle: (event: { originalEvent: Event; checked: boolean }) => void }).onToggle({
      originalEvent: new Event('change'),
      checked: true,
    });

    expect(fixture.componentInstance.control.value).toBeTrue();
  });

  it('should disable the toggle when the FormControl is disabled', () => {
    const fixture = createHost();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    const toggleComponent = fixture.debugElement.children[0].componentInstance as ComparisonModeToggleComponent;
    expect((toggleComponent as unknown as { disabled: boolean }).disabled).toBeTrue();
  });
});
