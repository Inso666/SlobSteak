/**
 * Story-Test US-078 „Gedämpfte Textfarbe und Rollen-Badges auf WCAG-AA-Kontrast anheben"
 * (Frontend-Anteil, Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Prüft ausschließlich die
 * in `docs/usecases/US-078-lesbare-gedaempfte-textfarben.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument, rechnerisch gegen die tatsächlich in
 * `frontend/src/styles.css` hinterlegten `:root`-Token-Werte (via `getComputedStyle`, nicht gegen
 * im Test dupliziert eingetippte Hex-Werte).
 *
 * Akzeptanzkriterien 5/6 (SPEC-00-Aktualisierung, ADR) und 8/9/10 (manueller Smoke-Test,
 * Story-Test-Existenz, vollständige grüne Testsuite) sind reine Dokumentations- bzw.
 * Prozessnachweise, die sich nicht sinnvoll als Jasmine-Assertion gegen den im Karma-Browser
 * geladenen Stylesheet-Zustand abbilden lassen (kein Dateisystemzugriff auf `.md`-Dateien aus dem
 * Browser-Testbundle heraus) — sie werden durch die tatsächlichen Doku-Änderungen
 * (`docs/specs/SPEC-00-Design-System.md`, `docs/adr/0012-kontrast-vor-wireframe-treue.md`) sowie
 * den im PR dokumentierten manuellen Smoke-Test nachgewiesen, analog zur Handhabung nicht
 * code-prüfbarer Akzeptanzkriterien in `us-047-frontend-design-migration.spec.ts`.
 */
describe('US-078: Gedämpfte Textfarbe und Rollen-Badges auf WCAG-AA-Kontrast anheben', () => {
  // --- Kontrast-Hilfsfunktion (WCAG 2.1 „relative luminance" / Kontrastformel) ---------------

  function parseColor(raw: string): { r: number; g: number; b: number; a: number } {
    const value = raw.trim();
    const hexMatch = value.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1,
      };
    }
    const rgbaMatch = value.match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
    );
    if (rgbaMatch) {
      return {
        r: Number(rgbaMatch[1]),
        g: Number(rgbaMatch[2]),
        b: Number(rgbaMatch[3]),
        a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
      };
    }
    throw new Error(`Nicht unterstütztes Farbformat in Token-Wert: "${raw}"`);
  }

  /** Blendet eine (ggf. transparente) Vordergrundfarbe über eine deckende Hintergrundfarbe. */
  function flattenOver(
    fg: { r: number; g: number; b: number; a: number },
    bg: { r: number; g: number; b: number },
  ): { r: number; g: number; b: number } {
    return {
      r: fg.a * fg.r + (1 - fg.a) * bg.r,
      g: fg.a * fg.g + (1 - fg.a) * bg.g,
      b: fg.a * fg.b + (1 - fg.a) * bg.b,
    };
  }

  function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const channel = (c: number): number => {
      const normalized = c / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  /** WCAG-Kontrastverhältnis zwischen zwei (bereits deckenden) Farben, z. B. 4.5 für AA/Fließtext. */
  function contrastRatio(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
  ): number {
    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** Simuliert CSS `opacity` auf einem Element: sowohl Text- als auch Flächenfarbe faden gegen den
   *  dahinterliegenden Untergrund (hier: die Seite, `--app-color-background`), siehe
   *  `.project-card.archived { opacity: var(--app-map-point-locked-opacity); }`. */
  function fadeTowards(
    rgb: { r: number; g: number; b: number },
    behind: { r: number; g: number; b: number },
    opacity: number,
  ): { r: number; g: number; b: number } {
    return flattenOver({ ...rgb, a: opacity }, behind);
  }

  const AA_TEXT_MIN_CONTRAST = 4.5;

  function token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  const pageBg = () => parseColor(token('--app-color-background')); // #10151f
  const surfaceBg = () => parseColor(token('--app-color-surface')); // #161d2b
  const surfaceHoverBg = () => parseColor(token('--app-color-surface-hover')); // #1d2536

  // Akzeptanzkriterium 1: `--app-color-text-faint` erreicht 4,5:1 auf beiden Flächen, bleibt dabei
  // sichtbar schwächer als `--app-color-text-muted` — ODER wird (wie hier begründet in
  // `frontend/src/styles.css` und `docs/adr/0012-kontrast-vor-wireframe-treue.md`) ersatzlos mit
  // `--app-color-text-muted` zusammengeführt. Geprüft wird: (a) der Token existiert nicht mehr
  // eigenständig, (b) `--app-color-text-muted` selbst erreicht 4,5:1 auf beiden Flächen.
  it('Akzeptanzkriterium 1: --app-color-text-faint entfällt, --app-color-text-muted erreicht 4,5:1 auf color.background und color.surface', () => {
    expect(token('--app-color-text-faint')).toBe('');

    const muted = parseColor(token('--app-color-text-muted'));
    const contrastOnPage = contrastRatio(muted, pageBg());
    const contrastOnSurface = contrastRatio(muted, surfaceBg());

    expect(contrastOnPage).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    expect(contrastOnSurface).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
  });

  // Akzeptanzkriterium 2: `.role-badge--pl`/`--coreteam`/`--architect` erreichen mindestens 4,5:1 —
  // geprüft auf beiden im Produkt vorkommenden effektiven Untergründen (Badge-Hintergrundfarbe ist
  // eine teiltransparente Fläche, die auf `color.surface` UND auf `color.background` aufliegt).
  it('Akzeptanzkriterium 2: alle drei Rollen-Badge-Kombinationen erreichen mindestens 4,5:1', () => {
    const roleBadges: { textToken: string; bgToken: string }[] = [
      { textToken: '--app-role-pl-badge', bgToken: '--app-role-pl-bg' },
      { textToken: '--app-role-ct', bgToken: '--app-role-ct-bg' },
      { textToken: '--app-role-ar', bgToken: '--app-role-ar-bg' },
    ];

    for (const { textToken, bgToken } of roleBadges) {
      const text = parseColor(token(textToken));
      const badgeBg = parseColor(token(bgToken));

      const effectiveOnSurface = flattenOver(badgeBg, surfaceBg());
      const effectiveOnPage = flattenOver(badgeBg, pageBg());

      const contrastOnSurface = contrastRatio(text, effectiveOnSurface);
      const contrastOnPage = contrastRatio(text, effectiveOnPage);

      expect(contrastOnSurface).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
      expect(contrastOnPage).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    }
  });

  // Akzeptanzkriterium 3: die reinen Rollenfarben (Map-Punkte, Fortschrittsringe, Slider) bleiben
  // unangetastet — nur die Badge-Kombination durfte sich ändern.
  it('Akzeptanzkriterium 3: die rohen Rollenfarben --app-role-pl/-ct/-ar bleiben unverändert', () => {
    expect(token('--app-role-pl')).toBe('#8b7cf6');
    expect(token('--app-role-ct')).toBe('#2dd4bf');
    expect(token('--app-role-ar')).toBe('#38bdf8');
  });

  // Akzeptanzkriterium 4: archivierte Projektkarten (`.project-card.archived { opacity:
  // var(--app-map-point-locked-opacity); }`) erreichen ebenfalls mindestens 4,5:1 für alle Texte —
  // geprüft für die Meta-Zeile (`--app-color-text-muted` auf `color.surface`), den
  // „ARCHIVIERT"-Status-Tag (`--app-color-text-muted` auf `color.surface-hover`) und alle drei
  // Rollen-Badges (auf ihrer jeweiligen effektiven Fläche über `color.surface`).
  it('Akzeptanzkriterium 4: Texte und Rollen-Badges auf archivierten Projektkarten erreichen weiterhin mindestens 4,5:1', () => {
    const lockedOpacity = Number(token('--app-map-point-locked-opacity'));
    expect(lockedOpacity).toBeGreaterThan(0);
    expect(lockedOpacity).toBeLessThanOrEqual(1);

    const behind = pageBg();
    const muted = parseColor(token('--app-color-text-muted'));

    // .meta (Zeitstempel) auf der Kartenfläche selbst.
    const metaText = fadeTowards(muted, behind, lockedOpacity);
    const metaBg = fadeTowards(surfaceBg(), behind, lockedOpacity);
    expect(contrastRatio(metaText, metaBg)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);

    // .status-tag--archived (Fläche color.surface-hover, Text color.text-muted).
    const statusTagText = fadeTowards(muted, behind, lockedOpacity);
    const statusTagBg = fadeTowards(surfaceHoverBg(), behind, lockedOpacity);
    expect(contrastRatio(statusTagText, statusTagBg)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);

    // Alle drei Rollen-Badges auf ihrer effektiven Fläche über color.surface.
    const roleBadges: { textToken: string; bgToken: string }[] = [
      { textToken: '--app-role-pl-badge', bgToken: '--app-role-pl-bg' },
      { textToken: '--app-role-ct', bgToken: '--app-role-ct-bg' },
      { textToken: '--app-role-ar', bgToken: '--app-role-ar-bg' },
    ];
    for (const { textToken, bgToken } of roleBadges) {
      const text = parseColor(token(textToken));
      const effectiveBg = flattenOver(parseColor(token(bgToken)), surfaceBg());

      const fadedText = fadeTowards(text, behind, lockedOpacity);
      const fadedBg = fadeTowards(effectiveBg, behind, lockedOpacity);

      expect(contrastRatio(fadedText, fadedBg)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    }
  });
});
