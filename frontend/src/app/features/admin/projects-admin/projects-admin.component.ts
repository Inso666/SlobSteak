import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminSubNavComponent } from '../admin-sub-nav/admin-sub-nav.component';
import { AdminProject, AdminProjectsService } from '../admin-projects.service';
import { ProjectMembershipManagerComponent } from './project-membership-manager.component';

/**
 * Admin-Bereich „Projektverwaltung & Mitgliederzuweisung“ (US-017, Screen S5 Sub-Bereich
 * Projekte): Liste aller Projekte mit Name, Status und Mitgliederzahl (Akzeptanzkriterium 1),
 * Formular zum Anlegen neuer Projekte (Akzeptanzkriterium 2). Die Mitgliederverwaltung je Projekt
 * (Akzeptanzkriterium 3/4) übernimmt die ausgelagerte
 * {@link ProjectMembershipManagerComponent}, sichtbar für das per Klick ausgewählte Projekt.
 *
 * US-046: Zeigt zusätzlich {@link AdminSubNavComponent}, damit ein Systemadmin von hier zum
 * Sub-Bereich „Nutzer“ wechseln kann (Akzeptanzkriterium 4).
 */
@Component({
  selector: 'app-projects-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ProjectMembershipManagerComponent, AdminSubNavComponent],
  templateUrl: './projects-admin.component.html',
  styleUrl: './projects-admin.component.css',
})
export class ProjectsAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminProjectsService = inject(AdminProjectsService);

  protected projects: AdminProject[] = [];
  protected createErrorMessage: string | null = null;
  protected selectedProjectId: string | null = null;

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

  private loadProjects(): void {
    this.adminProjectsService.listProjects().subscribe((projects) => (this.projects = projects));
  }
}
