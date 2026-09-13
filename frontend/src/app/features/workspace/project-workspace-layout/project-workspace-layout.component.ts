import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ProjectOverviewItem, ProjectsService } from '../../projects/projects.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { CurrentProjectContextService } from '../../../core/services/current-project-context.service';
import { APP_NAV_PROJECT_SUB_ITEM_LABELS } from '../../../core/navigation/app-navigation/nav-items';

/**
 * Projekt-Workspace-Shell (US-019, Screen S3): Header mit Projektname und Rollen-Badge
 * (Akzeptanzkriterium 1). Die frühere horizontale Tab-Navigation zwischen
 * Stakeholder-Liste/Map/Verteiler ist seit US-075 entfallen — dieselben drei Ziele sind stattdessen
 * als eingerückte Unterpunkte in der linken Sidebar erreichbar (`AppNavigationComponent`). Die
 * Rollen-basierte Sichtbarkeitsregel selbst (PRD Abschnitt 2.3, Akzeptanzkriterium 2/3/4 aus US-019)
 * ist dadurch in {@link CurrentProjectContextService}s Konsumenten (Sidebar) gewandert — zusätzlich
 * zur dortigen UI-Ausblendung sichert `roleGuard` die jeweilige Route weiterhin auch bei direktem
 * Aufruf ab (Akzeptanzkriterium 5).
 *
 * US-081 (Issue #125): Dieser Header-`<h1>` ist seither die EINZIGE Hauptüberschrift jeder
 * Projekt-Unterseite (Stakeholder-Liste/-Detail, Map, Verteiler) — die vormals zusätzlich
 * gerenderte zweite `<h1>` je Kind-Route ("Stakeholder"/"Map"/"Verteiler") ist entfallen
 * (Akzeptanzkriterium 1/2). Damit trotzdem weiterhin erkennbar bleibt, welcher Bereich aktiv ist,
 * ohne die Sidebar konsultieren zu müssen (Akzeptanzkriterium 5), trägt der `<h1>` zusätzlich ein
 * `aria-label`, das den Projektnamen um den aktiven Bereich ergänzt (siehe {@link headerAriaLabel}).
 * Der Bereichsname wird dafür aus der aktuellen Router-URL abgeleitet (analog zu
 * `AppNavigationComponent.computeIsProjectRoute`) statt über eine neue Route-`data`-Eigenschaft,
 * um keinen zweiten Ort für dieselbe Information einzuführen — die Wortwahl selbst kommt
 * unverändert aus der bereits zentralen {@link APP_NAV_PROJECT_SUB_ITEM_LABELS}.
 */
@Component({
  selector: 'app-project-workspace-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './project-workspace-layout.component.html',
  styleUrl: './project-workspace-layout.component.css',
})
export class ProjectWorkspaceLayoutComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly currentProjectContext = inject(CurrentProjectContextService);

  protected project: ProjectOverviewItem | null = null;
  protected loadError: string | null = null;
  /** US-081 Akzeptanzkriterium 5: aktueller Bereichsname für {@link headerAriaLabel}, aus der
   * Router-URL abgeleitet (siehe {@link computeAreaLabel}) und bei jeder Kind-Navigation innerhalb
   * desselben Projekt-Workspace neu berechnet (diese Komponente wird beim Wechsel zwischen
   * Stakeholder-Liste/Map/Verteiler NICHT neu instanziiert, nur ihre Kind-Route). */
  protected areaLabel = this.computeAreaLabel();

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.areaLabel = this.computeAreaLabel();
      });
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt einer dauerhaft leeren Shell bei
   * fehlgeschlagenem Laden.
   *
   * US-052: `changeDetectorRef.markForCheck()` in beiden Zweigen behebt eine bei der
   * Live-Verifikation dieser Story zusätzlich real reproduzierte, bis dahin unentdeckte
   * Ausprägung des aus US-050/US-057 bekannten Musters — exakt in dieser Methode, die die Story
   * ohnehin ändert: Ohne `zone.js` markiert die reine Feldzuweisung `this.project = project` im
   * `subscribe()`-Callback die Komponente nicht automatisch für die nächste
   * Change-Detection-Runde. Gegen einen echten laufenden Stack blieb dadurch Header/Tab-Navigation
   * für einen BERECHTIGTEN Nutzer dauerhaft unsichtbar (Akzeptanzkriterium 1 verletzt), obwohl
   * `project` intern korrekt gesetzt war — Unit-Tests mit synchronem `of(...)` deckten das nicht
   * auf, da die erste, ohnehin fällige Change-Detection-Runde die synchron eintreffende Antwort
   * noch mit erfasst; erst die tatsächliche Async-Latenz eines echten HTTP-Requests legt die
   * fehlende Markierung offen. */
  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      return;
    }

    this.projectsService.getProject(projectId).subscribe({
      next: (project) => {
        this.project = project;
        // US-075: einzige Stelle, die das Projekt lädt — die Sidebar (`AppNavigationComponent`)
        // liest denselben Zustand, statt selbst nachzuladen (kein zweiter Backend-Request).
        this.currentProjectContext.setProject(project);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.currentProjectContext.clear();
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** US-075: verhindert, dass die Sidebar nach dem Verlassen des Projekt-Workspace weiterhin das
   * zuletzt geladene Projekt anzeigt. */
  ngOnDestroy(): void {
    this.currentProjectContext.clear();
  }

  /**
   * US-052: `roleGuard` hat für einen nicht berechtigten Nutzer die Navigation bereits vor der
   * Instanziierung dieser Komponente auf die Kind-Route `access-denied` umgeleitet (siehe
   * `role.guard.ts`) — `AccessDeniedComponent` erklärt die Situation dort bereits konkret und
   * verständlich. Der eigene, redundante `getProject()`-Aufruf oben schlägt für denselben Nutzer
   * ebenfalls fehl und würde ohne diese Prüfung zusätzlich die generische, nichtssagende
   * {@link LOAD_ERROR_MESSAGE} über `AccessDeniedComponent` legen — genau die in der Story
   * beschriebene Verdopplung. `router.url` ist zu diesem Zeitpunkt bereits die final aufgelöste
   * Ziel-URL (Guards inkl. Redirects laufen vollständig ab, bevor diese Komponente erzeugt wird),
   * daher ist kein zusätzlicher Navigations-Listener nötig.
   */
  protected get showLoadError(): boolean {
    return this.loadError !== null && !this.router.url.endsWith('/access-denied');
  }

  /**
   * US-047 / SPEC-00 §1.3 & §4: Rollenfarbe als CSS-Modifier-Klasse für den `.role-badge`-Baustein.
   * Die Rolle „User" erhält bewusst `null` (kein Badge, SPEC-00 §4) statt einer neutralen Variante.
   */
  protected get roleBadgeClass(): string | null {
    switch (this.project?.role) {
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

  /** US-081 Akzeptanzkriterium 5: Accessible Name des einzigen verbleibenden `<h1>` — enthält den
   * sichtbaren Projektnamen vollständig (WCAG 2.5.3 „Label in Name") und ergänzt ihn um den aktiven
   * Bereich, damit ein Screenreader-Nutzer den Bereich auch ohne vorherige Sidebar-Navigation
   * identifizieren kann. Leerer String, solange `project` noch nicht geladen ist (Header rendert
   * dann ohnehin nicht, siehe Template `@if (project)`). */
  protected get headerAriaLabel(): string {
    return this.project ? `${this.project.name} – ${this.areaLabel}` : '';
  }

  /** US-081: leitet den aktiven Bereich aus der Router-URL ab (analog zu
   * `AppNavigationComponent.computeIsProjectRoute`) statt über eine neue Route-`data`-Eigenschaft.
   * `/map` und `/distribution` sind eindeutig; jede andere Kind-Route unterhalb des Projekt-
   * Workspace (insbesondere `stakeholders` UND `stakeholders/:stakeholderId`) gilt als
   * Stakeholder-Bereich — die Detailseite ist fachlich weiterhin Teil der Stakeholder-Liste
   * (Rücksprung über „Zurück zur Liste"), nicht ein vierter, eigener Bereich. */
  private computeAreaLabel(): string {
    const url = this.router.url;
    if (/\/distribution(?:[/?#]|$)/.test(url)) {
      return APP_NAV_PROJECT_SUB_ITEM_LABELS.distribution;
    }
    if (/\/map(?:[/?#]|$)/.test(url)) {
      return APP_NAV_PROJECT_SUB_ITEM_LABELS.map;
    }
    return APP_NAV_PROJECT_SUB_ITEM_LABELS.stakeholders;
  }
}
