import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';
import { Stakeholder, StakeholderDeletionImpact, StakeholdersService } from '../stakeholders.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Lösch-Bestätigungsdialog (US-023 Akzeptanzkriterium 6): lädt beim Öffnen die Impact-Zahlen über
 * `GET /api/v1/stakeholders/{id}/deletion-impact` (Akzeptanzkriterium 2) und zeigt sie vor der
 * eigentlichen Bestätigung an. Löschen ist ein Soft-Delete — Assessments und
 * Kommunikationszuordnungen bleiben unverändert bestehen (Akzeptanzkriterium 3), die Zahlen dienen
 * rein der Information, nicht einer Blockade.
 */
@Component({
  selector: 'app-delete-stakeholder-dialog',
  standalone: true,
  imports: [ProcessingButtonComponent, ButtonDirective, Message],
  templateUrl: './delete-stakeholder-dialog.component.html',
  styleUrl: './delete-stakeholder-dialog.component.css',
})
export class DeleteStakeholderDialogComponent implements OnChanges {
  @Input({ required: true }) stakeholder!: Stakeholder;
  @Output() deleted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly stakeholdersService = inject(StakeholdersService);

  protected impact: StakeholderDeletionImpact | null = null;
  protected errorMessage: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isSubmitting = false;

  ngOnChanges(): void {
    this.impact = null;
    this.errorMessage = null;
    this.isSubmitting = false;
    this.stakeholdersService.getDeletionImpact(this.stakeholder.id).subscribe({
      next: (impact) => (this.impact = impact),
      error: () => {
        this.errorMessage = 'Löschauswirkung konnte nicht ermittelt werden.';
      },
    });
  }

  protected onConfirm(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.stakeholdersService.deleteStakeholder(this.stakeholder.id).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.deleted.emit(this.stakeholder.id);
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Stakeholder konnte nicht gelöscht werden.';
      },
    });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
