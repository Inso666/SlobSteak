import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { AdminUser, AdminUsersService } from '../admin-users.service';
import { AdminProjectMembership, AdminProjectsService, PROJECT_ROLES } from '../admin-projects.service';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/**
 * Mitgliederverwaltung eines einzelnen Projekts (US-017, Screen S5 Sub-Bereich Projekte):
 * Dropdown zur Auswahl eines bestehenden Nutzers + Rollen-Select zum Hinzufügen
 * (Akzeptanzkriterium 3), Rollen-Select je Zeile zur Änderung sowie „Entfernen“-Aktion mit
 * Bestätigungsdialog (Akzeptanzkriterium 4).
 */
@Component({
  selector: 'app-project-membership-manager',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ProcessingButtonComponent, ViewStateComponent, Message, Skeleton],
  templateUrl: './project-membership-manager.component.html',
  styleUrl: './project-membership-manager.component.css',
})
export class ProjectMembershipManagerComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private readonly formBuilder = inject(FormBuilder);
  private readonly adminProjectsService = inject(AdminProjectsService);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly roles = PROJECT_ROLES;

  protected memberships: AdminProjectMembership[] = [];
  protected allUsers: AdminUser[] = [];
  protected errorMessage: string | null = null;
  /** US-050: diskreter Ladezustand je Liste statt eines kombinierbaren `isLoading`-Flags — die
   * Liste potenzieller Nutzer (Akzeptanzkriterium „beim ersten Öffnen bereits gefüllt“) und die
   * Mitgliederliste (Akzeptanzkriterium „aktualisiert sich unmittelbar nach Zuweisung“) laden
   * unabhängig voneinander. */
  protected allUsersState: ViewState = 'loading';
  protected membershipsState: ViewState = 'loading';
  /** US-050: Höhe des Skeleton-Platzhalters für das Nutzer-Auswahlfeld, ausschließlich aus der
   * Abstands-Token-Skala abgeleitet (SPEC-00 §1.2), analog zu `ViewStateComponent`. */
  protected readonly fieldSkeletonHeight = 'calc(var(--app-space-lg) * 2)';
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

  /** US-050: eigener, diskreter `ViewState` je Liste, damit „lädt noch“ sichtbar von „wirklich
   * leer“ unterschieden wird (Story-Symptom „Liste mit potentiellen Nutzern leer, bis sie erneut
   * ausgewählt wird“). Für die beiden GET-Requests dieser Komponente gab es vor US-050 kein
   * Fehler-Handling (anders als bei den vier US-044-Komponenten) — mit Einführung des `error`-
   * Zustands wird das hier ergänzt, damit `ViewState` an dieser Stelle vollständig nutzbar ist,
   * ohne bestehendes Verhalten zu brechen (siehe Anmerkungen des Dev-Agenten in der Story-Datei).
   *
   * `changeDetectorRef.markForCheck()` behebt die eigentliche technische Ursache der Story: Das
   * Frontend läuft ohne `zone.js`, eine reine Feldzuweisung in einem `subscribe()`-Callback
   * markiert die Komponente sonst nicht automatisch für die nächste Change-Detection-Runde (siehe
   * ausführliche Anmerkung in `project-overview.component.ts` bzw. der Story-Datei). */
  ngOnInit(): void {
    this.adminUsersService.listUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.allUsersState = deriveListViewState(users.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.errorMessage = LOAD_ERROR_MESSAGE;
        this.allUsersState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
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

  /** Lädt die Mitgliederliste — sowohl beim initialen Öffnen (`ngOnInit`) als auch nach jeder
   * erfolgreichen Mutation (Zuweisen/Rollenwechsel/Entfernen). US-050 Akzeptanzkriterium
   * „Mitgliederliste aktualisiert sich unmittelbar nach erfolgreicher Zuweisung, ohne weitere
   * Interaktion“: derselbe diskrete `ViewState` deckt beide Aufrufstellen ab, da beide über
   * dieselbe Methode laufen. */
  private loadMemberships(): void {
    if (!this.projectId) {
      return;
    }

    this.membershipsState = 'loading';
    this.adminProjectsService.listMemberships(this.projectId).subscribe({
      next: (memberships) => {
        this.memberships = memberships;
        this.membershipsState = deriveListViewState(memberships.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.errorMessage = LOAD_ERROR_MESSAGE;
        this.membershipsState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
