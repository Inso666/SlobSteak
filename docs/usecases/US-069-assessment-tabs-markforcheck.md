**ID:** US-069
**Status:** fertig am 30.08.2026, [PR #107](https://github.com/Inso666/SlobSteak/pull/107)
**Titel:** Assessment-Inhalt des standardmäßig aktiven Tabs zuverlässig bei Erstaufruf rendern
**Bounded Context / Domain:** StakeholderAssessment (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-029, US-030, US-059

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle (PL, Coreteam, Architect)** möchte ich beim Öffnen der Stakeholder-Detailseite mein bereits vorhandenes Assessment auf der standardmäßig aktiven Rollen-Sicht sofort sehen, ohne vorher auf einen anderen Tab klicken zu müssen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #103](https://github.com/Inso666/SlobSteak/issues/103) („Blocker: Assessment-Inhalt des standardmäßig aktiven Tabs bleibt nach Seitenaufruf leer bis manuell ein anderer Tab angeklickt wird“), entdeckt beim QA-Design-Abgleich-Gesamtaudit vom 30.08.2026.
- **Root Cause (Code, `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts`, `loadAssessments()`):** Die Methode mutiert `this.roles` (Klassenfeld, von dem der `activeRole`-Getter abhängt) direkt im `.subscribe()`-Callback von `assessmentsService.getAssessments(...)`, ohne `ChangeDetectorRef.markForCheck()` aufzurufen. Die Anwendung läuft zoneless (kein `zone.js`) — dasselbe Bug-Muster, das bereits in US-050/US-051/US-052/US-057/US-058/US-059 an anderen Stellen behoben wurde. `AssessmentTabsComponent` war nicht Teil der in US-058 dokumentierten, systematisch durchsuchten Fundstellen.
- **Reproduktion (Issue #103):** Assessment existiert (`PUT .../assessments/PL` liefert 200 mit persistierten Werten), `GET .../assessments` liefert beim Seitenaufruf korrekt 200 mit den Daten, aber der Tab-Inhalt (Slider, „Zuletzt geändert von/am“, Notizfeld) bleibt leer, bis ein anderer Tab an- und wieder zurückgeklickt wird.
- **Abgrenzung zu US-059/Issue #61/#81:** Dort war die gesamte Stakeholder-Detailseite leer (fehlendes `markForCheck()` in `StakeholderDetailComponent`). Diese Story betrifft einen anderen, eigenständigen Bug in einer anderen Komponente (`AssessmentTabsComponent`) — die Seite selbst rendert (nach Fix von US-059) korrekt, nur der Tab-Inhalt innerhalb des Assessment-Bereichs bleibt beim Erstaufruf leer.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an Application-Services, Endpunkten oder Validierungsregeln.

### 3. Akzeptanzkriterien

- [ ] Bei frischem Seitenaufruf der Stakeholder-Detailseite (Direktnavigation, kein vorheriger Tab-Klick) zeigt der Assessment-Bereich auf der standardmäßig aktiven Rollen-Sicht zuverlässig die vorhandenen Werte (Slider-Positionen, „Zuletzt geändert von/am“, Notizfeld), sobald `GET .../assessments` geantwortet hat — ohne dass eine unabhängige, zusätzliche Interaktion nötig ist.
- [ ] Verhalten beim manuellen Tab-Wechsel bleibt unverändert korrekt (war bereits vorher funktional).
- [ ] Für einen Stakeholder ohne vorhandenes Assessment der aktiven Rolle zeigt der Tab weiterhin zuverlässig den „noch nicht bewertet“-Zustand (kein Rückschritt gegenüber bestehendem Verhalten).
- [ ] Automatisierter Test (Angular `TestBed` + `HttpTestingController`, Antwort ausschließlich per `flush()` nach dem ursprünglichen Aufruf, danach ausschließlich der reguläre `fixture.detectChanges()`-Zyklus ohne zusätzliche simulierte Interaktion, analog zum in US-058/US-059 etablierten Testmuster) belegt für `loadAssessments()` den korrekten Endzustand direkt nach dem asynchronen Response, ohne vorherigen Tab-Wechsel.
- [ ] Bestehende Tests von `AssessmentTabsComponent` (inkl. Story-Tests aus US-029/US-030) bleiben grün bzw. werden präzisiert, falls sie das bisherige (fehlerhafte) Verhalten unbewusst mitgeprüft haben.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Kein bestehender Test wird gebrochen; `ng test` bleibt grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts` — `ChangeDetectorRef` injizieren (analog zum in US-058/US-059 etablierten Muster); `changeDetectorRef.markForCheck()` im `next`-Callback von `loadAssessments()` ergänzen.

**Wichtige Invarianten:**
- Ausschließlich die fehlende Change-Detection-Markierung wird ergänzt — keine Änderung an der fachlichen Logik von `activeRole`, `syncFormWithActiveTab()` oder der US-030-Sichtbarkeitsregel.
- Ein naiver Test mit synchronem `of(...)` deckt ein fehlendes `markForCheck()` nicht zuverlässig auf — der Story-Test muss die HTTP-Antwort per `HttpTestingController`/`flush()` asynchron simulieren (siehe US-058/US-059 Anmerkung).

### Anmerkungen des Product Owners

Höchste Priorität dieser Phase — funktionaler Blocker (Kern-Akzeptanzkriterium von US-029/US-030 bei Erstaufruf faktisch nicht erfüllt), betrifft denselben Root-Cause-Typ wie US-059, aber eine andere Komponente. Bewusst als erste Story dieser Phase eingeplant, da nachfolgende Stories (insbesondere US-070/US-071) denselben Bereich der Stakeholder-Detailseite berühren und ein funktional korrekter Ausgangszustand deren manuellen Smoke-Test erleichtert.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

Fix exakt wie im Story-Dokument beschrieben umgesetzt: `ChangeDetectorRef` in `AssessmentTabsComponent` injiziert, `markForCheck()` im `next`-Callback von `loadAssessments()` ergänzt — keine Änderung an `activeRole`, `syncFormWithActiveTab()` oder der US-030-Sichtbarkeitsregel. Story-Test `frontend/src/app/features/assessments/assessment-tabs/us-069-assessment-tabs-markforcheck.spec.ts` reproduziert den Bug über `HttpTestingController` + `flush()` (kein synchrones `of(...)`) und deckt alle vier Akzeptanzkriterien 1–4 ab; Akzeptanzkriterium 5 (bestehende Tests bleiben grün) und 7 (`ng test` bleibt grün) sind durch den vollständigen Testlauf (458/458 grün) belegt, Akzeptanzkriterium 6 durch diesen Story-Test selbst.

Keine fachliche Abweichung vom PRD oder von der Story-Vorgabe — reiner Presentation-Layer-Bugfix, keine Backend-Berührung.

Lokale Verifizierbarkeit: `npx ng test` (458/458 grün, inkl. isoliert `--include='**/us-069*.spec.ts'`, 4/4 grün), `npx ng lint` (fehlerfrei), `npx ng build` (erfolgreich; die einzige Warnung ist ein vorbestehender Bundle-Budget-Hinweis, unabhängig von dieser Story). Docker-Compose-Smoke-Test bewusst ausgelassen, da laut Aufgabenstellung für diesen rein internen Bugfix ohne visuelle Änderung nicht zwingend nötig — die Fehlerreproduktion und -behebung ist durch den asynchronen `HttpTestingController`-Test bereits eindeutig nachgewiesen (naiver synchroner Test hätte den Bug nicht aufgedeckt, siehe Kommentar im Story-Test).

**So probierst du es aus (manuell, gegen `docker-compose up`):** Als Nutzer mit Rolle PL/Coreteam/Architect anmelden, zu einem Projekt navigieren, einen Stakeholder öffnen, für die eigene Rolle ein Assessment abspeichern. Seite neu laden (Direktnavigation/F5) → der Assessment-Bereich zeigt auf der standardmäßig aktiven Rollen-Sicht sofort die gespeicherten Slider-Werte, „Zuletzt geändert von/am“ und Notizen, ohne zuerst einen anderen Tab anklicken zu müssen.

**Story-Tests isoliert ausführen:** `ng test --include='**/us-069*.spec.ts'`
