/**
 * CSV-Export-Hilfsfunktionen für die Verteilerliste (US-042 Akzeptanzkriterium 3). Reine
 * Utility-Funktionen statt Komponentenlogik, damit die Erzeugung des CSV-Inhalts (`buildCsv`)
 * unabhängig vom Datei-Download (`downloadCsvFile`, DOM-Seiteneffekt) isoliert testbar ist.
 */

/** Eine für den CSV-Export aufbereitete Zeile — Spaltenreihenfolge entspricht 1:1 den sichtbaren
 * Tabellenspalten (SPEC-05 §2.3: "Spalten der CSV entsprechen den sichtbaren Tabellenspalten").
 * Frequenz/Kanal liegen hier bereits als deutsches Anzeigelabel vor (nicht als Wire-Contract-Enum),
 * damit CSV und Tabelle exakt denselben Text zeigen. */
export interface DistributionListCsvRow {
  name: string;
  organization: string | null;
  email: string | null;
  communicationTypeName: string;
  frequencyLabel: string;
  channelLabel: string;
}

const CSV_COLUMN_HEADERS = [
  'Name',
  'Organisation',
  'E-Mail',
  'Kommunikationsart',
  'Frequenz',
  'Kanal',
];

/** Trennzeichen `;` (statt `,`), wie im SPEC-05-Pseudocode (§2.3) vorgegeben — üblich für
 * deutschsprachige Excel-Gebietsschemata, in denen `,` als Dezimaltrennzeichen reserviert ist. */
const CSV_SEPARATOR = ';';

/**
 * Erzeugt den vollständigen CSV-Inhalt (inkl. Kopfzeile) für die aktuell gefilterte Menge. Anders
 * als "E-Mails kopieren" (US-042 Akzeptanzkriterium 2) enthält der Export **alle** gefilterten
 * Zeilen inklusive solcher ohne E-Mail-Adresse (SPEC-05 §2.3) — diese Unterscheidung ist
 * absichtlich, nicht versehentlich zu vereinheitlichen.
 */
export function buildDistributionListCsv(rows: readonly DistributionListCsvRow[]): string {
  const lines = [CSV_COLUMN_HEADERS.map(escapeCsvField).join(CSV_SEPARATOR)];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.name),
        escapeCsvField(row.organization ?? ''),
        escapeCsvField(row.email ?? ''),
        escapeCsvField(row.communicationTypeName),
        escapeCsvField(row.frequencyLabel),
        escapeCsvField(row.channelLabel),
      ].join(CSV_SEPARATOR),
    );
  }

  return lines.join('\r\n');
}

/** Maskiert ein Feld, sofern es das Trennzeichen, Anführungszeichen oder einen Zeilenumbruch
 * enthält (RFC-4180-Minimalregel), statt naiv zu verketten und dabei die CSV-Struktur zu brechen. */
function escapeCsvField(value: string): string {
  if (
    value.includes(CSV_SEPARATOR) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Löst den clientseitigen Datei-Download aus (SPEC-05 §2.3: kein Server-Roundtrip, Blob + `<a
 * download>`). UTF-8-BOM vorangestellt, damit deutsche Umlaute in Excel korrekt angezeigt werden
 * (Excel interpretiert eine BOM-lose UTF-8-CSV-Datei sonst häufig als ANSI/Latin-1).
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Aktuelles Datum im ISO-Format (`yyyy-MM-dd`) für den Dateinamen (SPEC-05 §2.3). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
