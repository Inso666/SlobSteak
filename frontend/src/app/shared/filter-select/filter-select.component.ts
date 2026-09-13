import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

/** Eine Option eines {@link FilterSelectComponent}. */
export interface FilterSelectOption<T> {
  value: T;
  label: string;
}

/**
 * US-084 (Issue #123): gemeinsames, gestaltetes Auswahl-Control für Toolbar-Filter, die laut
 * Design (`Verteiler.dc.html` Z. 57, `.select{background:var(--surface);border:1px solid
 * var(--border);border-radius:8px;padding:9px 12px;font-size:13px;}`) den Filternamen als Präfix
 * im Chip selbst tragen ("Typ: Alle", "Kommunikationsart: Alle", "Meine Sicht: PL", "Vergleichen
 * mit: …") statt eines separaten, sichtbaren Labels davor. Einmal implementiert (Story-
 * Akzeptanzkriterium 1: „Das Muster ist einmal definiert und wird nicht je Screen nachgebaut.")
 * und in Stakeholder-Liste (Typ), Verteiler (vier Filter) und Stakeholder-Map (Meine Sicht,
 * Vergleichen mit) wiederverwendet. Rendert auf `<p-select>` mit den in US-077 gesetzten
 * Overlay-Tokens (`semantic.overlay.select` im zentralen Preset) — kein Screen definiert eine
 * eigene Overlay-Optik.
 *
 * **Zwei Betriebsarten**, je nachdem ob {@link options} bereits einen Eintrag für den „leeren"
 * Zustand enthält:
 * - Enthält `options` einen Eintrag mit dem aktuell im {@link control} stehenden Leerwert (z. B.
 *   `{ value: '', label: 'Alle' }` bzw. `{ value: null, label: 'Alle' }`), matcht `p-select`
 *   diesen wie jede andere Option — das Präfix erscheint über das `selectedItem`-Template
 *   unabhängig vom Auswahlzustand, und „Alle" bleibt jederzeit über die Pfeiltasten erneut
 *   anwählbar (Stakeholder-Liste „Typ", alle vier Verteiler-Filter, Map „Meine Sicht").
 * - Enthält `options` KEINEN solchen Eintrag (Pflichtfeld ohne sinnvollen Leerwert, z. B. Map
 *   „Vergleichen mit"), zeigt {@link placeholderLabel} (inkl. Präfix) den Zustand „noch nichts
 *   gewählt" über den PrimeNG-`placeholder`-Mechanismus — dieser Platzhalterzustand ist bewusst
 *   NICHT erneut über die Pfeiltasten erreichbar, identisch zum vormaligen nativen
 *   `<option disabled hidden>`-Verhalten (SPEC-04 „Vergleichen mit").
 *
 * Die Screenreader-Zuordnung bleibt über ein echtes, verknüpftes `<label for>` erhalten
 * (Akzeptanzkriterium 3) — visuell `sr-only`, da der Filtername bereits sichtbar im Chip-Text
 * steht und ein zusätzliches sichtbares Label ihn redundant duplizieren würde.
 */
@Component({
  selector: 'app-filter-select',
  standalone: true,
  imports: [Select, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="inputId" class="sr-only">{{ label }}</label>
    <p-select
      [inputId]="inputId"
      [options]="options"
      optionLabel="label"
      optionValue="value"
      [formControl]="control"
      [placeholder]="prefix + ': ' + placeholderLabel"
      [ariaLabel]="label"
      appendTo="body"
      styleClass="filter-select"
    >
      <ng-template #selectedItem let-selected>{{ prefix }}: {{ selected.label }}</ng-template>
    </p-select>
  `,
})
export class FilterSelectComponent<T> {
  /** Filtername, der dem aktuellen Wert vorangestellt wird (z. B. "Typ" → "Typ: Alle"). */
  @Input({ required: true }) prefix = '';
  /** Screenreader-Text des verknüpften `<label for>` (z. B. "Nach Typ filtern"). */
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input({ required: true }) options: FilterSelectOption<T>[] = [];
  @Input({ required: true }) control!: FormControl<T>;
  /** Anzeigetext, solange kein in {@link options} enthaltener Wert gewählt ist (Default „Alle"). */
  @Input() placeholderLabel = 'Alle';
}
