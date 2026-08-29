/**
 * Rundet auf eine ganze Zahl und begrenzt sie auf `[min, max]` (Standard: 0–100, die
 * Einfluss-/Interesse-Skala aus F3.1). Zentral gehalten (frontend.md Abschnitt 3), da sowohl die
 * Zeiger- als auch die Tastatur-Drag-Umrechnung in `DraggablePointComponent` (US-036) sowie das
 * Zoom-Clamping in `QuadrantChartComponent` dieselbe Grenzwert-Logik benötigen.
 */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
