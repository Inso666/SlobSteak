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
