import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FilterSelectComponent, FilterSelectOption } from './filter-select.component';

/** Host-Wrapper, da `FilterSelectComponent.control` ein `@Input({required:true})` ist und daher
 * nicht ohne einen echten, im Test kontrollierten `FormControl` instanziiert werden kann. */
@Component({
  standalone: true,
  imports: [FilterSelectComponent, ReactiveFormsModule],
  template: `
    <app-filter-select
      prefix="Typ"
      label="Nach Typ filtern"
      inputId="type-filter"
      [options]="options"
      [control]="control"
    />
  `,
})
class HostComponent {
  options: FilterSelectOption<string>[] = [
    { value: '', label: 'Alle' },
    { value: 'Person', label: 'Person' },
    { value: 'Organization', label: 'Organisation' },
  ];
  control = new FormControl<string>('', { nonNullable: true });
}

describe('FilterSelectComponent', () => {
  function createHost() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a p-select (no native <select>) with a screenreader-only, associated <label>', () => {
    const fixture = createHost();

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-select')).not.toBeNull();

    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.getAttribute('for')).toBe('type-filter');
    expect(label.classList.contains('sr-only')).toBeTrue();
    expect(label.textContent?.trim()).toBe('Nach Typ filtern');
  });

  it('prefixes the currently selected option label with the filter name, including the "Alle" default', () => {
    const fixture = createHost();

    const selectedLabel: HTMLElement = fixture.nativeElement.querySelector('.p-select-label');
    expect(selectedLabel.textContent?.trim()).toBe('Typ: Alle');

    fixture.componentInstance.control.setValue('Person');
    fixture.detectChanges();

    expect(selectedLabel.textContent?.trim()).toBe('Typ: Person');
  });

  it('shows the prefixed placeholder text when the control value matches no option (e.g. a required field still unset)', () => {
    TestBed.configureTestingModule({ imports: [FilterSelectComponent, ReactiveFormsModule] });

    @Component({
      standalone: true,
      imports: [FilterSelectComponent, ReactiveFormsModule],
      template: `
        <app-filter-select
          prefix="Vergleichen mit"
          label="Vergleichsperspektive"
          inputId="compare-filter"
          [options]="options"
          [control]="control"
          placeholderLabel="Bitte wählen"
        />
      `,
    })
    class NoEmptyOptionHostComponent {
      options: FilterSelectOption<string>[] = [
        { value: 'PL', label: 'PL' },
        { value: 'Architect', label: 'Architect' },
      ];
      control = new FormControl<string | null>(null);
    }

    TestBed.configureTestingModule({ imports: [NoEmptyOptionHostComponent] });
    const fixture = TestBed.createComponent(NoEmptyOptionHostComponent);
    fixture.detectChanges();

    const selectedLabel: HTMLElement = fixture.nativeElement.querySelector('.p-select-label');
    expect(selectedLabel.textContent?.trim()).toBe('Vergleichen mit: Bitte wählen');

    fixture.componentInstance.control.setValue('Architect');
    fixture.detectChanges();

    expect(selectedLabel.textContent?.trim()).toBe('Vergleichen mit: Architect');
  });

  it('keeps the control keyboard-operable: opening the panel and selecting an option via Enter updates the value', () => {
    const fixture = createHost();
    const trigger = fixture.debugElement.query(By.css('.p-select'));

    trigger.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const options = document.querySelectorAll('.p-select-option');
    expect(options.length).toBe(3);

    (options[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('Person');
  });
});
