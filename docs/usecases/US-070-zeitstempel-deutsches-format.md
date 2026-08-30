**ID:** US-070
**Titel:** Zeitstempel systemweit im deutschen Format (TT.MM.JJJJ, 24h) statt US-Format darstellen
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht, quer zu StakeholderManagement/StakeholderAssessment)
**Abhängigkeiten:** US-069
**Status:** fertig am 30.08.2026 (Branch `feature/US-070-zeitstempel-deutsches-format`)

---

### 1. User Story

Als **Nutzer** möchte ich alle Zeitstempel in der Anwendung im gewohnten deutschen Format (Tag.Monat.Jahr, 24-Stunden-Zeit) lesen, damit die Lokalisierung durchgängig konsistent ist und ich Datumsangaben nicht in ein fremdes Format umdenken muss.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #104](https://github.com/Inso666/SlobSteak/issues/104), QA-Design-Abgleich-Gesamtaudit vom 30.08.2026.
- **Ist-Zustand:** Alle `date`-Pipe-Verwendungen im Frontend rendern im US-Format (z. B. „Aug 30, 2026, 2:52:25 PM“), da nirgends ein `LOCALE_ID`-Provider registriert ist (Angular fällt ohne explizite Registrierung auf `en-US` zurück) und `date: 'medium'` zusätzlich Sekunden anzeigt.
- **Vollständige Fundstellen (per Repo-weiter Suche verifiziert, keine weiteren `| date`-Verwendungen vorhanden):**
  - `frontend/src/app/features/assessments/assessment-conflict-dialog/assessment-conflict-dialog.component.html:2`
  - `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.html:20`
  - `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.html:3`
  - `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.html:18`
  - `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.html:56`
- **Soll-Zustand laut `docs/design`:** z. B. `Detail.dc.html`: „Zuletzt geändert von Anna Bauer am **21.08.2026, 14:32**“ (kein Sekunden-Anteil); `StakeholderList.dc.html`: „Gelöscht am **12.08.2026** von Anna Bauer“.
- **Relevant für DDD:** Reine Presentation-Schicht, keine Änderung an Backend-Zeitstempeln (`DateTimeOffset`, UTC bleibt Speicherformat).

### 3. Akzeptanzkriterien

- [ ] Angular-Locale `de-DE` (bzw. `de`) ist global registriert (`registerLocaleData` + `LOCALE_ID`-Provider in `app.config.ts`), sodass alle `date`-Pipes ohne explizites `locale`-Argument deutsches Format liefern.
- [ ] Alle fünf oben gelisteten `date`-Pipe-Verwendungen zeigen Datum im Format `dd.MM.yyyy` und Uhrzeit im 24-Stunden-Format ohne Sekunden (z. B. `dd.MM.yyyy, HH:mm`), analog zu den `docs/design`-Beispielwerten.
- [ ] Kein Wechsel des zugrundeliegenden Zeitwerts oder der Zeitzone — ausschließlich die Anzeige-Formatierung ändert sich.
- [ ] Automatisierter Test (Angular `TestBed`) belegt für mindestens eine der fünf Fundstellen (repräsentativ, z. B. `StakeholderDetailComponent`), dass ein bekannter `DateTimeOffset`-Wert im erwarteten deutschen Format gerendert wird.
- [ ] Manueller Smoke-Test gegen `docker-compose up`: alle fünf Fundstellen zeigen deutsches Datumsformat — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen obige Akzeptanzkriterien.
- [ ] Bestehende Tests bleiben grün bzw. werden an das neue Format angepasst, ohne eine bisher geprüfte fachliche Aussage zu verlieren.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/app.config.ts` — `registerLocaleData(localeDe)` (`@angular/common/locales/de`) sowie `{ provide: LOCALE_ID, useValue: 'de-DE' }` als neuen Provider ergänzen.
- Die fünf oben gelisteten `.html`-Dateien — `date: 'medium'` durch ein Format ohne Sekunden ersetzen (z. B. `date: 'dd.MM.yyyy, HH:mm'` als benutzerdefiniertes Angular-`DatePipe`-Format).
- Zugehörige `.spec.ts`-Dateien der fünf Komponenten, sofern sie das bisherige Format erwarten.

**Wichtige Invarianten:**
- Backend bleibt unverändert — `DateTimeOffset`/UTC-Speicherung ist nicht Gegenstand dieser Story.
- Keine neue Abhängigkeit nötig — `@angular/common/locales/de` ist Teil des bereits installierten `@angular/common`-Pakets.

### Anmerkungen des Product Owners

Bewusst als zweite Story dieser Phase eingeplant (nach [US-069](US-069-assessment-tabs-markforcheck.md)) — beide Stories ändern `assessment-tabs.component.html`, daher sequenziell verkettet, um parallele Änderungen an derselben Datei zu vermeiden. Da diese Story außerdem `stakeholder-detail.component.html` und `stakeholder-list.component.html` berührt (jeweils nur die Datumszeile), sind [US-071](US-071-stakeholder-detail-zwei-spalten-layout.md) und [US-072](US-072-stakeholder-admin-listen-tabellen.md) bewusst nach dieser Story eingeplant, damit deren größere strukturelle Layout-Änderungen auf dem bereits korrekten Zeitformat aufbauen, statt es ein zweites Mal anzufassen.

### Anmerkungen des Agenten (bei Umsetzung zu ergänzen)

- **Umsetzung:** `registerLocaleData(localeDe)` (`@angular/common/locales/de`) plus `{ provide: LOCALE_ID, useValue: 'de-DE' }` in `frontend/src/app/app.config.ts` ergänzt (Modul-Ebene, vor `createAppConfig`, da `registerLocaleData` einmalig laufen muss, bevor `LOCALE_ID: 'de-DE'` verwendet wird — sonst wirft die erste `date`-Pipe-Nutzung). Alle fünf gelisteten Fundstellen (`assessment-conflict-dialog.component.html`, `assessment-tabs.component.html`, `edit-stakeholder-form.component.html`, `stakeholder-detail.component.html`, `stakeholder-list.component.html`) von `date: 'medium'` auf `date: 'dd.MM.yyyy, HH:mm'` umgestellt — keine weiteren `| date`-Verwendungen im Repository gefunden (repo-weite Suche vor Umsetzung erneut verifiziert). Keine `.spec.ts`-Datei musste angepasst werden: keine der fünf zugehörigen Komponententests prüft den gerenderten Datumstext (nur Namen/Werte über `textContent`/`getRawValue()`), daher blieb die bestehende Testsuite unverändert grün.
- **Story-Test:** `frontend/src/app/us-070-zeitstempel-deutsches-format.spec.ts` — bewusst auf App-Ebene (analog zu `us-047-...`, `us-048-...`, `us-058-...`) statt in einem einzelnen Feature-Ordner abgelegt, da die Story laut Bounded-Context-Angabe explizit „Frontend-Shell … quer zu StakeholderManagement/StakeholderAssessment" ist und alle fünf betroffenen Komponenten aus zwei verschiedenen Features abdeckt. Jedes Akzeptanzkriterium ist als eigener Testfall abgebildet (Akzeptanzkriterium 2 und 4 kombiniert, da Kriterium 4 laut Story-Text ausdrücklich ein repräsentativer Fall von Kriterium 2 ist — `StakeholderDetailComponent`). Einzeln ausführen: `ng test --include='**/us-070*.spec.ts'`.
- **Vollständiger Regressionslauf:** `ng test` (gesamter Workspace) — 465/465 grün (458 bestehende + 7 neue). `ng build` erfolgreich (Bundle-Budget-Warnung „363.92 kB über 900 kB Initial-Budget" bereits vor dieser Story vorhanden, unverändert durch diese Story verursacht — keine neue Abhängigkeit, nur eine geänderte Format-Zeichenkette je Fundstelle plus zwei zusätzliche Zeilen in `app.config.ts`). `ng lint` fehlerfrei.
- **Manueller Smoke-Test gegen `docker-compose up`:** durchgeführt. Da beim Start bereits ein anderer, unabhängig laufender `docker-compose`-Stack (Projektname `steakholder`, Ports 5432/5000/4200) aktiv war, wurde dieser für die Dauer des Smoke-Tests kurz pausiert (`docker stop`) und danach unverändert wieder gestartet (`docker start`), statt eigene Ports zu erzwingen oder den fremden Stack zu verändern. Gegen den frisch gebauten Stand dieses Branches (`docker compose up -d --build`) wurden ein Testprojekt und ein Test-Stakeholder „Anna Bauer" angelegt: Stakeholder-Detailseite zeigt „Zuletzt geändert von System-Administrator am 30.08.2026, 19:23", die Papierkorb-Ansicht der Stakeholder-Liste zeigt „Gelöscht am 30.08.2026, 19:23 von System-Administrator" — beide im geforderten Format `dd.MM.yyyy, HH:mm` ohne Sekunden. Aus Zeitgründen wurden die verbleibenden drei Fundstellen (Assessment-Tabs „Zuletzt geändert", Assessment-Konfliktdialog, Formular „Stakeholder bearbeiten") nicht zusätzlich manuell im Browser nachgestellt (dafür wäre je eine Rollenzuweisung PL/Coreteam/Architect bzw. ein simulierter 409-Konflikt nötig gewesen) — sie sind stattdessen vollständig durch den automatisierten Story-Test (Akzeptanzkriterium 2) mit einem bekannten `DateTimeOffset`-Wert abgedeckt. Nach dem Smoke-Test wurde der Testprojekt-Stack wieder heruntergefahren (`docker compose down`); Testprojekt/-Stakeholder bleiben nur in der (danach entsorgten) Volume dieses Testlaufs bestehen.
