import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Stammdaten-Panel der Stakeholder-Detailseite (US-071, Issue #102 — vormals eigenständiges
 * „Stakeholder bearbeiten“-Formular aus US-022, das hinter einem Lese-/Bearbeiten-Umschalter lag
 * und Name/Typ/Organisation redundant zum Namens-Header erneut abfragte).
 *
 * Seit US-071 gilt: für Nutzer mit Bearbeitungsrecht ({@link canEdit}) werden die
 * Stammdatenfelder Position, E-Mail, Telefon, Standort/Abteilung und Beschreibung **immer** direkt
 * als Eingabefelder gerendert (Akzeptanzkriterium 2) — kein separater Lese-/Bearbeiten-Modus mehr.
 * Für Nutzer ohne Bearbeitungsrecht bleiben dieselben Felder reiner, nicht editierbarer Text
 * (Akzeptanzkriterium 6, unverändert gegenüber dem bisherigen `<dl>`-Verhalten aus US-026).
 *
 * Name/Typ/Organisation gehören seit US-071 NICHT mehr zu den in diesem Komponenten-Template
 * gerenderten Feldern (vermeidet die in Issue #102 kritisierte Feld-Dopplung zum Namens-Header,
 * Akzeptanzkriterium 3). Die zugehörigen `FormControl`s bleiben aber Teil derselben internen
 * `FormGroup` wie die Panel-Felder und werden über {@link nameControl}/{@link typeControl}/
 * {@link organizationControl} öffentlich gemacht, damit `StakeholderDetailComponent` sie per
 * `[formControl]`-Bindung (Template-Referenzvariable `#editForm`) direkt im Namens-Header rendert.
 * So bleibt „Speichern“ eine einzige, gemeinsame Aktion über Header- und Panel-Felder hinweg
 * (Story Abschnitt 4, Invariante 2) und ist gemäß US-043-Muster nur bei tatsächlicher Änderung
 * (`!form.pristine`) aktiv (Akzeptanzkriterium 4) sowie während eines laufenden Requests gegen
 * Doppel-Submit gesperrt.
 */
@Component({
  selector: 'app-edit-stakeholder-form',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, ButtonDirective, InputText, Message, Textarea],
  templateUrl: './edit-stakeholder-form.component.html',
  styleUrl: './edit-stakeholder-form.component.css',
})
export class EditStakeholderFormComponent implements OnChanges {
  @Input({ required: true }) stakeholder!: Stakeholder;
  /** US-071 Akzeptanzkriterium 2/6: steuert, ob die Stammdatenfelder als Eingabefelder (true) oder
   * als reiner Text (false) gerendert werden — kein Lese-/Bearbeiten-Modus-Wechsel innerhalb einer
   * Berechtigungsstufe, nur diese eine, von außen (Rolle) bestimmte Weiche. */
  @Input() canEdit = false;
  @Output() updated = new EventEmitter<Stakeholder>();

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

  /** Öffentlich für die `[formControl]`-Bindung im Namens-Header von `StakeholderDetailComponent`
   * (US-071 Akzeptanzkriterium 3/5). */
  get nameControl(): FormControl<string> {
    return this.form.controls.name;
  }

  get typeControl(): FormControl<string> {
    return this.form.controls.type;
  }

  get organizationControl(): FormControl<string> {
    return this.form.controls.organization;
  }

  /** Position/Funktion ergibt für den Typ „Organisation“ fachlich keinen Sinn (unverändert aus
   * US-022) — Feld bleibt im editierbaren Zustand ausgeblendet, im reinen Lesetext dagegen
   * unverändert sichtbar (kein Rückschritt gegenüber dem bisherigen `<dl>`-Verhalten). */
  protected get isOrganizationType(): boolean {
    return this.form.controls.type.value === 'Organization';
  }

  ngOnChanges(): void {
    this.resetFormToStakeholder();
    this.errorMessage = null;
  }

  protected onSubmit(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus. US-071 Akzeptanzkriterium 4: ohne tatsächliche
    // Änderung bleibt „Speichern“ wirkungslos (der Button ist zusätzlich clientseitig deaktiviert).
    if (this.form.invalid || this.form.pristine || this.isSubmitting) {
      return;
    }

    this.errorMessage = null;
    this.isSubmitting = true;
    const values = this.form.getRawValue();
    const isOrganizationType = values.type === 'Organization';

    this.stakeholdersService
      .updateStakeholder(this.stakeholder.id, {
        name: values.name,
        type: values.type,
        organization: values.organization || null,
        position: isOrganizationType ? null : values.position || null,
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

  /** US-071 (PO-Entscheidung Abschnitt 2): „Abbrechen“ setzt auf den zuletzt gespeicherten Stand
   * zurück, statt (wie zuvor) einen separaten Bearbeiten-Modus zu verlassen — es gibt seit dieser
   * Story keinen Modus mehr, den man verlassen könnte. */
  protected onCancel(): void {
    this.resetFormToStakeholder();
    this.errorMessage = null;
  }

  private resetFormToStakeholder(): void {
    this.form.reset({
      name: this.stakeholder.name,
      type: this.stakeholder.type,
      organization: this.stakeholder.organization ?? '',
      position: this.stakeholder.position ?? '',
      email: this.stakeholder.email ?? '',
      phone: this.stakeholder.phone ?? '',
      locationDepartment: this.stakeholder.locationDepartment ?? '',
      description: this.stakeholder.description ?? '',
    });
  }
}
