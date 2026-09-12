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
      // US-078 (Issue #119): vormals '#5D6883' (`--app-color-text-faint`), das auf beiden im
      // Produkt vorkommenden Flächen 4,5:1 verfehlte und ersatzlos in `--app-color-text-muted`
      // aufgegangen ist (`frontend/src/styles.css`, `docs/adr/0012-kontrast-vor-wireframe-treue.md`).
      // Platzhalter-/Disabled-Text zieht denselben Wert nach, statt einen eigenen, erneut zu knapp
      // AA-konformen Grauton zu führen.
      disabledColor: '#8D97AC',
      placeholderColor: '#8D97AC',
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
    // US-079 (Issue #120): `outlined`/`text`/`secondary`-Button-Varianten übernahmen bislang
    // ungemappte Aura-Restwerte aus der neutralen Slate-Palette (`{surface.400-600}`) statt SPEC-00
    // §1.3 `.btn-secondary` (transparent, `color.border`-Rahmen, `color.text`-Schrift): gemessen
    // `#455165`/`#64748b` auf `#161d2b`/`#10151f` (2,11:1 bzw. 3,84:1 Kontrast — beide unter 4,5:1).
    // Betroffen waren konkret `outlined.secondary` ("E-Mails kopieren" im Verteiler, "Abbrechen" in
    // mehreren Formularen) und `text.secondary`. `text.primary` (Standard-Text-Button ohne
    // `severity`, z. B. "Abbrechen"/"Schließen" in Dialogen) war NIE betroffen: `button.text.primary
    // .color` referenziert in Aura bereits `{primary.color}` = `semantic.primary.color` (`#EDEFF4`)
    // oben — der in der Story gemessene Dialog-Bug war die weiße Dialogfläche dahinter (US-077),
    // nicht diese Textfarbe. `outlined.primary` (Standard-outlined ohne `severity`) und die reine
    // Filled-Variante `root.secondary` sind aktuell in keinem Screen im Einsatz, werden hier aber aus
    // Konsistenzgründen ebenfalls gemappt (SPEC-00 §4: kein ungemapptes Button-Farbschema im zentralen
    // Preset, unabhängig davon, ob ein Screen die Kombination heute schon verwendet).
    //
    // Deaktivierter Zustand (Akzeptanzkriterium 2): PrimeNG dimmt `:disabled` global über den
    // Semantik-Token `disabled.opacity` (Aura-Default `0.6`, `.p-component:disabled { opacity: ... }`
    // in `@primeuix/styles/base`) — das Button-Schema kennt keinen eigenen Disabled-Farb-Token. Statt
    // diesen app-weit (auch von anderen Komponenten genutzten) Mechanismus zu überschreiben, wird
    // bewusst derselbe `color.text`-Wert (`#EDEFF4`) auch für den deaktivierten Zustand verwendet:
    // `#EDEFF4` bei 60 % Opazität ergibt rechnerisch 6,31:1 auf `#10151F` und 6,06:1 auf `#161D2B`
    // (siehe `us-079-button-varianten-design-tokens.spec.ts`) — beide deutlich über der geforderten
    // 4,5:1-Schwelle, weil die Ausgangsfarbe selbst schon extrem hell ist. Kein separater
    // Disabled-Token, keine zusätzliche Custom-CSS nötig.
    //
    // Hover-Rahmen (Akzeptanzkriterium 1, "entsprechend dem in US-078 festgelegten Wert" =
    // `#5D6883`, siehe `formField.hoverBorderColor` oben — seit US-078/ADR-0012 unverändert als
    // Nicht-Text-Rahmenfarbe gültig, da WCAG-Kontrastanforderungen ausschließlich für Text gelten):
    // nur `root.secondary` (Filled-Variante) besitzt im PrimeNG-Button-Schema (`ButtonDesignTokens`,
    // `@primeuix/themes/types/button`) überhaupt ein `hoverBorderColor`-Feld. `outlined`/`text` kennen
    // strukturell keinen separaten Hover-Rahmen-Token — PrimeNGs Basis-CSS hält bei diesen beiden
    // Varianten den Rahmen zwischen Normal- und Hover-Zustand konstant und ändert beim Hover
    // ausschließlich die Hintergrundfläche. Der Hover-Rahmen-Wert wird deshalb ausschließlich dort
    // gesetzt, wo das Schema ihn vorsieht (`root.secondary`); für `outlined`/`text` bleibt der bereits
    // token-basierte Hover-Hintergrund (Aura-Default) unverändert die einzige Hover-Rückmeldung, wie
    // schon vor dieser Story — eine Custom-CSS-Erweiterung nur für diesen kosmetischen Nebeneffekt
    // hätte den Änderungsumfang der Story ohne gemessenen Bug-Befund vergrößert.
    button: {
      root: {
        secondary: {
          background: 'transparent',
          hoverBackground: '#1D2536',
          activeBackground: '#1D2536',
          borderColor: '#262F42',
          hoverBorderColor: '#5D6883',
          activeBorderColor: '#5D6883',
          color: '#EDEFF4',
          hoverColor: '#EDEFF4',
          activeColor: '#EDEFF4',
        },
      },
      outlined: {
        primary: {
          borderColor: '#262F42',
          color: '#EDEFF4',
        },
        secondary: {
          borderColor: '#262F42',
          color: '#EDEFF4',
        },
      },
      text: {
        secondary: {
          color: '#EDEFF4',
        },
      },
    },
  },
});
