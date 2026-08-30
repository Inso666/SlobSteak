import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { ButtonDirective } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from '../../admin/admin-communication-types.service';
import { DistributionListRow, DistributionListService } from '../distribution-list.service';
import { buildDistributionListCsv, downloadCsvFile, todayIsoDate } from '../csv-export.util';
import {
  DISTRIBUTION_CHANNEL_OPTIONS,
  DISTRIBUTION_COPY_ERROR_DETAIL,
  DISTRIBUTION_COPY_ERROR_SUMMARY,
  DISTRIBUTION_COPY_NO_EMAILS_DETAIL,
  DISTRIBUTION_COPY_NO_EMAILS_SUMMARY,
  DISTRIBUTION_COPY_SUCCESS_SUMMARY,
  DISTRIBUTION_EMPTY_TEXT,
  DISTRIBUTION_EMPTY_TITLE,
  DISTRIBUTION_EXPORT_ERROR_DETAIL,
  DISTRIBUTION_EXPORT_ERROR_SUMMARY,
  DISTRIBUTION_FILTER_PLACEHOLDER,
  DISTRIBUTION_FREQUENCY_OPTIONS,
  DISTRIBUTION_LOAD_ERROR_MESSAGE,
  DISTRIBUTION_MISSING_EMAIL_LABEL,
  DISTRIBUTION_MISSING_EMAIL_TOOLTIP,
  DISTRIBUTION_STAKEHOLDER_TYPE_OPTIONS,
  resolveDistributionOptionLabel,
} from '../distribution-messages';

/**
 * Verteiler-Tab der Projekt-Workspace-Shell (US-042, Screen S3, SPEC-05) — ersetzt den
 * `DistributionPlaceholderComponent`-Platzhalter aus US-019. Route bleibt durch
 * `roleGuard(['PL', 'Coreteam'])` geschützt (unverändert seit US-019), diese Komponente selbst
 * geht von einem bereits autorisierten Aufruf aus.
 *
 * Anders als im SPEC-05-Pseudocode (`p-table`, `p-select`) verwendet diese Komponente bewusst
 * native `<table>`/`<select>`-Elemente mit den bereits projektweit etablierten Design-Tokens
 * (siehe `styles.css`-Kommentar „noch nicht auf p-select migriert" sowie die tatsächliche
 * Umsetzung in `StakeholderListComponent`/`StakeholderMapPageComponent`/den Admin-Screens — dort
 * überall dasselbe Muster). Das erfüllt SPEC-00 §2/§3 (Label-Verknüpfung, Fehler-/Leer-/
 * Lade-Zustands-Muster, Fokus-Ring, Tokens) vollständig, ohne `p-table`/`p-select` als in diesem
 * Repository bislang ungenutzte Komponenten neu einzuführen (CLAUDE.md Abschnitt 6 — dokumentierte
 * Implementierungsentscheidung, siehe Anmerkungen des Agenten in der Story-Datei). `p-toast` +
 * `MessageService` sind hier hingegen ein sinnvoller, eng begrenzter Erstgebrauch (SPEC-05 §2.2:
 * transiente Aktions-Rückmeldung „niemals stillschweigend“ für „E-Mails kopieren“), für den es kein
 * gleichwertiges bestehendes Muster im Repository gibt.
 *
 * Die Tabellenspalte „Organisation“ (Akzeptanzkriterium 1) stammt NICHT aus dem
 * US-041-Response-Contract (der kennt kein `organization`-Feld) — sie wird von
 * {@link DistributionListService} durch einen zusätzlichen Abgleich gegen die bestehende
 * Stakeholderliste ergänzt (siehe dortige Anmerkung sowie „Anmerkungen des Agenten“ in der
 * Story-Datei).
 *
 * Die Fußzeile (US-066) zeigt „N von M Stakeholdern entsprechen dem Filter“, wobei `N`
 * ({@link distinctFilteredStakeholderCount}) unterschiedliche Stakeholder im Filterergebnis zählt
 * (Deduplizierung über `stakeholderId`, nicht `rows.length`) und `M` ({@link totalStakeholderCount})
 * dieselbe, ohnehin für die Organisations-Anreicherung geladene unfilterte Stakeholderliste
 * wiederverwendet (kein zusätzlicher Request, siehe {@link DistributionListService}).
 */
@Component({
  selector: 'app-distribution-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective, Skeleton, Toast],
  providers: [MessageService],
  templateUrl: './distribution-list-page.component.html',
  styleUrl: './distribution-list-page.component.css',
})
export class DistributionListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly distributionListService = inject(DistributionListService);
  private readonly communicationTypesService = inject(AdminCommunicationTypesService);
  private readonly clipboard = inject(Clipboard);
  private readonly messageService = inject(MessageService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly filterPlaceholder = DISTRIBUTION_FILTER_PLACEHOLDER;
  protected readonly frequencyOptions = DISTRIBUTION_FREQUENCY_OPTIONS;
  protected readonly channelOptions = DISTRIBUTION_CHANNEL_OPTIONS;
  protected readonly stakeholderTypeOptions = DISTRIBUTION_STAKEHOLDER_TYPE_OPTIONS;
  protected readonly missingEmailLabel = DISTRIBUTION_MISSING_EMAIL_LABEL;
  protected readonly missingEmailTooltip = DISTRIBUTION_MISSING_EMAIL_TOOLTIP;
  protected readonly emptyTitle = DISTRIBUTION_EMPTY_TITLE;
  protected readonly emptyText = DISTRIBUTION_EMPTY_TEXT;
  /** Platzhalterzeilen für den Lade-Zustand (SPEC-05 §1.2 `loadingbody`-Template-Äquivalent). */
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected projectId = '';
  protected rows: DistributionListRow[] = [];
  /** US-066 Akzeptanzkriterium 2: unfilterte Gesamtzahl aller aktiven Projekt-Stakeholder ("M"),
   * aus der bereits für die Organisations-Anreicherung geladenen Stakeholderliste (siehe
   * {@link DistributionListService.getDistributionList}) — kein zusätzlicher Request. */
  protected totalStakeholderCount = 0;
  protected isLoading = true;
  protected loadError: string | null = null;
  protected communicationTypeOptions: AdminCommunicationType[] = [];

  protected readonly filterForm = this.formBuilder.group({
    communicationTypeId: this.formBuilder.control<string | null>(null),
    frequency: this.formBuilder.control<string | null>(null),
    channel: this.formBuilder.control<string | null>(null),
    stakeholderType: this.formBuilder.control<string | null>(null),
  });

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.loadCommunicationTypeOptions();
    this.loadDistributionList();
    // SPEC-05 §2.1/§3.9: jede Filteränderung lädt die Liste serverseitig neu (US-041 filtert per
    // Query-Parameter) — kein zusätzliches `debounceTime` nötig, da Selects (anders als ein
    // Freitextfeld) keine Tastenanschlagsfolge auslösen.
    this.filterForm.valueChanges.subscribe(() => this.loadDistributionList());
  }

  /** SPEC-05 §2.1: „Filter zurücksetzen" ist deaktiviert, wenn kein Filter aktiv ist. */
  protected get hasActiveFilters(): boolean {
    const values = this.filterForm.getRawValue();
    return (
      values.communicationTypeId !== null ||
      values.frequency !== null ||
      values.channel !== null ||
      values.stakeholderType !== null
    );
  }

  protected resetFilters(): void {
    this.filterForm.reset({
      communicationTypeId: null,
      frequency: null,
      channel: null,
      stakeholderType: null,
    });
  }

  /** SPEC-00 §3 „Fehler-Baustein": Wiederholen-Aktion für den ganzseitigen Ladefehler. */
  protected onRetry(): void {
    this.loadDistributionList();
  }

  /** US-066 Akzeptanzkriterium 1: Anzahl **unterschiedlicher** Stakeholder im Filterergebnis ("N")
   * — ein Stakeholder mit mehreren zum Filter passenden Kommunikationszuordnungen (mehrere Zeilen
   * mit derselben `stakeholderId`) zählt dabei nur einmal, im Unterschied zu `rows.length`. */
  protected get distinctFilteredStakeholderCount(): number {
    return new Set(this.rows.map((row) => row.stakeholderId)).size;
  }

  /** US-042 Akzeptanzkriterium 4/US-066 Akzeptanzkriterium 3: bezieht sich weiterhin auf die
   * gefilterten **Zeilen** (nicht auf unterschiedliche Stakeholder) — unverändertes Verhalten. */
  protected get withEmailCount(): number {
    return this.rows.filter((row) => row.hasEmail).length;
  }

  protected get excludedCount(): number {
    return this.rows.length - this.withEmailCount;
  }

  protected frequencyLabel(value: string): string {
    return resolveDistributionOptionLabel(this.frequencyOptions, value);
  }

  protected channelLabel(value: string): string {
    return resolveDistributionOptionLabel(this.channelOptions, value);
  }

  /**
   * "E-Mails kopieren" (US-042 Akzeptanzkriterium 2: „kopiert alle E-Mail-Adressen der
   * gefilterten Liste kommasepariert" — daher `, ` als Trennzeichen, bewusst abweichend vom
   * `; `-Vorschlag im SPEC-05-Pseudocode §2.2, das den Story-Wortlaut noch nicht kannte und die
   * Trennzeichenwahl explizit dem Frontend-Agenten überlässt; die spätere, wörtliche
   * Story-Vorgabe geht vor). Ausgangsmenge ist die aktuell gefilterte Liste, Zeilen mit
   * `hasEmail === false` werden ausgeschlossen — **nie stillschweigend**: der Erfolgs-Toast nennt
   * immer die Anzahl kopierter Adressen und zusätzlich die Anzahl ausgeschlossener Zeilen, sobald
   * diese > 0 ist.
   */
  protected onCopyEmails(): void {
    const withEmail = this.rows.filter((row) => row.hasEmail && !!row.email?.trim());
    const excluded = this.rows.length - withEmail.length;

    if (withEmail.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: DISTRIBUTION_COPY_NO_EMAILS_SUMMARY,
        detail: DISTRIBUTION_COPY_NO_EMAILS_DETAIL,
      });
      return;
    }

    const emailList = withEmail.map((row) => row.email!.trim()).join(', ');
    const copied = this.clipboard.copy(emailList);

    if (copied) {
      this.messageService.add({
        severity: 'success',
        summary: DISTRIBUTION_COPY_SUCCESS_SUMMARY,
        detail:
          excluded > 0
            ? `${withEmail.length} Adressen kopiert · ${excluded} ohne hinterlegte E-Mail ausgeschlossen`
            : `${withEmail.length} Adressen kopiert`,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: DISTRIBUTION_COPY_ERROR_SUMMARY,
        detail: DISTRIBUTION_COPY_ERROR_DETAIL,
      });
    }
  }

  /**
   * "CSV exportieren" (US-042 Akzeptanzkriterium 3, SPEC-05 §2.3/§3.8): exportiert die
   * vollständige aktuell gefilterte Menge **inklusive** Zeilen ohne E-Mail — bewusst anders als
   * "E-Mails kopieren" ein vollständiger Datenexport, keine Kopierliste.
   */
  protected onExportCsv(): void {
    try {
      const csvRows = this.rows.map((row) => ({
        name: row.name,
        organization: row.organization,
        email: row.email,
        communicationTypeName: row.communicationTypeName,
        frequencyLabel: this.frequencyLabel(row.frequency),
        channelLabel: this.channelLabel(row.channel),
      }));
      const csv = buildDistributionListCsv(csvRows);
      downloadCsvFile(csv, `verteiler-${this.projectId}-${todayIsoDate()}.csv`);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: DISTRIBUTION_EXPORT_ERROR_SUMMARY,
        detail: DISTRIBUTION_EXPORT_ERROR_DETAIL,
      });
    }
  }

  /** Katalog-Dropdown „Kommunikationsart" (Story „Technische Hinweise“: `GET
   * /api/v1/communication-types?activeOnly=true`) — bleibt bei Fehlschlag bewusst einfach leer
   * (kein zusätzlicher, hier unkritischer Fehlerzustand): die übrigen drei Filter und die Liste
   * selbst bleiben davon unabhängig benutzbar. */
  private loadCommunicationTypeOptions(): void {
    this.communicationTypesService.listActiveCommunicationTypes().subscribe({
      next: (types) => {
        this.communicationTypeOptions = types;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private loadDistributionList(): void {
    if (!this.projectId) {
      return;
    }

    this.isLoading = true;
    this.loadError = null;
    const { communicationTypeId, frequency, channel, stakeholderType } =
      this.filterForm.getRawValue();

    this.distributionListService
      .getDistributionList(this.projectId, {
        communicationTypeId: communicationTypeId ?? undefined,
        frequency: frequency ?? undefined,
        channel: channel ?? undefined,
        stakeholderType: stakeholderType ?? undefined,
      })
      .subscribe({
        next: ({ rows, totalStakeholderCount }) => {
          this.rows = rows;
          this.totalStakeholderCount = totalStakeholderCount;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.rows = [];
          this.totalStakeholderCount = 0;
          this.isLoading = false;
          this.loadError = DISTRIBUTION_LOAD_ERROR_MESSAGE;
          this.changeDetectorRef.markForCheck();
        },
      });
  }
}
