import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from '../../admin/admin-communication-types.service';
import {
  DistributionListResult,
  DistributionListRow,
  DistributionListService,
} from '../distribution-list.service';
import { DISTRIBUTION_LOAD_ERROR_MESSAGE } from '../distribution-messages';
import { DistributionListPageComponent } from './distribution-list-page.component';

describe('DistributionListPageComponent', () => {
  let distributionListServiceSpy: jasmine.SpyObj<DistributionListService>;
  let communicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;
  let clipboardSpy: jasmine.SpyObj<Clipboard>;

  const catalog: AdminCommunicationType[] = [
    { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: '2026-01-01' },
  ];

  function row(overrides: Partial<DistributionListRow>): DistributionListRow {
    return {
      stakeholderId: 'sh-1',
      name: 'Max Mustermann',
      organization: 'ACME GmbH',
      hasEmail: true,
      email: 'max@example.com',
      communicationTypeId: 'type-1',
      communicationTypeName: 'Newsletter',
      frequency: 'Weekly',
      channel: 'Email',
      ...overrides,
    };
  }

  // US-066: `getDistributionList` liefert seit dieser Story `{ rows, totalStakeholderCount }`
  // (siehe `distribution-list.service.ts`). `totalStakeholderCount` fällt hier standardmäßig auf
  // `rows.length` zurück, da die meisten Tests dieser Datei die Fußzeilen-Formel nicht prüfen
  // (dafür siehe `us-066-verteiler-fusszeile-gesamtzahl.spec.ts`).
  function configure(rows: DistributionListRow[], totalStakeholderCount = rows.length): void {
    distributionListServiceSpy = jasmine.createSpyObj('DistributionListService', [
      'getDistributionList',
    ]);
    distributionListServiceSpy.getDistributionList.and.returnValue(
      of({ rows, totalStakeholderCount }),
    );

    communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', [
      'listActiveCommunicationTypes',
    ]);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of(catalog));

    clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);
    clipboardSpy.copy.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [DistributionListPageComponent],
      providers: [
        provideRouter([]),
        { provide: DistributionListService, useValue: distributionListServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        { provide: Clipboard, useValue: clipboardSpy },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DistributionListPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 1: Filterleiste + Ergebnistabelle, gespeist aus US-041 (hier über den
  // Service-Spy) sowie das Kommunikationsarten-Katalog-Dropdown aus US-037/US-038.
  it('loads the unfiltered distribution list and the active communication-type catalog on init', () => {
    configure([row({})]);
    const fixture = createComponent();

    expect(distributionListServiceSpy.getDistributionList).toHaveBeenCalledWith('project-1', {
      communicationTypeId: undefined,
      frequency: undefined,
      channel: undefined,
      stakeholderType: undefined,
    });
    expect(communicationTypesServiceSpy.listActiveCommunicationTypes).toHaveBeenCalled();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const communicationTypeSelect = nativeElement.querySelector<HTMLSelectElement>(
      '#dl-filter-kommunikationsart',
    )!;
    expect(
      Array.from(communicationTypeSelect.options).some(
        (option) => option.textContent?.trim() === 'Newsletter',
      ),
    ).toBeTrue();
  });

  it('renders each row with the resolved German frequency/channel labels and the joined organization', () => {
    configure([row({ frequency: 'Quarterly', channel: 'Report', organization: 'ACME GmbH' })]);
    const fixture = createComponent();

    const rowText = fixture.nativeElement.querySelector('tbody tr').textContent;
    expect(rowText).toContain('Max Mustermann');
    expect(rowText).toContain('ACME GmbH');
    expect(rowText).toContain('Quartalsweise');
    expect(rowText).toContain('Report');
  });

  // Akzeptanzkriterium 4: Zeilen ohne E-Mail bleiben sichtbar, zeigen aber ein Hinweis-Icon + Text.
  it('shows the missing-email icon and text for a row without an email address, without hiding the row', () => {
    configure([row({ hasEmail: false, email: null })]);
    const fixture = createComponent();

    const cell = fixture.nativeElement.querySelector('.dl-mail-cell--missing');
    expect(cell).not.toBeNull();
    expect(cell.querySelector('.pi-exclamation-triangle')).not.toBeNull();
    expect(cell.textContent).toContain('keine E-Mail hinterlegt');
  });

  // Akzeptanzkriterium 5: leeres Filterergebnis zeigt eine Leerzustand-Meldung statt einer leeren Tabelle.
  it('shows the empty-state message instead of an empty table when no rows match', () => {
    configure([]);
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.dl-empty-panel')?.textContent).toContain(
      'Keine Stakeholder entsprechen diesem Filter',
    );
    expect(fixture.nativeElement.querySelector('tbody tr td.dl-name-cell')).toBeNull();
  });

  it('shows skeleton placeholder rows while the request is still pending', () => {
    configure([]);
    distributionListServiceSpy.getDistributionList.and.returnValue(
      new Subject<DistributionListResult>(),
    );
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelectorAll('tbody tr p-skeleton').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.dl-empty-panel')).toBeNull();
  });

  it('reloads the list with the newly selected filter value when a filter control changes', () => {
    configure([row({})]);
    const fixture = createComponent();
    distributionListServiceSpy.getDistributionList.calls.reset();

    fixture.componentInstance['filterForm'].controls.frequency.setValue('Monthly');

    expect(distributionListServiceSpy.getDistributionList).toHaveBeenCalledWith('project-1', {
      communicationTypeId: undefined,
      frequency: 'Monthly',
      channel: undefined,
      stakeholderType: undefined,
    });
  });

  // SPEC-05 §2.1: "Filter zurücksetzen" ist deaktiviert, solange kein Filter aktiv ist, und setzt
  // bei Aktivierung alle vier Controls zurück.
  it('disables "Filter zurücksetzen" while no filter is active and resets all four filters once clicked', () => {
    configure([row({})]);
    const fixture = createComponent();
    const resetButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Filter zurücksetzen'))!;
    expect(resetButton.disabled).toBeTrue();

    fixture.componentInstance['filterForm'].controls.channel.setValue('Email');
    fixture.detectChanges();
    expect(resetButton.disabled).toBeFalse();

    resetButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['filterForm'].value).toEqual({
      communicationTypeId: null,
      frequency: null,
      channel: null,
      stakeholderType: null,
    });
    expect(resetButton.disabled).toBeTrue();
  });

  // Akzeptanzkriterium 2: "E-Mails kopieren" schließt Zeilen mit hasEmail:false aus und
  // kommuniziert den Ausschluss nicht stillschweigend (SPEC-05 §2.2/§3.7).
  it('copies only the emails of rows with hasEmail=true and reports the excluded count in the success toast', () => {
    configure([
      row({ stakeholderId: 'sh-1', email: 'max@example.com', hasEmail: true }),
      row({ stakeholderId: 'sh-2', email: null, hasEmail: false }),
    ]);
    const fixture = createComponent();
    const messageService = fixture.debugElement.injector.get(MessageService);
    spyOn(messageService, 'add');

    fixture.componentInstance['onCopyEmails']();

    expect(clipboardSpy.copy).toHaveBeenCalledWith('max@example.com');
    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        severity: 'success',
        detail: jasmine.stringMatching(
          /1 Adressen kopiert.*1 ohne hinterlegte E-Mail ausgeschlossen/,
        ),
      }),
    );
  });

  it('shows a warning toast without touching the clipboard when no filtered row has an email address', () => {
    configure([row({ hasEmail: false, email: null })]);
    const fixture = createComponent();
    const messageService = fixture.debugElement.injector.get(MessageService);
    spyOn(messageService, 'add');

    fixture.componentInstance['onCopyEmails']();

    expect(clipboardSpy.copy).not.toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
  });

  it('shows an error toast when the clipboard write itself fails', () => {
    configure([row({})]);
    const fixture = createComponent();
    clipboardSpy.copy.and.returnValue(false);
    const messageService = fixture.debugElement.injector.get(MessageService);
    spyOn(messageService, 'add');

    fixture.componentInstance['onCopyEmails']();

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error' }),
    );
  });

  // Akzeptanzkriterium 3: CSV-Export enthält alle gefilterten Zeilen inkl. solcher ohne E-Mail und
  // löst einen Datei-Download aus.
  it('triggers a CSV file download containing all filtered rows, including those without an email', () => {
    configure([row({ name: 'Ohne Mail', hasEmail: false, email: null })]);
    const fixture = createComponent();

    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');

    fixture.componentInstance['onExportCsv']();

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedBlob?.type).toContain('text/csv');
  });

  it('shows the shared error banner with a retry action when the initial load fails', () => {
    configure([]);
    distributionListServiceSpy.getDistributionList.and.returnValue(
      throwError(() => new Error('network')),
    );
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.load-error')?.textContent).toContain(
      DISTRIBUTION_LOAD_ERROR_MESSAGE,
    );

    distributionListServiceSpy.getDistributionList.and.returnValue(
      of({ rows: [row({})], totalStakeholderCount: 1 }),
    );
    const nativeElement: HTMLElement = fixture.nativeElement;
    nativeElement.querySelector<HTMLButtonElement>('.load-error button')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.load-error')).toBeNull();
  });

  // Akzeptanzkriterium 6: kein Mailversand-UI-Element ist Teil dieser Ansicht.
  it('renders no mail-send UI element (deliberate scope exclusion)', () => {
    configure([row({})]);
    const fixture = createComponent();

    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).not.toContain('senden');
    expect(text).not.toContain('versenden');
    expect(fixture.nativeElement.querySelector('[type="email"]')).toBeNull();
  });
});
