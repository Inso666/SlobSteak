import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';

/**
 * Projektübersicht (US-018, Screen S2): Kartenübersicht der dem Nutzer zugewiesenen Projekte mit
 * eigener Rolle und Stakeholder-Anzahl (Akzeptanzkriterium 1/3). Systemadmins sehen zusätzlich
 * einen Tab „Alle Projekte“ (Akzeptanzkriterium 2) sowie die CTA „Neues Projekt“
 * (Akzeptanzkriterium 4). Klick auf eine Karte navigiert zum Projekt-Workspace (S3) — die
 * Zielroute entsteht erst mit US-019, analog zur bereits vorher verdrahteten Navigation von
 * `LoginPageComponent` zu `/projects` selbst (siehe Anmerkungen der Story-Datei).
 */
@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.css',
})
export class ProjectOverviewComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly adminProjectsService = inject(AdminProjectsService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  protected myProjects: ProjectOverviewItem[] = [];
  protected allProjects: AdminProject[] = [];
  protected activeTab: 'mine' | 'all' = 'mine';

  protected readonly isSystemAdmin = this.tokenStorage.getClaims()?.isSystemAdmin ?? false;

  ngOnInit(): void {
    this.projectsService.listMyProjects().subscribe((projects) => (this.myProjects = projects));

    if (this.isSystemAdmin) {
      this.adminProjectsService.listProjects().subscribe((projects) => (this.allProjects = projects));
    }
  }

  protected onSelectTab(tab: 'mine' | 'all'): void {
    this.activeTab = tab;
  }

  protected onOpenProject(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }

  protected onCreateProject(): void {
    void this.router.navigate(['/admin/projects']);
  }
}
