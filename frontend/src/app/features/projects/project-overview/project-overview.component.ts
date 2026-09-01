import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/** US-074 Akzeptanzkriterium „Toolbar": Sortieroptionen des Sortier-Dropdowns. Ersetzt das laut
 * PO-Entscheidung (Story-Datei Abschnitt 2) vorerst ausgesetzte SPEC-02-Kriterium „Zuletzt
 * aktualisiert" — es gibt noch kein `Project.UpdatedAt` (siehe Folge-Story US-076). */
type ProjectSortOption = 'name' | 'newest';

/** Gemeinsame Teilmenge, die beide Kartentypen („Meine Projekte“/`ProjectOverviewItem` und „Alle
 * Projekte“/`AdminProject`) für die client-seitige Suche/Sortierung benötigen (US-074). */
interface SortableProject {
  name: string;
  createdAt?: string;
}

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
  imports: [ButtonDirective, InputText, ReactiveFormsModule, ViewStateComponent],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.css',
})
export class ProjectOverviewComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly adminProjectsService = inject(AdminProjectsService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected myProjects: ProjectOverviewItem[] = [];
  protected allProjects: AdminProject[] = [];
  protected activeTab: 'mine' | 'all' = 'mine';
  protected loadError: string | null = null;

  /** US-050: je Liste ein eigener, diskreter Ladezustand statt eines kombinierbaren
   * `isLoading`-Flags — „Meine Projekte“ und „Alle Projekte“ laden unabhängig voneinander
   * (Akzeptanzkriterium „unabhängig vom Tab 'Alle Projekte'“). */
  protected myProjectsState: ViewState = 'loading';
  protected allProjectsState: ViewState = 'loading';

  protected readonly isSystemAdmin = this.tokenStorage.getClaims()?.isSystemAdmin ?? false;

  /** US-074 Akzeptanzkriterium „Toolbar": rein client-seitige Filterung/Sortierung der bereits
   * geladenen Listen — kein erneuter Server-Request je Tastenanschlag/Auswahl. Keine
   * `Validators`, da diese Felder (anders als z. B. Formulare mit serverseitiger Validierung,
   * `.claude/agents/frontend.md` Abschnitt 2) rein lokal filtern, nichts an das Backend senden. */
  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    sortBy: new FormControl<ProjectSortOption>('name', { nonNullable: true }),
  });

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Ansicht bei
   * fehlgeschlagenem Laden. US-050: zusätzlich ein diskreter `ViewState` je Liste, damit
   * „lädt noch“ sichtbar von „wirklich leer“ unterschieden wird.
   *
   * `changeDetectorRef.markForCheck()` je Callback ist hier kein Stilmittel, sondern behebt die
   * eigentliche technische Ursache der Story: Dieses Frontend läuft ohne `zone.js` (kein Eintrag
   * in `package.json`/`angular.json`, siehe Anmerkungen des Dev-Agenten in der Story-Datei) —
   * eine reine Feldzuweisung in einem `subscribe()`-Callback, der außerhalb eines
   * Nutzer-Events abläuft, markiert die Komponente in diesem Zustand nicht automatisch für die
   * nächste Change-Detection-Runde. Ohne den expliziten Aufruf bliebe die Ansicht auch mit
   * korrektem `ViewState` bis zur nächsten, zufälligen Interaktion optisch „stehen“ — exakt das
   * in der Story beschriebene Symptom. */
  ngOnInit(): void {
    this.projectsService.listMyProjects().subscribe({
      next: (projects) => {
        this.myProjects = projects;
        this.myProjectsState = deriveListViewState(projects.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.myProjectsState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });

    if (this.isSystemAdmin) {
      this.adminProjectsService.listProjects().subscribe({
        next: (projects) => {
          this.allProjects = projects;
          this.allProjectsState = deriveListViewState(projects.length);
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.loadError = LOAD_ERROR_MESSAGE;
          this.allProjectsState = 'error';
          this.changeDetectorRef.markForCheck();
        },
      });
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

  /** US-074 Akzeptanzkriterium „Toolbar": gefilterte/sortierte Sicht auf `myProjects`, gebunden
   * an `filterForm`. Als Getter statt einmaliger Berechnung, da sich Eingabe-/Auswahlwert
   * jederzeit ändern kann. */
  protected get filteredMyProjects(): ProjectOverviewItem[] {
    return this.filterAndSort(this.myProjects);
  }

  /** Analog {@link filteredMyProjects} für die Admin-„Alle Projekte“-Liste. */
  protected get filteredAllProjects(): AdminProject[] {
    return this.filterAndSort(this.allProjects);
  }

  /** SPEC-00 §4 / US-074 Akzeptanzkriterium „Karten": farbcodierte Rollen-Badge-Klasse, analog zum
   * bereits etablierten `roleBadgeClass`-Muster in `ProjectWorkspaceLayoutComponent`. Rolle
   * „User" erhält bewusst keinen Badge (`null` → Template blendet ihn vollständig aus). */
  protected roleBadgeClass(role: string): string | null {
    switch (role) {
      case 'PL':
        return 'role-badge--pl';
      case 'Coreteam':
        return 'role-badge--coreteam';
      case 'Architect':
        return 'role-badge--architect';
      default:
        return null;
    }
  }

  private filterAndSort<T extends SortableProject>(items: T[]): T[] {
    const term = this.filterForm.controls.search.value.trim().toLowerCase();
    const filtered = term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items.slice();

    const sortBy = this.filterForm.controls.sortBy.value;
    return filtered.sort((a, b) =>
      sortBy === 'name' ? a.name.localeCompare(b.name, 'de') : (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
    );
  }
}
