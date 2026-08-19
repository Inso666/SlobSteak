import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Konfliktdialog bei einer veralteten Assessment-Version (US-029 Akzeptanzkriterium 4): erscheint,
 * wenn der Server beim Speichern `409 ASSESSMENT_MODIFIED` liefert (US-028 Akzeptanzkriterium 3).
 * „Trotzdem speichern“ löst einen erneuten Request ohne `expectedVersion` aus (Last-Write-Wins,
 * US-028 Akzeptanzkriterium 4); „Abbrechen“ lädt die aktuellen Werte neu.
 */
@Component({
  selector: 'app-assessment-conflict-dialog',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './assessment-conflict-dialog.component.html',
  styleUrl: './assessment-conflict-dialog.component.css',
})
export class AssessmentConflictDialogComponent {
  @Input({ required: true }) modifiedBy!: string;
  @Input({ required: true }) modifiedAt!: string;
  @Output() overwrite = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
