import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SlobSteakPreset } from './slobsteak-preset';

/**
 * Story-Test US-077 „Overlay-Komponenten im dunklen Theme statt auf weißer Fläche" (QA-Konvention,
 * `.claude/agents/qa.md` Abschnitt 1). Jeder Testfall bildet genau ein Akzeptanzkriterium aus der
 * Story-Datei ab, in derselben Reihenfolge wie im Story-Dokument.
 *
 * Akzeptanzkriterium 5 (manueller Smoke-Test gegen `docker compose up`, Screenshot-Nachweis) und
 * Akzeptanzkriterium 7 (bestehende Tests bleiben grün) sind naturgemäß kein Verhalten, das sich in
 * einem einzelnen Jasmine-Spec abbilden lässt — Nachweis über den PR-Text (Smoke-Test-Protokoll)
 * bzw. den vollständigen grünen `ng test`-Lauf des gesamten Workspace (CLAUDE.md Abschnitt 2/3).
 * Akzeptanzkriterium 6 ("Story-Test existiert") ist diese Datei selbst.
 *
 * Testmethode: `providePrimeNG` wird hier — exakt wie in `app.config.ts` (`createAppConfig`) — mit
 * `SlobSteakPreset` und `options: { darkModeSelector: false, cssLayer: false }` verdrahtet. Karma
 * führt diese Suite in echtem Chrome (`ChromeHeadlessCI`, `karma.conf.js`) aus, wodurch
 * `getComputedStyle` dieselbe CSS-Auflösung liefert wie im laufenden `docker compose`-System
 * (inkl. der `light-dark()`-Auflösung, die laut Root-Cause-Analyse der Story-Datei für
 * `darkModeSelector: false` gerade NICHT wie naiv erwartet funktioniert) — ein reiner
 * Objekt-Vergleich auf `SlobSteakPreset` allein würde diese Laufzeit-Eigenheit nicht abdecken.
 */
@Component({
  standalone: true,
  imports: [DialogModule, TooltipModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" header="Testdialog" [closable]="true">
      <p>Dialoginhalt</p>
    </p-dialog>
    <!-- Erzwingt das Laden des komponenten-eigenen p-tooltip-Stylesheets (US-077
         Akzeptanzkriterium 2): PrimeNG laedt Komponenten-Styles lazy beim ersten Einsatz der
         jeweiligen Direktive/Komponente, im Gegensatz zu den global gemeinsamen Semantik-Tokens
         (semantic.overlay/list/navigation), die bereits mit dem Dialog oben geladen werden. -->
    <button type="button" pTooltip="Hinweistext">Hilfe</button>
  `,
})
class DialogHostComponent {}

/** WCAG-2.1-Kontrastformel (relative Luminanz + Kontrastverhältnis), siehe
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance — bewusst hier lokal nachgebildet statt
 * einer neuen Produktionsabhängigkeit, da ausschließlich für diesen Test benötigt. */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.substring(0, 2), 16),
    parseInt(normalized.substring(2, 4), 16),
    parseInt(normalized.substring(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('US-077: Overlay-Komponenten im dunklen Theme statt auf weißer Fläche', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogHostComponent],
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

  it('Akzeptanzkriterium 1: das Preset mappt semantic.overlay (modal/popover/select) auf Fläche/Rahmen/Schrift/Radius der Design-Tokens', () => {
    expect(SlobSteakPreset.semantic?.overlay?.modal?.background).toBe('#161D2B');
    expect(SlobSteakPreset.semantic?.overlay?.modal?.borderColor).toBe('#262F42');
    expect(SlobSteakPreset.semantic?.overlay?.modal?.color).toBe('#EDEFF4');
    expect(SlobSteakPreset.semantic?.overlay?.modal?.borderRadius).toBeTruthy();

    expect(SlobSteakPreset.semantic?.overlay?.popover?.background).toBe('#161D2B');
    expect(SlobSteakPreset.semantic?.overlay?.popover?.borderColor).toBe('#262F42');
    expect(SlobSteakPreset.semantic?.overlay?.popover?.color).toBe('#EDEFF4');

    expect(SlobSteakPreset.semantic?.overlay?.select?.background).toBe('#161D2B');
    expect(SlobSteakPreset.semantic?.overlay?.select?.borderColor).toBe('#262F42');
    expect(SlobSteakPreset.semantic?.overlay?.select?.color).toBe('#EDEFF4');
  });

  it('Akzeptanzkriterium 2: ein gerenderter p-dialog trägt die Surface-Farbe (#161D2B) als CSS-Custom-Property, nicht #ffffff', () => {
    // Komponenten-eigene Stylesheets (z. B. `p-tooltip`) lädt PrimeNG lazy beim ersten Einsatz der
    // jeweiligen Komponente/Direktive — Fixture daher zuerst rendern, bevor die CSS-Custom-
    // Properties auf `:root` gelesen werden.
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();

    const rootStyles = getComputedStyle(document.documentElement);

    // Diese Variablen sind es, auf die `.p-dialog`, `.p-password`-Overlay sowie die
    // `p-select`/`p-multiselect`-Panels laut Aura-Komponentendefinition tatsächlich verweisen
    // (`--p-dialog-background: var(--p-overlay-modal-background)` usw.) — die zentrale Fundstelle,
    // an der der in der Story dokumentierte Bug behoben wurde.
    expect(rootStyles.getPropertyValue('--p-overlay-modal-background').trim().toUpperCase()).toBe(
      '#161D2B',
    );
    expect(rootStyles.getPropertyValue('--p-overlay-popover-background').trim().toUpperCase()).toBe(
      '#161D2B',
    );
    expect(rootStyles.getPropertyValue('--p-overlay-select-background').trim().toUpperCase()).toBe(
      '#161D2B',
    );
    expect(rootStyles.getPropertyValue('--p-tooltip-background').trim().toUpperCase()).toBe(
      '#161D2B',
    );

    // p-menu rendert bereits über `content.background` (US-047) korrekt dunkel; hier zusätzlich
    // geprüft, dass dessen Options-Hover-Zustand (`navigation.item.focusBackground`, ebenfalls von
    // der `light-dark()`-Falle betroffen) jetzt auf `color.surface-hover` statt auf einem
    // aufgelösten Hellwert steht.
    expect(
      rootStyles.getPropertyValue('--p-navigation-item-focus-background').trim().toUpperCase(),
    ).toBe('#1D2536');
    expect(
      rootStyles.getPropertyValue('--p-list-option-focus-background').trim().toUpperCase(),
    ).toBe('#1D2536');

    // Kein betroffener Token darf mehr auf reinem Weiß landen (der ursprünglich gemessene Bug-Zustand).
    [
      '--p-overlay-modal-background',
      '--p-overlay-popover-background',
      '--p-overlay-select-background',
      '--p-tooltip-background',
    ].forEach((token) => {
      expect(rootStyles.getPropertyValue(token).trim().toLowerCase()).not.toBe('#ffffff');
    });

    // Und der tatsächlich gerenderte `.p-dialog` im DOM übernimmt genau diese Fläche (die konkrete
    // Reproduktion aus der Story: „`.p-dialog` → `background-color: rgb(255, 255, 255)`").
    const dialogEl: HTMLElement | null = fixture.nativeElement.querySelector('.p-dialog');
    expect(dialogEl).not.toBeNull();
    expect(getComputedStyle(dialogEl!).backgroundColor).toBe('rgb(22, 29, 43)');
    expect(getComputedStyle(dialogEl!).backgroundColor).not.toBe('rgb(255, 255, 255)');
  });

  it('Akzeptanzkriterium 3: Textfarben aus SPEC-00 §1.2 erreichen auf der Overlay-Fläche (#161D2B) mindestens 4,5:1 Kontrast', () => {
    // Primärtext (Dialogtitel, Feldbeschriftungen, Schaltflächen-Beschriftung).
    expect(contrastRatio('#EDEFF4', '#161D2B')).toBeGreaterThanOrEqual(4.5);
    // Gedämpfter Text (Hinweistext, Meta-Infos) — laut SPEC-00 §4 bereits als AA-geprüft vermerkt.
    expect(contrastRatio('#8D97AC', '#161D2B')).toBeGreaterThanOrEqual(4.5);
    // Fehlertext.
    expect(contrastRatio('#F87171', '#161D2B')).toBeGreaterThanOrEqual(4.5);
    // Primärtext auf dem Options-Hover-/Selected-Hintergrund des Auswahl-Panels
    // (`color.surface-hover`, `#1D2536`).
    expect(contrastRatio('#EDEFF4', '#1D2536')).toBeGreaterThanOrEqual(4.5);
  });

  it('Akzeptanzkriterium 4: der Nachweis erfolgt automatisiert über das Preset (semantic.overlay) UND über den gerenderten p-dialog — beide oben abgedeckt', () => {
    // Zusammenfassender Kriterium-Testfall: die beiden vorangehenden Testfälle (Akzeptanzkriterium 1
    // für das Preset-Objekt, Akzeptanzkriterium 2 für den gerenderten Dialog) erfüllen beide in der
    // Story genannten Nachweisformen ("bzw.") bereits vollständig — dieser Testfall hält das
    // Akzeptanzkriterium dennoch als eigenen, benannten Eintrag fest (qa.md Abschnitt 1: „jedes
    // Akzeptanzkriterium als eigener Testfall").
    expect(SlobSteakPreset.semantic?.overlay).toBeTruthy();
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    const dialogEl: HTMLElement | null = fixture.nativeElement.querySelector('.p-dialog');
    expect(getComputedStyle(dialogEl!).backgroundColor).not.toBe('rgb(255, 255, 255)');
  });
});
