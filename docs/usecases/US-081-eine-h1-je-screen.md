**ID:** US-081
**Titel:** Genau eine Hauptüberschrift je Screen (Projektname statt zusätzlicher Bereichsüberschrift)
**Bounded Context / Domain:** Frontend-Shell / ProjectManagement (Presentation-Schicht)
**Abhängigkeiten:** US-075, US-080
**Status:** fertig am 2026-09-13 (Branch `feature/US-081-eine-h1-je-screen`, PR folgt)

---

### 1. User Story

Als **Nutzer mit Screenreader** möchte ich auf jedem Screen genau einen Seitentitel vorfinden, damit die Dokumentstruktur eindeutig ist und ich nicht zwei gleichrangige Überschriften ohne Hierarchie vorgelesen bekomme.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #125](https://github.com/Inso666/SlobSteak/issues/125), QA-Design-Abgleich vom 04.09.2026.
- **Ist-Zustand:** Jede Projekt-Unterseite rendert zwei `<h1>`:

```
/projects/<id>/stakeholders   H1: "ERP-Einführung Rewe"   H1: "Stakeholder"
/projects/<id>/map            H1: "ERP-Einführung Rewe"   H1: "Map"
/projects/<id>/distribution   H1: "ERP-Einführung Rewe"   H1: "Verteiler"
```

- **Design-Vorgabe:** `docs/design/StakeholderList.dc.html`, `Map.dc.html`, `Verteiler.dc.html` und `Detail.dc.html` zeigen je Screen genau eine Überschrift — den Projektnamen (`.page-title`, 24px) plus Rollen-Badge. Welcher Bereich aktiv ist, sagt ausschließlich der markierte Unterpunkt in der Sidebar (die Navigation aus US-075).
- **Nebenwirkung im Ist-Zustand:** Zwischen Projekttitel und Inhalt entsteht ein rund 50px breiter Leerraum, den das Design nicht vorsieht; der Bereichsname wiederholt redundant, was die Sidebar bereits markiert.
- **Ergänzend:** Die App-`h1` rendert mit 28px; `docs/design` gibt für den Projekt-Screen-Titel 24px vor und `--app-font-size-display` steht auf 26px (1,625rem). Die Größenangleichung gehört in dieselbe Änderung.

### 3. Akzeptanzkriterien

- [x] Auf jedem Screen existiert genau ein `<h1>`. Auf Projekt-Unterseiten ist das der Projektname.
- [x] Die bisherigen Bereichsüberschriften „Stakeholder", „Map", „Verteiler" entfallen als `<h1>`. Bleibt ein sichtbares Bereichslabel gewünscht, wird es als `<h2>` oder als nicht-überschriftliches Element umgesetzt und erhält den im Design vorgesehenen Abstand.
- [x] Der Leerraum zwischen Projekttitel und erstem Inhaltselement entspricht dem Design (`.main{gap:20px}` in `Verteiler.dc.html`).
- [x] Die Schriftgröße des Seitentitels folgt `--app-font-size-display`; abweichende lokale Werte werden entfernt.
- [x] Die Zugänglichkeit bleibt erhalten: Für Screens, deren `<h1>` nur den Projektnamen trägt, benennt ein `aria-label` oder eine visuell versteckte Ergänzung weiterhin den aktiven Bereich, damit die Seite ohne Sidebar-Kontext identifizierbar bleibt.
- [x] Automatisierter Test (Angular `TestBed`) belegt je Route: genau ein `<h1>`, Inhalt = Projektname.
- [x] Manueller Smoke-Test gegen `docker compose up` über alle drei Projekt-Unterseiten und die Stakeholder-Detailseite — Screenshot-Nachweis im PR.
- [x] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [x] Bestehende Tests bleiben grün (insbesondere US-019, US-025, US-042, US-063, US-075).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/workspace/**` (Projekt-Workspace-Layout mit dem Projekttitel)
- `frontend/src/app/features/stakeholders/**`, `frontend/src/app/features/map/**`, `frontend/src/app/features/distribution/**` (jeweils die zweite `<h1>`)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- Kein Verlust an Orientierung: Wenn der Bereichsname aus dem sichtbaren Bereich verschwindet, muss die Sidebar-Markierung eindeutig sein (US-075) — sonst bleibt ein `<h2>` stehen.
- Keine Backend-Änderung, keine Migration.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **`docs/design/StakeholderList.dc.html`/`Map.dc.html`/`Verteiler.dc.html`/`Detail.dc.html` nicht im Repository vorhanden** (CLAUDE.md Abschnitt 6): `docs/design/` enthält aktuell ausschließlich `S2-Projektuebersicht-Wireframe.html`. Die vier in Abschnitt 2/4 referenzierten `.dc.html`-Artboards existierten offenbar nur in der Design-Canvas-Sitzung des vorangegangenen QA-Design-Abgleichs (Issue #125) und wurden nicht committet. Umsetzung basiert daher auf der wörtlichen Beschreibung in dieser Story-Datei („genau eine Überschrift — den Projektnamen … plus Rollen-Badge") sowie auf `docs/specs/SPEC-00-Design-System.md` (Token `--app-font-size-display`, `space.lg` = 20px) — der PRD-konformsten, am wenigsten überraschenden Interpretation der Story-Vorgabe.
- **Dokumentierte Abweichung von `docs/specs/SPEC-06-Stakeholder-Detail.md` §1.1** (CLAUDE.md Abschnitt 6): SPEC-06 zeigt im Component-Tree noch `<h1 class="detail-title">{{ stakeholder.name }}</h1>` als eigene Überschrift der Stakeholder-Detailseite — verfasst, bevor dieser Screen ebenfalls unter das „Design zeigt genau eine Überschrift"-Prinzip fiel (die Story nennt `Detail.dc.html` explizit als eines der vier betroffenen Artboards, siehe oben). Da `ProjectWorkspaceLayoutComponent`s `<h1>` (Projektname) auch auf der Detailseite rendert, hätte ein unverändertes SPEC-06-`<h1>` denselben Zwei-`<h1>`-Fehler reproduziert, den diese Story genau beheben soll (Akzeptanzkriterium 1 gilt uneingeschränkt für „jeden Screen"). Der Stakeholder-Name in `stakeholder-detail.component.html` ist daher jetzt ein `<h2>` (visuell unverändert, weiterhin `--app-font-size-display`) statt eines zweiten `<h1>` — analog zum bereits etablierten Muster „ein `<h1>` je Screen, weitere Seitenabschnitte als `<h2>`" dieser Story.
- **Bereichsname weiterhin vorhanden, aber nicht mehr sichtbar:** Statt die entfallenen Bereichsüberschriften „Stakeholder"/„Map"/„Verteiler" ersatzlos zu streichen, tragen die drei betroffenen `<section>`-Wurzelelemente sie jetzt als `.sr-only`-Element weiter (identisches Wording wie die Sidebar-Unterpunkte, `APP_NAV_PROJECT_SUB_ITEM_LABELS` aus US-075) — das erhält die bestehende `aria-labelledby`-Landmarkenbenennung dieser Bereiche, ohne sichtbaren Platz zu beanspruchen (Akzeptanzkriterium 2, Variante „nicht-überschriftliches Element").
- **`aria-label` statt Route-`data`-Eigenschaft:** Der aktive Bereich für das `aria-label` des verbleibenden `<h1>` (Akzeptanzkriterium 5) wird in `ProjectWorkspaceLayoutComponent` aus der Router-URL abgeleitet (`computeAreaLabel()`, analog zu `AppNavigationComponent.computeIsProjectRoute`), nicht über eine neue `data`-Eigenschaft in `app.routes.ts` — vermeidet einen zweiten Ort für dieselbe Information.
- **Manueller Smoke-Test ohne Docker:** Docker-Daemon in dieser Agenten-Umgebung nicht erreichbar (`//./pipe/dockerDesktopLinuxEngine` nicht gefunden — dieselbe Einschränkung wie bereits bei US-077 bis US-080 dokumentiert). Da alle vier betroffenen Routen (`/projects/:id/...`) einen `roleGuard`/`authGuard` mit echtem HTTP-Aufruf besitzen und ohne Backend sofort auf `/login` bzw. `access-denied` umleiten, wurde zusätzlich zur echten App-Shell (`ng serve`) ein temporärer, nicht committeter `HttpInterceptor` eingerichtet, der genau die für diese vier Screens nötigen Endpunkte (`GET /api/v1/projects/:id`, `.../stakeholders`, `.../stakeholders/:id`, `.../map`, `.../distribution-list`, `.../assessments`, `.../communications`, `/api/v1/communication-types`) mit statischen Testdaten beantwortet, plus ein manuell per `localStorage` gesetztes Fake-Session-Token — dieselbe Vorgehensweise wie bei US-079/US-080 („temporäre, nicht committete Vorschau"). Per `getComputedStyle` im echten Chrome bestätigt: `<h1>`-Schriftgröße `26px` (`--app-font-size-display`), `.workspace-header{margin-bottom}` `20px` (`--app-space-lg`), `.stakeholder-list{padding-top}` `0px` (kein zusätzlicher lokaler Abstand mehr), genau ein `<h1>` je Screen mit `aria-label` „ERP-Einführung Rewe – Stakeholder-Liste"/„… – Map"/„… – Verteiler". Screenshots aller drei Projekt-Unterseiten sowie der Stakeholder-Detailseite im PR. Interceptor-Datei und Registrierung in `app.config.ts` wurden vor Story-Abschluss vollständig wieder entfernt (`git status` bestätigt keine verbleibenden Änderungen an `app.config.ts`).
