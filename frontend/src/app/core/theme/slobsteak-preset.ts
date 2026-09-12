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
 * PrimeNG-Versionen, auf die SPEC-00 §1.1 noch verweist — siehe ADR-0011).
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
 *
 * US-077 (Issue #116): `providePrimeNG` verdrahtet dieses Preset in `app.config.ts` bewusst mit
 * `options.darkModeSelector: false` (kein Light/Dark-Toggle im Scope, SPEC-00 §1.1). PrimeNG v22
 * behandelt `darkModeSelector: false` intern so, dass für jeden Token, dessen Aura-Default über die
 * CSS-Funktion `light-dark(light, dark)` zwei Varianten definiert, ausschließlich die **Light**-
 * Variante als fixer Wert in die generierte `:root`-Regel geschrieben wird — die Dark-Variante wird
 * nicht als Alternativpfad emittiert (kein `@media`/Klassen-Selektor, keine `light-dark()`-Funktion
 * im Output). Das erzwungene `color-scheme: dark` in `styles.css` kann diesen bereits fest auf
 * „hell" aufgelösten Wert deshalb nicht mehr nachträglich umsteuern. Der genaue Mechanismus
 * (`applyDarkColorScheme`/`getColorSchemeOption` in `@primeuix/styled`) ist in ADR-0011
 * dokumentiert — er erklärt auch, warum schon `components.card` einen `colorScheme`-Workaround
 * brauchte, bevor diese Ursache geklärt war.
 * Betroffen sind u. a. alle vier Overlay-Semantik-Gruppen (`semantic.overlay.modal/popover/select`,
 * von `p-dialog`, `p-password`-Panel, `p-select`/`p-multiselect`-Panel referenziert), die vor dieser
 * Story komplett ungemappt blieben und daher auf Aura-Defaults (`light-dark({surface.0},
 * {surface.900})`) — sprich der eingefrorenen Light-Variante `#ffffff` — standen. Die einzige
 * robuste Gegenmaßnahme: jeder betroffene Token bekommt hier einen **flachen** Hex-/rgba-Wert ohne
 * `light-dark()`, exakt wie bei `content`/`formField` bereits gehandhabt — ein flacher Wert entgeht
 * der Light/Dark-Auswahl komplett, weil es keine zwei Varianten mehr zum Auswählen gibt.
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
    // US-077 / SPEC-00 §4 „Kein Screen überschreibt Dialog-Farben lokal": zentrale Overlay-Semantik
    // für alle drei von PrimeNG v22 vorgesehenen Overlay-Gruppen. `modal` treibt `p-dialog` (und
    // `p-confirmdialog`), `popover` treibt `p-popover` sowie das `p-password`-Stärke-Overlay,
    // `select` treibt die `p-select`-/`p-multiselect`-Panels — jeweils über Aura-interne
    // Token-Referenzen (`{overlay.modal.*}` usw.), hier zentral auf einen einzigen Satz Design-
    // Tokens aus SPEC-00 §1.2 gemappt: Fläche `color.surface`, Rahmen `color.border`, Schrift
    // `color.text`, Radius `radius.md` (identisch mit `content.borderRadius` oben — Overlays sind
    // im Wireframe optisch dieselbe Panel-Fläche wie Karten, keine eigene Radius-Stufe vorgesehen).
    overlay: {
      modal: {
        background: '#161D2B',
        borderColor: '#262F42',
        color: '#EDEFF4',
        borderRadius: '8px',
      },
      popover: {
        background: '#161D2B',
        borderColor: '#262F42',
        color: '#EDEFF4',
        borderRadius: '8px',
      },
      select: {
        background: '#161D2B',
        borderColor: '#262F42',
        color: '#EDEFF4',
        borderRadius: '8px',
      },
    },
    // US-077: `list.option.focusBackground` (Options-Hover in `p-select`/`p-multiselect`-Panels)
    // ist in Aura `light-dark({surface.100},{surface.800})` — vom selben `darkModeSelector: false`-
    // Effekt betroffen wie die Overlay-Gruppen oben. `selectedBackground`/`selectedFocusBackground`
    // referenzieren bereits das flache `highlight`-Token von oben und sind daher unbetroffen; nur
    // der reine Hover-Zustand (Akzeptanzkriterium 3: „Options-Einträge inkl. Hover-/Selected-
    // Zustand" ≥ 4,5:1) braucht hier einen flachen Ersatzwert.
    list: {
      option: {
        focusBackground: '#1D2536',
      },
    },
    // US-077: dieselbe `light-dark()`-Falle für den Hover-/Aktiv-Zustand von `p-menu`-Einträgen
    // (`navigation.item.focusBackground`/`activeBackground`, ebenfalls
    // `light-dark({surface.100},{surface.800})` in Aura). `p-menu` selbst rendert dank
    // `content.background`/`content.borderColor`/`content.color` (oben) bereits korrekt auf
    // `color.surface` — nur der Hover-Hintergrund der Menüeinträge fehlte.
    navigation: {
      item: {
        focusBackground: '#1D2536',
        activeBackground: '#1D2536',
      },
    },
  },
  components: {
    card: {
      colorScheme: {
        light: { root: { background: '#161D2B', color: '#EDEFF4' } },
        dark: { root: { background: '#161D2B', color: '#EDEFF4' } },
      },
    },
    // US-050 / SPEC-00 §3: Skeleton-Bausteine (`<p-skeleton>`) in `color.surface-hover`
    // (`--app-color-surface-hover`) auf `color.surface`-Hintergrund. `borderRadius` bleibt
    // bewusst ungesetzt — Aura referenziert dafür bereits `{content.border.radius}`, das über
    // `semantic.content.borderRadius` oben schon auf `8px`/`radius.md` gesetzt ist, ein
    // zusätzlicher lokaler Wert wäre eine doppelte Quelle der Wahrheit.
    skeleton: {
      root: {
        background: '#1D2536',
      },
    },
    // US-077 / Akzeptanzkriterium 2: `p-tooltip` referenziert in Aura keinen Overlay-Semantik-Token,
    // sondern feste Primitiv-Farben (`{surface.700}`/`{surface.0}` — ein dunkles Grau mit weißer
    // Schrift, unabhängig vom Farbschema). Damit Tooltips optisch dieselbe Fläche wie alle anderen
    // Overlays zeigen (SPEC-00 §4: „rendern auf `color.surface`"), wird hier explizit auf dieselben
    // zwei Design-Tokens umgemappt statt auf der zufällig ebenfalls dunklen Aura-Voreinstellung zu
    // verharren.
    tooltip: {
      root: {
        background: '#161D2B',
        color: '#EDEFF4',
      },
    },
  },
});
