/**
 * Zentrale Wortlaute und Optionslisten für das Verteiler-Feature (US-042, SPEC-05). An einer
 * Stelle gehalten (frontend.md Abschnitt 3: „UI-Texte werden nicht verteilt hartcodiert"), damit
 * Wording-Anpassungen nicht in Komponente und Tests parallel gepflegt werden müssen.
 */

/** Deutsche Anzeige-Wortlaute für den Frequenz-Wire-Contract-Enum-Wert. Bewusst hier separat
 * gehalten statt aus `communication-assignment-panel.component.ts` importiert — der Export dort
 * ist eine Implementierungsdetail-Konstante dieser Komponente, kein öffentlicher Contract dieses
 * Features. Wortlaute sind absichtlich identisch (US-040 F4.2), um Terminologie-Konsistenz zu
 * wahren (SPEC-05 Akzeptanzkriterium „Alle Texte sind ... terminologisch konsistent"). */
export const DISTRIBUTION_FREQUENCY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Weekly', label: 'Wöchentlich' },
  { value: 'Monthly', label: 'Monatlich' },
  { value: 'Quarterly', label: 'Quartalsweise' },
  { value: 'AdHoc', label: 'Anlassbezogen' },
];

export const DISTRIBUTION_CHANNEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Email', label: 'E-Mail' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Report', label: 'Report' },
];

/** Wortlaute für `StakeholderType` (Wire-Contract `Person`/`Organization`), deckungsgleich mit
 * `stakeholder-list.component.html` (Typ-Filter dort). */
export const DISTRIBUTION_STAKEHOLDER_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Person', label: 'Person' },
  { value: 'Organization', label: 'Organisation' },
];

/** Löst einen Wire-Contract-Enum-Wert gegen eine Optionsliste zu seinem deutschen Anzeigelabel
 * auf; unbekannte Werte fallen auf den Rohwert zurück statt eine leere Zelle zu zeigen. */
export function resolveDistributionOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Platzhalter aller vier Filter-Dropdowns, solange kein Wert gewählt ist (SPEC-05 §2.1: Start-
 * und Reset-Zustand ist „Alle"). */
export const DISTRIBUTION_FILTER_PLACEHOLDER = 'Alle';

/** Empty-State-Überschrift/-Text (SPEC-05 §1.2 `emptymessage`-Template). */
export const DISTRIBUTION_EMPTY_TITLE = 'Keine Stakeholder entsprechen diesem Filter';
export const DISTRIBUTION_EMPTY_TEXT =
  'Ändere die Filterkombination oder setze sie zurück, um Stakeholder zu sehen.';

/** Hinweistext für Zeilen ohne hinterlegte E-Mail-Adresse (SPEC-05 §1.2/§3.6) — Icon + Text sind
 * die primäre, nicht nur farbliche Kodierung; dieser Text ergänzt sie als Tooltip-Erläuterung der
 * Konsequenz für „E-Mails kopieren". */
export const DISTRIBUTION_MISSING_EMAIL_LABEL = 'keine E-Mail hinterlegt';
export const DISTRIBUTION_MISSING_EMAIL_TOOLTIP =
  'Für diesen Eintrag ist keine E-Mail-Adresse hinterlegt. Er wird bei „E-Mails kopieren" automatisch ausgeschlossen.';

/** Toast-Wortlaute „E-Mails kopieren" (SPEC-05 §2.2/§3.7) — der Ausschluss von Zeilen ohne E-Mail
 * wird laut Designer-Notiz nie stillschweigend kommuniziert. */
export const DISTRIBUTION_COPY_NO_EMAILS_SUMMARY = 'Keine E-Mail-Adressen';
export const DISTRIBUTION_COPY_NO_EMAILS_DETAIL =
  'Keine der gefilterten Zeilen hat eine hinterlegte E-Mail-Adresse.';
export const DISTRIBUTION_COPY_SUCCESS_SUMMARY = 'E-Mails kopiert';
export const DISTRIBUTION_COPY_ERROR_SUMMARY = 'Kopieren fehlgeschlagen';
export const DISTRIBUTION_COPY_ERROR_DETAIL =
  'Die E-Mail-Adressen konnten nicht in die Zwischenablage kopiert werden.';

/** Toast-Wortlaute „CSV exportieren" (SPEC-05 §3.8: Fehlerfall analog zu „E-Mails kopieren" zu
 * kommunizieren). */
export const DISTRIBUTION_EXPORT_ERROR_SUMMARY = 'Export fehlgeschlagen';
export const DISTRIBUTION_EXPORT_ERROR_DETAIL = 'Die CSV-Datei konnte nicht erstellt werden.';

/** Konsistente Fehlermeldung für einen fehlgeschlagenen Ladevorgang der Verteilerliste, analog zu
 * `LOAD_ERROR_MESSAGE` (US-044), hier als eigene Konstante, da die Formulierung
 * feature-spezifisch leicht abweicht ("Verteilerliste"). */
export const DISTRIBUTION_LOAD_ERROR_MESSAGE =
  'Verteilerliste konnte nicht geladen werden. Bitte versuche es erneut.';
