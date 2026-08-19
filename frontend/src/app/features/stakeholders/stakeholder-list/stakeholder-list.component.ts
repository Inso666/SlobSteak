import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
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
 */
@Component({
  selector: 'app-stakeholder-list',
  standalone: true,
  imports: [ReactiveFormsModule, CreateStakeholderFormComponent, EditStakeholderFormComponent, DeleteStakeholderDialogComponent],
  templateUrl: './stakeholder-list.component.html',
  styleUrl: './stakeholder-list.component.css',
})
export class StakeholderListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly route = inject(ActivatedRoute);

  protected projectId = '';
  protected stakeholders: Stakeholder[] = [];
  protected editingStakeholder: Stakeholder | null = null;
  protected deletingStakeholder: Stakeholder | null = null;

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    type: [''],
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.loadStakeholders();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.loadStakeholders());
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

  private loadStakeholders(): void {
    if (!this.projectId) {
      return;
    }

    const { search, type } = this.filterForm.getRawValue();
    this.stakeholdersService.listStakeholders(this.projectId, { search: search || undefined, type: type || undefined }).subscribe((stakeholders) => {
      this.stakeholders = stakeholders;
    });
  }
}
