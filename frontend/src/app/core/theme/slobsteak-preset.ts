import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * US-047: zentrales PrimeNG-Custom-Preset auf Basis des dunklen Aura-Presets
 * (SPEC-00 §1.1). Bildet die Design-Tokens aus SPEC-00 §1.2 auf die internen
 * PrimeNG-Semantik-Tokens ab, damit jede PrimeNG-Komponente (p-button,
 * p-card, p-message, p-tag, …) app-weit dieselbe Optik ohne lokale
 * Theme-Overrides erhält (siehe SPEC-00 §4 „kein Screen überschreibt
 * Theme-Variablen lokal").
 *
 * PrimeNG v22 löst Light/Dark ausschließlich über die CSS-Funktion
 * `light-dark()` auf Basis der berechneten `color-scheme`-Eigenschaft auf
 * (kein `semantic.colorScheme.{light,dark}`-Objekt mehr wie in älteren
 * PrimeNG-Versionen, auf die SPEC-00 §1.1 noch verweist — siehe ADR-0004).
 * Da SlobSteak laut Wireframe ausschließlich ein dunkles Theme kennt (kein
 * Light-Mode-Toggle im Scope), werden die Tokens hier direkt (nicht über
 * `light-dark()`) auf feste Werte gesetzt; `styles.css` erzwingt zusätzlich
 * `color-scheme: dark`, damit auch die wenigen, hier nicht überschriebenen
 * Komponenten-internen `light-dark()`-Aufrufe konsistent den dunklen Zweig
 * wählen.
 *
 * Die Akzentfarbe (`#F2A93B`) wird bewusst NICHT auf `primary` gemappt
 * (SPEC-00 §4: „ausschließlich für Braucht-Aufmerksamkeit-Signale und den
 * Fokus-Ring — in keinem Screen für allgemeine Links, Primär-Buttons oder
 * dekorative Akzente"). `primary` bildet stattdessen das Wireframe-Muster
 * „Text-auf-hell-Fläche" ab (`.btn-primary`, SPEC-00 §1.3): Fläche =
 * `color.text`, Schrift = `color.background`.
 */
export const SlobSteakPreset = definePreset(Aura, {
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '#F2A93B',
      offset: '2px',
      shadow: 'none',
    },
    primary: {
      color: '#EDEFF4',
      contrastColor: '#10151F',
      hoverColor: '#D8DBE4',
      activeColor: '#C3C7D3',
    },
    text: {
      color: '#EDEFF4',
      hoverColor: '#EDEFF4',
      mutedColor: '#8D97AC',
      hoverMutedColor: '#8D97AC',
    },
    content: {
      background: '#161D2B',
      hoverBackground: '#1D2536',
      borderColor: '#262F42',
      color: '#EDEFF4',
      hoverColor: '#EDEFF4',
      borderRadius: '8px',
    },
    formField: {
      background: '#161D2B',
      disabledBackground: '#1D2536',
      filledBackground: '#1D2536',
      filledHoverBackground: '#1D2536',
      filledFocusBackground: '#1D2536',
      borderColor: '#262F42',
      hoverBorderColor: '#5D6883',
      focusBorderColor: '#F2A93B',
      invalidBorderColor: '#F87171',
      color: '#EDEFF4',
      disabledColor: '#5D6883',
      placeholderColor: '#5D6883',
      invalidPlaceholderColor: '#F87171',
      borderRadius: '8px',
    },
    highlight: {
      background: 'rgba(242, 169, 59, 0.14)',
      focusBackground: 'rgba(242, 169, 59, 0.2)',
      color: '#F2A93B',
      focusColor: '#F2A93B',
    },
  },
  components: {
    card: {
      colorScheme: {
        light: { root: { background: '#161D2B', color: '#EDEFF4' } },
        dark: { root: { background: '#161D2B', color: '#EDEFF4' } },
      },
    },
  },
});
