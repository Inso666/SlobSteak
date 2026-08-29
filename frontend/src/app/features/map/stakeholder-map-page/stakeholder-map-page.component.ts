import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { MapComparisonEntry, MapPoint, MapService, PerspectiveRole } from '../map.service';
import { ProjectsService } from '../../projects/projects.service';
import { QuadrantChartComponent } from '../quadrant-chart/quadrant-chart.component';
import { ComparisonModeToggleComponent } from '../comparison-mode-toggle/comparison-mode-toggle.component';
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
 * Stakeholder-Map (US-032, Screen S3 Tab „Map", F3.1; erweitert um den Vergleichsmodus in US-034,
 * F3.2). Lädt die Map-Punkte über `MapService` — im Basis-Modus für genau eine Perspektive
 * (`GET .../map`, US-031), im Vergleichsmodus für zwei Perspektiven gleichzeitig
 * (`GET .../map/compare`, US-033) — und zeigt sie im {@link QuadrantChartComponent}. Das
 * Perspektiv-Dropdown „Meine Sicht" (Feldname `ownPerspective`) ist standardmäßig auf die eigene
 * Projekt-Rolle des angemeldeten Nutzers vorbelegt (US-032 Akzeptanzkriterium 2). Ein Klick auf
 * einen Punkt navigiert zur Stakeholder-Detailseite (US-026).
 *
 * **Vergleichsmodus (US-034 Akzeptanzkriterium 1):** Der {@link ComparisonModeToggleComponent}
 * (`compareMode`-Steuerelement) schaltet ein zweites Dropdown „Vergleichen mit:"
 * (`comparePerspective`) frei; sobald beide Werte gesetzt sind, wird `GET .../map/compare`
 * aufgerufen statt `GET .../map`. `comparePerspective` ist gemäß SPEC-04 §2.1 nur dann pflichtig
 * (`Validators.required`), wenn `compareMode === true`; beim Deaktivieren wird das Feld
 * deaktiviert und zurückgesetzt.
 *
 * **Dokumentierte Abweichung von SPEC-04 §2.1 (CLAUDE.md Abschnitt 6):** SPEC-04 erlaubt
 * ausdrücklich, dass `comparePerspective === ownPerspective` gewählt wird („keine
 * Validierungsregel, die dies verhindert"). Der inzwischen bereits fertiggestellte, dieser Story
 * zugrunde liegende Endpoint `GET .../map/compare` (US-033) liefert für `primary === secondary`
 * jedoch `400 Bad Request` (`PRIMARY_EQUALS_SECONDARY`) — SPEC-04 wurde vor dieser strengeren, im
 * Rahmen von US-033 bewusst getroffenen Backend-Entscheidung verfasst. Statt einen serverseitig
 * grundsätzlich abgelehnten Request zu riskieren, filtert {@link comparePerspectiveOptions} die
 * aktuell gewählte `ownPerspective` aus der Optionsliste des zweiten Dropdowns heraus (fachlich
 * ohnehin naheliegend — der Vergleich einer Perspektive mit sich selbst liefert keine Erkenntnis)
 * und die `ownPerspective`-Änderung setzt eine dadurch ungültig gewordene `comparePerspective`-
 * Auswahl zurück.
 *
 * **Konsistenz mit `ownPerspective` (dokumentierte Abweichung von SPEC-04 §1, bereits seit
 * US-032):** SPEC-04 sieht `p-select` für beide Dropdowns vor; das bereits fertiggestellte
 * `ownPerspective`-Steuerelement (US-032) nutzt stattdessen ein natives `<select>`. Um innerhalb
 * derselben Toolbar nicht zwei unterschiedliche Auswahl-Paradigmen zu mischen, übernimmt
 * `comparePerspective` dasselbe, bereits etablierte native `<select>`-Muster.
 */
@Component({
  selector: 'app-stakeholder-map-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective, Card, Skeleton, QuadrantChartComponent, ComparisonModeToggleComponent],
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
  protected comparisonEntries: MapComparisonEntry[] = [];
  protected selectedPerspective: PerspectiveRole = 'PL';
  protected viewState: MapViewState = 'loading';

  protected readonly filterForm = this.formBuilder.group({
    ownPerspective: this.formBuilder.nonNullable.control<PerspectiveRole>('PL'),
    compareMode: this.formBuilder.nonNullable.control<boolean>(false),
    comparePerspective: this.formBuilder.control<PerspectiveRole | null>({ value: null, disabled: true }),
  });

  /** Siehe Klassendokumentation „Dokumentierte Abweichung von SPEC-04 §2.1": schließt die aktuell
   * gewählte `ownPerspective` aus, damit `primary === secondary` (US-033: `400 Bad Request`) über
   * die UI gar nicht erst wählbar ist. */
  protected get comparePerspectiveOptions(): PerspectiveRole[] {
    const ownPerspective = this.filterForm.controls.ownPerspective.value;
    return PERSPECTIVE_OPTIONS.filter((option) => option !== ownPerspective);
  }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';

    // US-032 Akzeptanzkriterium 2: Standardauswahl ist die eigene Projekt-Rolle des angemeldeten
    // Nutzers.
    this.projectsService.getProject(this.projectId).subscribe((project) => {
      const defaultPerspective = this.asPerspective(project.role) ?? PERSPECTIVE_OPTIONS[0];
      this.filterForm.controls.ownPerspective.setValue(defaultPerspective, { emitEvent: false });
      this.selectedPerspective = defaultPerspective;
      this.reload();
      this.changeDetectorRef.markForCheck();
    });

    this.filterForm.controls.ownPerspective.valueChanges.subscribe((perspective) => {
      this.selectedPerspective = perspective;

      const comparePerspectiveControl = this.filterForm.controls.comparePerspective;
      if (comparePerspectiveControl.value === perspective) {
        comparePerspectiveControl.setValue(null);
        return; // comparePerspective.valueChanges löst bereits ein reload() aus.
      }

      this.reload();
    });

    // US-034 Akzeptanzkriterium 1: `compareMode` schaltet die Pflicht von `comparePerspective`
    // um (SPEC-04 §2.1) und aktiviert/deaktiviert das zugehörige Steuerelement.
    this.filterForm.controls.compareMode.valueChanges.subscribe((compareMode) => {
      const comparePerspectiveControl = this.filterForm.controls.comparePerspective;
      if (compareMode) {
        comparePerspectiveControl.enable({ emitEvent: false });
        comparePerspectiveControl.setValidators(Validators.required);
      } else {
        comparePerspectiveControl.disable({ emitEvent: false });
        comparePerspectiveControl.setValue(null, { emitEvent: false });
        comparePerspectiveControl.clearValidators();
      }
      comparePerspectiveControl.updateValueAndValidity({ emitEvent: false });
      this.reload();
    });

    this.filterForm.controls.comparePerspective.valueChanges.subscribe(() => {
      if (this.filterForm.controls.compareMode.value) {
        this.reload();
      }
    });
  }

  /** US-032 Akzeptanzkriterium 3: Klick auf einen Punkt navigiert zur Stakeholder-Detailseite
   * (US-026) — unverändert für eigene wie für Vergleichspunkte. */
  protected onPointSelected(stakeholderId: string): void {
    this.router.navigate(['/projects', this.projectId, 'stakeholders', stakeholderId]);
  }

  /** SPEC-04 §3.7 „Allgemeiner Ladefehler": wiederholt exakt den zuletzt fehlgeschlagenen Aufruf. */
  protected onRetry(): void {
    this.reload();
  }

  private asPerspective(role: string): PerspectiveRole | null {
    return (PERSPECTIVE_OPTIONS as readonly string[]).includes(role) ? (role as PerspectiveRole) : null;
  }

  /** Lädt je nach `compareMode` entweder die Vergleichsdaten (`GET .../map/compare`, US-033) oder
   * die Einzelperspektive (`GET .../map`, US-031) neu. Ist `compareMode` aktiv, aber noch keine
   * `comparePerspective` gewählt (Zwischenzustand direkt nach dem Aktivieren des Schalters), wird
   * bewusst kein Request ausgelöst — ein Aufruf ohne zweite Perspektive wäre ohnehin ungültig
   * (US-033: `400 Bad Request`). */
  private reload(): void {
    if (!this.projectId) {
      return;
    }

    const ownPerspective = this.filterForm.controls.ownPerspective.value;
    const compareMode = this.filterForm.controls.compareMode.value;
    const comparePerspective = this.filterForm.controls.comparePerspective.value;

    if (compareMode) {
      if (!comparePerspective) {
        return;
      }

      this.viewState = 'loading';
      this.mapService.getComparisonData(this.projectId, ownPerspective, comparePerspective).subscribe({
        next: (entries) => {
          this.comparisonEntries = entries;
          this.points = [];
          this.viewState = entries.length === 0 ? 'empty' : 'content';
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.viewState = 'error';
          this.changeDetectorRef.markForCheck();
        },
      });
      return;
    }

    this.viewState = 'loading';
    this.comparisonEntries = [];
    this.mapService.getMapData(this.projectId, ownPerspective).subscribe({
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
