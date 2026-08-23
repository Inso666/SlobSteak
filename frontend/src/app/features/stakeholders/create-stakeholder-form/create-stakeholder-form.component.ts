import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Formular „Stakeholder anlegen“ (US-021). Erfasst alle in der Story genannten Felder
 * (Akzeptanzkriterium 5); der Speichern-Button ist bei ungültigem E-Mail-Format deaktiviert,
 * `position` wird bei `type = Organization` ausgeblendet. Nach erfolgreichem Anlegen emittiert die
 * Komponente {@link created} (Akzeptanzkriterium 6) — die aufrufende Komponente
 * ({@link StakeholderListComponent} aus US-025) entscheidet, wie der neue Eintrag sichtbar wird
 * (dort: Neuladen der serverseitigen Liste). `projectId` ist optional als Input überschreibbar,
 * wird sonst (Standardfall) aus der übergeordneten Workspace-Route gelesen (US-019).
 */
@Component({
  selector: 'app-create-stakeholder-form',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent],
  templateUrl: './create-stakeholder-form.component.html',
  styleUrl: './create-stakeholder-form.component.css',
})
export class CreateStakeholderFormComponent implements OnInit {
  @Input() projectId = '';
  @Output() created = new EventEmitter<Stakeholder>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly route = inject(ActivatedRoute);

  protected errorMessage: string | null = null;
  protected lastSimilarWarning: string | null = null;
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

  ngOnInit(): void {
    if (!this.projectId) {
      this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    }
  }

  protected onSubmit(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    this.errorMessage = null;
    this.lastSimilarWarning = null;
    this.isSubmitting = true;
    const values = this.form.getRawValue();

    this.stakeholdersService
      .createStakeholder(this.projectId, {
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
        next: (stakeholder) => {
          this.isSubmitting = false;
          if (stakeholder.similarStakeholderWarning) {
            this.lastSimilarWarning = `Hinweis: Ähnlicher Stakeholder existiert bereits: ${stakeholder.similarStakeholderWarning.name}`;
          }
          this.form.reset({ name: '', type: 'Person', organization: '', position: '', email: '', phone: '', locationDepartment: '', description: '' });
          this.created.emit(stakeholder);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.error?.error === 'NAME_REQUIRED'
              ? 'Der Name darf nicht leer sein.'
              : error.error?.error === 'INVALID_EMAIL_FORMAT'
                ? 'Die E-Mail-Adresse ist ungültig formatiert.'
                : 'Stakeholder konnte nicht angelegt werden.';
        },
      });
  }
}
