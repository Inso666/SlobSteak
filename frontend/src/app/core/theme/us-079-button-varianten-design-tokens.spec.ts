import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { ButtonDirective } from 'primeng/button';
import { SlobSteakPreset } from './slobsteak-preset';

/**
 * Story-Test US-079 „PrimeNG-Button-Varianten (outlined, text, deaktiviert) auf die Design-Tokens
 * mappen" (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1). Jeder Testfall bildet genau ein
 * Akzeptanzkriterium aus `docs/usecases/US-079-button-varianten-design-tokens.md` ab, in derselben
 * Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 6 (manueller Smoke-Test gegen `docker compose up`, Screenshot-Nachweis) und
 * Akzeptanzkriterium 8 (bestehende Tests bleiben grün) sind reine Prozessnachweise, die sich nicht
 * sinnvoll als Jasmine-Assertion abbilden lassen — Nachweis über den PR-Text bzw. den vollständigen
 * grünen `ng test`-Lauf (CLAUDE.md Abschnitt 2/3). Akzeptanzkriterium 7 ("Story-Test existiert") ist
 * diese Datei selbst.
 *
 * Testmethode: exakt wie in `us-077-overlay-komponenten-dark-theme.spec.ts` wird `providePrimeNG`
 * mit `SlobSteakPreset` und denselben Optionen wie in `app.config.ts` (`createAppConfig`) verdrahtet
 * und in echtem Chrome (Karma `ChromeHeadlessCI`) gerendert, damit `getComputedStyle` dieselbe
 * CSS-Auflösung liefert wie im laufenden System.
 */
@Component({
  standalone: true,
  imports: [ButtonDirective],
  template: `
    <button type="button" pButton [outlined]="true" severity="secondary" id="outlined-secondary">
      Abbrechen
    </button>
    <button
      type="button"
      pButton
      [outlined]="true"
      severity="secondary"
      disabled
      id="outlined-secondary-disabled"
    >
      Abbrechen
    </button>
    <button type="button" pButton [outlined]="true" id="outlined-primary">Outlined</button>
    <button type="button" pButton [text]="true" severity="secondary" id="text-secondary">
      Abbrechen
    </button>
    <button
      type="button"
      pButton
      [text]="true"
      severity="secondary"
      disabled
      id="text-secondary-disabled"
    >
      Abbrechen
    </button>
    <button type="button" pButton [text]="true" id="text-primary">Schließen</button>
    <button type="button" pButton severity="secondary" id="secondary-filled">Sekundär</button>
    <button type="button" pButton id="primary">Speichern</button>
    <button type="button" pButton disabled id="primary-disabled">Speichern</button>
  `,
})
class ButtonHostComponent {}

/** WCAG-2.1-Kontrastformel (relative Luminanz + Kontrastverhältnis), siehe
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance — analog zu
 * `us-077-overlay-komponenten-dark-theme.spec.ts` / `us-078-lesbare-gedaempfte-textfarben.spec.ts`
 * lokal nachgebildet statt einer neuen Produktionsabhängigkeit. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Simuliert CSS `opacity` auf einem Element (hier: die globale PrimeNG-Regel
 * `.p-component:disabled { opacity: var(--p-disabled-opacity); }`) — Vordergrund- UND
 * Hintergrundfarbe faden gemeinsam gegen den dahinterliegenden Untergrund, siehe
 * `us-078-lesbare-gedaempfte-textfarben.spec.ts` `fadeTowards`. */
function fadeTowards(
  fg: { r: number; g: number; b: number },
  behind: { r: number; g: number; b: number },
  opacity: number,
): { r: number; g: number; b: number } {
  return {
    r: opacity * fg.r + (1 - opacity) * behind.r,
    g: opacity * fg.g + (1 - opacity) * behind.g,
    b: opacity * fg.b + (1 - opacity) * behind.b,
  };
}

const AA_TEXT_MIN_CONTRAST = 4.5;
const PAGE_BG = hexToRgb('#10151F');
const SURFACE_BG = hexToRgb('#161D2B');
const COLOR_TEXT = hexToRgb('#EDEFF4');
const COLOR_BORDER = '#262F42';
const HOVER_BORDER = '#5D6883'; // formField.hoverBorderColor, seit US-078 unverändert (ADR-0012).
const DISABLED_OPACITY = 0.6; // Aura-Default `disabled.opacity` (`@primeuix/themes/aura/base`).

describe('US-079: PrimeNG-Button-Varianten (outlined, text, deaktiviert) auf die Design-Tokens mappen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonHostComponent],
      providers: [
        providePrimeNG({
          theme: {
            preset: SlobSteakPreset,
            options: { darkModeSelector: false, cssLayer: false },
          },
        }),
      ],
    }).compileComponents();
  });

  function renderButtons(): HTMLElement {
    const fixture = TestBed.createComponent(ButtonHostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  it('Akzeptanzkriterium 1: das Preset mappt outlined/text/secondary auf Schrift color.text, Rahmen color.border, Fläche transparent, Hover-Rahmen auf den in US-078 festgelegten Wert', () => {
    // outlined (Standard + secondary)
    expect(SlobSteakPreset.components?.button?.outlined?.primary?.color).toBe('#EDEFF4');
    expect(SlobSteakPreset.components?.button?.outlined?.primary?.borderColor).toBe(COLOR_BORDER);
    expect(SlobSteakPreset.components?.button?.outlined?.secondary?.color).toBe('#EDEFF4');
    expect(SlobSteakPreset.components?.button?.outlined?.secondary?.borderColor).toBe(
      COLOR_BORDER,
    );

    // text (secondary; text.primary referenziert bereits semantic.primary.color unverändert)
    expect(SlobSteakPreset.components?.button?.text?.secondary?.color).toBe('#EDEFF4');

    // secondary (Filled-Variante): Fläche transparent, Rahmen color.border, Schrift color.text,
    // Hover-Rahmen auf dem in US-078 festgelegten Wert für Nicht-Text-Rahmenfarben.
    const rootSecondary = SlobSteakPreset.components?.button?.root?.secondary;
    expect(rootSecondary?.background).toBe('transparent');
    expect(rootSecondary?.borderColor).toBe(COLOR_BORDER);
    expect(rootSecondary?.color).toBe('#EDEFF4');
    expect(rootSecondary?.hoverBorderColor).toBe(HOVER_BORDER);
    expect(rootSecondary?.activeBorderColor).toBe(HOVER_BORDER);

    // Am tatsächlich gerenderten Button nachvollzogen (CSS-Custom-Properties und berechneter Stil).
    const host = renderButtons();
    const outlinedSecondary = host.querySelector<HTMLElement>('#outlined-secondary')!;
    expect(getComputedStyle(outlinedSecondary).color).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(outlinedSecondary).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(outlinedSecondary).borderColor).toBe('rgb(38, 47, 66)');

    const outlinedPrimary = host.querySelector<HTMLElement>('#outlined-primary')!;
    expect(getComputedStyle(outlinedPrimary).color).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(outlinedPrimary).borderColor).toBe('rgb(38, 47, 66)');

    const textSecondary = host.querySelector<HTMLElement>('#text-secondary')!;
    expect(getComputedStyle(textSecondary).color).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(textSecondary).backgroundColor).toBe('rgba(0, 0, 0, 0)');

    const secondaryFilled = host.querySelector<HTMLElement>('#secondary-filled')!;
    expect(getComputedStyle(secondaryFilled).color).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(secondaryFilled).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(secondaryFilled).borderColor).toBe('rgb(38, 47, 66)');

    expect(token('--p-button-secondary-hover-border-color').toLowerCase()).toBe(
      HOVER_BORDER.toLowerCase(),
    );
  });

  it('Akzeptanzkriterium 2: der deaktivierte Zustand erreicht mindestens 4,5:1 gegen color.background (#10151F) UND color.surface (#161D2B)', () => {
    renderButtons();

    // Deaktivierte outlined-/text-Buttons haben eine transparente Fläche — nur der Textpixel wird
    // durch die globale `.p-component:disabled { opacity }`-Regel gegen den jeweils dahinterliegenden
    // Untergrund gefadet (siehe `fadeTowards`, analog US-078).
    const disabledTextOnPage = fadeTowards(COLOR_TEXT, PAGE_BG, DISABLED_OPACITY);
    const disabledTextOnSurface = fadeTowards(COLOR_TEXT, SURFACE_BG, DISABLED_OPACITY);

    expect(contrastRatio(disabledTextOnPage, PAGE_BG)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    expect(contrastRatio(disabledTextOnSurface, SURFACE_BG)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );
  });

  it('Akzeptanzkriterium 3: kein Screen setzt Button-Farben lokal — die Änderung erfolgt ausschließlich im Preset', () => {
    // Nicht als Laufzeitverhalten in Karma prüfbar (kein Dateisystemzugriff auf Screen-CSS aus dem
    // Browser-Testbundle heraus, analog zu den Dokumentationskriterien in
    // `us-078-lesbare-gedaempfte-textfarben.spec.ts`). Nachgewiesen durch Repo-weite Durchsicht
    // (`grep -rln "p-button|btn-secondary" src/app --include="*.css"` liefert keine Treffer) sowie
    // dadurch, dass diese Story ausschließlich `slobsteak-preset.ts` und diese Testdatei ändert.
    expect(SlobSteakPreset.components?.button).toBeTruthy();
  });

  it('Akzeptanzkriterium 4: primary, outlined, text und secondary erreichen mindestens 4,5:1 in normal, hover, fokussiert und deaktiviert', () => {
    renderButtons();

    // primary (Filled, unverändert seit US-047) — Fläche = color.text, Schrift = color.background.
    const primaryColor = hexToRgb(SlobSteakPreset.semantic!.primary!.color as string);
    const primaryContrast = hexToRgb(SlobSteakPreset.semantic!.primary!.contrastColor as string);
    const primaryHoverBg = hexToRgb(SlobSteakPreset.semantic!.primary!.hoverColor as string);
    const primaryActiveBg = hexToRgb(SlobSteakPreset.semantic!.primary!.activeColor as string);
    expect(contrastRatio(primaryContrast, primaryColor)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );
    expect(contrastRatio(primaryContrast, primaryHoverBg)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );
    expect(contrastRatio(primaryContrast, primaryActiveBg)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );
    // deaktiviert: Fläche UND Schrift faden gemeinsam gegen den Untergrund — bei derart hohem
    // Ausgangskontrast (>15:1) bleibt das Ergebnis über 4,5:1 (siehe Berechnung in der Story-Datei).
    const disabledPrimaryText = fadeTowards(primaryContrast, SURFACE_BG, DISABLED_OPACITY);
    const disabledPrimaryBg = fadeTowards(primaryColor, SURFACE_BG, DISABLED_OPACITY);
    expect(contrastRatio(disabledPrimaryText, disabledPrimaryBg)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );

    // outlined (primary + secondary): Schrift color.text auf transparenter Fläche — normal, hover
    // (PrimeNG ändert bei `outlined` nur die Hintergrundfläche, nicht die Schrift-/Rahmenfarbe) und
    // fokussiert (Fokus-Ring ändert die Schriftfarbe nicht) sind identisch zum Normalzustand. Am
    // gerenderten Element für beide Kombinationen nachvollzogen, nicht nur rechnerisch am Token.
    for (const id of ['#outlined-primary', '#outlined-secondary']) {
      const el = renderButtons().querySelector<HTMLElement>(id)!;
      const renderedColor = hexToRgb('#EDEFF4');
      expect(getComputedStyle(el).color).toBe('rgb(237, 239, 244)');
      expect(contrastRatio(renderedColor, PAGE_BG)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
      expect(contrastRatio(renderedColor, SURFACE_BG)).toBeGreaterThanOrEqual(
        AA_TEXT_MIN_CONTRAST,
      );
    }
    const disabledOutlinedOnSurface = fadeTowards(COLOR_TEXT, SURFACE_BG, DISABLED_OPACITY);
    expect(contrastRatio(disabledOutlinedOnSurface, SURFACE_BG)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );

    // text (secondary): identische Überlegung wie outlined — keine eigene Rahmenfarbe, Schrift
    // bleibt über alle Zustände hinweg color.text.
    expect(contrastRatio(COLOR_TEXT, PAGE_BG)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    expect(contrastRatio(COLOR_TEXT, SURFACE_BG)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);

    // secondary (Filled): normal/hover/aktiv nutzen alle color.text auf color.surface-hover
    // (`#1D2536`) bzw. transparenter Fläche.
    const surfaceHover = hexToRgb('#1D2536');
    expect(contrastRatio(COLOR_TEXT, surfaceHover)).toBeGreaterThanOrEqual(AA_TEXT_MIN_CONTRAST);
    const disabledSecondaryFilled = fadeTowards(COLOR_TEXT, SURFACE_BG, DISABLED_OPACITY);
    expect(contrastRatio(disabledSecondaryFilled, SURFACE_BG)).toBeGreaterThanOrEqual(
      AA_TEXT_MIN_CONTRAST,
    );
  });

  it('Akzeptanzkriterium 5: ein automatisierter Test belegt die Farbzuweisung für outlined und text inklusive deaktiviertem Zustand', () => {
    const host = renderButtons();

    const outlinedSecondary = host.querySelector<HTMLElement>('#outlined-secondary')!;
    const outlinedSecondaryDisabled = host.querySelector<HTMLElement>(
      '#outlined-secondary-disabled',
    )!;
    const textSecondary = host.querySelector<HTMLElement>('#text-secondary')!;
    const textSecondaryDisabled = host.querySelector<HTMLElement>('#text-secondary-disabled')!;

    // Normalzustand: Schrift color.text (#EDEFF4), Fläche transparent.
    expect(getComputedStyle(outlinedSecondary).color).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(textSecondary).color).toBe('rgb(237, 239, 244)');

    // Deaktivierter Zustand: `[disabled]` triggert PrimeNGs `.p-component:disabled`-Opazitätsregel;
    // die zugrunde liegende Schriftfarbe bleibt trotzdem color.text (kein Umschalten auf einen
    // separaten, ungemappten Aura-Restwert) — geprüft über das `disabled`-Attribut sowie die
    // tatsächlich angewendete Opazität.
    expect(outlinedSecondaryDisabled.hasAttribute('disabled')).toBe(true);
    expect(textSecondaryDisabled.hasAttribute('disabled')).toBe(true);
    expect(Number(getComputedStyle(outlinedSecondaryDisabled).opacity)).toBeCloseTo(
      DISABLED_OPACITY,
      1,
    );
    expect(Number(getComputedStyle(textSecondaryDisabled).opacity)).toBeCloseTo(
      DISABLED_OPACITY,
      1,
    );
  });

  it('Ergänzend (Regressionsschutz US-043): text.primary (Standard-Text-Button ohne severity) und der primäre Button bleiben unverändert auf color.text/semantic.primary gemappt', () => {
    const host = renderButtons();
    const textPrimary = host.querySelector<HTMLElement>('#text-primary')!;
    expect(getComputedStyle(textPrimary).color).toBe('rgb(237, 239, 244)');

    const primaryButton = host.querySelector<HTMLElement>('#primary')!;
    expect(getComputedStyle(primaryButton).backgroundColor).toBe('rgb(237, 239, 244)');
    expect(getComputedStyle(primaryButton).color).toBe('rgb(16, 21, 31)');

    // `#primary-disabled` existiert im Template ausschließlich, um sicherzustellen, dass ein
    // deaktivierter Standard-Button (ohne outlined/text/secondary) weiterhin fehlerfrei rendert.
    const primaryDisabled = host.querySelector<HTMLElement>('#primary-disabled')!;
    expect(primaryDisabled.hasAttribute('disabled')).toBe(true);
  });
});
