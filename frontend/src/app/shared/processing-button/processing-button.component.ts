import { Component, Input } from '@angular/core';
import { ButtonDirective } from 'primeng/button';

/**
 * Einheitlicher Baustein für jeden Button, der einen schreibenden HTTP-Request auslöst (US-043).
 * Kapselt das projektweit einheitliche Verarbeitungs-Feedback an einer Stelle statt es in jeder
 * Formular-/Aktions-Komponente zu duplizieren (siehe Story-Technische-Hinweise): solange
 * {@link isSubmitting} `true` ist, wird der native Button über `[disabled]` gesperrt **und** zeigt
 * einen sichtbar veränderten Zustand — Textwechsel auf {@link submittingLabel} plus Inline-Spinner
 * (Akzeptanzkriterium 2). Ein reines `[disabled]` ohne visuellen Unterschied gilt laut Story nicht
 * als erfüllt, deshalb bewusst kein einfacher `[disabled]`-Wrapper.
 *
 * Der eigentliche Doppel-Submit-Schutz (Akzeptanzkriterium 3/4) — das Setzen/Zurücksetzen von
 * `isSubmitting` inkl. Guard gegen einen zweiten Trigger während eines laufenden Requests — bleibt
 * bewusst in der jeweiligen Feature-Komponente (dort, wo der Request tatsächlich ausgelöst wird),
 * damit ein Test die Komponentenmethode auch ohne echten DOM-Klick zweimal aufrufen und über
 * `HttpTestingController` verifizieren kann, dass nur ein Request aussteht.
 *
 * Für `type="submit"` genügt die Platzierung innerhalb eines `<form (ngSubmit)="...">` — das
 * native Formular-Submit übernimmt den Aufruf. Für `type="button"` wird `(click)` direkt am
 * Custom-Element gebunden; das `click`-Event des inneren `<button>` bubblet zum Host-Element hoch,
 * da `:host` per `display: contents` selbst keine eigene Box rendert.
 *
 * Bewusst mit der Standard-Change-Detection-Strategie (nicht `OnPush`): die aufrufenden
 * Formular-/Aktions-Komponenten sind selbst nicht `OnPush`, daher würde eine `OnPush`-Grenze an
 * dieser Stelle keinen Nutzen bringen, aber zusätzliche Komplexität bei der Input-Propagation
 * einführen — konsistent mit den übrigen, in dieser Story nicht auf `OnPush` migrierten
 * Feature-Komponenten.
 */
@Component({
  selector: 'app-processing-button',
  standalone: true,
  imports: [ButtonDirective],
  templateUrl: './processing-button.component.html',
  styleUrl: './processing-button.component.css',
})
export class ProcessingButtonComponent {
  @Input() type: 'submit' | 'button' = 'button';
  @Input() isSubmitting = false;
  @Input() disabled = false;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) submittingLabel!: string;
}
