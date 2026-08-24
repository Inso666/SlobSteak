import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Formular „Stakeholder bearbeiten“ (US-022). Zeigt im Kopfbereich „Zuletzt geändert von [Name]
 * am [Datum/Uhrzeit]“ (Akzeptanzkriterium 4) — gespeist aus `updatedByName`/`updatedAt` des zu
 * bearbeitenden Stakeholders. Änderungen sind ohne Freigabeprozess sofort sichtbar
 * (Akzeptanzkriterium 3): kein Speichern-Bestätigungsdialog, direkter `PATCH`-Aufruf.
 */
@Component({
  selector: 'app-edit-stakeholder-form',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ProcessingButtonComponent, ButtonDirective, InputText, Message, Textarea],
  templateUrl: './edit-stakeholder-form.component.html',
  styleUrl: './edit-stakeholder-form.component.css',
})
export class EditStakeholderFormComponent implements OnChanges {
  @Input({ required: true }) stakeholder!: Stakeholder;
  @Output() updated = new EventEmitter<Stakeholder>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);

  protected errorMessage: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isSubmitting = false;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    type: ['Person', Validators.required],
    organization: [''],
    position: [''],
    email: ['', Validators.email],
    phone: [''],
    locationDepartment: [''],
    description: [''],
  });

  protected get isOrganization(): boolean {
    return this.form.controls.type.value === 'Organization';
  }

  ngOnChanges(): void {
    this.form.setValue({
      name: this.stakeholder.name,
      type: this.stakeholder.type,
      organization: this.stakeholder.organization ?? '',
      position: this.stakeholder.position ?? '',
      email: this.stakeholder.email ?? '',
      phone: this.stakeholder.phone ?? '',
      locationDepartment: this.stakeholder.locationDepartment ?? '',
      description: this.stakeholder.description ?? '',
    });
    this.errorMessage = null;
  }

  protected onSubmit(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    this.errorMessage = null;
    this.isSubmitting = true;
    const values = this.form.getRawValue();

    this.stakeholdersService
      .updateStakeholder(this.stakeholder.id, {
        name: values.name,
        type: values.type,
        organization: values.organization || null,
        position: this.isOrganization ? null : values.position || null,
        email: values.email || null,
        phone: values.phone || null,
        locationDepartment: values.locationDepartment || null,
        description: values.description || null,
      })
      .subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          this.updated.emit(updated);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.error?.error === 'NAME_REQUIRED'
              ? 'Der Name darf nicht leer sein.'
              : error.error?.error === 'INVALID_EMAIL_FORMAT'
                ? 'Die E-Mail-Adresse ist ungültig formatiert.'
                : error.status === 404
                  ? 'Dieser Stakeholder wurde bereits gelöscht.'
                  : 'Stakeholder konnte nicht aktualisiert werden.';
        },
      });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
