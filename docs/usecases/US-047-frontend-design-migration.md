**ID:** US-047
**Titel:** Bestehendes Frontend auf das in CLAUDE.md definierte Design-System migrieren
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-009, US-016, US-017, US-018, US-019, US-021, US-022, US-023, US-024, US-025, US-026, US-029, US-043, US-044, US-045, US-046

---

### 1. User Story

Als **Projektverantwortlicher** möchte ich, dass die gesamte bisher entstandene Angular-UI einheitlich das in `CLAUDE.md` hinterlegte Design-Konzept (Farben inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, Komponentenmuster wie Karten/Buttons/Formulare) verwendet, damit die Anwendung wie aus einem Guss wirkt, statt dass jede Story ihr eigenes, unkoordiniertes CSS mitbringt.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** PRD Abschnitt 6.1 (Design-Richtung) beschreibt die fachliche Zielrichtung nur grob; die verbindliche, im Detail ausgearbeitete Spezifikation (Farbpalette inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, wiederverwendbare Komponentenmuster) wird **separat vom Projektverantwortlichen erarbeitet und in `CLAUDE.md` hinterlegt** — diese Story setzt das dort hinterlegte Konzept um, definiert es nicht selbst.
- **Anlass:** UX-Review vom 23.08.2026 hat festgestellt, dass `frontend/src/styles.css` bis dato leer ist, keine Design-Tokens existieren und jede der 15 bestehenden Feature-`.css`-Dateien Farben/Radien/Abstände unkoordiniert hartcodiert (z. B. drei verschiedene Grautöne `#666`/`#888`/`#eee`/`#f5f5f5` für denselben Zweck, drei verschiedene `border-radius`-Werte ohne erkennbare Skala). Die einzige durchgängige Konsistenz (`#b00020` für Fehlertexte) ist reines Copy-Paste zwischen Stories, keine echte Systematik.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht — keine Domain-, Application- oder Infrastructure-Änderung. Diese Story darf keine fachliche Logik, keine API-Contracts und kein Verhalten verändern, ausschließlich Markup-Struktur (soweit für das neue Komponentenmuster nötig, z. B. Karten- statt Tabellenlayout) und Styling.

### 3. Akzeptanzkriterien

- [ ] Alle in `CLAUDE.md` definierten Design-Tokens (Farben inkl. Akzentfarbe, Typografie-Skala, Abstands-/Radius-Skala) sind zentral an einer Stelle hinterlegt (z. B. CSS Custom Properties auf `:root` in `frontend/src/styles.css`) — nicht pro Komponente dupliziert.
- [ ] Jede der 15 bestehenden Feature-`.css`-Dateien (siehe Dateiliste unten) sowie `app.css` referenzieren für Farben, Radien, Abstände und Typografie ausschließlich diese zentralen Tokens; kein literaler Hex-/px-/rem-Wert bleibt hartcodiert stehen, wo ein passendes Token existiert.
- [ ] Die im Design-Konzept festgelegte Akzentfarbe wird an mindestens einer fachlich sinnvollen Stelle zur Hervorhebung von Handlungsbedarf eingesetzt (Kandidat gemäß PRD 6.1: Stakeholder ohne Assessment in Liste und/oder Detailansicht) — sofern das Konzept eine solche Verwendung vorsieht.
- [ ] Wo das Design-Konzept ein Kartenlayout anstelle von rohen `<table>`-Strukturen vorschreibt, werden die betroffenen Ansichten (mindestens Stakeholder-Liste, Nutzerverwaltung, Projektverwaltung) entsprechend umgestellt, ohne dass Spalteninhalte oder Aktionen verloren gehen.
- [ ] Alle Screens S1–S5 (Login, Projektübersicht, Projekt-Workspace inkl. Stakeholder-Liste/-Detail/Assessment-Tabs, Admin-Bereich) sind nach der Migration visuell konsistent (gleiche Buttons, gleiche Formularfelder, gleiche Fehlerdarstellung) — im PR wird das durch Vorher/Nachher-Screenshots je Screen belegt.
- [ ] Kein bestehender Component- oder Story-Test wird durch diese Story funktional gebrochen; `ng test` (gesamter Workspace) bleibt grün. Betrifft ein Test ausschließlich CSS-Klassennamen/DOM-Struktur, die sich durch die Migration zwangsläufig ändern (z. B. Tabelle → Karte), wird der Test entsprechend angepasst, nicht entfernt.
- [ ] Es wird keine neue Business-Logik, kein neuer Endpoint-Aufruf und keine Änderung an bestehenden `*.service.ts`-Dateien vorgenommen — reine Presentation-Schicht.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/styles.css` (neu: globale Design-Tokens)
- `frontend/src/index.html` (Web-Font-Einbindung, sofern das Konzept einen solchen vorsieht)
- `frontend/src/app/app.css`, `frontend/src/app/app.html`
- `frontend/src/app/features/auth/login-page/login-page.component.css`
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.css`
- `frontend/src/app/features/projects/project-overview/project-overview.component.css`
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.css`
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.css`
- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.css`
- `frontend/src/app/features/stakeholders/create-stakeholder-form/create-stakeholder-form.component.css`
- `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.css`
- `frontend/src/app/features/stakeholders/delete-stakeholder-dialog/delete-stakeholder-dialog.component.css`
- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.css`
- `frontend/src/app/features/assessments/assessment-conflict-dialog/assessment-conflict-dialog.component.css`
- `frontend/src/app/features/admin/users-admin/users-admin.component.css`
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.css`
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.css`
- zugehörige `.html`-Dateien der oben genannten Komponenten, ausschließlich soweit die Markup-Struktur (nicht der Inhalt/das Verhalten) für das neue Komponentenmuster angepasst werden muss (z. B. Tabellenzeile → Karten-Element).

**Wichtige Invarianten & Validierungsregeln:**

- Rein präsentational — keine Änderung an Formular-Validierungsregeln, Routing, Guards oder Service-Aufrufen.
- Kontrast-/Lesbarkeitsanforderungen des Design-Konzepts sind einzuhalten, sofern dort spezifiziert (z. B. WCAG-Mindestkontrast für Fehlertexte/Akzentfarbe).

### 5. Definition of Ready (Ergänzung zu CLAUDE.md Abschnitt 3.3)

Diese Story hat eine zusätzliche, über das übliche Schema hinausgehende Voraussetzung: Das in `CLAUDE.md` zu hinterlegende Design-Konzept muss **vollständig vorliegen** (Farbpalette inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, Komponentenmuster für Buttons/Karten/Formulare/Fehlerdarstellung), bevor diese Story begonnen wird. Liegt zum geplanten Startzeitpunkt nur ein Teil des Konzepts vor, hält der Dev-Agent inne und dokumentiert die Lücke unter „Anmerkungen des Dev-Agenten“ statt Annahmen zu treffen (CLAUDE.md Abschnitt 4).

### Anmerkungen des Dev-Agenten

- Diese Story ist bewusst **nach** US-043–US-046 einsortiert: Diese vier Stories führen neue UI-Bausteine ein (Verarbeitungs-Feedback/Spinner, Fehlermeldungs-Darstellung, globale Navigation). Würde diese Migration vor ihnen laufen, entstünden dort erneut Ad-hoc-Styles, die anschließend ein zweites Mal migriert werden müssten. Sollte die Design-Ausarbeitung schneller fertig sein als US-043–046 umgesetzt sind, ist in Rücksprache mit dem Projektverantwortlichen zu entscheiden, ob die Reihenfolge getauscht wird — nicht eigenmächtig durch den Dev-Agenten.
- Sollte sich der Umfang (15 Komponenten + globale Tokens in einem Durchlauf) als zu groß für eine einzelne fokussierte Iteration erweisen, ist das gemäß CLAUDE.md Abschnitt 4 als Anmerkung zu dokumentieren und eine Aufteilung in mehrere Folge-Stories (z. B. je Bounded Context) vorzuschlagen, statt die Story unvollständig als „fertig“ zu markieren.
- Kein PRD-Akzeptanzkriterium einer bereits abgeschlossenen Story darf durch diese Migration verletzt werden (z. B. Sichtbarkeitsregeln, Pflichtfelder, Rollen-Einschränkungen) — ausschließlich visuelle Darstellung und Markup-Struktur ändern sich.

_(Weitere Anmerkungen vom Dev-Agenten bei Umsetzung zu ergänzen, insbesondere falls das CLAUDE.md-Design-Konzept an einzelnen Stellen für bestehende Screens keine eindeutige Vorgabe macht.)_
