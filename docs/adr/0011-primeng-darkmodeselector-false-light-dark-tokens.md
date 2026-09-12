# ADR-0011: `darkModeSelector: false` erzwingt bei PrimeNG v22 die Light-Variante jedes `light-dark()`-Tokens — betroffene Tokens brauchen flache Custom-Preset-Werte

## Status

Angenommen (2026-09-13, im Rahmen von US-077).

## Kontext

`frontend/src/app/core/theme/slobsteak-preset.ts` enthielt bereits vor dieser Story einen Kommentar,
der vermutete, PrimeNG v22 löse `light-dark()`-Tokens „nicht wie ursprünglich angenommen" auf, und
verwies dafür auf „ADR-0004". Diese Referenz war falsch — ADR-0004 behandelt PBKDF2-Passwort-Hashing,
nicht PrimeNG-Theming; ein ADR zur eigentlichen Ursache existierte nicht. Sichtbarer Symptomträger war
u. a. `components.card`, das trotz eines bereits gesetzten `semantic.content.background` zusätzlich
über einen expliziten `colorScheme: { light: {...}, dark: {...} }`-Block abgesichert werden musste,
ohne dass dokumentiert war, warum das nötig ist.

Im Rahmen von US-077 (Issue #116, Overlay-Komponenten rendern auf `#ffffff` statt auf dem dunklen
Theme) wurde die tatsächliche Ursache durch direkte Analyse von `@primeuix/styled`/`@primeuix/themes`
(Version aus `frontend/package.json`) geklärt, statt sie erneut nur zu vermuten.

## Entscheidung / Befund

`app.config.ts` verdrahtet `providePrimeNG` mit `options.darkModeSelector: false` (SlobSteak kennt
laut SPEC-00 §1.1 ausschließlich ein dunkles Theme, kein Light/Dark-Toggle). PrimeNGs Style-Engine
wertet das intern so aus:

```js
applyDarkColorScheme(options) {
  const t = options.darkModeSelector;
  return !(t === 'none' || t === false);
}
```

Ist `darkModeSelector: false`, liefert `applyDarkColorScheme(...)` `false`, wodurch
`getColorSchemeOption(...)` ein **leeres Array** zurückgibt. Beim Zusammenbau der CSS-Ausgabe
(`transformCSS`) bedeutet ein leeres Array: für jeden Semantik-Token, dessen Aura-Standardwert über
die CSS-Funktion `light-dark(light, dark)` zwei Varianten definiert, wird **ausschließlich die
Light-Variante** als fixer Wert in die generierte `:root,:host`-Regel geschrieben — kein
`light-dark()`-Aufruf, kein alternativer Dark-Selektor, keine Reaktion auf das im übrigen Stylesheet
erzwungene `color-scheme: dark`.

Das erklärt exakt die beiden bislang nur vermuteten bzw. am Symptom behobenen Fälle:

- `components.card` brauchte einen expliziten `colorScheme.{light,dark}`-Block, weil `card.root.background`
  in Aura zwar auf `{content.background}` verweist, dieser Verweis intern aber ebenfalls über den
  `light-dark()`-Mechanismus aufgelöst wird, solange der Token selbst nicht flach überschrieben ist.
- `semantic.overlay` (treibt `p-dialog`, `p-password`-Overlay, `p-select`-/`p-multiselect`-Panels) war
  vor US-077 komplett ungemappt und landete dadurch unverändert auf Auras `light-dark({surface.0},
  {surface.900})` — sprich der eingefrorenen Light-Variante `#ffffff`.

Empirisch verifiziert mit dem echten `@primeuix/themes`-Compiler (`Theme.getCommonStyleSheet()` /
`Theme.getStyleSheet('tooltip')`, aufgerufen mit `SlobSteakPreset` und exakt der Produktionsoption
`darkModeSelector: false`): nach Ergänzung eines flachen (nicht `light-dark()`-basierten) Custom-Wertes
für einen betroffenen Token erscheint im generierten CSS ausschließlich dieser flache Wert — kein
`light-dark()` mehr, unabhängig von `darkModeSelector`.

**Konsequenz für jede künftige Preset-Ergänzung:** Jeder PrimeNG-Semantik- oder Komponenten-Token, der
in Aura einen `light-dark(...)`-Ausdruck referenziert, muss in `slobsteak-preset.ts` einen **flachen**
Hex-/rgba-Wert erhalten (kein `light-dark()`, kein Verlassen auf `color-scheme: dark` allein) — sonst
bleibt er dauerhaft auf der Aura-Light-Variante eingefroren, unabhängig davon, ob SlobSteak selbst
jemals einen Light-Mode einführt. Vor Ergänzung eines neuen Tokens im Preset lohnt sich ein kurzer
Blick in die Aura-Quelle (`node_modules/@primeuix/themes/aura`) bzw. ein Probelauf wie in US-077
(`Theme.getCommonStyleSheet()`/`Theme.getStyleSheet(...)` mit dem Ziel-Preset), um `light-dark()`-Reste
frühzeitig zu erkennen, statt sie erst über einen gemessenen Kontrast-Bug zu entdecken.

## Alternativen (verworfen)

- **`darkModeSelector` auf einen echten Wert setzen (z. B. `'system'` oder einen Klassen-Selektor)
  statt `false`:** würde PrimeNG dazu bringen, echte `light-dark()`-CSS-Ausdrücke zu erzeugen, die der
  Browser anhand von `color-scheme: dark` korrekt auflösen könnte — architektonisch näher an PrimeNGs
  vorgesehenem Mechanismus. Verworfen, da das eine Änderung an `app.config.ts`/den bestehenden
  PrimeNG-Optionen wäre, die über den Scope dieser Bugfix-Story hinausgeht und ein eigenes Risiko trägt
  (mögliche Nebenwirkungen auf andere, bereits korrekt funktionierende Tokens). Bleibt als mögliche
  spätere Vereinfachung dokumentiert, falls ein künftiger Preset-Umbau ansteht.
- **`colorScheme.{light,dark}`-Wrapper wie bei `components.card` für jeden betroffenen Token:**
  funktional gleichwertig zu einem flachen Wert, aber deutlich ausführlicher (zwei identische Werte je
  Token). Verworfen zugunsten der kürzeren, bereits an anderer Stelle im Preset etablierten flachen
  Schreibweise (z. B. `semantic.content`, `semantic.formField`).

## Konsequenzen

- `slobsteak-preset.ts` referenziert ab sofort dieses ADR statt der fälschlich zitierten „ADR-0004".
- Folge-Stories, die weitere PrimeNG-Komponenten an das Preset anschließen (z. B. US-084 „gestaltete
  Auswahlfelder app-weit"), profitieren von der hier dokumentierten Prüfmethode, statt denselben Bug
  in einer neuen Komponente erneut zu reproduzieren.
