**ID:** US-070
**Titel:** Zeitstempel systemweit im deutschen Format (TT.MM.JJJJ, 24h) statt US-Format darstellen
**Bounded Context / Domain:** Frontend-Shell (Presentation-Schicht, quer zu StakeholderManagement/StakeholderAssessment)
**Abhängigkeiten:** US-069

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
