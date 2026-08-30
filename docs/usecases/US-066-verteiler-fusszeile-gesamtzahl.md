**ID:** US-066
**Titel:** Verteiler-Fußzeile zeigt unfilterte Gesamtzahl der Projekt-Stakeholder
**Bounded Context / Domain:** DistributionList (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-042

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich in der Fußzeile des Verteiler-Tabs sehen, wie viele Stakeholder dem aktuellen Filter entsprechen **im Verhältnis zur Gesamtzahl aller Stakeholder im Projekt**, damit ich sofort einschätzen kann, wie stark mein Filter die Liste eingrenzt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #82](https://github.com/Inso666/SlobSteak/issues/82), Design-Abgleich gegen `docs/design/S2-Projektuebersicht-Wireframe.html`, Artboard `Verteiler.dc.html`.
- **Ist-Zustand (Code, `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` Zeilen 126–133):** Die Fußzeile zeigt „N Einträge in der Verteilerliste · M mit E-Mail-Adresse (K ohne E-Mail-Adresse)“. `N` ist dabei `rows.length` — die Anzahl der **Zeilen** (Stakeholder × Kommunikationszuordnung), nicht die Anzahl unterschiedlicher Stakeholder. Die unfilterte Gesamtzahl der Projekt-Stakeholder fehlt vollständig.
- **Soll-Zustand (Issue #82 / `Verteiler.dc.html`):** „**18 von 32** Stakeholdern entsprechen dem Filter · 17 mit E-Mail-Adresse (1 ausgeschlossen)“ — enthält die unfilterte Gesamtzahl **M** (aller aktiven Stakeholder im Projekt) als Bezugsgröße zur gefilterten Anzahl **N**, und beide Zahlen zählen **Stakeholder**, nicht Tabellenzeilen.
- **PO-Entscheidung zur bereits in US-042 dokumentierten Abweichung:** US-042 „Anmerkungen des Agenten“ Punkt 5 begründet das Weglassen der Gesamtzahl damit, dass weder die Akzeptanzkriterien noch SPEC-05 (als „illustrative Beispielansicht“ markiert) eine konkrete Vorgabe machen und ein zusätzlicher unfilterter Baseline-Request nicht gerechtfertigt sei. `docs/design/Verteiler.dc.html` (verbindliche Design-Quelle, Commit `de23df9` vom 2026-08-23, damit vor Story-Abschluss vorhanden) enthält jedoch eine konkrete, wörtliche Formatvorgabe inkl. Beispielwerten. Diese Story übernimmt die Design-Vorgabe als bindend. Ein zusätzlicher Backend-Request ist dafür **nicht** nötig: `DistributionListPageComponent` lädt für die Organisations-Anreicherung (US-042 Anmerkung 1) bereits `GET /api/v1/projects/{projectId}/stakeholders` — die Länge dieser bereits vorhandenen Antwort liefert die unfilterte Gesamtzahl **M** direkt, ohne zusätzlichen Request.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an `DistributionListQuery`/API-Contract (US-041) nötig.

### 3. Akzeptanzkriterien

- [ ] Die Fußzeile zeigt die Anzahl **unterschiedlicher Stakeholder**, die dem aktuellen Filter entsprechen (nicht die Anzahl der Tabellenzeilen — ein Stakeholder mit mehreren zum Filter passenden Kommunikationszuordnungen zählt einfach), im Format „**N von M** Stakeholdern entsprechen dem Filter“.
- [ ] **M** ist die unfilterte Gesamtzahl aller aktiven Stakeholder des Projekts (ermittelt aus der bereits geladenen Stakeholderliste, kein zusätzlicher Request).
- [ ] Der bestehende Zusatz „… mit E-Mail-Adresse (K ausgeschlossen)“ bleibt inhaltlich erhalten, bezogen auf die gefilterten Zeilen (unverändertes Verhalten aus US-042).
- [ ] Ohne aktiven Filter gilt N = M (Fußzeile zeigt dann „M von M Stakeholdern entsprechen dem Filter“).
- [ ] Leerzustand (kein Treffer, US-042 Akzeptanzkriterium 5) bleibt unverändert; die Fußzeile wird in diesem Zustand nicht angezeigt (wie bisher, `@else`-Zweig).
- [ ] Automatisierter Test (Angular `TestBed` + `HttpTestingController`) belegt: korrekte N/M-Berechnung bei mehreren Zuordnungen desselben Stakeholders, korrekte M-Ermittlung ohne zusätzlichen HTTP-Request über die bestehende Stakeholderliste, korrektes Format bei aktivem und inaktivem Filter.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `DistributionListPageComponent` (inkl. `us-042-verteilerlisten-ui.spec.ts`) bleiben grün bzw. werden an die neue Fußzeilen-Formel angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.html` (Zeilen 126–133, `.dl-foot-info`)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.ts` (neues abgeleitetes Feld/Signal für „Anzahl unterschiedlicher Stakeholder im Filterergebnis“ sowie „unfilterte Gesamtzahl“, letztere aus der bereits für die Organisations-Anreicherung geladenen Stakeholderliste, US-042 Anmerkung 1)
- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.spec.ts`, `frontend/src/app/features/distribution/us-042-verteilerlisten-ui.spec.ts`

**Wichtige Invarianten:**
- Kein zusätzlicher HTTP-Request nur für die Gesamtzahl — Wiederverwendung der bereits vorhandenen `GET /api/v1/projects/{projectId}/stakeholders`-Antwort.
- „N“ und „M“ zählen Stakeholder, nicht Zeilen — Deduplizierung über `stakeholderId`.

### Anmerkungen des Product Owners

Diese Story korrigiert bewusst die in US-042 „Anmerkungen des Agenten“ Punkt 5 dokumentierte Abweichung, nachdem `docs/design/Verteiler.dc.html` als zum Story-Zeitpunkt bereits existierende, aber nicht konsultierte verbindliche Design-Quelle identifiziert wurde. Diese Story ist bewusst als erste von drei sequenziell verketteten Verteiler-Design-Korrekturen ([US-067](US-067-verteiler-kommunikationsart-chip.md), [US-068](US-068-verteiler-mail-cell-attention-farbe.md)) angelegt, da alle drei dieselben Dateien (`distribution-list-page.component.html/.css/.ts`) ändern — sequenzielle Bearbeitung vermeidet parallele Änderungen an denselben Stellen.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
