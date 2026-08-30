import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MapPoint } from './map.service';
import { QuadrantChartComponent } from './quadrant-chart/quadrant-chart.component';

/**
 * Story-Test US-061 „Map-Zoom skaliert Positionen statt Punkt-Marker unverhältnismäßig zu
 * vergrößern" (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft
 * ausschließlich die in `docs/usecases/US-061-map-zoom-skalierung.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument:
 *
 * - Akzeptanzkriterium 1 + 5 (automatisierbarer Teil): siehe unten, per Style-Assertion auf den
 *   tatsächlich gerenderten Inline-Styles (`--marker-counter-scale` auf `.map-point`, `transform`
 *   auf `.plot-surface`) — echtes `getBoundingClientRect()` liefert für per `TestBed.createComponent`
 *   erzeugte, nicht in `document.body` eingehängte Elemente in diesem Projekt durchgängig eine
 *   Null-Bounding-Box (siehe z. B. `draggable-point.component.spec.ts`, das `surfaceRef` deshalb
 *   ebenfalls mockt statt auf reales Layout zu setzen) — Style-Assertion ist die von
 *   Akzeptanzkriterium 5 ausdrücklich zugelassene Alternative. Der Zoom wird bewusst über einen
 *   echten `.click()` auf den gerenderten Zoom-Cluster-Button ausgelöst statt über einen direkten
 *   Aufruf von `zoomIn()` auf der Komponenteninstanz: Das Projekt läuft ohne `zone.js` (siehe
 *   `package.json`/`polyfills`), Angulars zoneless Change-Detection-Scheduler markiert eine
 *   `OnPush`-Ansicht nur nach einem Angular-eigenen Event-Binding (bzw. `markForCheck()`) als „dirty“
 *   — ein reiner TypeScript-Methodenaufruf von außen löst dagegen selbst mit anschließendem
 *   `fixture.detectChanges()` kein DOM-Update aus. Ein echter `.click()` auf den Button reproduziert
 *   exakt den Interaktionspfad des Nutzers (`(click)="zoomIn()"`, siehe Template).
 * - Akzeptanzkriterium 2 (weiter entfernter Punkt bleibt per Pan erreichbar): unverändert
 *   gegenüber US-036 — diese Story ändert weder `onSurfacePointerDown/-Move/-Up` noch `clampPan()`.
 *   Bereits durch `us-036-map-dragdrop-ui.spec.ts`/`quadrant-chart.component.spec.ts` sowie den
 *   unveränderten Produktivcode abgedeckt; kein separater Testfall hier, um keine Schein-Genauigkeit
 *   über etwas vorzutäuschen, das ohne reales Browser-Layout (Pan-Clamp liest
 *   `getBoundingClientRect()`) nicht seriös prüfbar ist.
 * - Akzeptanzkriterium 6 (Story-Test existiert): durch diese Datei selbst erfüllt.
 * - Akzeptanzkriterium 7 (bestehende Tests bleiben grün): nicht Teil dieses Story-Tests, siehe
 *   vollständiger `ng test`-Lauf (PR-Beschreibung).
 */
describe('US-061: Map-Zoom skaliert Positionen statt Punkt-Marker unverhältnismäßig zu vergrößern', () => {
  function createComponent(points: MapPoint[]): ComponentFixture<QuadrantChartComponent> {
    TestBed.configureTestingModule({ imports: [QuadrantChartComponent] });
    const fixture = TestBed.createComponent(QuadrantChartComponent);
    fixture.componentInstance.points = points;
    fixture.componentInstance.perspective = 'PL';
    fixture.componentInstance.currentUserRole = 'PL';
    fixture.detectChanges();
    return fixture;
  }

  /** Löst einen echten Klick auf einen der drei Zoom-Cluster-Buttons aus (siehe Kopfkommentar,
   * warum kein direkter `zoomIn()`-Aufruf verwendet wird) und lässt Angular anschließend die
   * dadurch dirty gewordene Ansicht neu rendern. */
  function clickZoomButton(fixture: ComponentFixture<QuadrantChartComponent>, ariaLabel: string): void {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(`.zoom-cluster button[aria-label="${ariaLabel}"]`);
    if (!button) {
      throw new Error(`Zoom-Cluster-Button mit aria-label "${ariaLabel}" nicht gefunden.`);
    }
    button.click();
    fixture.detectChanges();
  }

  /** Liest den `scale(...)`-Faktor aus einem CSS-`transform`-Inline-Style-String (z. B. aus
   * `.plot-surface`s `translate(0px, 0px) scale(1.5)`). */
  function scaleFactorOf(transform: string): number {
    const match = /scale\(([-\d.]+)\)/.exec(transform);
    if (!match) {
      throw new Error(`Kein scale(...) in Transform-String gefunden: "${transform}"`);
    }
    return Number(match[1]);
  }

  function markerCounterScaleOf(button: HTMLButtonElement): number {
    const raw = button.style.getPropertyValue('--marker-counter-scale').trim();
    if (raw === '') {
      throw new Error('Marker-Element hat keine --marker-counter-scale Custom Property gesetzt.');
    }
    return Number(raw);
  }

  // Akzeptanzkriterium 1: Nach Zoom-In wächst der Abstand zwischen zwei dicht beieinanderliegenden
  // Punkten spürbar stärker als deren Marker-Durchmesser — die Marker-Größe bleibt konstant. Der
  // Container-Scale-Faktor (`.plot-surface`, bestimmt den Bildschirm-Abstand zweier Punkte bei
  // fester Prozent-Differenz) wächst mit dem Zoom; der EFFEKTIVE Marker-Scale-Faktor (Container-
  // Scale × Marker-Gegenskalierung) bleibt dagegen bei jedem Zoom-Level exakt 1 (unverändert).
  it('grows the screen distance between two close-by points with the container zoom while the effective marker size stays constant', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-a', name: 'Punkt A', influence: 50, interest: 50 },
      { stakeholderId: 'sh-b', name: 'Punkt B', influence: 53, interest: 47 },
    ];
    const fixture = createComponent(points);

    const surfaceEl: HTMLElement = fixture.nativeElement.querySelector('.plot-surface');
    let markerButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point');
    expect(markerButtons.length).toBe(2);

    // Vor jedem Zoom (zoomLevel 1): Referenzwert, Container-Scale 1, Marker-Gegenskalierung 1.
    expect(scaleFactorOf(surfaceEl.style.transform)).toBe(1);
    markerButtons.forEach((button) => expect(markerCounterScaleOf(button)).toBe(1));

    clickZoomButton(fixture, 'Vergrößern');
    clickZoomButton(fixture, 'Vergrößern');

    const containerScaleAfterZoom = scaleFactorOf(surfaceEl.style.transform);
    expect(containerScaleAfterZoom).toBe(2); // 1 + 2 * ZOOM_STEP(0.5) — Bildschirm-Abstand wächst um denselben Faktor.
    expect(containerScaleAfterZoom).toBeGreaterThan(1);

    markerButtons = fixture.nativeElement.querySelectorAll('.map-point');
    markerButtons.forEach((button) => {
      const markerCounterScale = markerCounterScaleOf(button);
      const effectiveMarkerScale = containerScaleAfterZoom * markerCounterScale;
      // Der Marker-Durchmesser wächst NICHT mit — die Gegenskalierung neutralisiert den
      // Container-Zoom exakt, während derselbe Container-Zoom den Punktabstand bereits
      // spürbar vergrößert hat (containerScaleAfterZoom === 2 oben).
      expect(effectiveMarkerScale).toBeCloseTo(1, 9);
    });
  });

  // Akzeptanzkriterium 3: Zwei nah beieinanderliegende Test-Punkte (Einfluss/Interesse 47/53 und
  // 50/50, SPEC-04 §4 Kern-Akzeptanzkriterium) lassen sich nach ausreichendem Zoom-In eindeutig
  // einzeln per Maus selektieren/ziehen — als unabhängig ansteuerbare, gleich große DOM-Elemente
  // (dieselbe Vorgehensweise wie das bereits bestehende Zoom/Pan-Edge-Case aus US-036, hier mit den
  // in SPEC-04 §4 explizit genannten Testwerten).
  it('keeps the 47/53 and 50/50 test points individually draggable after zooming in, both at the same constant marker size', () => {
    const points: MapPoint[] = [
      { stakeholderId: 'sh-47-53', name: 'Punkt 47/53', influence: 47, interest: 53 },
      { stakeholderId: 'sh-50-50', name: 'Punkt 50/50', influence: 50, interest: 50 },
    ];
    const fixture = createComponent(points);

    for (let i = 0; i < 4; i++) {
      clickZoomButton(fixture, 'Vergrößern');
    }

    const draggablePoints = fixture.debugElement.queryAll(By.css('app-draggable-point'));
    expect(draggablePoints.length).toBe(2);

    const markerButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.map-point');
    const counterScales = Array.from(markerButtons).map((button) => markerCounterScaleOf(button));
    // Beide Marker sind — unabhängig von ihrer knappen 3-Prozentpunkte-Nähe — exakt gleich groß.
    expect(counterScales[0]).toBeCloseTo(counterScales[1], 9);
    expect(counterScales[0]).toBeCloseTo(1 / 3, 9); // zoomLevel nach 4×+0.5: 1 + 4*0.5 = 3.

    let emittedA: unknown;
    let emittedB: unknown;
    fixture.componentInstance.pointMoved.subscribe((event) => {
      if (event.stakeholderId === 'sh-47-53') {
        emittedA = event;
      } else if (event.stakeholderId === 'sh-50-50') {
        emittedB = event;
      }
    });

    draggablePoints[0].triggerEventHandler('dragEnd', { influence: 20, interest: 80 });
    expect(emittedA).toEqual({ stakeholderId: 'sh-47-53', perspectiveRole: 'PL', influence: 20, interest: 80 });
    expect(emittedB).toBeUndefined();

    draggablePoints[1].triggerEventHandler('dragEnd', { influence: 90, interest: 10 });
    expect(emittedB).toEqual({ stakeholderId: 'sh-50-50', perspectiveRole: 'PL', influence: 90, interest: 10 });
  });

  // Akzeptanzkriterium 4: bestehendes Zoom/Pan-Verhalten (Grenzwerte [1, 4] in 0.5er-Schritten,
  // `translate() scale()`-Reihenfolge) bleibt durch diese Story unverändert — reiner
  // Regressionstest, identisch zur bereits bestehenden Prüfung in
  // `quadrant-chart.component.spec.ts` (`drag & drop / zoom-pan (US-036)`); liest bewusst die
  // Komponenten-Getter direkt (nicht das DOM), unabhängig vom Zoneless-Rendering-Detail oben.
  it('keeps the existing zoom bounds [1, 4] and the translate()-before-scale() transform order unchanged', () => {
    const fixture = createComponent([]);
    const instance = fixture.componentInstance as unknown as {
      zoomIn(): void;
      zoomOut(): void;
      resetView(): void;
      zoomLevel: number;
      surfaceTransform: string;
    };

    expect(instance.zoomLevel).toBe(1);
    instance.zoomIn();
    expect(instance.zoomLevel).toBe(1.5);
    expect(instance.surfaceTransform).toMatch(/^translate\([^)]*\)\s*scale\(1\.5\)$/);

    for (let i = 0; i < 10; i++) {
      instance.zoomIn();
    }
    expect(instance.zoomLevel).toBe(4);

    instance.zoomOut();
    expect(instance.zoomLevel).toBe(3.5);

    instance.resetView();
    expect(instance.zoomLevel).toBe(1);
  });

  // Akzeptanzkriterium 5: automatisierter Beleg (Style-Assertion, siehe Datei-Kopfkommentar für die
  // Begründung gegenüber echtem `getBoundingClientRect()`) dafür, dass die Marker-Größe nach Zoom
  // konstant bleibt, während die berechnete Bildschirmdistanz zwischen zwei Punkten wächst — hier
  // zusätzlich am oberen Rand (`MAX_ZOOM = 4`) verifiziert, nicht nur bei einem einzelnen
  // Zwischenschritt wie in Akzeptanzkriterium 1.
  it('proves via style assertion that the marker stays the same size at MAX_ZOOM while the container scale (driving screen distance) reaches its maximum', () => {
    const points: MapPoint[] = [{ stakeholderId: 'sh-1', name: 'Max Mustermann', influence: 50, interest: 50 }];
    const fixture = createComponent(points);

    for (let i = 0; i < 6; i++) {
      clickZoomButton(fixture, 'Vergrößern'); // 1 + 6*0.5 = 4 = MAX_ZOOM, weitere Klicks würden geclampt.
    }

    const surfaceEl: HTMLElement = fixture.nativeElement.querySelector('.plot-surface');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.map-point');

    const containerScale = scaleFactorOf(surfaceEl.style.transform);
    expect(containerScale).toBe(4); // MAX_ZOOM erreicht — maximal möglicher Bildschirm-Abstands-Faktor.

    const markerCounterScale = markerCounterScaleOf(button);
    expect(markerCounterScale).toBeCloseTo(0.25, 9); // 1 / 4

    // Effektive, tatsächlich auf dem Bildschirm gerenderte Marker-Größe: Container-Scale ×
    // Gegenskalierung — bleibt exakt beim Ausgangswert (1), obwohl der Punktabstand um Faktor 4
    // gewachsen ist.
    expect(containerScale * markerCounterScale).toBeCloseTo(1, 9);
  });
});
