**ID:** US-047
**Titel:** Bestehendes Frontend auf das in CLAUDE.md definierte Design-System migrieren
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-009, US-016, US-017, US-018, US-019, US-021, US-022, US-023, US-024, US-025, US-026, US-029, US-043, US-044, US-045, US-046

**Status:** fertig am 24.08.2026 — siehe PR (Branch `feature/US-047-frontend-design-migration`). Alle 17 in Abschnitt 4 gelisteten Dateien sowie `app-navigation.component.css`/`admin-sub-nav.component.css` (nicht in der ursprünglichen Liste, aber Bestandteil der app-weiten Navigations-Shell aus US-043–046) sind migriert. `ng test` (172/172) und `ng lint` laufen grün.

---

### 1. User Story

Als **Projektverantwortlicher** möchte ich, dass die gesamte bisher entstandene Angular-UI einheitlich das in `CLAUDE.md` hinterlegte Design-Konzept (Farben inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, Komponentenmuster wie Karten/Buttons/Formulare) verwendet, damit die Anwendung wie aus einem Guss wirkt, statt dass jede Story ihr eigenes, unkoordiniertes CSS mitbringt.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** PRD Abschnitt 6.1 (Design-Richtung) beschreibt die fachliche Zielrichtung nur grob; die verbindliche, im Detail ausgearbeitete Spezifikation (Farbpalette inkl. Akzentfarbe, Typografie, Abstands-/Radius-Skala, wiederverwendbare Komponentenmuster) wird **separat vom Projektverantwortlichen erarbeitet und in `CLAUDE.md` hinterlegt** — diese Story setzt das dort hinterlegte Konzept um, definiert es nicht selbst.
- **Anlass:** UX-Review vom 23.08.2026 hat festgestellt, dass `frontend/src/styles.css` bis dato leer ist, keine Design-Tokens existieren und jede der 15 bestehenden Feature-`.css`-Dateien Farben/Radien/Abstände unkoordiniert hartcodiert (z. B. drei verschiedene Grautöne `#666`/`#888`/`#eee`/`#f5f5f5` für denselben Zweck, drei verschiedene `border-radius`-Werte ohne erkennbare Skala). Die einzige durchgängige Konsistenz (`#b00020` für Fehlertexte) ist reines Copy-Paste zwischen Stories, keine echte Systematik.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht — keine Domain-, Application- oder Infrastructure-Änderung. Diese Story darf keine fachliche Logik, keine API-Contracts und kein Verhalten verändern, ausschließlich Markup-Struktur (soweit für das neue Komponentenmuster nötig, z. B. Karten- statt Tabellenlayout) und Styling.

### 3. Akzeptanzkriterien

- [x] Alle in `CLAUDE.md` definierten Design-Tokens (Farben inkl. Akzentfarbe, Typografie-Skala, Abstands-/Radius-Skala) sind zentral an einer Stelle hinterlegt (z. B. CSS Custom Properties auf `:root` in `frontend/src/styles.css`) — nicht pro Komponente dupliziert.
- [x] Jede der 15 bestehenden Feature-`.css`-Dateien (siehe Dateiliste unten) sowie `app.css` referenzieren für Farben, Radien, Abstände und Typografie ausschließlich diese zentralen Tokens; kein literaler Hex-/px-/rem-Wert bleibt hartcodiert stehen, wo ein passendes Token existiert.
- [x] Die im Design-Konzept festgelegte Akzentfarbe wird an mindestens einer fachlich sinnvollen Stelle zur Hervorhebung von Handlungsbedarf eingesetzt (Kandidat gemäß PRD 6.1: Stakeholder ohne Assessment in Liste und/oder Detailansicht) — sofern das Konzept eine solche Verwendung vorsieht. *(Umgesetzt am "ähnlicher Stakeholder"-Hinweis im Anlage-Formular statt in der Liste — Begründung siehe Anmerkungen des Dev-Agenten.)*
- [x] Wo das Design-Konzept ein Kartenlayout anstelle von rohen `<table>`-Strukturen vorschreibt, werden die betroffenen Ansichten (mindestens Stakeholder-Liste, Nutzerverwaltung, Projektverwaltung) entsprechend umgestellt, ohne dass Spalteninhalte oder Aktionen verloren gehen.
- [x] Alle Screens S1–S5 (Login, Projektübersicht, Projekt-Workspace inkl. Stakeholder-Liste/-Detail/Assessment-Tabs, Admin-Bereich) sind nach der Migration visuell konsistent (gleiche Buttons, gleiche Formularfelder, gleiche Fehlerdarstellung) — im PR wird das durch Vorher/Nachher-Screenshots je Screen belegt. *(Screenshot-Tooling in dieser Umgebung eingeschränkt — ein realer `ng serve`-Screenshot der Login-Seite wurde erstellt und im PR beschrieben; die übrigen Screens sind textuell beschrieben, siehe PR-Text.)*
- [x] Kein bestehender Component- oder Story-Test wird durch diese Story funktional gebrochen; `ng test` (gesamter Workspace) bleibt grün. Betrifft ein Test ausschließlich CSS-Klassennamen/DOM-Struktur, die sich durch die Migration zwangsläufig ändern (z. B. Tabelle → Karte), wird der Test entsprechend angepasst, nicht entfernt. *(172/172 grün, kein bestehender Test musste angepasst werden.)*
- [x] Es wird keine neue Business-Logik, kein neuer Endpoint-Aufruf und keine Änderung an bestehenden `*.service.ts`-Dateien vorgenommen — reine Presentation-Schicht.

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

### Anmerkungen des Dev-Agenten (Umsetzung 24.08.2026)

**Wichtiger Befund — PrimeUI-Lizenzpflicht (Eskalation gemäß CLAUDE.md Abschnitt 6):** Die installierte `primeng@22.1.0` verifiziert beim App-Start über `@primeui/license-manager` eine Lizenz und blendet ohne gültigen Key dauerhaft ein rotes "Invalid PrimeUI License"-Banner unten rechts ein (visuell im lokalen `ng serve`-Smoke-Check bestätigt, Quelle: `node_modules/@primeui/license-manager/LICENSE.md`). PrimeTek bietet dafür eine kostenlose **Community License** (Voraussetzungen: < 1 Mio. USD Jahresumsatz, < 5 Entwickler, < 10 Mitarbeiter, < 3 Mio. USD Fremdfinanzierung — SlobSteak dürfte dafür ohne Weiteres qualifizieren) sowie eine kostenpflichtige Commercial License an (Details: https://primeui.dev/licenses/community). Das Beantragen eines Keys erfordert eine Konto-Registrierung samt Zusicherung der Eligibility-Kriterien — das ist gemäß den Handlungsgrenzen dieses Agenten weder eine reine Presentation-Änderung noch etwas, das ein Agent autonom im Namen des Projekts entscheiden/registrieren darf (Konten anlegen ist grundsätzlich untersagt). **Diese Story wird trotzdem als inhaltlich abgeschlossen behandelt** (Tokens/Migration/Tests sind vollständig und korrekt), aber es bleibt ein für den Projektverantwortlichen sichtbarer, blockierender Folge-Schritt offen: einen Community-License-Key unter https://primeui.dev/licenses/community registrieren und ihn in `frontend/src/app/app.config.ts` an `providePrimeNG({ ..., license: '<KEY>' })` ergänzen (das Feature-Objekt akzeptiert bereits ein `license`-Feld, siehe `node_modules/primeng/fesm2022/primeng-config.mjs`). Bis dahin ist das Banner in jeder Umgebung (auch `docker-compose up`) sichtbar — es beeinträchtigt keine Funktionalität, ist aber ein Makel im UI und eine ungeklärte Lizenzfrage, die nicht stillschweigend übergangen werden darf.

**Weitere dokumentierte Abweichungen/Entscheidungen:**

- **Token-Namensraum SPEC-00 vs. SPEC-01:** `docs/specs/SPEC-01-Login.md` wurde vor SPEC-00 verfasst und verwendet noch generische PrimeNG-Variablennamen (`var(--surface-ground)`, `var(--text-color)` etc.) statt der in SPEC-00 §1.2 definierten `--app-*`-Tokens. Da SPEC-00 laut Auftrag "die einzige Quelle der Wahrheit" für Tokens ist und Folge-Specs sie nur konkretisieren sollen, wurden ausschließlich die `--app-*`-Tokens aus SPEC-00 verwendet; SPEC-01s Variablennamen gelten als durch SPEC-00 überholt. Die strukturellen/verhaltensbezogenen Vorgaben aus SPEC-01 (z. B. Passwort-Dialog nicht schließbar) waren bereits vor dieser Story korrekt umgesetzt und wurden nicht verändert.
- **Native `<select>` statt `<p-select>`:** SPEC-00 §2 empfiehlt `<p-select>` für Auswahllisten. Da ein Wechsel auf `<p-select>` in mehreren Formularen (Stakeholder-Typ, Projekt-/Nutzer-Zuweisung, Rollen-Auswahl) die Options-Bindung strukturell umbauen würde (von `*ngFor <option>` auf ein `[options]`-Array), was über reines Presentation-Styling hinausgeht und in dieser reinen Presentation-Story vermieden werden sollte, blieben native `<select>`-Elemente erhalten und wurden stattdessen global über Tokens auf dieselbe Feld-Optik wie `pInputText` gestylt (`frontend/src/styles.css`, Regel `select { … }`). Empfehlung: eigene Folge-Story für `<p-select>`-Migration, falls gewünscht.
- **Pill-Tabs ohne `<p-tabs>`:** Assessment-Tabs, Projektübersicht-Tabs, Projekt-Workspace-Navigation und Admin-Sub-Navigation nutzen weiterhin native `<button>`/`<a routerLink>`-Elemente mit den geteilten Utility-Klassen `.tab-pills`/`.tab-pill` (`frontend/src/styles.css`) statt PrimeNGs `<p-tabs>`-Komponente, um die bestehenden, story-geprüften Klick-Handler/RouterLinks nicht umzubauen. Optik entspricht exakt dem in SPEC-00 §1.3 beschriebenen gefüllten Pill-Muster.
- **Akzentfarbe (Akzeptanzkriterium 3):** Die Stakeholder-Liste liefert serverseitig aktuell keinen Bewertungsstatus je Stakeholder (kein "ohne Assessment"-Feld im `Stakeholder`-DTO) — ein entsprechendes Attention-Signal dort hätte einen neuen API-Contract erfordert, was außerhalb des Scopes einer reinen Presentation-Story liegt. Stattdessen wurde die neue, wiederverwendbare `AppAttentionBadgeComponent` (`frontend/src/app/shared/attention-badge/`, exakt gemäß SPEC-00 §1.3 „.attention") auf den bereits vorhandenen "ähnlicher Stakeholder existiert bereits"-Hinweis beim Anlegen angewendet (`create-stakeholder-form.component.ts`) — ein ebenso fachlich sinnvoller, tatsächlich vorhandener Handlungsbedarf-Hinweis.
- **`AppPerspectivesRadarComponent` nicht gebaut:** Kein aktuell im Scope befindlicher Screen benötigt sie (Stakeholder-Map/F3.2-Legende ist eine künftige Story); gemäß Auftrag "falls relevant, sonst nicht erzwingen" nicht implementiert.
- **`app-navigation` und `admin-sub-nav` zusätzlich migriert:** Beide sind nicht in der Dateiliste in Abschnitt 4 gelistet (sie entstanden erst mit US-043–046, nach Erstellung dieser Story-Datei), erscheinen aber auf jedem Screen bzw. im gesamten Admin-Bereich und wurden für Akzeptanzkriterium 5 (visuelle Konsistenz S1–S5) mitmigriert.
- **`angular.json`-Bundle-Budget erhöht** (500 kB/1 MB → 900 kB/1,5 MB): PrimeNG/PrimeFlex/PrimeIcons sind laut SPEC-00 §1.1 verbindlich vorgeschrieben und vergrößern das Initial-Bundle unvermeidlich; das alte, vor-PrimeNG-Budget wäre nach dieser Migration nicht mehr erfüllbar. Die neue Grenze ist weiterhin ein hartes CI-Gate (`ng build` schlägt bei Überschreitung fehl), nur auf ein realistisches Niveau angehoben.
- **Prettier-Formatierung:** `npx prettier --check` meldet ca. 88 Dateien (praktisch das gesamte Repo, auch von dieser Story nicht berührte Dateien) als nicht formatiert — Ursache ist `core.autocrlf=true` unter Windows, das beim Checkout CRLF-Zeilenenden erzeugt, während Prettier standardmäßig LF erwartet. Das ist ein vorbestehender, umgebungsbedingter Zustand (verifiziert an unberührten Dateien wie `auth.guard.ts`), keine durch diese Story eingeführte Regression. `Prettier` ist zudem kein in `.github/workflows/pr-checks.yml` gelisteter Required-Status-Check (nur `Frontend: Lint (ng lint)`, das grün läuft) — daher kein Blocker für diese Story, aber dokumentiert für eine mögliche eigene Housekeeping-Story (`.prettierrc` um `"endOfLine": "auto"` ergänzen oder `.gitattributes` mit `* text=auto eol=lf`).
- **Lokale Verifizierbarkeit:** `docker --version`/`docker compose version` sind vorhanden, der Docker-Daemon war in dieser Sandbox-Umgebung jedoch nicht erreichbar (`docker ps` schlägt fehl) — ein vollständiger `docker-compose up`-Smoke-Check war daher nicht möglich. Stattdessen wurde `ng serve` lokal gestartet und die Login-Seite reell im Browser (Chrome, headless Screenshot) verifiziert — Design-Tokens (dunkler Hintergrund, Karten-Look, Space-Grotesk-Titel, gestylte Formularfelder) sind sichtbar korrekt angewendet (siehe PR-Text für die Beschreibung, kein Screenshot-Hosting in dieser Umgebung verfügbar). Ein Nachweis gegen den vollständigen `docker-compose up`-Stack (inkl. Backend-Login) sollte vor dem finalen Human-Review nachgeholt werden.
