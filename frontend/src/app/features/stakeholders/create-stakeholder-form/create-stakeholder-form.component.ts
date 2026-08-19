import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { EditStakeholderFormComponent } from '../edit-stakeholder-form/edit-stakeholder-form.component';
import { DeleteStakeholderDialogComponent } from '../delete-stakeholder-dialog/delete-stakeholder-dialog.component';

/**
 * Formular „Stakeholder anlegen“ (US-021, im Standard-Landingtab „Stakeholder-Liste“ der
 * Projekt-Workspace-Shell aus US-019 — ersetzt dort den bisherigen Platzhalter). Erfasst alle in
 * der Story genannten Felder (Akzeptanzkriterium 5); der Speichern-Button ist bei ungültigem
 * E-Mail-Format deaktiviert, `position` wird bei `type = Organization` ausgeblendet. Nach
 * erfolgreichem Anlegen erscheint der neue Eintrag sofort in der Liste unterhalb des Formulars
 * (Akzeptanzkriterium 6) — eine echte, serverseitig geladene Liste mit Suche/Filter folgt erst
 * mit US-025; bis dahin ist dies eine rein clientseitig für die aktuelle Sitzung akkumulierte
 * Ansicht der selbst angelegten Stakeholder (siehe Anmerkungen der Story-Datei). Die
 * Stakeholder-Detailseite (US-026) existiert noch nicht — eine Navigation dorthin entsteht erst
 * mit dieser Story.
 *
 * US-022: jede Zeile der Liste erhält zusätzlich eine „Bearbeiten“-Aktion, die
 * {@link EditStakeholderFormComponent} inline einblendet (dieselbe minimale-Scope-Begründung wie
 * bei US-021 Akzeptanzkriterium 6 — keine eigene Detailseite vor US-026).
 *
 * US-023: jede Zeile erhält zusätzlich eine „Löschen“-Aktion, die
 * {@link DeleteStakeholderDialogComponent} inline einblendet (Soft-Delete mit
 * Bestätigungsdialog inkl. Impact-Zahlen).
 */
@Component({
  selector: 'app-create-stakeholder-form',
  standalone: true,
  imports: [ReactiveFormsModule, EditStakeholderFormComponent, DeleteStakeholderDialogComponent],
  templateUrl: './create-stakeholder-form.component.html',
  styleUrl: './create-stakeholder-form.component.css',
})
export class CreateStakeholderFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly route = inject(ActivatedRoute);

  private projectId = '';

  protected createdStakeholders: Stakeholder[] = [];
  protected errorMessage: string | null = null;
  protected lastSimilarWarning: string | null = null;
  protected editingStakeholder: Stakeholder | null = null;
  protected deletingStakeholder: Stakeholder | null = null;

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
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage = null;
    this.lastSimilarWarning = null;
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
          this.createdStakeholders = [stakeholder, ...this.createdStakeholders];
          if (stakeholder.similarStakeholderWarning) {
            this.lastSimilarWarning = `Hinweis: Ähnlicher Stakeholder existiert bereits: ${stakeholder.similarStakeholderWarning.name}`;
          }
          this.form.reset({ name: '', type: 'Person', organization: '', position: '', email: '', phone: '', locationDepartment: '', description: '' });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.error === 'NAME_REQUIRED'
              ? 'Der Name darf nicht leer sein.'
              : error.error?.error === 'INVALID_EMAIL_FORMAT'
                ? 'Die E-Mail-Adresse ist ungültig formatiert.'
                : 'Stakeholder konnte nicht angelegt werden.';
        },
      });
  }

  protected onEdit(stakeholder: Stakeholder): void {
    this.editingStakeholder = stakeholder;
    this.deletingStakeholder = null;
  }

  protected onEditCancelled(): void {
    this.editingStakeholder = null;
  }

  protected onEditUpdated(updated: Stakeholder): void {
    this.createdStakeholders = this.createdStakeholders.map((s) => (s.id === updated.id ? updated : s));
    this.editingStakeholder = null;
  }

  protected onDeleteClick(stakeholder: Stakeholder): void {
    this.deletingStakeholder = stakeholder;
    this.editingStakeholder = null;
  }

  protected onDeleteCancelled(): void {
    this.deletingStakeholder = null;
  }

  protected onDeleted(deletedId: string): void {
    this.createdStakeholders = this.createdStakeholders.filter((s) => s.id !== deletedId);
    this.deletingStakeholder = null;
  }
}
