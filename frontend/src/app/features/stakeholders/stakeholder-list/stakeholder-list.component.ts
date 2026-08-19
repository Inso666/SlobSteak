import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { debounceTime } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectsService } from '../../projects/projects.service';
import { CreateStakeholderFormComponent } from '../create-stakeholder-form/create-stakeholder-form.component';
import { EditStakeholderFormComponent } from '../edit-stakeholder-form/edit-stakeholder-form.component';
import { DeleteStakeholderDialogComponent } from '../delete-stakeholder-dialog/delete-stakeholder-dialog.component';

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
 */
@Component({
  selector: 'app-stakeholder-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CreateStakeholderFormComponent, EditStakeholderFormComponent, DeleteStakeholderDialogComponent],
  templateUrl: './stakeholder-list.component.html',
  styleUrl: './stakeholder-list.component.css',
})
export class StakeholderListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);

  protected projectId = '';
  protected currentUserRole: string | null = null;
  protected stakeholders: Stakeholder[] = [];
  protected editingStakeholder: Stakeholder | null = null;
  protected deletingStakeholder: Stakeholder | null = null;
  protected showDeleted = false;

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    type: [''],
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.loadStakeholders();

    this.projectsService.getProject(this.projectId).subscribe((project) => (this.currentUserRole = project.role));
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

  /** US-024 Akzeptanzkriterium 4: aktualisiert die Papierkorb-Ansicht ohne vollständigen Reload. */
  protected onRestore(stakeholder: Stakeholder): void {
    this.stakeholdersService.restoreStakeholder(stakeholder.id).subscribe(() => this.loadStakeholders());
  }

  private loadStakeholders(): void {
    if (!this.projectId) {
      return;
    }

    if (this.showDeleted) {
      this.stakeholdersService.listStakeholders(this.projectId, { deleted: true }).subscribe((stakeholders) => {
        this.stakeholders = stakeholders;
      });
      return;
    }

    const { search, type } = this.filterForm.getRawValue();
    this.stakeholdersService.listStakeholders(this.projectId, { search: search || undefined, type: type || undefined }).subscribe((stakeholders) => {
      this.stakeholders = stakeholders;
    });
  }
}
