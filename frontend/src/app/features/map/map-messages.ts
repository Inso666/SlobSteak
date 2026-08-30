/**
 * Zentrale Wortlaute für das Map-Feature (US-032/US-034). An einer Stelle gehalten (frontend.md
 * Abschnitt 2: „UI-Texte werden nicht verteilt hartcodiert“), damit Wording-Anpassungen nicht in
 * mehreren Dateien parallel gepflegt werden müssen.
 */

/** Empty-State-Text (SPEC-04 §3.6, sinngemäß übernommener Vorschlagswortlaut). */
export const MAP_EMPTY_MESSAGE = 'Für diese Perspektive liegen noch keine Bewertungen vor.';

/** Label des Vergleichsmodus-Schalters (SPEC-04 §1, wortgleich). */
export const COMPARE_MODE_LABEL = 'Vergleichsmodus';

/** Label des zweiten Perspektiv-Dropdowns (SPEC-04 §1, wortgleich). */
export const COMPARE_PERSPECTIVE_LABEL = 'Vergleichen mit:';

/** Platzhalter-Option des zweiten Perspektiv-Dropdowns, solange keine Vergleichsperspektive
 * gewählt ist (US-034 Akzeptanzkriterium 1). */
export const COMPARE_PERSPECTIVE_PLACEHOLDER = 'Bitte wählen';

/** Legenden-Titel (SPEC-04 §1 `p-panel header="Legende"`, wortgleich). */
export const MAP_LEGEND_TITLE = 'Legende';

/** Legenden-Zeile für die Verbindungslinie (SPEC-04 §1, wortgleich). */
export const MAP_LEGEND_CONNECTION_LABEL = 'Verbindungslinie — Bewertung in beiden Sichten';

/** Legenden-Hinweistext (SPEC-04 §1 `legend-note`, wortgleich). */
export const MAP_LEGEND_NOTE =
  'Punkte ohne Bewertung in einer der gewählten Perspektiven zeigen keine Linie. Stakeholder ganz ohne Bewertung in beiden Sichten erscheinen nicht auf der Map.';

/** Fehlermeldung nach fehlgeschlagenem Drag-Speichervorgang, kein 409-Konflikt (US-036,
 * SPEC-04 §3.7 „Allgemeiner Ladefehler“-Muster analog auf den Speicherfall übertragen). */
export const MAP_DRAG_SAVE_ERROR_MESSAGE = 'Position konnte nicht gespeichert werden. Der Punkt wurde auf die zuletzt gespeicherte Position zurückgesetzt.';

/** Aria-Label-Präfix für Screenreader während einer laufenden, unbestätigten Bewegung (Maus-Drag
 * oder Tastatur-Pfeiltasten) eines Punkts (US-062, SPEC-04 §2.3 WCAG 2.1 AA) — ergänzt in
 * `DraggablePointComponent.displayAriaLabel` um die aktuellen Einfluss-/Interesse-Live-Werte,
 * damit ein Screenreader jede Pfeiltasten-Bewegung ankündigt, statt nur den zuletzt bestätigten
 * Stand vorzulesen. */
export const MAP_POINT_LIVE_ARIA_LABEL_PREFIX = 'Wird verschoben';
