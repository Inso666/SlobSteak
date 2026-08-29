**ID:** US-032
**Titel:** Map-UI Quadranten-Diagramm mit Perspektiv-Dropdown
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-031, US-019

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **meine Stakeholder als Quadranten-Diagramm (Einfluss × Interesse) sehen, um Prioritäten auf einen Blick zu erkennen**, damit **ich meine Steuerungsgespräche gezielt vorbereiten kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.1
- **Relevant für DDD:** Presentation-Schicht (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [x] X-Achse zeigt „Einfluss“ (0–100), Y-Achse „Interesse“ (0–100); bei 50/50 sind vier Quadranten visuell getrennt und mit „Eng betreuen“, „Zufriedenstellen“, „Informiert halten“, „Beobachten“ beschriftet.
- [x] Ein Dropdown wählt die Perspektive (`PL`/`Coreteam`/`Architect`); Standardauswahl ist die eigene Projekt-Rolle des angemeldeten Nutzers.
- [x] Jeder Punkt repräsentiert einen Stakeholder aus der Map-Query (US-031); Klick auf einen Punkt navigiert zur Stakeholder-Detailseite (US-026).
- [x] Tab „Map“ ist in der Sidebar/Workspace-Navigation für Rolle `User` ausgeblendet (Konsistenz mit US-019/US-030/US-031).
- [x] Komponententest deckt Rendering mit leerer Datenmenge (Leerzustand) und mit ≥1 Punkt ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.ts`
- `frontend/src/app/features/map/quadrant-chart/quadrant-chart.component.ts`
- `frontend/src/app/features/map/map.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Standard-Perspektive entspricht der eigenen Rolle des angemeldeten Nutzers.

---

### 5. Status

**Fertig am 29.08.2026.** Umgesetzt in `feature/US-032-map-ui`, siehe zugehöriger PR.

### 6. So probierst du es aus

1. `docker-compose up` (Gesamtstack) starten.
2. Als Nutzer mit Projekt-Rolle `PL`/`Coreteam`/`Architect` einloggen, Projekt öffnen.
3. Mindestens einen Stakeholder in „Stakeholder-Liste“ anlegen und über den Assessment-Bereich der
   Detailseite (US-029) für die eigene Rolle einen Einfluss-/Interesse-Wert eintragen (alternativ:
   `PUT /api/v1/stakeholders/{id}/assessments/{role}` direkt aufrufen).
4. Tab „Map“ öffnen: Standardmäßig ist „Meine Sicht“ auf die eigene Projekt-Rolle vorausgewählt, der
   bewertete Stakeholder erscheint als farbiger Punkt im passenden Quadranten (Einfluss/Interesse
   je 0–100, vier beschriftete Quadranten bei 50/50).
5. Klick auf den Punkt navigiert zur Stakeholder-Detailseite.
6. Perspektive im Dropdown wechseln (z. B. auf eine Rolle ohne Bewertungen) → Leerzustand
   „Für diese Perspektive liegen noch keine Bewertungen vor.“ mit Link zurück zur Stakeholder-Liste.
7. Als Nutzer mit Rolle `User` einloggen: Tab „Map“ ist in der Workspace-Navigation nicht vorhanden;
   direkter Aufruf von `/projects/{id}/map` leitet auf die „Kein Zugriff“-Seite um.

Story-Tests isoliert ausführen:
```
cd frontend
ng test --include='**/us-032*.spec.ts'
ng test --include='**/features/map/**/*.spec.ts'
```

### 7. Anmerkungen des Agenten

- **Scope-Abgrenzung ggü. `docs/specs/SPEC-04-Stakeholder-Map.md` (CLAUDE.md Abschnitt 6):**
  SPEC-04 beschreibt den vollständigen Endzustand des Map-Tabs inklusive Vergleichsmodus
  (`compareMode`, zweiter Perspektiv-Dropdown, Diamanten, Verbindungslinien, Diff-Panel — F3.2),
  Drag&Drop inkl. Zoom/Pan (F3.3) und einer Legende/`AppPerspectivesRadarComponent`-Einbindung, die
  laut PRD (Abschnitt F3) und `docs/usecases/BACKLOG.md` (Phase 5) ausdrücklich als eigene,
  nachfolgende, noch offene Stories geschnitten sind (US-033 Vergleichsmodus-API, US-034
  Vergleichsmodus-UI, US-035 Drag&Drop-API, US-036 Drag&Drop-UI). Diese Story implementiert
  ausschließlich die eigenständigen Akzeptanzkriterien von US-032 (= PRD F3.1, Basis-Ansicht ohne
  Vergleichsmodus/Drag&Drop/Zoom-Pan/Legende/Diff-Panel) — kein Vorgriff auf die noch offenen
  Folgestories (CLAUDE.md Abschnitt 3 „kein Vorgriff auf spätere Stories“). Die statische, nicht
  ziehbare `QuadrantChartComponent` dieser Story bildet die Grundlage, auf der US-036 später die in
  SPEC-04 beschriebene `app-stakeholder-map-canvas`-Komponente (drag-/zoom-/vergleichsfähig) aufbaut
  bzw. sie ablöst.
- **ARIA-Abweichung von SPEC-04:** SPEC-04 schlägt für die dortige, vollständige Canvas-Komponente
  `role="img"` vor. Da `QuadrantChartComponent` bereits in dieser Basis-Version fokussierbare,
  klickbare `<button>`-Punkte enthält, wird stattdessen `role="group"` mit derselben beschreibenden
  `aria-label` verwendet — `role="img"` würde die Nachkommen für Screenreader/Tastatur unerreichbar
  machen (WCAG 2.1 AA würde verletzt statt erfüllt).
- **Perspektiv-Optionsliste fest statt „serverseitig geladen“:** SPEC-04 §2.1 sieht für den
  Endzustand vor, dass `perspectiveOptions` aus einem Katalog-Endpoint geladen wird. Ein solcher
  Endpoint existiert weder im PRD noch im Backlog; US-032s eigene Akzeptanzkriterien benennen exakt
  die drei Werte `PL`/`Coreteam`/`Architect`, identisch zum Wertebereich des zugrunde liegenden
  `GET .../map`-Endpoints (US-031). Feste Aufzählung ist daher die PRD-konformste, am wenigsten
  überraschende Umsetzung für den aktuellen Story-Umfang.
- **Loading-Skeleton:** Der geteilte `ViewStateComponent`-Baustein (US-050) ist auf listenzeilen-
  große Platzhalter fest verdrahtet und dafür nicht konfigurierbar. Für den quadratischen
  Map-Canvas wird stattdessen der in SPEC-04 §1 wörtlich vorgegebene
  `<p-skeleton height="640px">`-Platzhalter verwendet (eigener `MapViewState`-Union-Typ nach
  demselben SPEC-00-§3-Muster). Denselben Wert (`max-width: 40rem` = 640px) trägt auch der
  geladene Plot-Bereich, damit Skeleton und Inhalt dieselbe Größe haben (SPEC-00 §3 „Ersetzt
  Inhalte 1:1 in Form/Größe“) — ohne diese Obergrenze würde `width:100%` kombiniert mit
  `aspect-ratio:1/1` auf breiten Bildschirmen einen unverhältnismäßig hohen Canvas erzeugen (beim
  manuellen Smoke-Test dieser Story real beobachtet und korrigiert).
- **Route weiterhin eager im übrigen `app.routes.ts`, aber lazy für `map`:** Die Map-Route nutzt
  `loadComponent` (frontend.md Abschnitt 3), während die übrigen Routen der Datei weiterhin eager
  `component`-Referenzen verwenden (bereits bestehende, von dieser Story nicht geänderte Praxis) —
  keine Vermischung, nur die neue Route folgt der in `frontend.md` verbindlich vorgegebenen
  Konvention.
- **Explorativer Fund, nicht Teil dieser Story behoben:** Beim manuellen Smoke-Test gegen den
  laufenden Docker-Stack rendert `StakeholderDetailComponent` (US-026) nach Navigation dauerhaft
  leer (Ziel des Klicks auf einen Map-Punkt, Akzeptanzkriterium 3) — die zugrunde liegende
  Navigation selbst funktioniert nachweislich korrekt (URL/Route wechseln exakt wie erwartet,
  `GET /api/v1/stakeholders/{id}` liefert `200`), nur das Rendern der Zielkomponente bleibt aus.
  Ursache: fehlendes `ChangeDetectorRef.markForCheck()` in `StakeholderDetailComponent`s
  `subscribe()`-Callbacks (dieselbe zoneless-Root-Cause wie US-050/051/052/057/058, dort aber nicht
  erfasst). Nicht Bestandteil des StakeholderMap-Kontexts dieser Story — als
  [GitHub-Issue #61](https://github.com/Inso666/SlobSteak/issues/61) dokumentiert statt hier
  mitbehoben (CLAUDE.md Abschnitt 3 „kein Vermischen mehrerer Stories“).
