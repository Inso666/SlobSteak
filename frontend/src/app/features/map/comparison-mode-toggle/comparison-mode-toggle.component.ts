import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToggleSwitch, ToggleSwitchChangeEvent } from 'primeng/toggleswitch';
import { COMPARE_MODE_LABEL } from '../map-messages';

/**
 * Wiederverwendbarer Vergleichsmodus-Schalter (US-034 Akzeptanzkriterium 1, SPEC-04 §1
 * `p-toggleswitch inputId="compareMode"`). Implementiert `ControlValueAccessor`, damit die
 * Host-Seite ihn wie jedes andere Reactive-Forms-Steuerelement über
 * `formControlName="compareMode"` einbinden kann (frontend.md Abschnitt 2 — Reactive statt
 * Template-driven Forms) und das Label nicht an mehreren Stellen dupliziert werden muss
 * (frontend.md Abschnitt 3 — zentrale Wortlaute, siehe `map-messages.ts`).
 */
@Component({
  selector: 'app-comparison-mode-toggle',
  standalone: true,
  imports: [FormsModule, ToggleSwitch],
  templateUrl: './comparison-mode-toggle.component.html',
  styleUrl: './comparison-mode-toggle.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ComparisonModeToggleComponent),
      multi: true,
    },
  ],
})
export class ComparisonModeToggleComponent implements ControlValueAccessor {
  protected readonly label = COMPARE_MODE_LABEL;
  protected checked = false;
  protected disabled = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Standard-CVA-Platzhalter, bis Angular per registerOnChange den echten Callback setzt.
  private onChange: (value: boolean) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Standard-CVA-Platzhalter, bis Angular per registerOnTouched den echten Callback setzt.
  private onTouched: () => void = () => {};

  writeValue(value: boolean | null): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onToggle(event: ToggleSwitchChangeEvent): void {
    this.checked = event.checked;
    this.onChange(event.checked);
    this.onTouched();
  }
}
