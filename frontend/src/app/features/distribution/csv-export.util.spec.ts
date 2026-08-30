import { DistributionListCsvRow, buildDistributionListCsv, todayIsoDate } from './csv-export.util';

describe('buildDistributionListCsv', () => {
  it('writes the header row with exactly the visible table columns, semicolon-separated', () => {
    const csv = buildDistributionListCsv([]);
    expect(csv).toBe('Name;Organisation;E-Mail;Kommunikationsart;Frequenz;Kanal');
  });

  // US-042 Akzeptanzkriterium 3: der Export enthält alle gefilterten Zeilen inklusive solcher ohne
  // E-Mail-Adresse (anders als "E-Mails kopieren") — ein leeres Feld statt einer ausgelassenen Zeile.
  it('exports a row without an email address as an empty field instead of omitting it', () => {
    const rows: DistributionListCsvRow[] = [
      {
        name: 'Erika Beispiel',
        organization: null,
        email: null,
        communicationTypeName: 'Newsletter',
        frequencyLabel: 'Wöchentlich',
        channelLabel: 'E-Mail',
      },
    ];

    const csv = buildDistributionListCsv(rows);

    expect(csv.split('\r\n')[1]).toBe('Erika Beispiel;;;Newsletter;Wöchentlich;E-Mail');
  });

  it('writes one row per entry with all six columns in the visible table order', () => {
    const rows: DistributionListCsvRow[] = [
      {
        name: 'Max Mustermann',
        organization: 'ACME GmbH',
        email: 'max@example.com',
        communicationTypeName: 'Newsletter',
        frequencyLabel: 'Wöchentlich',
        channelLabel: 'E-Mail',
      },
    ];

    const csv = buildDistributionListCsv(rows);

    expect(csv).toBe(
      'Name;Organisation;E-Mail;Kommunikationsart;Frequenz;Kanal\r\nMax Mustermann;ACME GmbH;max@example.com;Newsletter;Wöchentlich;E-Mail',
    );
  });

  it('quotes a field that contains the separator, a double quote, or a line break (RFC-4180)', () => {
    const rows: DistributionListCsvRow[] = [
      {
        name: 'Mustermann; Max "MM"',
        organization: null,
        email: null,
        communicationTypeName: 'Zeile 1\nZeile 2',
        frequencyLabel: 'Wöchentlich',
        channelLabel: 'E-Mail',
      },
    ];

    const csv = buildDistributionListCsv(rows);

    expect(csv.split('\r\n')[1]).toBe(
      '"Mustermann; Max ""MM""";;;"Zeile 1\nZeile 2";Wöchentlich;E-Mail',
    );
  });
});

describe('todayIsoDate', () => {
  it('returns the current date as yyyy-MM-dd', () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
