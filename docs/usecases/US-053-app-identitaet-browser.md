**ID:** US-053
**Titel:** App-Identität im Browser (Tab-Titel, Favicon, Marken-Icon)
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-001, US-047

**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich SlobSteak an seinem eigenen Namen und Icon im Browser-Tab erkennen, statt am generischen Angular-CLI-Gerüst, mit dem das Projekt einmal begonnen hat.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“, drei Einzelbefunde, zusammengefasst zu einer Story, da alle drei denselben, nie nachgezogenen Scaffold-Zustand betreffen:
  1. „Das Icon für die App fehlt.“
  2. „Der Tabname ist nicht vergeben, sondern immer noch ‚Frontend‘.“
  3. „Das Navicon ist noch das Standard-Icon für Angular.“
- **Verifikation durch PO (Code-Review):**
  - `frontend/src/index.html` Zeile 4: `<title>Frontend</title>` — bestätigt unverändert seit dem Angular-CLI-Scaffold, nie auf „SlobSteak“ (o. ä.) angepasst.
  - `frontend/public/favicon.ico`: laut `git log --follow` seit dem allerersten Commit (`85455da feat(US-001): Projekt-Grundgerüst & Architektur-Setup`) kein einziges Mal verändert — es handelt sich nachweislich um das von `ng new` generierte Standard-Angular-Favicon, referenziert von `index.html` als Browser-Tab-Icon.
  - Login-Seite (`login-page.component.html`) enthält aktuell **keinerlei** Marken-/Logo-Element — `docs/specs/SPEC-01-Login.md` §1.2 sieht dafür explizit einen „Markenblock“ mit dekorativem SVG-Logo neben dem Schriftzug „SlobSteak“ vor (`<svg aria-hidden="true" …></svg> <!-- dekoratives Logo, aus Wireframe übernommen -->`), der schlicht nicht umgesetzt wurde. Das erklärt den Befund „Icon für die App fehlt“ zusätzlich zum Favicon-Punkt — hier fehlt das Icon nicht nur im Browser-Tab, sondern auch im Produkt selbst.
- **Abgrenzung zu US-054:** Diese Story behebt ausschließlich die drei oben genannten, eng zusammenhängenden Identitäts-Lücken (Titel, Favicon, Marken-Icon als Asset). Die vollständige strukturelle/visuelle Angleichung der Login-Seite an SPEC-01 (Tagline, Footnote-Text, Bootstrapping-Zustand) ist Gegenstand von US-054 — dort wird das in dieser Story bereitgestellte Marken-Icon eingebaut.

### 3. Akzeptanzkriterien

- [ ] `frontend/src/index.html` trägt einen aussagekräftigen `<title>` („SlobSteak“ bzw. eine vom Projektverantwortlichen bestätigte Variante, z. B. „SlobSteak – Stakeholder-Management“).
- [ ] `frontend/public/favicon.ico` (sowie ggf. zusätzliche moderne Icon-Formate, falls im Rahmen dieser Story ergänzt, z. B. SVG-Favicon) zeigt ein SlobSteak-eigenes Icon, nicht mehr das Angular-CLI-Standardicon.
- [ ] Ein Marken-Icon (SVG, dekorativ, `aria-hidden="true"`) steht als wiederverwendbares Asset zur Verfügung und wird mindestens auf der Login-Seite eingesetzt (Umsetzung im Markup selbst erfolgt in US-054, sofern das Icon rechtzeitig vorliegt — andernfalls liefert diese Story das Icon als eigenständiges Zwischenergebnis für die Folge-Story).
- [ ] Design des Icons ist mit den in SPEC-00 definierten Farb-Tokens konsistent (z. B. `color.text`/`color.attention`, keine neu erfundene Farbe).
- [ ] Kein bestehender Test wird gebrochen; `ng test`/`ng lint`/`ng build` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/index.html` (`<title>`, `<link rel="icon">`)
- `frontend/public/favicon.ico` (und optional `frontend/public/icon.svg` o. ä.)
- ggf. ein neues, wiederverwendbares SVG-Asset/Komponente für das Marken-Icon (Ablage z. B. `frontend/src/app/shared/` oder `frontend/public/`), damit US-054 es direkt referenzieren kann.

**Wichtige Invarianten:**
- Rein statische Assets/Metadaten — keine Logik-Änderung.
- Icon-Gestaltung ist eine gestalterische Entscheidung ohne PRD-Vorgabe im Detail — bei Unklarheit gilt CLAUDE.md Abschnitt 6 (PRD-konformste, am wenigsten überraschende Interpretation wählen und begründen, z. B. Ableitung aus dem Produktnamen „SlobSteak“ und den SPEC-00-Tokens).

### Anmerkungen des Product Owners

Bewusst als eigenständige, kleine Story vor US-054 geschnitten, damit das Marken-Icon als Asset unabhängig von der größeren strukturellen Login-Migration bereitsteht und nicht zwei Stories dasselbe Icon parallel neu erfinden.
