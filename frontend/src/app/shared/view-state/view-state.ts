/**
 * Diskreter Lade-/Anzeige-Zustand für Listen-/Übersichtsseiten (US-050, SPEC-00 §3
 * „Event-Handling-Grundsatz“): Zustandswechsel werden als exklusive, sich gegenseitig
 * ausschließende Zustände modelliert statt als kombinierbare Boolean-Flags
 * (`isLoading && !hasData`) — verhindert die widersprüchliche gleichzeitige Darstellung von
 * Skeleton und Empty-State, die in allen fünf in der Story beschriebenen Fällen zum fälschlich
 * „leer“ wirkenden Ladezustand geführt hat.
 *
 * - `loading`: Der zugehörige Request läuft noch, es liegt weder eine erfolgreiche noch eine
 *   fehlgeschlagene Antwort vor.
 * - `content`: Request erfolgreich abgeschlossen, mindestens ein Element vorhanden.
 * - `empty`: Request erfolgreich abgeschlossen, das Ergebnis ist tatsächlich leer.
 * - `error`: Request fehlgeschlagen. Die eigentliche Fehlerdarstellung bleibt bewusst beim
 *   bestehenden, komponentenweiten Fehler-Baustein aus US-044 (`loadError`/`errorMessage` +
 *   `.load-error`-Absatz) — {@link ViewStateComponent} zeigt in diesem Zustand weder Skeleton
 *   noch Empty-Text, um keine zweite, widersprüchliche Fehlerdarstellung neben dem bestehenden
 *   Banner zu erzeugen (siehe Anmerkungen des Dev-Agenten in der Story-Datei).
 */
export type ViewState = 'loading' | 'content' | 'empty' | 'error';

/**
 * Leitet aus der Anzahl der nach einer erfolgreichen Antwort geladenen Elemente den
 * Folgezustand ab (Akzeptanzkriterium 1). An einer Stelle gehalten, damit alle fünf
 * Verwendungsstellen exakt dieselbe Regel anwenden statt sie unabhängig zu wiederholen.
 */
export function deriveListViewState(itemCount: number): ViewState {
  return itemCount === 0 ? 'empty' : 'content';
}
