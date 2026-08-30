**ID:** US-059
**Titel:** StakeholderDetailComponent zuverlässig rendern (Assessment-Bereich, Stammdaten) statt leerem Inhaltsbereich
**Bounded Context / Domain:** StakeholderManagement / StakeholderAssessment (Frontend-Shell, Presentation-Schicht)
**Abhängigkeiten:** US-026, US-029, US-030

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle (PL, Coreteam, Architect)** möchte ich, dass die Stakeholder-Detailseite nach dem Öffnen zuverlässig ihre Stammdaten **und** den Assessment-Bereich anzeigt, damit ich Stakeholder bewerten kann, statt vor einem dauerhaft leeren Inhaltsbereich zu stehen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #61](https://github.com/Inso666/SlobSteak/issues/61) („StakeholderDetailComponent rendert leer bei Direktnavigation (fehlendes markForCheck, zoneless)“), zusätzlich unabhängig vom Projektverantwortlichen als Endnutzer-Bug gemeldet und in Issue #61 als Kommentar verlinkt: „Ich kann zwar Stakeholder anlegen, allerdings kein Assessment durchführen. Es gibt weder eine separate Oberfläche dafür, noch Eingabefelder in der Stakeholder Verwaltung. Somit ist auch die Map aktuell nutzlos.“
- **Verifikation durch PO (Code-Review):** Das Assessment-Feature selbst ist vollständig umgesetzt (US-027–US-030, alle „fertig“) — `AssessmentTabsComponent` ist in `stakeholder-detail.component.html` korrekt eingebunden. Der gemeldete „fehlende Assessment-Bereich“ ist damit **kein fehlendes Feature**, sondern eine Folge des in Issue #61 dokumentierten Rendering-Bugs: `stakeholder-detail.component.ts` injiziert keinen `ChangeDetectorRef` und ruft in keinem seiner `subscribe()`-Callbacks (`load()`, sowie `ngOnInit`s `projectsService.getProject(...)`-Aufruf, der `currentUserRole` und damit `canViewAssessments`/`canEdit`/`canDelete` setzt) `markForCheck()` auf. Das Frontend läuft zoneless (kein `zone.js`) — dieselbe, bereits mehrfach in diesem Projekt behobene Root Cause (US-050, US-051, US-052, US-057, US-058). `StakeholderDetailComponent` wurde von der „systematischen“ US-058-Bereinigung nicht erfasst.
- **Auswirkung größer als ursprünglich in Issue #61 beschrieben:** Da ohne sichtbaren Assessment-Bereich keine Einfluss-/Interesse-Bewertungen erfasst werden können, bleibt die bereits fertiggestellte Stakeholder Map (US-031–US-036) mangels Daten faktisch leer/nutzlos. Der Fix dieser Story ist damit Voraussetzung dafür, dass zwei bereits „fertig“ gemeldete Feature-Bereiche (Assessment **und** Map) in der Praxis nutzbar werden.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an Application-Services, Endpunkten oder Validierungsregeln.

### 3. Akzeptanzkriterien

- [ ] Nach Navigation zu `/projects/{projectId}/stakeholders/{stakeholderId}` (per Klick auf einen Stakeholder-Namen in der Liste, per Klick auf einen Map-Punkt, oder per Direktaufruf der URL) zeigt der Inhaltsbereich zuverlässig Name, Typ, Organisation und alle Stammdatenfelder — ohne dass eine unabhängige, zusätzliche Interaktion nötig ist.
- [ ] Für Rollen `PL`/`Coreteam`/`Architect` erscheint der Assessment-Bereich (Überschrift + `AssessmentTabsComponent`) zuverlässig unter denselben Bedingungen.
- [ ] Für Rolle `User` bleibt der Assessment-Bereich weiterhin vollständig aus dem DOM entfernt (US-030 Akzeptanzkriterium 3) — diese Story ändert an der Sichtbarkeitsregel selbst nichts, nur an der Zuverlässigkeit des Renderings.
- [ ] Ein nicht existierender oder soft-gelöschter Stakeholder zeigt zuverlässig die „Nicht gefunden“-Ansicht (US-026 Akzeptanzkriterium 5), nicht einen leeren Inhaltsbereich.
- [ ] Automatisierter Test (Angular `TestBed` + `HttpTestingController`, Antwort ausschließlich per `flush()` nach dem ursprünglichen Aufruf, danach ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ohne zusätzliche simulierte Interaktion, analog zum in US-058 etablierten Testmuster) belegt für `load()` (Erfolg **und** Fehler) sowie für den `getProject(...)`-Subscribe den korrekten Endzustand.
- [ ] Bestehende Tests von `StakeholderDetailComponent` sowie der zugehörigen Story-Tests (US-026, US-029, US-030) bleiben grün bzw. werden präzisiert, falls sie das bisherige (fehlerhafte) Verhalten unbewusst mitgeprüft haben.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Kein bestehender Test wird gebrochen; `ng test` bleibt grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.ts` — `ChangeDetectorRef` injizieren (analog zum in US-058 etablierten Muster); `changeDetectorRef.markForCheck()` ergänzen in:
  - `load()`s `next`- und `error`-Zweig,
  - dem `projectsService.getProject(...).subscribe(...)`-Callback in `ngOnInit`.

**Wichtige Invarianten:**
- Ausschließlich die fehlende Change-Detection-Markierung wird ergänzt — keine Änderung an der fachlichen Logik von `canEdit`/`canDelete`/`canViewAssessments` oder an der US-030-Sichtbarkeitsregel.
- Analog zum methodischen Befund aus US-058: ein naiver Test mit synchronem `of(...)` deckt ein fehlendes `markForCheck()` nicht zuverlässig auf — der Story-Test muss die HTTP-Antwort tatsächlich per `HttpTestingController`/`flush()` asynchron simulieren.

### Anmerkungen des Product Owners

Kein neues GitHub-Issue für den vom Projektverantwortlichen gemeldeten Bug angelegt, da Issue #61 (unabhängig davon bereits während der QA-Verifikation von US-032 gefunden) exakt dieselbe Root Cause in derselben Datei beschreibt — der Endnutzer-Bug wurde stattdessen als Kommentar an Issue #61 angehängt, um Duplikate zu vermeiden. Diese Story setzt Issue #61 vollständig um.

**Update 30.08.2026 (PO-Review der Phase-12-Issues):** [Issue #81](https://github.com/Inso666/SlobSteak/issues/81) („Stakeholder-Detailseite (S4) rendert leer — Kommunikationszuordnungen-Panel aus US-040 nicht erreichbar“) beschreibt exakt dieselbe Root Cause wie Issue #61 in derselben Datei (`stakeholder-detail.component.ts`, fehlendes `ChangeDetectorRef`/`markForCheck()`), diesmal entdeckt beim Design-Abgleich von US-040. Code-Review bestätigt: `markForCheck()` fehlt weiterhin (Story noch „offen“). Issue #81 ist damit kein neuer Befund und erhält bewusst **keine** eigene Story — es bestätigt lediglich zusätzlich, dass diese Story (US-059) mit steigender Priorität behandelt werden sollte, da sie inzwischen nicht nur Assessment und Map, sondern auch die in US-040 bereits „fertig“ gemeldete Kommunikationszuordnungs-UI blockiert. Der Fix dieser Story deckt Issue #81 vollständig mit ab.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
