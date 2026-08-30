import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { clamp } from '../../../shared/utils/clamp';
import { MAP_POINT_LIVE_ARIA_LABEL_PREFIX } from '../map-messages';

/** Einfluss-/Interesse-Wertepaar in Prozent (0–100), identisch zur Skala aus `MapPoint`/
 * `MapComparisonValue` (`map.service.ts`). */
export interface DragPosition {
  influence: number;
  interest: number;
}

/**
 * Ein einzelner, ggf. ziehbarer Punkt der Quadranten-Map (US-036, F3.3). Rendert weiterhin ein
 * natives `<button class="map-point">` (frontend.md Abschnitt 6 — semantisches Element statt
 * `div`/`span`), damit Klick-zu-Navigation (US-032 Akzeptanzkriterium 3) und Tastaturfokus
 * unverändert funktionieren, unabhängig davon, ob der Punkt ziehbar ist.
 *
 * **Ziehbarkeit (US-036 Akzeptanzkriterium 1/2):** {@link draggable} wird ausschließlich von der
 * aufrufenden {@link QuadrantChartComponent} berechnet (eigene Rolle **und** primäre Perspektive im
 * Vergleichsmodus, SPEC-04 §3.1) — diese Komponente selbst kennt keine Rollen-/Perspektiven-Logik,
 * sondern setzt nur um, was ihr über das Flag mitgeteilt wird. Ist `draggable === false`, ignoriert
 * die Komponente Zeiger- und Tastatur-Bewegungsversuche vollständig (kein Umschalten zur Laufzeit
 * über einen anderen Weg) und markiert den Punkt visuell (`.map-point--locked`: gesperrter Cursor,
 * siehe `.css`) — Klick-Navigation bleibt davon unberührt.
 *
 * **Maus-Drag (US-036 Akzeptanzkriterium 3):** Die Umrechnung Pixel → Einfluss/Interesse verwendet
 * die tatsächliche, bereits Zoom/Pan-transformierte Bounding-Box von {@link surfaceRef} (der
 * `plotSurface`-Container aus `QuadrantChartComponent`) — dadurch ist keine manuelle
 * Zoom-Faktor-Rechnung nötig: Ist die Fläche durch `transform: scale(...)`/`translate(...)`
 * vergrößert/verschoben, spiegelt `getBoundingClientRect()` das bereits wider (SPEC-04 §3.4,
 * Zoom/Pan-Bedarf bei dicht beieinanderliegenden Punkten).
 *
 * **Tastatur-Alternative (SPEC-04 §2.3, WCAG 2.1 AA):** Pfeiltasten verschieben in ±1-Schritten
 * (Shift: ±10), `Enter`/Fokusverlust (`blur`) bestätigt die Änderung (löst {@link dragEnd} aus wie
 * ein Maus-Loslassen), `Escape` verwirft die noch nicht bestätigte Änderung ohne Seiteneffekt.
 *
 * **Optimistisches Rendering (SPEC-04 §2.2):** Während eines aktiven Drags (Maus oder
 * unbestätigte Tastatur-Bewegung) zeigt die Komponente die Live-Position (`livePosition`) statt der
 * zuletzt bestätigten `@Input`-Werte; nach Bestätigung (`dragEnd`) fällt sie sofort auf die
 * `@Input`-Werte zurück — die aufrufende Seite aktualisiert diese synchron im selben
 * `dragEnd`-Handler-Aufruf (optimistisches Übernehmen in die Datenquelle), wodurch kein sichtbarer
 * Sprung entsteht. Schlägt der nachfolgende Speichervorgang fehl, macht die aufrufende Seite die
 * Datenquellen-Änderung rückgängig (SPEC-04 §3.7 „Punkt springt zurück“) — diese Komponente selbst
 * kennt den Erfolg/Misserfolg des Speicherns nicht.
 *
 * **Marker-Gegenskalierung (US-061):** {@link markerScale} skaliert ausschließlich das eigene
 * `<button class="map-point">`-Element gegen den Container-Zoom, NICHT {@link surfaceRef} — die
 * Pixel→Prozent-Umrechnung in {@link updateFromPointer} liest weiterhin unverändert
 * `surfaceRef.nativeElement.getBoundingClientRect()` und bleibt dadurch von dieser Gegenskalierung
 * vollständig unberührt (verifiziert gegen echte Maus-Drag-Interaktion nach Zoom, siehe
 * `us-061-map-zoom-skalierung.spec.ts`).
 *
 * **Live-Aria-Label während einer Bewegung (US-062, SPEC-04 §2.3 WCAG 2.1 AA):** {@link ariaLabel}
 * ist ein reiner `@Input`, den die aufrufende {@link QuadrantChartComponent} ausschließlich aus dem
 * zuletzt **bestätigten** Stand berechnet (`pointAriaLabel()`) — er reagiert nicht auf
 * {@link livePosition}. Ohne Gegenmaßnahme liest ein Screenreader beim Fokussieren daher nur den
 * zuletzt bestätigten Stand vor und kündigt keine der Pfeiltasten-/Maus-Bewegungen an, bis
 * `Enter`/Fokusverlust die Änderung committet (bestätigter Bug aus Issue #69, siehe Story-Datei
 * US-062). {@link displayAriaLabel} schließt diese Lücke: Solange {@link isLiveEditing} `true` ist,
 * liefert er einen aus {@link displayInfluence}/{@link displayInterest} generierten Live-Text
 * (angelehnt an die bereits vorhandene `.map-point__live`-Formulierung), sonst unverändert das
 * `@Input` {@link ariaLabel}. Nach Bestätigung/Verwerfen wird `livePosition` wieder `null`, wodurch
 * der Getter automatisch auf `ariaLabel` zurückfällt — dessen von der aufrufenden Seite neu
 * berechneter Wert liegt bereits vor dem nächsten Rendern vor (SPEC-04 §2.2, optimistisches
 * Übernehmen im selben `dragEnd`-Handler-Aufruf), sodass kein veralteter Zwischenstand angezeigt
 * wird.
 */
@Component({
  selector: 'app-draggable-point',
  standalone: true,
  templateUrl: './draggable-point.component.html',
  styleUrl: './draggable-point.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraggablePointComponent {
  /** Explizites `markForCheck()` nach jeder Live-Positions-Änderung (siehe unten) — Pointer-
   * Events, die während eines aktiven Drags mit `setPointerCapture` umgeleitet werden, lösen nicht
   * in jeder Browser-/Zeitpunkt-Konstellation zuverlässig den impliziten Ivy-Dirty-Marker für
   * OnPush-Komponenten aus; konsistent mit dem projektweiten Zoneless-Härtungsmuster aus US-058
   * (`changeDetectorRef.markForCheck()` nach jeder außerhalb eines einfachen Template-Klicks
   * erfolgenden Zustandsänderung). */
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input({ required: true }) influence!: number;
  @Input({ required: true }) interest!: number;
  @Input({ required: true }) ariaLabel!: string;
  /** Zusätzliche, von der aufrufenden Seite berechnete CSS-Klassen (Rollenfarbe/Vergleichsform,
   * z. B. `'map-point--pl'` bzw. `'map-point--compare map-point--architect'`) — dieselbe
   * Klassenkonvention wie vor US-036, siehe `quadrant-chart.component.css`. */
  @Input() extraClasses = '';
  /** US-036 Akzeptanzkriterium 1: von `QuadrantChartComponent` berechnet, siehe Klassendoku. */
  @Input() draggable = false;
  /** Container, dessen (ggf. Zoom/Pan-transformierte) Bounding-Box die Pixel→Prozent-Umrechnung
   * für Maus-Drags liefert (US-036 Akzeptanzkriterium 5). Bei rein per Tastatur bedienten Punkten
   * unbenutzt. */
  @Input({ required: true }) surfaceRef!: ElementRef<HTMLElement>;
  /** US-061 Akzeptanzkriterium 1/5: Gegenskalierung, mit der die aufrufende
   * {@link QuadrantChartComponent} den Container-Zoom (`transform: scale(zoomLevel)` auf
   * `.plot-surface`) für die visuelle Marker-**Größe** neutralisiert — üblicherweise
   * `1 / zoomLevel`. Als CSS Custom Property (`--marker-counter-scale`, siehe `.css`) statt als
   * direkt gebundener `[style.transform]` umgesetzt, damit die vorhandenen, formabhängigen
   * `transform`-Werte aus `.map-point`/`.map-point--compare` (Zentrierung, Diamant-Rotation)
   * unverändert in derselben CSS-Regel stehen bleiben, statt sie hier dupliziert in TypeScript
   * nachzubauen. Diese Komponente kennt bewusst nur den fertigen Skalierungsfaktor, nicht den
   * `zoomLevel` selbst — sie bleibt agnostisch gegenüber Zoom-/Pan-Semantik (siehe Klassendoku). */
  @Input() markerScale = 1;

  /** Klick/Enter ohne aktive Bewegung — Navigation zur Stakeholder-Detailseite (US-032), unverändert
   * für ziehbare wie nicht-ziehbare Punkte. */
  @Output() activated = new EventEmitter<void>();
  /** Nach Bestätigung einer Positionsänderung (Maus-Loslassen, Tastatur-`Enter`/`blur`) — US-036
   * Akzeptanzkriterium 3. */
  @Output() dragEnd = new EventEmitter<DragPosition>();

  /** Live-Position während eines aktiven Drags/einer unbestätigten Tastatur-Bewegung; `null`, wenn
   * der Punkt gerade nicht bewegt wird (dann gilt die zuletzt bestätigte `@Input`-Position). */
  protected livePosition: DragPosition | null = null;
  private isPointerDragging = false;
  private suppressNextClick = false;

  protected get displayInfluence(): number {
    return this.livePosition?.influence ?? this.influence;
  }

  protected get displayInterest(): number {
    return this.livePosition?.interest ?? this.interest;
  }

  protected get isLiveEditing(): boolean {
    return this.livePosition !== null;
  }

  /** Textbaustein „Einfluss X · Interesse Y“ — von der `.map-point__live`-Statusanzeige (Template)
   * und {@link displayAriaLabel} gemeinsam verwendet, damit die visuelle und die per Screenreader
   * angekündigte Live-Formulierung nicht unabhängig voneinander gepflegt werden (frontend.md
   * Abschnitt 3: Wording an einer Stelle halten). */
  protected get liveValuesText(): string {
    return `Einfluss ${this.displayInfluence} · Interesse ${this.displayInterest}`;
  }

  /** US-062 Akzeptanzkriterium 2/3: siehe Klassendoku „Live-Aria-Label während einer Bewegung“. */
  protected get displayAriaLabel(): string {
    return this.isLiveEditing
      ? `${MAP_POINT_LIVE_ARIA_LABEL_PREFIX}: ${this.liveValuesText}.`
      : this.ariaLabel;
  }

  protected onClick(): void {
    if (this.suppressNextClick) {
      // Ein pointerup direkt vor dem click-Event stammt vom Loslassen eines Drags, nicht von einem
      // eigenständigen Klick — sonst würde jedes Drag zusätzlich zur Stakeholder-Detailseite navigieren.
      this.suppressNextClick = false;
      return;
    }
    this.activated.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    // Nie an die Canvas-Pan-Behandlung durchreichen (SPEC-04 §3.4: Pan nur auf leerer Fläche).
    event.stopPropagation();
    if (!this.draggable) {
      return;
    }
    event.preventDefault();
    this.isPointerDragging = true;
    (event.target as Element).setPointerCapture(event.pointerId);
    this.updateFromPointer(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.isPointerDragging) {
      return;
    }
    this.updateFromPointer(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.isPointerDragging) {
      return;
    }
    this.updateFromPointer(event);
    this.isPointerDragging = false;
    this.suppressNextClick = true;
    this.commitLivePosition();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.draggable) {
      return;
    }

    const step = event.shiftKey ? 10 : 1;
    const base = this.livePosition ?? { influence: this.influence, interest: this.interest };

    switch (event.key) {
      case 'ArrowRight':
        this.livePosition = { influence: clamp(base.influence + step), interest: base.interest };
        event.preventDefault();
        this.changeDetectorRef.markForCheck();
        return;
      case 'ArrowLeft':
        this.livePosition = { influence: clamp(base.influence - step), interest: base.interest };
        event.preventDefault();
        this.changeDetectorRef.markForCheck();
        return;
      case 'ArrowUp':
        this.livePosition = { influence: base.influence, interest: clamp(base.interest + step) };
        event.preventDefault();
        this.changeDetectorRef.markForCheck();
        return;
      case 'ArrowDown':
        this.livePosition = { influence: base.influence, interest: clamp(base.interest - step) };
        event.preventDefault();
        this.changeDetectorRef.markForCheck();
        return;
      case 'Enter':
        if (this.livePosition) {
          event.preventDefault();
          this.commitLivePosition();
        }
        return;
      case 'Escape':
        if (this.livePosition) {
          event.preventDefault();
          this.livePosition = null;
          this.changeDetectorRef.markForCheck();
        }
        return;
      default:
        return;
    }
  }

  /** SPEC-04 §2.3: Fokusverlust bestätigt eine noch offene Tastatur-Positionsänderung, analog zu
   * `Enter` — verhindert, dass ein Wechsel zu einem anderen Element eine begonnene Änderung
   * stillschweigend verwirft. */
  protected onBlur(): void {
    this.commitLivePosition();
  }

  private updateFromPointer(event: PointerEvent): void {
    const rect = this.surfaceRef.nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const influence = clamp(((event.clientX - rect.left) / rect.width) * 100);
    // SVG-/CSS-y wächst nach unten, `bottom`/„Interesse hoch = oben“ nach oben — Invertierung
    // analog zur bestehenden Konvention in quadrant-chart.component.html (`100 - interest`).
    const interest = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100);
    this.livePosition = { influence, interest };
    this.changeDetectorRef.markForCheck();
  }

  private commitLivePosition(): void {
    if (!this.livePosition) {
      return;
    }
    const final = this.livePosition;
    this.livePosition = null;
    this.changeDetectorRef.markForCheck();
    this.dragEnd.emit(final);
  }
}
