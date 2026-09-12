# ADR-0012: Bei Konflikt zwischen Wireframe-Farbwert und WCAG-AA-Kontrast gewinnt der Kontrast

## Status

Angenommen (2026-09-13, im Rahmen von US-078).

## Kontext

Der QA-Design-Abgleich vom 04.09.2026 (Issue #119, Issue #121) stellte fest, dass zwei zentrale
Design-Tokens aus `docs/specs/SPEC-00-Design-System.md` §1.2 — `--app-color-text-faint` (`#5D6883`)
und die drei Rollen-Badge-Kombinationen (`--app-role-pl/-ct/-ar` als Textfarbe auf ihrer jeweiligen
16%-Opazitätsfläche) — den WCAG-AA-Mindestkontrast von 4,5:1 für Fließtext auf den im Produkt
tatsächlich vorkommenden Flächen verfehlen (gemessen 3,03–4,44:1, siehe Story-Datei
`docs/usecases/US-078-lesbare-gedaempfte-textfarben.md` Abschnitt 2). Beide Werte stammen unverändert
aus dem Wireframe (`docs/design/Components.dc.html`/`S2-Projektuebersicht-Wireframe.html`) — der
Kontrast-Fehler ist also ein Fehler der Design-Vorlage selbst, nicht der Umsetzung.

Zusätzlich verschärft die bestehende Wiederverwendung von `--app-map-point-locked-opacity` (US-064)
für archivierte Projektkarten (`.project-card.archived { opacity: var(--app-map-point-locked-opacity)
; }`, eingeführt in US-074) den Fehler: reines CSS-`opacity` auf ein Element faltet Text- UND
Flächenfarbe gemeinsam gegen den dahinterliegenden Seitenhintergrund, wodurch sich ihr Kontrast
zueinander unabhängig vom gewählten Basiswert immer weiter Richtung 1:1 bewegt, je niedriger die
Opazität ist. Selbst `--app-color-text-muted` (`#8D97AC`), das auf voller Deckkraft komfortabel
5,7–6,2:1 erreicht, fällt beim bisherigen Wert `0,72` unter 4,5:1.

## Entscheidung

**Bei einem Konflikt zwischen einem im Wireframe vorgegebenen Farb-/Opazitätswert und dem
WCAG-AA-Mindestkontrast (4,5:1 für Fließtext) gewinnt der Kontrast.** Das Wireframe ist laut
PRD-Vorgabe (siehe Anmerkungen des Product Owners in US-078) die Momentaufnahme des Entwurfs;
`docs/specs/SPEC-00-Design-System.md` ist die verbindliche, gepflegte Quelle der Wahrheit für
Token-Werte und darf davon abweichen, wenn das Wireframe selbst einen Zugänglichkeits-Fehler trägt.
Eine solche Abweichung ist kein „stiller" Bruch mit der Design-Vorlage (CLAUDE.md Abschnitt 6),
sondern wird hier ausdrücklich dokumentiert, damit ein späterer Design-Abgleich sie nicht erneut als
Abweichung meldet.

Konkret in US-078 umgesetzt:

1. **`--app-color-text-faint` entfällt ersatzlos**, alle Verwendungsstellen nutzen
   `--app-color-text-muted`. Ein neuer, eigenständiger Zwischenwert wurde geprüft und verworfen (siehe
   Alternativen) — er hätte keinen wahrnehmbaren Abstand zu `text-muted` mehr gehabt.
2. **`--app-role-pl-badge` (`#A89DF8`)** ersetzt die rohe Datenfarbe `--app-role-pl` ausschließlich in
   der `.role-badge--pl`-Textfarbe. `--app-role-pl` selbst (Map-Punkt, Fortschrittsring, Slider) bleibt
   unverändert — Coreteam/Architect benötigten keine Anpassung, ihre rohe Rollenfarbe erreicht auf der
   Badge-Fläche bereits >4,5:1.
3. **`--app-map-point-locked-opacity`: `0,72` → `0,92`.** Kein an dieser Stelle geprüfter Wert
   unterhalb von `0,92` hält alle betroffenen Text-/Badge-Kombinationen archivierter Projektkarten über
   4,5:1 (bindend ist `text-muted` auf `color.surface-hover` im „ARCHIVIERT"-Status-Tag, siehe
   Berechnung im Story-Test `us-078-lesbare-gedaempfte-textfarben.spec.ts`).

## Alternativen (verworfen)

- **Eigenständiger `text-faint`-Zwischenwert statt Zusammenführung mit `text-muted`:** rechnerisch
  gerade noch möglich (z. B. `#8993B5`, Kontrast 5,55:1 auf `color.surface`), aber nur mit einem
  Kontrast-Abstand von unter 0,3 zu `text-muted` (5,75:1) — die Farben wären auf einem realen Bildschirm
  praktisch nicht mehr unterscheidbar gewesen. Die dreistufige Texthierarchie aus SPEC-00 §1.2 wäre nur
  noch auf dem Papier, nicht mehr optisch, bestanden. Verworfen zugunsten der von der Story explizit
  vorgesehenen Fallback-Option (Zusammenführung).
- **`--app-map-point-locked-opacity` unverändert lassen, stattdessen einen zweiten, höheren
  Opazitätswert nur für `.project-card.archived` einführen:** hätte SPEC-00 §1.2 wieder zwei
  „gedimmt/gesperrt"-Bedeutungen mit unterschiedlichen Zahlen gegeben — exakt das Problem, das US-064
  (Issue #71) ursprünglich beheben sollte (uneinheitliche Opazitäts-Literale). Verworfen zugunsten der
  von US-078 Akzeptanzkriterium 4 explizit vorgegebenen Lösung: den einen bestehenden Token anheben.
- **Nur die Badge-Hintergrundfläche abdunkeln (Deckkraft der `-bg`-Variante senken), Rollenfarbe als
  Text unverändert lassen:** rechnerisch geprüft (siehe Story-Berechnung) — selbst bei einer
  Hintergrundfläche ohne jede Färbung (Alpha 0) bleibt der Kontrast von `--app-role-pl` gegen
  `color.surface` bei rund 5,07:1 auf voller Deckkraft, fällt aber unter der bestehenden
  Archiv-Opazität von `0,72` unmittelbar wieder unter 4,5:1 — dieser Weg allein hätte zusätzlich eine
  nahezu unsichtbare Badge-Fläche erzwungen, ohne das Archiv-Problem zu lösen. Verworfen zugunsten der
  Kombination „aufgehellte Badge-Textfarbe + angehobene Archiv-Opazität".

## Konsequenzen

- `docs/specs/SPEC-00-Design-System.md` §1.2 wurde entsprechend aktualisiert (siehe Story US-078).
- Der bestehende Story-Test aus US-064 (`us-064-map-opacity-token-vereinheitlichen.spec.ts`) prüft ab
  sofort gegen `0,92` statt `0,72` — die eigentliche Akzeptanz aus US-064 (ein einziger benannter Token
  statt verstreuter Zahlen-Literale) bleibt davon unberührt.
- Archivierte Projektkarten wirken durch die auf `0,92` angehobene Opazität optisch nur noch schwach
  gedimmt; die Erkennbarkeit des Archiv-Zustands stützt sich in der Praxis primär auf den
  „ARCHIVIERT"-Status-Tag als Text, nicht mehr auf die Flächendimmung. Sollte ein künftiger
  QA-/UX-Abgleich das als unzureichend erkennbar einstufen, ist die Lösung ein zusätzliches, rein
  visuelles Signal (z. B. Rahmen- oder Icon-Kennzeichnung), keine erneute Absenkung dieses
  Opazitäts-Tokens — jede Absenkung würde denselben Kontrast-Fehler reproduzieren.
- Jede künftige Story, die einen neuen Farb- oder Opazitätswert aus einem Wireframe übernimmt, prüft
  vorab dessen Kontrast auf den tatsächlich vorkommenden Flächen (inkl. etwaiger gedimmter/reduzierter
  Zustände), statt den Wireframe-Wert unbesehen zu übernehmen.
