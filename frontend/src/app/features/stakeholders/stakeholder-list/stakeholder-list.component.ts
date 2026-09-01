import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { debounceTime } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectsService } from '../../projects/projects.service';
import { MapService, MapPoint, PerspectiveRole } from '../../map/map.service';
import { CreateStakeholderFormComponent } from '../create-stakeholder-form/create-stakeholder-form.component';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { formatRelativeTime } from '../../../shared/utils/relative-time';

/** Projektrollen, die eine eigene Perspektive im Assessment tragen und damit die Spalten
 * „Kommunikation“/„Meine Bewertung“ sehen dürfen (US-072 Akzeptanzkriterium 1/6, identische
 * Grenze wie US-040/US-030). */
const PERSPECTIVE_ROLES: readonly string[] = ['PL', 'Coreteam', 'Architect'];

/**
 * Stakeholder-Liste mit Suche/Filter (US-025, Standard-Landingtab „Stakeholder-Liste“ der
 * Projekt-Workspace-Shell aus US-019). Lädt serverseitig gefiltert über `GET /api/v1/projects/
 * {projectId}/stakeholders?search=&type=` (Akzeptanzkriterium 1/2).
 *
 * US-072 (Issue #100): Tabellen-Umbau statt Karten-Raster (`docs/design/StakeholderList.dc.html`).
 * Spalten Name (inkl. Typ-Icon), Organisation, Kommunikation (Chips), Meine Bewertung, Aktualisiert
 * (relative Zeit) — die beiden mittleren Spalten entfallen für Rolle `User` vollständig
 * ({@link canViewPerspectiveColumns}), da weder Kommunikationszuordnungen noch eine eigene
 * Bewertung für diese Rolle existieren (US-040/US-030). „Meine Bewertung“ joint client-seitig die
 * bereits bestehende, rollenkorrekte Map-Query-API (US-031, `MapService.getMapData`) über
 * `stakeholderId` — kein neuer Backend-Contract. Zeilen sind klickbar und navigieren zur
 * Detailseite (Akzeptanzkriterium 2); Bearbeiten/Löschen sind seit US-071/dieser Story
 * ausschließlich über die Detailseite erreichbar, die zugehörigen Formular-/Dialog-Komponenten
 * werden hier daher nicht mehr eingebunden. „Gelöschte anzeigen“ ist ein Toggle, der den
 * Papierkorb-Bereich zusätzlich unterhalb der weiterhin sichtbaren aktiven Liste einblendet
 * (Akzeptanzkriterium 4) — beide Listen werden unabhängig voneinander geladen. „Stakeholder
 * anlegen“ öffnet {@link CreateStakeholderFormComponent} als `p-dialog` über einen
 * Toolbar-Button (Akzeptanzkriterium 5, Muster aus US-038/US-065/US-056).
 *
 * `totalStakeholderCount` für die geforderte Zeilenzahl-Anzeige „N Stakeholder insgesamt · M
 * angezeigt (gefiltert)“ stammt, solange kein Filter aktiv ist, direkt aus der ohnehin geladenen
 * (dann bereits vollständigen) Liste — nur bei aktivem Such-/Typ-Filter wird zusätzlich einmalig
 * ungefiltert nachgeladen ({@link refreshTotalCountOnly}), da der bestehende Listen-Endpunkt sonst
 * ausschließlich die bereits gefilterte Menge liefert, ohne eigenes Gesamt-Feld. So entsteht im
 * unfiltrierten Regelfall (Initial-Laden, nach Anlegen/Wiederherstellen) kein zweiter, mit
 * identischen Parametern doppelter HTTP-Request (siehe Anmerkungen des Agenten in der
 * Story-Datei).
 *
 * US-058: `changeDetectorRef.markForCheck()` in jedem `subscribe()`-Callback ergänzt — dieselbe
 * Root Cause wie in US-050/US-051/US-057: Das Frontend läuft ohne `zone.js`, eine reine
 * Feldzuweisung in einem `subscribe()`-Callback markiert die Komponente sonst nicht automatisch
 * für die nächste Change-Detection-Runde.
 */
@Component({
  selector: 'app-stakeholder-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    CreateStakeholderFormComponent,
    ProcessingButtonComponent,
    ButtonDirective,
    Dialog,
    InputText,
  ],
  templateUrl: './stakeholder-list.component.html',
  styleUrl: './stakeholder-list.component.css',
})
export class StakeholderListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly projectsService = inject(ProjectsService);
  private readonly mapService = inject(MapService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected projectId = '';
  protected currentUserRole: string | null = null;
  protected stakeholders: Stakeholder[] = [];
  protected deletedStakeholders: Stakeholder[] = [];
  protected showDeleted = false;
  protected loadError: string | null = null;
  protected deletedLoadError: string | null = null;
  /** Ungefiltert geladene Gesamtzahl aktiver Stakeholder (siehe Klassendoku). */
  protected totalStakeholderCount = 0;
  /** US-043 Akzeptanzkriterium 1/2/3/4: IDs der Stakeholder, deren Wiederherstellung gerade läuft. */
  protected readonly restoringStakeholderIds = new Set<string>();
  /** „Meine Bewertung“ je Stakeholder, aus der Map-Query-API (US-031) client-seitig gejoint —
   * `undefined`, solange die Rolle keine Perspektive trägt oder noch nicht geladen wurde. */
  protected assessmentByStakeholderId = new Map<string, MapPoint>();
  /** US-056: `p-dialog` erfordert ein `WritableSignal` für `[(visible)]`. */
  protected readonly createDialogVisible = signal(false);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    type: [''],
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.loadStakeholders();

    this.projectsService.getProject(this.projectId).subscribe((project) => {
      this.currentUserRole = project.role;
      this.changeDetectorRef.markForCheck();
      this.loadAssessments();
    });
    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.loadStakeholders());
  }

  /** Umschalter „Gelöschte anzeigen“ ist ausschließlich für Rolle `PL` sichtbar (US-024
   * Akzeptanzkriterium 3). */
  protected get showDeletedToggle(): boolean {
    return this.currentUserRole === 'PL';
  }

  /** US-072 Akzeptanzkriterium 1/6: Spalten „Kommunikation“/„Meine Bewertung“ existieren nur für
   * die drei perspektiv-tragenden Rollen. */
  protected get canViewPerspectiveColumns(): boolean {
    return PERSPECTIVE_ROLES.includes(this.currentUserRole ?? '');
  }

  /** US-072 Akzeptanzkriterium 3: „N Stakeholder insgesamt · M angezeigt (gefiltert)“, das
   * „(gefiltert)“-Suffix erscheint nur, wenn tatsächlich gefiltert wird. */
  protected get isFiltered(): boolean {
    const { search, type } = this.filterForm.getRawValue();
    return !!search || !!type;
  }

  /** US-047/SPEC-00 §1.3-analog: Rollen-Badge-Klasse für die eigene Rolle unter „Meine Bewertung“. */
  protected get ownRoleBadgeClass(): string {
    switch (this.currentUserRole) {
      case 'PL':
        return 'role-badge--pl';
      case 'Coreteam':
        return 'role-badge--coreteam';
      case 'Architect':
        return 'role-badge--architect';
      default:
        return '';
    }
  }

  protected typeIcon(stakeholder: Stakeholder): string {
    return stakeholder.type === 'Organization' ? 'pi-building' : 'pi-user';
  }

  protected assessmentFor(stakeholder: Stakeholder): MapPoint | undefined {
    return this.assessmentByStakeholderId.get(stakeholder.id);
  }

  /** Formatiert einen ISO-Zeitstempel als deutsche relative Zeitangabe (Akzeptanzkriterium 1,
   * „vor 2 Std.“/„vor 1 Tag“/… analog zu `docs/design/StakeholderList.dc.html`). US-076: Logik
   * nach `shared/utils/relative-time.ts` extrahiert, da die Projektübersicht (Kartenfußzeile)
   * dieselbe Umrechnung benötigt. */
  protected relativeTime(iso: string): string {
    return formatRelativeTime(iso);
  }

  protected onRowClick(stakeholder: Stakeholder): void {
    this.router.navigate([stakeholder.id], { relativeTo: this.route });
  }

  protected onToggleDeleted(showDeleted: boolean): void {
    this.showDeleted = showDeleted;
    if (showDeleted) {
      this.loadDeletedStakeholders();
    }
  }

  protected openCreateDialog(): void {
    this.createDialogVisible.set(true);
  }

  protected closeCreateDialog(): void {
    this.createDialogVisible.set(false);
  }

  protected onCreated(): void {
    this.createDialogVisible.set(false);
    this.loadStakeholders();
  }

  /** US-024 Akzeptanzkriterium 4: aktualisiert die Papierkorb-Ansicht ohne vollständigen Reload.
   * US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
   * nachweislich keinen zweiten HTTP-Request aus.
   *
   * Lädt zusätzlich {@link loadAssessments} neu (US-072): die Map-Query-API (US-031) liefert nur
   * aktive Stakeholder — solange dieser Stakeholder gelöscht war, fehlte er in
   * `assessmentByStakeholderId`; ohne diesen erneuten Ladevorgang zeigte die Spalte „Meine
   * Bewertung“ nach dem Wiederherstellen fälschlich „– noch nicht bewertet“, obwohl ein
   * Assessment existiert (im manuellen Smoke-Test dieser Story beobachtet und hier behoben). */
  protected onRestore(stakeholder: Stakeholder): void {
    if (this.restoringStakeholderIds.has(stakeholder.id)) {
      return;
    }

    this.restoringStakeholderIds.add(stakeholder.id);
    this.stakeholdersService.restoreStakeholder(stakeholder.id).subscribe({
      next: () => {
        this.restoringStakeholderIds.delete(stakeholder.id);
        this.loadDeletedStakeholders();
        this.loadStakeholders();
        this.loadAssessments();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.restoringStakeholderIds.delete(stakeholder.id);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. Ist kein Filter aktiv, liefert diese Antwort bereits die vollständige
   * aktive Menge — `totalStakeholderCount` wird dann direkt daraus übernommen, ohne separaten
   * Request (siehe Klassendoku); nur bei aktivem Filter wird die Gesamtzahl zusätzlich einmalig
   * ungefiltert nachgeladen. */
  private loadStakeholders(): void {
    if (!this.projectId) {
      return;
    }

    this.loadError = null;
    const { search, type } = this.filterForm.getRawValue();
    const filtered = this.isFiltered;
    this.stakeholdersService
      .listStakeholders(this.projectId, { search: search || undefined, type: type || undefined })
      .subscribe({
        next: (stakeholders) => {
          this.stakeholders = stakeholders;
          if (filtered) {
            this.refreshTotalCountOnly();
          } else {
            this.totalStakeholderCount = stakeholders.length;
          }
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.loadError = LOAD_ERROR_MESSAGE;
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /** Lädt die ungefilterte Gesamtzahl aktiver Stakeholder ausschließlich für die
   * Zeilenzahl-Anzeige nach — nur aufgerufen, während tatsächlich gefiltert wird (siehe
   * {@link loadStakeholders}), damit im unfiltrierten Regelfall kein zweiter, identischer Request
   * entsteht. */
  private refreshTotalCountOnly(): void {
    this.stakeholdersService.listStakeholders(this.projectId, {}).subscribe({
      next: (stakeholders) => {
        this.totalStakeholderCount = stakeholders.length;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private loadDeletedStakeholders(): void {
    if (!this.projectId) {
      return;
    }

    this.deletedLoadError = null;
    this.stakeholdersService.listStakeholders(this.projectId, { deleted: true }).subscribe({
      next: (stakeholders) => {
        this.deletedStakeholders = stakeholders;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.deletedLoadError = LOAD_ERROR_MESSAGE;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** US-072 Akzeptanzkriterium 1 („Meine Bewertung“): nur für perspektiv-tragende Rollen
   * überhaupt aufgerufen — Rolle `User` löst keinen Map-Request aus (US-030/US-031
   * Sichtbarkeitsgrenze, kein neuer Endpunkt-Aufruf für eine Rolle ohne eigene Perspektive). */
  private loadAssessments(): void {
    if (!this.projectId || !this.canViewPerspectiveColumns) {
      return;
    }

    this.mapService.getMapData(this.projectId, this.currentUserRole as PerspectiveRole).subscribe({
      next: (points) => {
        this.assessmentByStakeholderId = new Map(
          points.map((point) => [point.stakeholderId, point]),
        );
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
