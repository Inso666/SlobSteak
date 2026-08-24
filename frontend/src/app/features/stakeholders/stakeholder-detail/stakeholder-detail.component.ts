import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { ProjectsService } from '../../projects/projects.service';
import { EditStakeholderFormComponent } from '../edit-stakeholder-form/edit-stakeholder-form.component';
import { DeleteStakeholderDialogComponent } from '../delete-stakeholder-dialog/delete-stakeholder-dialog.component';
import { AssessmentTabsComponent } from '../../assessments/assessment-tabs/assessment-tabs.component';

/**
 * Stakeholder-Detailseite (US-026, Screen S4). Lädt einen einzelnen Stakeholder über
 * `GET /api/v1/stakeholders/{id}` und zeigt Kopfbereich (Name, Typ, Organisation, „zuletzt
 * geändert von/am“ aus US-022, Akzeptanzkriterium 1) sowie den Stammdaten-Bereich mit allen
 * Feldern aus F1.1 (Akzeptanzkriterium 2). Bearbeiten (über die bestehende
 * {@link EditStakeholderFormComponent} aus US-022) ist nur für `PL`/`Coreteam`/`Architect`
 * verfügbar — für Rolle `User` rein read-only, serverseitig ohnehin weiterhin über den
 * rollen-beschränkten `PATCH`-Endpoint abgesichert. Der CTA „Löschen“ (über die bestehende
 * {@link DeleteStakeholderDialogComponent} aus US-023) ist ausschließlich für `PL` sichtbar
 * (Akzeptanzkriterium 4); nach erfolgreichem Löschen navigiert die Seite zurück zur Liste.
 * Reserviert einen Platzhalter-Slot für „Kommunikationszuordnungen“ (US-040) sowie seit US-029
 * den befüllten Assessment-Bereich ({@link AssessmentTabsComponent}, `currentUserRole` wird
 * durchgereicht, damit nur der Tab der eigenen Rolle editierbar ist). Seit US-030 ist dieser
 * gesamte Assessment-Slot für Rolle `User` per `@if` ({@link canViewAssessments}) vollständig aus
 * dem DOM entfernt (nicht nur per CSS versteckt) — eine zusätzliche UX-Schicht über der
 * serverseitigen 403-Sperre auf `GET .../assessments`. Ein 404 (Stakeholder nicht
 * vorhanden oder soft-gelöscht, Akzeptanzkriterium 5) zeigt eine „Nicht gefunden“-Ansicht statt
 * der Detailinhalte.
 */
@Component({
  selector: 'app-stakeholder-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, EditStakeholderFormComponent, DeleteStakeholderDialogComponent, AssessmentTabsComponent, ButtonDirective],
  templateUrl: './stakeholder-detail.component.html',
  styleUrl: './stakeholder-detail.component.css',
})
export class StakeholderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stakeholdersService = inject(StakeholdersService);
  private readonly projectsService = inject(ProjectsService);

  protected projectId = '';
  protected stakeholder: Stakeholder | null = null;
  protected notFound = false;
  protected currentUserRole: string | null = null;
  protected editing = false;
  protected deleting = false;

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    const stakeholderId = this.route.snapshot.paramMap.get('stakeholderId');
    if (!stakeholderId) {
      this.notFound = true;
      return;
    }

    this.load(stakeholderId);
    this.projectsService.getProject(this.projectId).subscribe((project) => (this.currentUserRole = project.role));
  }

  /** Akzeptanzkriterium 2: Bearbeiten nur für PL/Coreteam/Architect, für User read-only. */
  protected get canEdit(): boolean {
    return this.currentUserRole === 'PL' || this.currentUserRole === 'Coreteam' || this.currentUserRole === 'Architect';
  }

  /** Akzeptanzkriterium 4: CTA „Löschen“ nur für PL/Admin(mit PL-Zuweisung) sichtbar. */
  protected get canDelete(): boolean {
    return this.currentUserRole === 'PL';
  }

  /**
   * US-030 Akzeptanzkriterium 3: Assessment-Bereich (inkl. Tabs) wird für Rolle `User` vollständig
   * aus dem DOM entfernt, nicht nur per CSS versteckt — reine, zusätzliche UX-Schicht über der
   * serverseitigen 403-Sperre auf `GET .../assessments` (US-030 Akzeptanzkriterium 1/2). Gleiches
   * Allowlist-Gating wie {@link canEdit}, hier bewusst in dieser Komponente statt in
   * `AssessmentTabsComponent` selbst platziert, damit dasselbe etablierte Rollen-Gating-Muster
   * dieser Seite (`canEdit`/`canDelete`, US-026) für alle Sichtbarkeitsentscheidungen konsistent an
   * einer Stelle bleibt und der gesamte Slot (inkl. Überschrift „Assessment“) verschwindet statt nur
   * die Tabs darunter.
   */
  protected get canViewAssessments(): boolean {
    return this.currentUserRole === 'PL' || this.currentUserRole === 'Coreteam' || this.currentUserRole === 'Architect';
  }

  protected onEditClick(): void {
    this.editing = true;
    this.deleting = false;
  }

  protected onEditCancelled(): void {
    this.editing = false;
  }

  protected onEditUpdated(updated: Stakeholder): void {
    this.editing = false;
    this.stakeholder = updated;
  }

  protected onDeleteClick(): void {
    this.deleting = true;
    this.editing = false;
  }

  protected onDeleteCancelled(): void {
    this.deleting = false;
  }

  protected onDeleted(): void {
    this.router.navigate(['/projects', this.projectId, 'stakeholders']);
  }

  private load(stakeholderId: string): void {
    this.stakeholdersService.getStakeholder(stakeholderId).subscribe({
      next: (stakeholder) => {
        this.stakeholder = stakeholder;
        this.notFound = false;
      },
      error: () => {
        this.stakeholder = null;
        this.notFound = true;
      },
    });
  }
}
