import { Component, Input, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { AdminProjectMembership, AdminProjectsService, PROJECT_ROLES } from '../admin-projects.service';

/**
 * Mitgliederverwaltung eines einzelnen Projekts (US-017, Screen S5 Sub-Bereich Projekte):
 * Dropdown zur Auswahl eines bestehenden Nutzers + Rollen-Select zum Hinzufügen
 * (Akzeptanzkriterium 3), Rollen-Select je Zeile zur Änderung sowie „Entfernen“-Aktion mit
 * Bestätigungsdialog (Akzeptanzkriterium 4).
 */
@Component({
  selector: 'app-project-membership-manager',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
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
    if (this.assignForm.invalid) {
      return;
    }

    this.errorMessage = null;
    const { userId, role } = this.assignForm.getRawValue();

    this.adminProjectsService.assignMember(this.projectId, userId, role).subscribe({
      next: () => {
        this.assignForm.reset({ userId: '', role: 'PL' });
        this.loadMemberships();
      },
      error: () => {
        this.errorMessage = 'Nutzer konnte nicht zugewiesen werden.';
      },
    });
  }

  protected onChangeRole(membership: AdminProjectMembership, newRole: string): void {
    this.adminProjectsService.changeMemberRole(this.projectId, membership.userId, newRole).subscribe({
      next: () => this.loadMemberships(),
      error: () => {
        this.errorMessage = `Rolle für ${membership.userName} konnte nicht geändert werden.`;
      },
    });
  }

  protected onRemoveMember(membership: AdminProjectMembership): void {
    if (!confirm(`${membership.userName} wirklich aus dem Projekt entfernen?`)) {
      return;
    }

    this.adminProjectsService.removeMember(this.projectId, membership.userId).subscribe({
      next: () => this.loadMemberships(),
      error: (error: HttpErrorResponse) => {
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
