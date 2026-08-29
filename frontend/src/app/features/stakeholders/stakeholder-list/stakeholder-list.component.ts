import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { debounceTime } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectsService } from '../../projects/projects.service';
import { CreateStakeholderFormComponent } from '../create-stakeholder-form/create-stakeholder-form.component';
import { EditStakeholderFormComponent } from '../edit-stakeholder-form/edit-stakeholder-form.component';
import { DeleteStakeholderDialogComponent } from '../delete-stakeholder-dialog/delete-stakeholder-dialog.component';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Stakeholder-Liste mit Suche/Filter (US-025, Standard-Landingtab „Stakeholder-Liste“ der
 * Projekt-Workspace-Shell aus US-019 — ersetzt dort {@link CreateStakeholderFormComponent} als
 * primäre Ansicht). Lädt serverseitig gefiltert über `GET /api/v1/projects/{projectId}/
 * stakeholders?search=&type=` (Akzeptanzkriterium 1/2); für alle vier Projektrollen inkl. `User`
 * erreichbar (Akzeptanzkriterium 4) — die Response enthält serverseitig ohnehin keine Einfluss-/
 * Interesse-Werte (Akzeptanzkriterium 3). Enthält das Anlage-Formular sowie je Zeile die
 * Bearbeiten-/Löschen-Aktionen aus US-022/US-023, die nach jeder Änderung die Liste neu laden.
 *
 * Der Filter-Dropdown „Kommunikationsart“ aus Akzeptanzkriterium 1 ist noch nicht mit echten
 * Optionen befüllt — ein Endpoint zum Auflisten des Kommunikationsarten-Katalogs entsteht erst mit
 * US-037; die Backend-Query (`communicationTypeId`) unterstützt den Filter bereits, sobald diese
 * Story eine Datenquelle für die Optionen liefert (siehe Anmerkungen der Story-Datei).
 *
 * US-024 (Papierkorb-Ansicht): der Umschalter „Gelöschte anzeigen“ ist ausschließlich für Rolle
 * `PL` sichtbar (Akzeptanzkriterium 3) und ersetzt bei Aktivierung den Listeninhalt vollständig
 * durch `GET .../stakeholders?deleted=true` (Akzeptanzkriterium 1) — kein Vermischen von aktiven
 * und gelöschten Zeilen, das entspricht dem Backend-Contract, der stets ausschließlich das eine
 * oder das andere liefert. Anlage-Formular sowie Bearbeiten-/Löschen-Aktionen sind in diesem
 * Modus ausgeblendet; stattdessen zeigt jede Zeile einen Badge und einen „Wiederherstellen“-Button
 * (Akzeptanzkriterium 3/4), der nach Erfolg die (weiterhin gefilterte) Papierkorb-Ansicht neu lädt,
 * ohne die Seite komplett neu zu laden.
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
    RouterLink,
    DatePipe,
    CreateStakeholderFormComponent,
    EditStakeholderFormComponent,
    DeleteStakeholderDialogComponent,
    ProcessingButtonComponent,
    ButtonDirective,
    InputText,
  ],
  templateUrl: './stakeholder-list.component.html',
  styleUrl: './stakeholder-list.component.css',
})
export class StakeholderListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected projectId = '';
  protected currentUserRole: string | null = null;
  protected stakeholders: Stakeholder[] = [];
  protected editingStakeholder: Stakeholder | null = null;
  protected deletingStakeholder: Stakeholder | null = null;
  protected showDeleted = false;
  protected loadError: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: IDs der Stakeholder, deren Wiederherstellung gerade läuft. */
  protected readonly restoringStakeholderIds = new Set<string>();

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    type: [''],
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.loadStakeholders();

    this.projectsService.getProject(this.projectId).subscribe((project) => {
      this.currentUserRole = project.role;
    });
    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.loadStakeholders());
  }

  /** Umschalter „Gelöschte anzeigen“ ist ausschließlich für Rolle `PL` sichtbar (Akzeptanzkriterium 3). */
  protected get showDeletedToggle(): boolean {
    return this.currentUserRole === 'PL';
  }

  protected onToggleDeleted(showDeleted: boolean): void {
    this.showDeleted = showDeleted;
    this.editingStakeholder = null;
    this.deletingStakeholder = null;
    this.loadStakeholders();
  }

  protected onCreated(): void {
    this.loadStakeholders();
  }

  protected onEdit(stakeholder: Stakeholder): void {
    this.editingStakeholder = stakeholder;
    this.deletingStakeholder = null;
  }

  protected onEditCancelled(): void {
    this.editingStakeholder = null;
  }

  protected onEditUpdated(): void {
    this.editingStakeholder = null;
    this.loadStakeholders();
  }

  protected onDeleteClick(stakeholder: Stakeholder): void {
    this.deletingStakeholder = stakeholder;
    this.editingStakeholder = null;
  }

  protected onDeleteCancelled(): void {
    this.deletingStakeholder = null;
  }

  protected onDeleted(): void {
    this.deletingStakeholder = null;
    this.loadStakeholders();
  }

  /** US-024 Akzeptanzkriterium 4: aktualisiert die Papierkorb-Ansicht ohne vollständigen Reload.
   * US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
   * nachweislich keinen zweiten HTTP-Request aus. */
  protected onRestore(stakeholder: Stakeholder): void {
    if (this.restoringStakeholderIds.has(stakeholder.id)) {
      return;
    }

    this.restoringStakeholderIds.add(stakeholder.id);
    this.stakeholdersService.restoreStakeholder(stakeholder.id).subscribe({
      next: () => {
        this.restoringStakeholderIds.delete(stakeholder.id);
        this.loadStakeholders();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.restoringStakeholderIds.delete(stakeholder.id);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** US-044 Akzeptanzkriterium 4: konsistente Fehlermeldung statt stumm leerer Liste bei
   * fehlgeschlagenem Laden. */
  private loadStakeholders(): void {
    if (!this.projectId) {
      return;
    }

    this.loadError = null;

    if (this.showDeleted) {
      this.stakeholdersService.listStakeholders(this.projectId, { deleted: true }).subscribe({
        next: (stakeholders) => {
          this.stakeholders = stakeholders;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.loadError = LOAD_ERROR_MESSAGE;
          this.changeDetectorRef.markForCheck();
        },
      });
      return;
    }

    const { search, type } = this.filterForm.getRawValue();
    this.stakeholdersService.listStakeholders(this.projectId, { search: search || undefined, type: type || undefined }).subscribe({
      next: (stakeholders) => {
        this.stakeholders = stakeholders;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
