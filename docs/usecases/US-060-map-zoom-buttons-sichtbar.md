**ID:** US-060
**Titel:** Zoom-Cluster-Buttons auf der Map sichtbar und auffindbar machen
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-036

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle** möchte ich die Zoom-Cluster-Buttons auf der Stakeholder Map sehen und erkennen können, damit ich dicht beieinanderliegende Punkte per Zoom auseinanderziehen kann, ohne vorher wissen zu müssen, dass an dieser Stelle überhaupt Buttons existieren.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #67](https://github.com/Inso666/SlobSteak/issues/67), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §1.
- **Ist-Zustand (aus Issue #67):** Die drei Zoom-Cluster-Buttons (`aria-label="Vergrößern"`, `"Verkleinern"`, `"Ansicht zurücksetzen"`) existieren im DOM, sind fokussierbar und funktional klickbar, rendern aber ohne sichtbares PrimeNG-Icon und nur 22×14px groß — für Maus-Nutzer:innen faktisch unsichtbar/nicht auffindbar.
- **PO-Anmerkung zum Code-Stand:** `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.html` (Zeilen 96–99) verwendet `pButton [text]="true" [rounded]="false" icon="pi pi-plus" …` — dieselbe `pButton`+`icon`-Kombination wird auch in `users-admin.component.html`, `projects-admin.component.html` und `project-membership-manager.component.html` verwendet (dort ohne gemeldetes Rendering-Problem). Die Ursache liegt damit vermutlich nicht in der `pButton`-Direktive selbst, sondern in einer spezifischen CSS-Regel für `.zoom-cluster` bzw. der Kombination `[text]="true" [rounded]="false"` ohne Label-Text (reine Icon-Buttons) — im gesichteten CSS (`quadrant-chart.component.css`) ist für `.zoom-cluster button` keine explizite Größenregel vorhanden, die konkrete Ursache der 22×14px-Größe und des fehlenden Icon-Kindelements ist damit noch offen und vom Dev-Agenten zu ermitteln.
- **Relevant für DDD:** Reine Presentation-/CSS-Schicht, keine fachliche Logik betroffen.

### 3. Akzeptanzkriterien

- [ ] Die drei Zoom-Cluster-Buttons sind visuell wahrnehmbar: sichtbares Icon-Glyph (`pi-plus`/`pi-minus`/`pi-refresh`), Button-Größe vergleichbar mit anderen PrimeNG-Icon-Buttons im Produkt (SPEC-00 §1.3), nicht 22×14px.
- [ ] Funktionalität (Zoom-In/-Out/Reset) bleibt unverändert erhalten — reiner visueller Fix, keine Verhaltensänderung.
- [ ] Automatisierter Test (Angular `TestBed`) belegt, dass jeder der drei Buttons ein Icon-Kindelement (`.pi.pi-plus`/`.pi.pi-minus`/`.pi.pi-refresh` bzw. äquivalent) im DOM besitzt.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: Zoom-Cluster ist ohne DevTools-Zoom mit bloßem Auge in der oberen rechten Ecke der Zeichenfläche erkennbar (Screenshot-Nachweis im PR).
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `QuadrantChartComponent` (inkl. `us-036-*.spec.ts`) bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu prüfende Dateien:**
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.html` (Zeilen 96–99, Zoom-Cluster-Markup)
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.css` (`.zoom-cluster`-Regel und global vererbte Button-Styles, die die Größe unbeabsichtigt einschränken könnten)
- Vergleich mit funktionierenden `pButton icon="…"`-Beispielen (`users-admin.component.html`, `projects-admin.component.html`, `project-membership-manager.component.html`) zur Eingrenzung, was an dieser Stelle abweicht (z. B. fehlender `label`-Text, `[text]`/`[rounded]`-Kombination, PrimeNG-v22-spezifisches Verhalten bei reinen Icon-Buttons).

**Wichtige Invarianten:**
- Kein neues, frei erfundenes Größen-/Farb-Token — Anpassung nutzt bestehende SPEC-00-Tokens bzw. die bereits an anderer Stelle funktionierende `pButton`-Konfiguration.

### Anmerkungen des Product Owners

Diese Story deckt ausschließlich Issue #67 ab (Sichtbarkeit). Das verwandte, aber technisch unabhängige Zoom-Skalierungsproblem (Punkt-Marker wachsen unverhältnismäßig mit) ist als eigene Folge-Story [US-061](US-061-map-zoom-skalierung.md) angelegt (Issue #68) — nicht dieselbe Ursache, daher keine Zusammenlegung.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

**Status:** fertig am 30.08.2026, Branch `feature/US-060-map-zoom-buttons-sichtbar`, PR siehe Repository.

**Root Cause (abweichend von der PO-Hypothese im Abschnitt „Fachlicher & Technischer Kontext"):**
Die Ursache lag entgegen der ursprünglichen Vermutung **nicht** in `quadrant-chart.component.css`
(`.zoom-cluster` enthielt gar keine button-spezifische Größenregel), sondern im Template-Markup:
`quadrant-chart.component.ts` importiert für die Zoom-Buttons ausschließlich `ButtonDirective`
(die `[pButton]`-Attribut-Direktive). In PrimeNG v22 besitzt genau diese Attribut-Direktive
**keinen `icon`-Input** — nur die separate `<p-button>`-Komponente kennt `icon` als Input
(bestätigt durch Prüfung von `node_modules/primeng/fesm2022/primeng-button.mjs`: die
`inputs`-Liste der `ButtonDirective` enthält `pButton, text, plain, raised, size, outlined, link,
rounded, fluid, variant, iconOnly, loading, severity` — kein `icon`). Das `icon="pi pi-plus"`-
Attribut im ursprünglichen Markup wurde daher von Angular nie als Component-Input, sondern
bestenfalls als wirkungsloses HTML-Attribut auf dem `<button>`-Element interpretiert; es entstand
nie ein Icon-Kindelement.

Bei den drei betroffenen Buttons blieb dadurch der komplette Button-Inhalt leer (kein Icon, kein
Label-Text) — ein leeres `<button>` kollabiert mit dem PrimeNG-Preset auf die gemeldeten 22×14px.
Der Vergleich mit `users-admin.component.html`/`projects-admin.component.html`/
`project-membership-manager.component.html` aus der PO-Anmerkung zeigt denselben zugrunde
liegenden Effekt (das `icon`-Attribut wirkt dort ebenfalls nicht), fiel dort aber nie auf, weil
diese Buttons zusätzlich einen sichtbaren Text-Label-Inhalt haben (z. B. „Nutzer anlegen") und
dadurch trotz fehlendem Icon eine normale, gut sichtbare Button-Größe behalten — die PO-Aussage
„dieselbe Kombination funktioniert dort ohne gemeldetes Problem" bezieht sich also auf die
*Größe*, nicht auf ein tatsächlich sichtbares Icon dort.

**Umfang der Abweichung/Beobachtung (Eskalation nach CLAUDE.md Abschnitt 6):** Das oben beschriebene
fehlende Icon betrifft potenziell **alle** `pButton icon="…"`-Vorkommen im Frontend (siehe die
genannten Admin-Screens), nicht nur die drei Zoom-Buttons — dort ist es nur unauffällig, weil ein
Label-Text vorhanden ist. Diese Story behebt ausschließlich die drei in Issue #67 gemeldeten
Zoom-Cluster-Buttons (PO-Anmerkung: „Diese Story deckt ausschließlich Issue #67 ab"); die
systemweite Bereinigung aller `pButton icon="…"`-Stellen auf das korrekte `pButtonIcon`-
Content-Child-Muster ist bewusst **nicht** Teil dieser Story und wird hiermit als Beobachtung
dokumentiert statt still mitgefixt (keine Erweiterung des Story-Scopes) — Empfehlung: eigenes
Ticket für einen projektweiten Icon-Rendering-Audit aller `pButton`-Stellen.

**Fix:** `quadrant-chart.component.ts` importiert zusätzlich `ButtonIcon` (`[pButtonIcon]`,
Content-Child-Direktive aus `primeng/button`); `quadrant-chart.component.html` ersetzt das
wirkungslose `icon="…"`-Attribut je Button durch ein Kind-Element
`<i class="pi pi-plus" pButtonIcon aria-hidden="true"></i>` (analog für `pi-minus`/`pi-refresh`).
Damit erkennt `ButtonDirective` intern über `contentChild(ButtonIcon)` ein vorhandenes Icon und
setzt automatisch die PrimeNG-Klasse `p-button-icon-only` (kein neu erfundenes CSS-Token — reine,
bereits im PrimeNG-Preset vorhandene Standardgrößen-Referenz, SPEC-00 §1.3). `[text]="true"
[rounded]="false"` sowie sämtliche Klick-Handler (`zoomIn()`/`zoomOut()`/`resetView()`) bleiben
unverändert — reiner visueller Fix ohne Verhaltensänderung.

**Tests:**
- Story-Test: `frontend/src/app/features/map/us-060-map-zoom-buttons-sichtbar.spec.ts` (Akzeptanz-
  kriterium 1+3: Icon-Kindelement je Button; Akzeptanzkriterium 2: Klick löst weiterhin die
  jeweilige Zoom-Methode aus). Einzeln ausführen:
  `ng test --include='**/us-060-map-zoom-buttons-sichtbar.spec.ts'` (im `frontend/`-Verzeichnis).
- Vollständiger `ng test`-Lauf: 399/399 grün (inkl. `quadrant-chart.component.spec.ts` und
  `us-036-map-dragdrop-ui.spec.ts`, beide unverändert grün — keine Regression).
- `ng lint`: fehlerfrei.

**Manueller Smoke-Test (Akzeptanzkriterium 4):** gegen eine eigene, isolierte
`docker-compose up`-Instanz (Ports 4201/5001/5433, um den bereits 14h laufenden
Haupt-Compose-Stack auf 4200/5000/5432 nicht zu stören) durchgeführt: Login als Seed-Admin,
Projekt + Stakeholder + Assessment angelegt, Stakeholder Map geöffnet — die drei Zoom-Cluster-
Buttons (oben rechts in der Zeichenfläche) sind mit bloßem Auge klar erkennbaren `+`/`−`/
Reset-Icons und normaler PrimeNG-Icon-Button-Größe sichtbar; Klick auf `+`/`−` verändert den
Zoom-Level sichtbar, „Ansicht zurücksetzen" setzt ihn zurück. Screenshot im PR verlinkt.
