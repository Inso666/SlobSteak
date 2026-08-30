import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button, ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ToggleSwitch } from 'primeng/toggleswitch';
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
 * Admin-Bereich „Kommunikationsarten-Katalog“ (US-038, Screen S5 Sub-Bereich Kommunikationsarten;
 * Layout seit US-065 an `docs/design/AdminCatalogs.dc.html` angeglichen): Liste aller
 * Katalogeinträge als kompakte Zeilen in einem gemeinsamen, umrandeten Panel mit Status
 * (aktiv/deaktiviert, Akzeptanzkriterium 1/2), inline „Kommunikationsart hinzufügen“-Zeile am
 * Panel-Ende mit Inline-Duplikat-Fehler (Akzeptanzkriterium 4, entspricht inhaltlich US-038
 * Akzeptanzkriterium 2), sowie je Eintrag genau **ein** Bearbeiten-Icon, das einen kombinierten
 * Dialog mit Namensfeld und Aktiv-Toggle öffnet (Akzeptanzkriterium 3). Dieser Dialog orchestriert
 * die bestehenden Methoden `renameCommunicationType`/`setActive` sequenziell, ohne den
 * Backend-Contract zu ändern (US-065 „Wichtige Invarianten“).
 *
 * US-065 korrigiert damit bewusst den Layout-/Interaktionsteil von US-038 Akzeptanzkriterium 3
 * (vormals: Kartenliste mit zwei permanent sichtbaren Text-Buttons „Umbenennen“ und
 * „Aktivieren“/„Deaktivieren“ je Karte) zugunsten von `docs/design/AdminCatalogs.dc.html`, das
 * gegenüber der SPEC-07-Pseudocode-Skizze als Design-Quelle vorrangig ist (siehe Story-Datei
 * US-065 Abschnitt 2 „PO-Entscheidung“). Die übrigen fachlichen Eigenschaften aus US-038 (Liste mit
 * Status, `POST`/`PATCH`-Aufrufe, Duplikat-Fehler inline, ausschließliche Sichtbarkeit für
 * Systemadmins, deaktivierte Einträge bleiben sichtbar) bleiben unverändert erhalten.
 *
 * Deaktivieren ist weiterhin keine destruktive/irreversible Aktion (jederzeit reaktivierbar,
 * Eintrag bleibt bestehen) und läuft daher — anders als „Passwort zurücksetzen“/„Mitgliedschaft
 * entfernen“ — bewusst ohne zusätzlichen Bestätigungsdialog, sondern als Teil des Speichern-Klicks
 * im kombinierten Bearbeiten-Dialog.
 *
 * Icon-only-Buttons (Bearbeiten-Icon je Zeile, Abbrechen-Icon der inline Add-Zeile) verwenden
 * bewusst die `<p-button icon="...">`-Komponente statt der im übrigen Repo verbreiteten
 * `pButton`-Attribut-Direktive: In der hier verwendeten PrimeNG-Version (22.x) rendert die
 * `pButton`-Direktive kein `icon`-Attribut mehr (das erfordert seit dieser Version einen
 * projizierten `pButtonIcon`-Kindknoten) — ein reines `<button pButton icon="...">` ohne
 * Textinhalt bliebe daher optisch leer. Bei textbehafteten `pButton`-Buttons dieser Komponente
 * (z. B. „Abbrechen“) tritt das Problem nicht auf, da dort kein Icon gerendert wird. Diese
 * PrimeNG-Versionsinkompatibilität betrifft vermutlich weitere, bereits bestehende
 * `pButton icon="..."`-Stellen im Repo (außerhalb dieser Story) und wird dort nicht mitkorrigiert
 * (Scope dieser Story: ausschließlich `communication-types-admin`) — siehe Story-Datei
 * „Anmerkungen des Agenten“ (CLAUDE.md Abschnitt 6).
 */
@Component({
  selector: 'app-communication-types-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ProcessingButtonComponent, ViewStateComponent, ButtonDirective, Button, Dialog, InputText, Message, ToggleSwitch],
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

  /** Zustand der inline „Kommunikationsart hinzufügen“-Zeile am Panel-Ende (US-065
   * Akzeptanzkriterium 4) — ersetzt den vormals separaten Anlegen-Button mit modalem Dialog. */
  protected isAddingType = false;
  protected createErrorMessage: string | null = null;
  protected isCreatingType = false;
  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
  });

  /** Kombinierter Bearbeiten-Dialog (US-065 Akzeptanzkriterium 3): ein Namensfeld **und** ein
   * Aktiv-Toggle in einem Formular, Speichern orchestriert `renameCommunicationType`/`setActive`
   * sequenziell je nachdem, welcher der beiden Werte sich tatsächlich geändert hat. */
  protected editErrorMessage: string | null = null;
  protected isSavingEdit = false;
  protected editingType: AdminCommunicationType | null = null;
  protected readonly editDialogVisible = signal(false);
  protected readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    active: [true],
  });

  ngOnInit(): void {
    this.loadCommunicationTypes();
  }

  protected openInlineAdd(): void {
    this.createErrorMessage = null;
    this.createForm.reset();
    this.isAddingType = true;
  }

  protected closeInlineAdd(): void {
    this.isAddingType = false;
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
        this.closeInlineAdd();
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

  protected openEditDialog(communicationType: AdminCommunicationType): void {
    this.editingType = communicationType;
    this.editErrorMessage = null;
    this.editForm.reset({ name: communicationType.name, active: communicationType.isActive });
    this.editDialogVisible.set(true);
  }

  protected closeEditDialog(): void {
    this.editDialogVisible.set(false);
    this.editErrorMessage = null;
    this.editingType = null;
    this.editForm.reset();
  }

  protected onSubmitEdit(): void {
    if (this.editForm.invalid || this.isSavingEdit || !this.editingType) {
      return;
    }

    const editingType = this.editingType;
    const { name, active } = this.editForm.getRawValue();

    this.editErrorMessage = null;
    this.isSavingEdit = true;

    if (name === editingType.name) {
      this.applyActiveChangeThenFinishEdit(editingType, active);
      return;
    }

    this.adminCommunicationTypesService.renameCommunicationType(editingType.id, name).subscribe({
      next: () => this.applyActiveChangeThenFinishEdit(editingType, active),
      error: (error: HttpErrorResponse) => {
        this.isSavingEdit = false;
        this.editErrorMessage = error.status === 409 ? NAME_ALREADY_IN_USE_MESSAGE : 'Kommunikationsart konnte nicht umbenannt werden.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** Zweiter, optionaler Schritt des kombinierten Speichern-Vorgangs (US-065 Akzeptanzkriterium
   * 3): `setActive` wird nur aufgerufen, wenn sich der Aktiv-Status tatsächlich geändert hat —
   * andernfalls schließt der Dialog direkt, ohne einen unnötigen zweiten Request auszulösen. */
  private applyActiveChangeThenFinishEdit(editingType: AdminCommunicationType, active: boolean): void {
    if (active === editingType.isActive) {
      this.finishEdit();
      return;
    }

    this.adminCommunicationTypesService.setActive(editingType.id, active).subscribe({
      next: () => this.finishEdit(),
      error: () => {
        this.isSavingEdit = false;
        this.editErrorMessage = active
          ? `„${editingType.name}“ konnte nicht aktiviert werden.`
          : `„${editingType.name}“ konnte nicht deaktiviert werden.`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private finishEdit(): void {
    this.isSavingEdit = false;
    this.closeEditDialog();
    this.loadCommunicationTypes();
    this.changeDetectorRef.markForCheck();
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
