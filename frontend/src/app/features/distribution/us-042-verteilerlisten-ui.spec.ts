import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { of } from 'rxjs';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from '../admin/admin-communication-types.service';
import { DistributionListRow, DistributionListService } from './distribution-list.service';
import { DistributionListPageComponent } from './distribution-list-page/distribution-list-page.component';

/**
 * Story-Test US-042 „Verteilerlisten-UI: Filter, Tabelle, Copy-E-Mails, CSV-Export“ (QA-Konvention
 * `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die in der Story-Datei gelisteten
 * Akzeptanzkriterien, je Kriterium ein Testfall, in derselben Reihenfolge wie im Story-Dokument.
 * Generische, darüber hinausgehende Komponententests bleiben in
 * `distribution-list-page.component.spec.ts` (analog zu `us-040-communication-assignment-ui.spec.ts`).
 */
describe('US-042: Verteilerlisten-UI: Filter, Tabelle, Copy-E-Mails, CSV-Export', () => {
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
  // (siehe `distribution-list.service.ts`); die Fußzeilen-Formel selbst ist Gegenstand von
  // `us-066-verteiler-fusszeile-gesamtzahl.spec.ts`, hier bleibt `totalStakeholderCount` daher ein
  // unauffälliger Standardwert.
  function configure(rows: DistributionListRow[]): void {
    TestBed.resetTestingModule();
    distributionListServiceSpy = jasmine.createSpyObj('DistributionListService', [
      'getDistributionList',
    ]);
    distributionListServiceSpy.getDistributionList.and.returnValue(
      of({ rows, totalStakeholderCount: rows.length }),
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

  // Akzeptanzkriterium 1: Tab „Verteiler“ zeigt eine Filterleiste (Kommunikationsart, Frequenz,
  // Kanal, Stakeholder-Typ) und eine Ergebnistabelle (Name, Organisation, E-Mail, Kommunikationsart,
  // Frequenz, Kanal), gespeist aus US-041.
  it('shows the filter bar (communication type, frequency, channel, stakeholder type) and a result table fed from the distribution-list query', () => {
    configure([row({})]);
    const fixture = createComponent();
    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.querySelector('#dl-filter-kommunikationsart')).not.toBeNull();
    expect(nativeElement.querySelector('#dl-filter-frequenz')).not.toBeNull();
    expect(nativeElement.querySelector('#dl-filter-kanal')).not.toBeNull();
    expect(nativeElement.querySelector('#dl-filter-typ')).not.toBeNull();

    expect(distributionListServiceSpy.getDistributionList).toHaveBeenCalledWith(
      'project-1',
      jasmine.any(Object),
    );
    const headerText = Array.from(nativeElement.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headerText).toEqual([
      'Name',
      'Organisation',
      'E-Mail',
      'Kommunikationsart',
      'Frequenz',
      'Kanal',
    ]);

    const rowText = nativeElement.querySelector('tbody tr')?.textContent;
    expect(rowText).toContain('Max Mustermann');
    expect(rowText).toContain('ACME GmbH');
    expect(rowText).toContain('max@example.com');
    expect(rowText).toContain('Newsletter');
  });

  // Akzeptanzkriterium 2: „E-Mails kopieren" kopiert alle E-Mail-Adressen der gefilterten Liste
  // kommasepariert in die Zwischenablage und schließt Zeilen mit hasEmail:false aus.
  it('copies the email addresses of the filtered list to the clipboard and excludes rows with hasEmail:false', () => {
    configure([
      row({ stakeholderId: 'sh-1', email: 'max@example.com', hasEmail: true }),
      row({ stakeholderId: 'sh-2', name: 'Erika Beispiel', email: null, hasEmail: false }),
      row({ stakeholderId: 'sh-3', name: 'Otto Ohne', email: 'otto@example.com', hasEmail: true }),
    ]);
    const fixture = createComponent();

    fixture.componentInstance['onCopyEmails']();

    expect(clipboardSpy.copy).toHaveBeenCalledTimes(1);
    const copiedText = clipboardSpy.copy.calls.mostRecent().args[0];
    // Wortlaut der Story: "kommasepariert" — kein `;`, keine der ausgeschlossenen Zeile.
    expect(copiedText).toBe('max@example.com, otto@example.com');
  });

  // Akzeptanzkriterium 3: „CSV exportieren" erzeugt eine CSV-Datei mit den Spalten Name,
  // Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal und löst einen Datei-Download aus.
  it('exports a CSV file with the columns Name/Organisation/E-Mail/Kommunikationsart/Frequenz/Kanal and triggers a file download', async () => {
    configure([row({})]);
    const fixture = createComponent();

    let capturedBlob: Blob | undefined;
    let capturedFilename: string | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      capturedFilename = this.download;
    });

    fixture.componentInstance['onExportCsv']();

    expect(capturedBlob?.type).toContain('text/csv');
    expect(capturedFilename).toMatch(/^verteiler-project-1-\d{4}-\d{2}-\d{2}\.csv$/);
    const csvText = await capturedBlob!.text();
    expect(csvText).toContain('Name;Organisation;E-Mail;Kommunikationsart;Frequenz;Kanal');
  });

  // Akzeptanzkriterium 4: Zeilen ohne hinterlegte E-Mail-Adresse zeigen ein Hinweis-Icon in der Tabelle.
  it('shows a hint icon in the table for rows without a stored email address', () => {
    configure([row({ hasEmail: false, email: null })]);
    const fixture = createComponent();

    const missingCell = fixture.nativeElement.querySelector('.dl-mail-cell--missing');
    expect(missingCell).not.toBeNull();
    expect(missingCell.querySelector('i.pi-exclamation-triangle')).not.toBeNull();
  });

  // Akzeptanzkriterium 5: Leeres Filterergebnis zeigt eine klare Leerzustand-Meldung statt einer
  // leeren Tabelle.
  it('shows a clear empty-state message instead of an empty table for an empty filter result', () => {
    configure([]);
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.dl-empty-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tbody tr td.dl-name-cell')).toBeNull();
  });

  // Akzeptanzkriterium 6: Kein Mailversand-Button/-Formular ist Teil dieser Ansicht (bewusst
  // außerhalb des MVP-Scopes).
  it('renders no mail-send button or form (deliberately out of MVP scope)', () => {
    configure([row({})]);
    const fixture = createComponent();

    const buttonLabels = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).map((button) => button.textContent?.trim());
    expect(buttonLabels.some((label) => label?.match(/senden|versenden|compose/i))).toBeFalse();
    expect(fixture.nativeElement.querySelector('form[name="compose"]')).toBeNull();
  });
});
