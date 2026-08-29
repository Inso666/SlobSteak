import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { MapPoint, MapService, PerspectiveRole } from '../map.service';
import { ProjectsService } from '../../projects/projects.service';
import { QuadrantChartComponent } from '../quadrant-chart/quadrant-chart.component';
import { MAP_EMPTY_MESSAGE } from '../map-messages';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';

/** Diskreter Anzeigezustand (SPEC-00 §3 „Event-Handling-Grundsatz“, konsistent mit dem
 * app-weiten `ViewState`-Muster aus US-050) statt kombinierbarer Boolean-Flags. Eigenständig
 * (nicht der geteilte `ViewState`-Typ aus `shared/view-state`) definiert, weil dessen
 * `ViewStateComponent` sein Skeleton auf feste, listenzeilen-große Platzhalter auslegt
 * (`skeletonRowHeight`, nicht pro Verwendungsstelle konfigurierbar) — für den quadratischen
 * Map-Canvas passt stattdessen der in SPEC-04 §1 wörtlich vorgegebene
 * `<p-skeleton height="640px">`-Platzhalter besser zur „Ersetzt Inhalte 1:1 in Form/Größe“-Vorgabe
 * aus SPEC-00 §3 (Ermessensfrage laut SPEC-04 §3.6, hier so entschieden und dokumentiert). */
type MapViewState = 'loading' | 'content' | 'empty' | 'error';

const PERSPECTIVE_OPTIONS: readonly PerspectiveRole[] = ['PL', 'Coreteam', 'Architect'];

/**
 * Stakeholder-Map (US-032, Screen S3 Tab „Map", F3.1). Lädt die Map-Punkte für genau eine
 * Perspektive über `MapService`/US-031 (Akzeptanzkriterium 3) und zeigt sie im
 * {@link QuadrantChartComponent}. Das Perspektiv-Dropdown „Meine Sicht" (Feldname `ownPerspective`,
 * Benennung bewusst deckungsgleich mit `docs/specs/SPEC-04-Stakeholder-Map.md` §2.1, damit die
 * Vergleichsmodus-Folgestory US-034 dasselbe Formular um `compareMode`/`comparePerspective`
 * erweitern kann statt es umzubenennen) ist standardmäßig auf die eigene Projekt-Rolle des
 * angemeldeten Nutzers vorbelegt (Akzeptanzkriterium 2). Ein Klick auf einen Punkt navigiert zur
 * Stakeholder-Detailseite (US-026, Akzeptanzkriterium 3).
 *
 * Anmerkung des Agenten (CLAUDE.md Abschnitt 6): `docs/specs/SPEC-04-Stakeholder-Map.md`
 * beschreibt den vollständigen Endzustand aller vier Map-Stories der Backlog-Phase 5
 * (Vergleichsmodus/F3.2 → US-033/034, Drag&Drop/F3.3 → US-035/036) gemeinsam in einem Dokument.
 * Diese Komponente implementiert ausschließlich die eigenständigen Akzeptanzkriterien von US-032
 * (Basis-Ansicht ohne Vergleichsmodus, ohne Zoom/Pan, ohne Drag&Drop) — kein Vorgriff auf die
 * noch offenen Folgestories (CLAUDE.md Abschnitt 3). Ebenfalls bewusst zurückgestellt: die in
 * SPEC-04 §1 beschriebene Legende (`p-panel header="Legende"`) und die
 * `AppPerspectivesRadarComponent`-Wiederverwendung — ihr Inhalt (eigene vs. Vergleichssicht,
 * Verbindungslinien-Hinweis) ist ausschließlich im Vergleichsmodus sinnvoll und gehört inhaltlich
 * zu F3.2 (US-034), nicht zu F3.1.
 *
 * Die Perspektiv-Optionsliste ist hier als feste Aufzählung `PL`/`Coreteam`/`Architect` hinterlegt
 * statt, wie SPEC-04 §2.1 es für den vollständigen Endzustand vorsieht, „serverseitig aus den im
 * Projekt vorhandenen Perspektiven-Rollen geladen" zu werden — ein solcher Katalog-Endpoint
 * existiert weder im PRD noch im Backlog; die Story-AC selbst benennt exakt diese drei Werte
 * („Ein Dropdown wählt die Perspektive (PL/Coreteam/Architect)"), und der zugrunde liegende
 * `GET .../map`-Endpoint (US-031) akzeptiert ohnehin nur genau diese drei Werte. PRD-konformste,
 * am wenigsten überraschende Lesart statt Erfindung eines neuen Katalog-Endpoints außerhalb dieser
 * Story.
 */
@Component({
  selector: 'app-stakeholder-map-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective, Card, Skeleton, QuadrantChartComponent],
  templateUrl: './stakeholder-map-page.component.html',
  styleUrl: './stakeholder-map-page.component.css',
})
export class StakeholderMapPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapService = inject(MapService);
  private readonly projectsService = inject(ProjectsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly perspectiveOptions = PERSPECTIVE_OPTIONS;
  protected readonly emptyMessage = MAP_EMPTY_MESSAGE;
  protected readonly loadErrorMessage = LOAD_ERROR_MESSAGE;

  protected projectId = '';
  protected points: MapPoint[] = [];
  protected selectedPerspective: PerspectiveRole = 'PL';
  protected viewState: MapViewState = 'loading';

  protected readonly filterForm = this.formBuilder.group({
    ownPerspective: this.formBuilder.nonNullable.control<PerspectiveRole>('PL'),
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';

    // Akzeptanzkriterium 2: Standardauswahl ist die eigene Projekt-Rolle des angemeldeten Nutzers.
    this.projectsService.getProject(this.projectId).subscribe((project) => {
      const defaultPerspective = this.asPerspective(project.role) ?? PERSPECTIVE_OPTIONS[0];
      this.filterForm.controls.ownPerspective.setValue(defaultPerspective, { emitEvent: false });
      this.selectedPerspective = defaultPerspective;
      this.loadMapData(defaultPerspective);
      this.changeDetectorRef.markForCheck();
    });

    this.filterForm.controls.ownPerspective.valueChanges.subscribe((perspective) => {
      this.selectedPerspective = perspective;
      this.loadMapData(perspective);
    });
  }

  /** Akzeptanzkriterium 3: Klick auf einen Punkt navigiert zur Stakeholder-Detailseite (US-026). */
  protected onPointSelected(stakeholderId: string): void {
    this.router.navigate(['/projects', this.projectId, 'stakeholders', stakeholderId]);
  }

  /** SPEC-04 §3.7 „Allgemeiner Ladefehler": wiederholt exakt den zuletzt fehlgeschlagenen Aufruf. */
  protected onRetry(): void {
    this.loadMapData(this.selectedPerspective);
  }

  private asPerspective(role: string): PerspectiveRole | null {
    return (PERSPECTIVE_OPTIONS as readonly string[]).includes(role) ? (role as PerspectiveRole) : null;
  }

  private loadMapData(perspective: PerspectiveRole): void {
    if (!this.projectId) {
      return;
    }

    this.viewState = 'loading';
    this.mapService.getMapData(this.projectId, perspective).subscribe({
      next: (points) => {
        this.points = points;
        this.viewState = points.length === 0 ? 'empty' : 'content';
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.viewState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
