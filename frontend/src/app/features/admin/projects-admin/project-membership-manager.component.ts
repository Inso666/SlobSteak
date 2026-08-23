import { Component, Input, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { AdminProjectMembership, AdminProjectsService, PROJECT_ROLES } from '../admin-projects.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';

/**
 * Mitgliederverwaltung eines einzelnen Projekts (US-017, Screen S5 Sub-Bereich Projekte):
 * Dropdown zur Auswahl eines bestehenden Nutzers + Rollen-Select zum Hinzufügen
 * (Akzeptanzkriterium 3), Rollen-Select je Zeile zur Änderung sowie „Entfernen“-Aktion mit
 * Bestätigungsdialog (Akzeptanzkriterium 4).
 */
@Component({
  selector: 'app-project-membership-manager',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ProcessingButtonComponent],
  templateUrl: './project-membership-manager.component.html',
  styleUrl: './project-membership-manager.component.css',
})
export class ProjectMembershipManagerComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private readonly formBuilder = inject(FormBuilder);
  private readonly adminProjectsService = inject(AdminProjectsService);
  private readonly adminUsersService = inject(AdminUsersService);

  protected readonly roles = PROJECT_ROLES;

  protected memberships: AdminProjectMembership[] = [];
  protected allUsers: AdminUser[] = [];
  protected errorMessage: string | null = null;
  /** US-043 Akzeptanzkriterium 1/2/3/4: Verarbeitungs-Feedback + Doppel-Submit-Schutz. */
  protected isAssigning = false;
  protected readonly changingRoleUserIds = new Set<string>();
  protected readonly removingMemberUserIds = new Set<string>();

  protected readonly assignForm = this.formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    role: ['PL', Validators.required],
  });

  get assignableUsers(): AdminUser[] {
    const memberUserIds = new Set(this.memberships.map((m) => m.userId));
    return this.allUsers.filter((user) => !memberUserIds.has(user.id));
  }

  ngOnInit(): void {
    this.adminUsersService.listUsers().subscribe((users) => (this.allUsers = users));
    this.loadMemberships();
  }

  protected onAssignMember(): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.assignForm.invalid || this.isAssigning) {
      return;
    }

    this.errorMessage = null;
    this.isAssigning = true;
    const { userId, role } = this.assignForm.getRawValue();

    this.adminProjectsService.assignMember(this.projectId, userId, role).subscribe({
      next: () => {
        this.isAssigning = false;
        this.assignForm.reset({ userId: '', role: 'PL' });
        this.loadMemberships();
      },
      error: () => {
        this.isAssigning = false;
        this.errorMessage = 'Nutzer konnte nicht zugewiesen werden.';
      },
    });
  }

  protected onChangeRole(membership: AdminProjectMembership, newRole: string): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.changingRoleUserIds.has(membership.userId)) {
      return;
    }

    this.changingRoleUserIds.add(membership.userId);
    this.adminProjectsService.changeMemberRole(this.projectId, membership.userId, newRole).subscribe({
      next: () => {
        this.changingRoleUserIds.delete(membership.userId);
        this.loadMemberships();
      },
      error: () => {
        this.changingRoleUserIds.delete(membership.userId);
        this.errorMessage = `Rolle für ${membership.userName} konnte nicht geändert werden.`;
      },
    });
  }

  protected onRemoveMember(membership: AdminProjectMembership): void {
    // US-043 Akzeptanzkriterium 3: ein zweiter Trigger während eines laufenden Requests löst
    // nachweislich keinen zweiten HTTP-Request aus.
    if (this.removingMemberUserIds.has(membership.userId)) {
      return;
    }

    if (!confirm(`${membership.userName} wirklich aus dem Projekt entfernen?`)) {
      return;
    }

    this.removingMemberUserIds.add(membership.userId);
    this.adminProjectsService.removeMember(this.projectId, membership.userId).subscribe({
      next: () => {
        this.removingMemberUserIds.delete(membership.userId);
        this.loadMemberships();
      },
      error: (error: HttpErrorResponse) => {
        this.removingMemberUserIds.delete(membership.userId);
        this.errorMessage =
          error.status === 404
            ? `${membership.userName} war bereits nicht mehr Mitglied.`
            : `${membership.userName} konnte nicht entfernt werden.`;
      },
    });
  }

  private loadMemberships(): void {
    if (!this.projectId) {
      return;
    }

    this.adminProjectsService.listMemberships(this.projectId).subscribe((memberships) => (this.memberships = memberships));
  }
}
