import { Component, Input, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import { AssessmentRole, AssessmentsService } from '../assessments.service';
import { AssessmentConflictDialogComponent } from '../assessment-conflict-dialog/assessment-conflict-dialog.component';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

const PERSPECTIVE_BEARING_ROLES = ['PL', 'Coreteam', 'Architect'] as const;

/**
 * Assessment-Tabs auf der Stakeholder-Detailseite (US-029, Screen S4) — ein Tab je
 * perspektiv-tragender Rolle (Akzeptanzkriterium 1), gespeist aus `GET .../assessments` (US-028).
 * Jeder Tab zeigt Einfluss-/Interesse-Slider, Notizfeld und „zuletzt geändert von/am“
 * (Akzeptanzkriterium 2). Nur der Tab der eigenen Projekt-Rolle des angemeldeten Nutzers
 * (übergeben über {@link currentUserRole}) ist editierbar; die übrigen Tabs bleiben sichtbar, aber
 * read-only (Akzeptanzkriterium 3) — eine reine UI-Ergänzung zur bereits serverseitig (US-028)
 * durchgesetzten Regel, ersetzt sie nicht. Ein `409 ASSESSMENT_MODIFIED` beim Speichern zeigt den
 * {@link AssessmentConflictDialogComponent} (Akzeptanzkriterium 4). `status: "NOT_ASSESSED"` zeigt
 * einen Hinweis mit „Jetzt bewerten“-CTA, klickbar nur für die eigene Rolle (Akzeptanzkriterium 5);
 * `status: "NO_ROLE_ASSIGNED"` zeigt einen Hinweis ganz ohne Eingabemöglichkeit
 * (Akzeptanzkriterium 6). Der äußerste Tabs-Container trägt `data-testid="assessment-tabs"`
 * (US-030 Akzeptanzkriterium 3): die aufrufende {@link StakeholderDetailComponent} entfernt diese
 * Komponente für Rolle `User` per `@if` vollständig aus dem DOM, statt sie nur per CSS zu
 * verstecken.
 */
@Component({
  selector: 'app-assessment-tabs',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, AssessmentConflictDialogComponent, ProcessingButtonComponent, ButtonDirective, Message, Textarea],
  templateUrl: './assessment-tabs.component.html',
  styleUrl: './assessment-tabs.component.css',
})
export class AssessmentTabsComponent implements OnInit {
  @Input({ required: true }) stakeholderId!: string;
  @Input() currentUserRole: string | null = null;

  private readonly assessmentsService = inject(AssessmentsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly roleTabs = PERSPECTIVE_BEARING_ROLES;
  protected activeTab: string = PERSPECTIVE_BEARING_ROLES[0];
  protected roles: AssessmentRole[] = [];
  protected assessing = false;
  protected conflict: { modifiedBy: string; modifiedAt: string } | null = null;
  protected errorMessage: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isSaving = false;

  protected readonly form = this.formBuilder.nonNullable.group({
    influence: [0],
    interest: [0],
    notes: [''],
  });

  ngOnInit(): void {
    this.loadAssessments();
  }

  protected get activeRole(): AssessmentRole | undefined {
    return this.roles.find((r) => r.role === this.activeTab);
  }

  protected get isOwnRole(): boolean {
    return this.currentUserRole === this.activeTab;
  }

  protected onSelectTab(role: string): void {
    this.activeTab = role;
    this.assessing = false;
    this.conflict = null;
    this.errorMessage = null;
    this.syncFormWithActiveTab();
  }

  protected onStartAssessing(): void {
    this.assessing = true;
  }

  protected onSave(): void {
    const expectedVersion = this.activeRole?.status === 'ASSESSED' ? (this.activeRole.version ?? undefined) : undefined;
    this.save(expectedVersion);
  }

  protected onConflictOverwrite(): void {
    this.save(undefined);
  }

  protected onConflictCancelled(): void {
    this.conflict = null;
    this.loadAssessments();
  }

  private save(expectedVersion: number | undefined): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus (gilt für den Speichern-Button ebenso wie für
    // „Trotzdem speichern“ im Konfliktdialog, die beide hier münden).
    if (this.isSaving) {
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    const values = this.form.getRawValue();

    this.assessmentsService
      .upsertAssessment(this.stakeholderId, this.activeTab, {
        influence: values.influence,
        interest: values.interest,
        notes: values.notes || null,
        expectedVersion,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.conflict = null;
          this.assessing = false;
          this.loadAssessments();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          if (error.status === 409) {
            this.conflict = { modifiedBy: error.error?.modifiedBy, modifiedAt: error.error?.modifiedAt };
          } else {
            this.errorMessage = 'Assessment konnte nicht gespeichert werden.';
          }
        },
      });
  }

  private loadAssessments(): void {
    if (!this.stakeholderId) {
      return;
    }

    this.assessmentsService.getAssessments(this.stakeholderId).subscribe((roles) => {
      this.roles = roles;
      this.syncFormWithActiveTab();
    });
  }

  private syncFormWithActiveTab(): void {
    const role = this.activeRole;
    if (role?.status === 'ASSESSED') {
      this.form.setValue({ influence: role.influence ?? 0, interest: role.interest ?? 0, notes: role.notes ?? '' });
    } else {
      this.form.setValue({ influence: 0, interest: 0, notes: '' });
    }

    // Nur die eigene Rolle ist editierbar (Akzeptanzkriterium 3) — über den Reactive-Forms-eigenen
    // enable()/disable() statt eines rohen [disabled]-Attributs, damit Angular den Formularstatus
    // konsistent verwaltet.
    if (this.isOwnRole) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }
}
