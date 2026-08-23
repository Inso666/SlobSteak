import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';

/**
 * Projekt-Workspace-Shell (US-019, Screen S3): Header mit Projektname und Rollen-Badge
 * (Akzeptanzkriterium 1), Tab-Navigation zwischen Stakeholder-Liste/Map/Verteiler. Tab-Sichtbarkeit
 * folgt exakt der Berechtigungsmatrix aus PRD Abschnitt 2.3 (Akzeptanzkriterium 2/3/4) — zusätzlich
 * zur hier vorgenommenen UI-Ausblendung sichert `roleGuard` die jeweilige Route auch bei direktem
 * Aufruf ab (Akzeptanzkriterium 5).
 */
@Component({
  selector: 'app-project-workspace-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './project-workspace-layout.component.html',
  styleUrl: './project-workspace-layout.component.css',
})
export class ProjectWorkspaceLayoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);

  protected project: ProjectOverviewItem | null = null;
  protected loadError: string | null = null;

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt einer dauerhaft leeren Shell bei
   * fehlgeschlagenem Laden. */
  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      return;
    }

    this.projectsService.getProject(projectId).subscribe({
      next: (project) => (this.project = project),
      error: () => (this.loadError = LOAD_ERROR_MESSAGE),
    });
  }

  /** Map-Tab ist für Rolle `User` ausgeblendet (Akzeptanzkriterium 3). */
  protected get showMapTab(): boolean {
    return this.project !== null && this.project.role !== 'User';
  }

  /** Verteiler-Tab ist ausschließlich für `PL`/`Coreteam` sichtbar (Akzeptanzkriterium 4). */
  protected get showDistributionTab(): boolean {
    return this.project !== null && (this.project.role === 'PL' || this.project.role === 'Coreteam');
  }
}
