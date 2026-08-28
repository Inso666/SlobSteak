import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { AdminProject, AdminProjectsService } from '../admin-projects.service';
import { ProjectMembershipManagerComponent } from './project-membership-manager.component';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/**
 * Admin-Bereich „Projektverwaltung & Mitgliederzuweisung“ (US-017, Screen S5 Sub-Bereich
 * Projekte): Liste aller Projekte mit Name, Status und Mitgliederzahl (Akzeptanzkriterium 1),
 * Formular zum Anlegen neuer Projekte (Akzeptanzkriterium 2). Die Mitgliederverwaltung je Projekt
 * (Akzeptanzkriterium 3/4) übernimmt die ausgelagerte
 * {@link ProjectMembershipManagerComponent}, sichtbar für das per Klick ausgewählte Projekt.
 *
 * US-056: Wird seit dieser Story unter der Kind-Route `admin/projects` innerhalb des Tab-Host
 * {@link AdminPageComponent} gerendert — die vormals hier eingebettete Sub-Navigation
 * ({@link AdminSubNavComponent}) sowie die eigene Seitenüberschrift entfallen, da der Tab-Host
 * beides bereits einmalig für beide Admin-Unterseiten stellt (Akzeptanzkriterium 1).
 */
@Component({
  selector: 'app-projects-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProjectMembershipManagerComponent,
    ProcessingButtonComponent,
    ViewStateComponent,
    ButtonDirective,
    InputText,
    Message,
  ],
  templateUrl: './projects-admin.component.html',
  styleUrl: './projects-admin.component.css',
})
export class ProjectsAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminProjectsService = inject(AdminProjectsService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected projects: AdminProject[] = [];
  protected createErrorMessage: string | null = null;
  protected selectedProjectId: string | null = null;
  protected loadError: string | null = null;
  /** US-050: diskreter Ladezustand der Projektliste statt eines kombinierbaren `isLoading`-Flags. */
  protected projectsState: ViewState = 'loading';
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isCreatingProject = false;

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  protected onCreateProject(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.createForm.invalid || this.isCreatingProject) {
      return;
    }

    this.createErrorMessage = null;
    this.isCreatingProject = true;
    const { name, description } = this.createForm.getRawValue();

    this.adminProjectsService.createProject(name, description || null).subscribe({
      next: () => {
        this.isCreatingProject = false;
        this.createForm.reset();
        this.loadProjects();
      },
      error: () => {
        this.isCreatingProject = false;
        this.createErrorMessage = 'Projekt konnte nicht angelegt werden.';
      },
    });
  }

  protected onSelectProject(project: AdminProject): void {
    this.selectedProjectId = this.selectedProjectId === project.id ? null : project.id;
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. US-050: zusätzlich ein diskreter `ViewState`, damit „lädt noch“
   * sichtbar von „wirklich leer“ unterschieden wird.
   *
   * `changeDetectorRef.markForCheck()` behebt die eigentliche technische Ursache der Story: Das
   * Frontend läuft ohne `zone.js`, eine reine Feldzuweisung in einem `subscribe()`-Callback
   * markiert die Komponente sonst nicht automatisch für die nächste Change-Detection-Runde (siehe
   * ausführliche Anmerkung in `project-overview.component.ts` bzw. der Story-Datei). */
  private loadProjects(): void {
    this.loadError = null;
    this.projectsState = 'loading';
    this.adminProjectsService.listProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.projectsState = deriveListViewState(projects.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.projectsState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
