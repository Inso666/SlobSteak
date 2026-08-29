import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';
import { AdminCommunicationType, AdminCommunicationTypesService } from '../../admin/admin-communication-types.service';
import { CommunicationAssignment, StakeholderCommunicationsService } from '../stakeholder-communications.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/** Rollen, die Kommunikationszuordnungen pflegen dürfen (US-040 Akzeptanzkriterium 4) — bewusst
 * dieselbe Rollenliste wie am Backend (`StakeholderCommunicationController`), hier eine reine
 * UX-Ergänzung über der serverseitigen Absicherung (frontend.md Abschnitt 2). <c>Architect</c> ist
 * hier bewusst enthalten, obwohl er bei Verteilerlisten (US-041/US-042) keinen Zugriff hat (PRD
 * Abschnitt F4.2). */
const MANAGE_ROLES = ['PL', 'Coreteam', 'Architect'];

/** Deutsche Anzeige-Wortlaute für den Wire-Contract-Enum-Wert (US-040 Akzeptanzkriterium 5, PRD
 * F4.2) — an einer zentralen Stelle gehalten (frontend.md Abschnitt 3), statt in Template und
 * Formularoptionen dupliziert. */
export const FREQUENCY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Weekly', label: 'Wöchentlich' },
  { value: 'Monthly', label: 'Monatlich' },
  { value: 'Quarterly', label: 'Quartalsweise' },
  { value: 'AdHoc', label: 'Anlassbezogen' },
];

export const CHANNEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Email', label: 'E-Mail' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Report', label: 'Report' },
];

/**
 * Kommunikationszuordnungen-Bereich auf der Stakeholder-Detailseite (US-040, Screen S4, Nachfolger
 * des Platzhalter-Slots aus US-026). Zeigt die bestehenden Zuordnungen des Stakeholders
 * (Akzeptanzkriterium 5, gespeist aus `GET .../communications`) sowie ein Auswahlformular
 * (Katalog-Dropdown aus `GET /api/v1/communication-types?activeOnly=true`, Frequenz-/Kanal-Select,
 * „Hinzufügen“-Button) zum Zuordnen einer weiteren Kommunikationsart. Bearbeiten/Entfernen einer
 * bestehenden Zuordnung (über die bereits vorhandenen `PATCH`/`DELETE`-Endpunkte, Akzeptanzkriterium
 * 2/3) ist eine sinnvolle Ergänzung über den wörtlichen Akzeptanzkriterium-5-Wortlaut hinaus, ohne
 * die stattdessen einzige Möglichkeit zur Korrektur/Entfernung fehlen würde — dokumentiert gemäß
 * CLAUDE.md Abschnitt 6 als sinnvolle technische Vervollständigung, keine fachliche Abweichung.
 * Formular und Bearbeiten-/Entfernen-Aktionen sind ausschließlich für {@link MANAGE_ROLES} sichtbar
 * (Akzeptanzkriterium 4); für Rolle `User` bleibt die Liste rein lesend, konsistent mit der
 * serverseitigen Rollenprüfung des Controllers.
 */
@Component({
  selector: 'app-communication-assignment-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, ViewStateComponent, ButtonDirective, Message],
  templateUrl: './communication-assignment-panel.component.html',
  styleUrl: './communication-assignment-panel.component.css',
})
export class CommunicationAssignmentPanelComponent implements OnInit {
  @Input({ required: true }) stakeholderId!: string;
  @Input() currentUserRole: string | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly communicationsService = inject(StakeholderCommunicationsService);
  private readonly communicationTypesService = inject(AdminCommunicationTypesService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly channelOptions = CHANNEL_OPTIONS;

  protected assignments: CommunicationAssignment[] = [];
  protected assignmentsState: ViewState = 'loading';
  protected loadError: string | null = null;

  protected catalog: AdminCommunicationType[] = [];

  protected addErrorMessage: string | null = null;
  protected isAdding = false;
  protected readonly addForm = this.formBuilder.nonNullable.group({
    communicationTypeId: ['', Validators.required],
    frequency: [FREQUENCY_OPTIONS[0].value, Validators.required],
    channel: [CHANNEL_OPTIONS[0].value, Validators.required],
  });

  protected editingCommunicationTypeId: string | null = null;
  protected editErrorMessage: string | null = null;
  protected isSavingEdit = false;
  protected readonly editForm = this.formBuilder.nonNullable.group({
    frequency: [FREQUENCY_OPTIONS[0].value, Validators.required],
    channel: [CHANNEL_OPTIONS[0].value, Validators.required],
  });

  protected readonly removingIds = new Set<string>();
  protected removeErrorMessage: string | null = null;

  /** Akzeptanzkriterium 4: Formular sowie Bearbeiten-/Entfernen-Aktionen nur für PL/Coreteam/Architect. */
  protected get canManage(): boolean {
    return this.currentUserRole !== null && MANAGE_ROLES.includes(this.currentUserRole);
  }

  ngOnInit(): void {
    this.loadAssignments();
    this.communicationTypesService.listActiveCommunicationTypes().subscribe((types) => {
      this.catalog = types;
      this.changeDetectorRef.markForCheck();
    });
  }

  protected labelForFrequency(value: string): string {
    return this.frequencyOptions.find((option) => option.value === value)?.label ?? value;
  }

  protected labelForChannel(value: string): string {
    return this.channelOptions.find((option) => option.value === value)?.label ?? value;
  }

  protected onAdd(): void {
    // US-043-Muster: ein zweiter Trigger während eines laufenden Requests löst keinen zweiten
    // HTTP-Request aus.
    if (this.addForm.invalid || this.isAdding) {
      return;
    }

    this.addErrorMessage = null;
    this.isAdding = true;
    const { communicationTypeId, frequency, channel } = this.addForm.getRawValue();

    this.communicationsService.assignCommunication(this.stakeholderId, communicationTypeId, { frequency, channel }).subscribe({
      next: () => {
        this.isAdding = false;
        this.addForm.reset({ communicationTypeId: '', frequency: FREQUENCY_OPTIONS[0].value, channel: CHANNEL_OPTIONS[0].value });
        this.loadAssignments();
        this.changeDetectorRef.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.isAdding = false;
        this.addErrorMessage =
          error.status === 409
            ? 'Diese Kommunikationsart ist diesem Stakeholder bereits zugeordnet.'
            : 'Kommunikationsart konnte nicht zugeordnet werden.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected onStartEdit(assignment: CommunicationAssignment): void {
    this.editingCommunicationTypeId = assignment.communicationTypeId;
    this.editErrorMessage = null;
    this.editForm.reset({ frequency: assignment.frequency, channel: assignment.channel });
  }

  protected onCancelEdit(): void {
    this.editingCommunicationTypeId = null;
    this.editErrorMessage = null;
  }

  protected onSaveEdit(): void {
    if (this.editForm.invalid || this.isSavingEdit || !this.editingCommunicationTypeId) {
      return;
    }

    this.editErrorMessage = null;
    this.isSavingEdit = true;
    const { frequency, channel } = this.editForm.getRawValue();
    const communicationTypeId = this.editingCommunicationTypeId;

    this.communicationsService.updateAssignment(this.stakeholderId, communicationTypeId, { frequency, channel }).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.editingCommunicationTypeId = null;
        this.loadAssignments();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.isSavingEdit = false;
        this.editErrorMessage = 'Änderung konnte nicht gespeichert werden.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected onRemove(assignment: CommunicationAssignment): void {
    if (this.removingIds.has(assignment.communicationTypeId)) {
      return;
    }

    this.removeErrorMessage = null;
    this.removingIds.add(assignment.communicationTypeId);

    this.communicationsService.removeAssignment(this.stakeholderId, assignment.communicationTypeId).subscribe({
      next: () => {
        this.removingIds.delete(assignment.communicationTypeId);
        this.loadAssignments();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.removingIds.delete(assignment.communicationTypeId);
        this.removeErrorMessage = `„${assignment.communicationTypeName}“ konnte nicht entfernt werden.`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private loadAssignments(): void {
    this.loadError = null;
    this.assignmentsState = 'loading';
    this.communicationsService.getAssignments(this.stakeholderId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        this.assignmentsState = deriveListViewState(assignments.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.assignmentsState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
