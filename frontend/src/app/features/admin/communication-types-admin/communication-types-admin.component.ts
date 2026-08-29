import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { AdminCommunicationType, AdminCommunicationTypesService } from '../admin-communication-types.service';
import { LOAD_ERROR_MESSAGE } from '../../../core/messages/http-error-messages';
import { ProcessingButtonComponent } from '../../../shared/processing-button/processing-button.component';
import { ViewState, deriveListViewState } from '../../../shared/view-state/view-state';
import { ViewStateComponent } from '../../../shared/view-state/view-state.component';

/** Fehlermeldung bei einem Duplikat-Namen (409 `NAME_ALREADY_IN_USE`, US-037). An einer Stelle
 * gehalten (frontend.md Abschnitt 2), da sie sowohl beim Anlegen als auch beim Umbenennen inline
 * am Namensfeld erscheint. */
const NAME_ALREADY_IN_USE_MESSAGE = 'Diese Bezeichnung wird bereits verwendet.';

/**
 * Admin-Bereich „Kommunikationsarten-Katalog“ (US-038, Screen S5 Sub-Bereich Kommunikationsarten):
 * Liste aller Katalogeinträge mit Status (aktiv/deaktiviert, Akzeptanzkriterium 1), Formular
 * „Anlegen“ mit Inline-Duplikat-Fehler (Akzeptanzkriterium 2), sowie je Eintrag eine
 * „Umbenennen“- und eine „Aktivieren/Deaktivieren“-Aktion (Akzeptanzkriterium 3) — bewusst als
 * zwei getrennte Zeilenaktionen statt eines kombinierten Bearbeiten-Dialogs (Abweichung von
 * SPEC-07 §1.5, siehe Story-Datei „Anmerkungen des Agenten“: Die Story fordert wörtlich „eine
 * „Umbenennen“- und eine „Aktivieren/Deaktivieren“-Aktion“, eine explizite Story-eigene Vorgabe
 * geht einer abweichenden Pseudocode-Skizze der Screen-Spec vor, CLAUDE.md Abschnitt 6). Struktur
 * (Kartenliste, `ViewState`, `p-dialog` für Formulare, `ProcessingButtonComponent`) folgt bewusst
 * demselben, bereits etablierten Muster wie `UsersAdminComponent`/`ProjectsAdminComponent`
 * (US-016/US-017/US-056) statt der rohen `<p-table>`/`<p-toast>`/`<p-confirmdialog>`-Pseudocode-
 * Skizze aus SPEC-07 §1.5 — Konsistenz mit dem einzigen tatsächlich im Repo etablierten
 * Admin-Listen-Muster wiegt hier schwerer als eine wörtliche 1:1-Umsetzung des Spec-Pseudocodes
 * (dieselbe Begründung wie bereits in `AdminPageComponent` für das Tab-Muster dokumentiert).
 * Deaktivieren ist hier keine destruktive/irreversible Aktion (jederzeit reaktivierbar, Eintrag
 * bleibt bestehen) und läuft daher — anders als „Passwort zurücksetzen“/„Mitgliedschaft
 * entfernen“ — bewusst ohne zusätzlichen Bestätigungsdialog per direktem Klick.
 */
@Component({
  selector: 'app-communication-types-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, ViewStateComponent, ButtonDirective, Dialog, InputText, Message],
  templateUrl: './communication-types-admin.component.html',
  styleUrl: './communication-types-admin.component.css',
})
export class CommunicationTypesAdminComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminCommunicationTypesService = inject(AdminCommunicationTypesService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected communicationTypes: AdminCommunicationType[] = [];
  protected loadError: string | null = null;
  protected typesState: ViewState = 'loading';

  protected createErrorMessage: string | null = null;
  protected isCreatingType = false;
  protected readonly createDialogVisible = signal(false);
  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
  });

  protected renameErrorMessage: string | null = null;
  protected isRenamingType = false;
  protected renamingType: AdminCommunicationType | null = null;
  protected readonly renameDialogVisible = signal(false);
  protected readonly renameForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
  });

  /** Zeilenweiser Verarbeitungs-Zustand der Aktivieren/Deaktivieren-Aktion (Doppel-Klick-Schutz
   * analog `resettingUserIds` in `UsersAdminComponent`, US-043). */
  protected readonly togglingIds = new Set<string>();
  protected toggleErrorMessage: string | null = null;

  ngOnInit(): void {
    this.loadCommunicationTypes();
  }

  protected openCreateDialog(): void {
    this.createErrorMessage = null;
    this.createForm.reset();
    this.createDialogVisible.set(true);
  }

  protected closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.createErrorMessage = null;
    this.createForm.reset();
  }

  protected onCreateType(): void {
    if (this.createForm.invalid || this.isCreatingType) {
      return;
    }

    this.createErrorMessage = null;
    this.isCreatingType = true;
    const { name } = this.createForm.getRawValue();

    this.adminCommunicationTypesService.createCommunicationType(name).subscribe({
      next: () => {
        this.isCreatingType = false;
        this.createForm.reset();
        this.createDialogVisible.set(false);
        this.loadCommunicationTypes();
        this.changeDetectorRef.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.isCreatingType = false;
        this.createErrorMessage = error.status === 409 ? NAME_ALREADY_IN_USE_MESSAGE : 'Kommunikationsart konnte nicht angelegt werden.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected openRenameDialog(communicationType: AdminCommunicationType): void {
    this.renamingType = communicationType;
    this.renameErrorMessage = null;
    this.renameForm.reset({ name: communicationType.name });
    this.renameDialogVisible.set(true);
  }

  protected closeRenameDialog(): void {
    this.renameDialogVisible.set(false);
    this.renameErrorMessage = null;
    this.renamingType = null;
    this.renameForm.reset();
  }

  protected onRenameType(): void {
    if (this.renameForm.invalid || this.isRenamingType || !this.renamingType) {
      return;
    }

    this.renameErrorMessage = null;
    this.isRenamingType = true;
    const { name } = this.renameForm.getRawValue();

    this.adminCommunicationTypesService.renameCommunicationType(this.renamingType.id, name).subscribe({
      next: () => {
        this.isRenamingType = false;
        this.renameDialogVisible.set(false);
        this.renamingType = null;
        this.renameForm.reset();
        this.loadCommunicationTypes();
        this.changeDetectorRef.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.isRenamingType = false;
        this.renameErrorMessage = error.status === 409 ? NAME_ALREADY_IN_USE_MESSAGE : 'Kommunikationsart konnte nicht umbenannt werden.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected onToggleActive(communicationType: AdminCommunicationType): void {
    if (this.togglingIds.has(communicationType.id)) {
      return;
    }

    this.toggleErrorMessage = null;
    this.togglingIds.add(communicationType.id);
    const nextIsActive = !communicationType.isActive;

    this.adminCommunicationTypesService.setActive(communicationType.id, nextIsActive).subscribe({
      next: () => {
        this.togglingIds.delete(communicationType.id);
        this.loadCommunicationTypes();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.togglingIds.delete(communicationType.id);
        this.toggleErrorMessage = nextIsActive
          ? `„${communicationType.name}“ konnte nicht aktiviert werden.`
          : `„${communicationType.name}“ konnte nicht deaktiviert werden.`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private loadCommunicationTypes(): void {
    this.loadError = null;
    this.typesState = 'loading';
    this.adminCommunicationTypesService.listCommunicationTypes().subscribe({
      next: (communicationTypes) => {
        this.communicationTypes = communicationTypes;
        this.typesState = deriveListViewState(communicationTypes.length);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadError = LOAD_ERROR_MESSAGE;
        this.typesState = 'error';
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
