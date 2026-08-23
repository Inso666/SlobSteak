import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminProject, AdminProjectsService } from '../admin-projects.service';
import { ProjectMembershipManagerComponent } from './project-membership-manager.component';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';

/**
 * Admin-Bereich „Projektverwaltung & Mitgliederzuweisung“ (US-017, Screen S5 Sub-Bereich
 * Projekte): Liste aller Projekte mit Name, Status und Mitgliederzahl (Akzeptanzkriterium 1),
 * Formular zum Anlegen neuer Projekte (Akzeptanzkriterium 2). Die Mitgliederverwaltung je Projekt
 * (Akzeptanzkriterium 3/4) übernimmt die ausgelagerte
 * {@link ProjectMembershipManagerComponent}, sichtbar für das per Klick ausgewählte Projekt.
 */
@Component({
  selector: 'app-projects-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ProjectMembershipManagerComponent],
  templateUrl: './projects-admin.component.html',
  styleUrl: './projects-admin.component.css',
})
export class ProjectsAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminProjectsService = inject(AdminProjectsService);

  protected projects: AdminProject[] = [];
  protected createErrorMessage: string | null = null;
  protected selectedProjectId: string | null = null;
  protected loadError: string | null = null;

  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  protected onCreateProject(): void {
    if (this.createForm.invalid) {
      return;
    }

    this.createErrorMessage = null;
    const { name, description } = this.createForm.getRawValue();

    this.adminProjectsService.createProject(name, description || null).subscribe({
      next: () => {
        this.createForm.reset();
        this.loadProjects();
      },
      error: () => {
        this.createErrorMessage = 'Projekt konnte nicht angelegt werden.';
      },
    });
  }

  protected onSelectProject(project: AdminProject): void {
    this.selectedProjectId = this.selectedProjectId === project.id ? null : project.id;
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. */
  private loadProjects(): void {
    this.loadError = null;
    this.adminProjectsService.listProjects().subscribe({
      next: (projects) => (this.projects = projects),
      error: () => (this.loadError = LOAD_ERROR_MESSAGE),
    });
  }
}
