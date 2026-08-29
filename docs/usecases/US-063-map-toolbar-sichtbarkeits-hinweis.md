**ID:** US-063
**Titel:** Toolbar-Hinweistext „X von Y Stakeholdern sichtbar“ auf der Map ergänzen
**Bounded Context / Domain:** StakeholderMap (Frontend, Presentation-Schicht)
**Abhängigkeiten:** US-032, US-062

---

### 1. User Story

Als **Nutzer mit einer perspektiv-tragenden Projekt-Rolle** möchte ich in der Map-Toolbar auf einen Blick sehen, wie viele der Stakeholder meines Projekts in der aktuell gewählten Perspektive überhaupt sichtbar/bewertet sind, damit mir klar ist, dass fehlende Punkte an fehlenden Bewertungen liegen und nicht an einem Anzeigefehler.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #70](https://github.com/Inso666/SlobSteak/issues/70), entdeckt beim Design-Abgleich von Phase 5 gegen `docs/specs/SPEC-04-Stakeholder-Map.md` §1 (Toolbar-Layout).
- **Ist-Zustand:** Die Toolbar (`stakeholder-map-page.component.html`) enthält aktuell nur „Meine Sicht“, den Vergleichsmodus-Schalter und (bei aktivem Vergleichsmodus) „Vergleichen mit“. Der laut SPEC-04 §1 vorgesehene rechtsbündige Info-Text `{{ visibleCount }} von {{ totalCount }} Stakeholdern sichtbar` fehlt vollständig.
- **Datenlage:** `StakeholderMapPageComponent.points` (bzw. `comparisonEntries` im Vergleichsmodus) enthält bereits ausschließlich die in der gewählten Perspektive sichtbaren/bewerteten Stakeholder (`visibleCount` = `points.length` bzw. Anzahl der Comparison-Entries). Eine Gesamtzahl aller (nicht-gelöschten) Stakeholder des Projekts (`totalCount`) wird auf dieser Seite aktuell nicht geladen — muss ergänzt werden, z. B. über die bereits bestehende `StakeholdersService.listStakeholders(projectId)` (siehe `stakeholder-list.component.ts` für das etablierte Verwendungsmuster).
- **Relevant für DDD:** Reine Presentation-Schicht; ggf. ein zusätzlicher, bereits bestehender Read-Endpoint-Aufruf (`GET /api/v1/projects/{id}/stakeholders`), kein neuer Endpoint nötig.

### 3. Akzeptanzkriterien

- [ ] Rechts in der Toolbar erscheint ein Hinweistext im Format „{{visibleCount}} von {{totalCount}} Stakeholdern sichtbar“ (SPEC-04 §1: `span.info-text.mono`).
- [ ] `visibleCount` entspricht der Anzahl der in der aktuell gewählten Perspektive (bzw. im Vergleichsmodus: primäre Perspektive) tatsächlich angezeigten Punkte.
- [ ] `totalCount` entspricht der Gesamtzahl aller nicht-gelöschten Stakeholder des Projekts, unabhängig von deren Bewertungsstatus.
- [ ] Der Hinweistext aktualisiert sich zuverlässig bei Wechsel der Perspektive bzw. des Vergleichsmodus (inkl. korrekter Change-Detection-Markierung, siehe US-058/US-059 — kein erneutes „stumm hängenbleibendes“ UI).
- [ ] Automatisierter Test belegt Text/Werte für mindestens: alle Stakeholder bewertet (`visibleCount === totalCount`), sowie mindestens ein unbewerteter Stakeholder vorhanden (`visibleCount < totalCount`).
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests von `StakeholderMapPageComponent` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.ts` — neues Feld/Getter `totalCount` (Ladeaufruf via `StakeholdersService`, analog zum bestehenden Ladeaufruf der Map-Punkte selbst) sowie `visibleCount` (aus vorhandenem `points`/`comparisonEntries` ableitbar).
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.html` — Toolbar (`<form class="toolbar">`) um den Info-Text ergänzen, rechtsbündig (SPEC-04 §1 nennt einen `div.spacer`-Trenner davor).
- `frontend/src/app/features/map/stakeholder-map-page/stakeholder-map-page.component.css` — `.info-text`/`.mono`-Klasse gemäß SPEC-00 (mono-Schrift für Kennzahlen, bereits an anderer Stelle im Produkt verwendet, siehe SPEC-00 §1.2).

**Wichtige Invarianten:**
- Kein neuer Backend-Endpoint — Wiederverwendung des bestehenden Stakeholder-Listen-Endpoints (US-025).
- `totalCount`-Ladeaufruf zählt ausschließlich nicht-soft-gelöschte Stakeholder (Standardverhalten des bestehenden Endpoints).

### Anmerkungen des Product Owners

Kleine, klar abgegrenzte Ergänzung — bewusst nicht mit den übrigen Map-Issues zusammengelegt, da eigenständige Ursache (fehlendes Feature-Detail statt Bug in bestehendem Code).

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)
