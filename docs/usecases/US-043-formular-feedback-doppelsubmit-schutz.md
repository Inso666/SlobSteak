**ID:** US-043
**Titel:** Einheitliches Verarbeitungs-Feedback & Doppel-Submit-Schutz auf allen Formularen/Aktions-Buttons
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-009, US-016, US-017, US-021, US-022, US-023, US-024, US-029

---

### 1. User Story

Als **Nutzer** möchte ich bei jeder Schaltfläche, die einen Speicher-, Lösch- oder sonstigen Schreib-Request auslöst, sofort sehen, dass meine Aktion verarbeitet wird, und sie währenddessen nicht versehentlich ein zweites Mal auslösen können, damit ich bei einer langsamen Verbindung nicht im Unklaren bin, ob meine Eingabe angekommen ist, und keine Duplikate (doppelte Stakeholder, doppelte Assessment-Saves, doppelte Nutzer/Projekte) erzeuge.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Kein einzelner PRD-Abschnitt; leitet sich aus CLAUDE.md Abschnitt 3.7 („Angular: … `HttpClient`-Fehler werden zentral behandelt“, sinngemäß auf konsistentes Lade-/Verarbeitungsfeedback erweitert) sowie aus dem UX-Review vom 23.08.2026 ab (Befund „P0 #1“: kein einziges Formular außer Login/Passwort-Änderung hat überhaupt ein `isSubmitting`-Flag, und selbst dort ändert sich nur `[disabled]`, kein sichtbarer Zustand).
- **Relevant für DDD:** Presentation-Schicht, quer zu mehreren Bounded Contexts (StakeholderManagement, StakeholderAssessment, IdentityAccess, ProjectManagement) — keine Domain-Logik betroffen, reines UI-Interaktionsmuster.

### 3. Akzeptanzkriterien

- [x] Alle produktiven Buttons, die einen schreibenden HTTP-Request auslösen, erhalten ein `isSubmitting`-Flag (oder gleichwertiges Signal), das ab Request-Start `true` ist: Stakeholder anlegen, Stakeholder bearbeiten, Stakeholder-Löschen bestätigen, Stakeholder wiederherstellen, Assessment speichern, Nutzer anlegen, Nutzer-Passwort zurücksetzen, Projekt anlegen, Projektmitglied hinzufügen/entfernen/Rolle ändern (`ProjectMembershipManagerComponent`).
- [x] Solange `isSubmitting === true` ist der auslösende Button über `[disabled]` gesperrt **und** zeigt einen sichtbar veränderten Zustand (z. B. Textwechsel „Wird gespeichert…“/„Wird gelöscht…“ und/oder ein einfacher Inline-Spinner) — ein reines `[disabled]` ohne visuellen Unterschied zum Normalzustand gilt als nicht erfüllt.
- [x] Ein zweiter Klick bzw. ein zweites `ngSubmit` während eines laufenden Requests löst nachweislich keinen zweiten HTTP-Request aus; mindestens ein Komponententest pro Formular-Typ (z. B. `create-stakeholder-form`, `assessment-tabs`) simuliert einen Doppel-Trigger und verifiziert über `HttpTestingController`, dass genau ein Request ausstehend ist.
- [x] `isSubmitting` wird sowohl im `next`- als auch im `error`-Callback wieder auf `false` gesetzt, sodass ein fehlgeschlagener Request erneut versucht werden kann, ohne die Seite neu laden zu müssen.
- [x] Das bestehende `isSubmitting`-Verhalten in `login-page.component.ts` und `password-change-modal.component.ts` wird auf dasselbe sichtbare Muster (Textwechsel/Spinner statt nur `[disabled]`) angeglichen, damit die App ein einheitliches Verarbeitungs-Feedback zeigt.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/stakeholders/create-stakeholder-form/create-stakeholder-form.component.ts` (+ `.html`)
- `frontend/src/app/features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component.ts` (+ `.html`)
- `frontend/src/app/features/stakeholders/delete-stakeholder-dialog/delete-stakeholder-dialog.component.ts` (+ `.html`)
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.ts` (+ `.html`, Wiederherstellen-Button)
- `frontend/src/app/features/assessments/assessment-tabs/assessment-tabs.component.ts` (+ `.html`)
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` (+ `.html`, Nutzer anlegen + Passwort zurücksetzen je Zeile)
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` (+ `.html`)
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` (+ `.html`)
- `frontend/src/app/features/auth/login-page/login-page.component.html`
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.html`

**Wichtige Invarianten & Validierungsregeln:**

- Reine UI-Zustandslogik — keine Domain- oder Application-Regel wird verändert. Serverseitige Constraints (z. B. Unique-Regeln) bleiben die eigentliche Sicherheitsnetz-Ebene; der Doppel-Submit-Schutz hier ersetzt sie nicht, sondern verhindert nur unnötige/verwirrende Duplikat-Requests aus der UI.
- Da dasselbe Muster in acht+ Komponenten wiederholt wird, ist ein gemeinsamer, wiederverwendbarer Baustein (z. B. ein kleines Utility/eine Basisklasse oder eine gemeinsame CSS-Klasse für den Verarbeitungszustand unter `frontend/src/app/shared/`) der reinen Kopie des Musters in jede Komponente vorzuziehen (CLAUDE.md-Grundsatz: keine unnötige Duplikation).

### Anmerkungen des Dev-Agenten

- **PrimeNG-Migration bewusst nicht Teil dieser Story.** `.claude/agents/frontend.md` verweist inzwischen
  verbindlich auf `docs/specs/SPEC-00-Design-System.md` (PrimeNG als Komponentenbibliothek). Diese Story
  wurde jedoch gemäß expliziter Vorgabe des Backlogs (Phase 9, US-047 „Bestehendes Frontend auf das
  Design-System migrieren“ hängt selbst von US-043 ab) und der Aufgabenstellung ausschließlich mit den
  bestehenden Plain-CSS-/Standard-HTML-Mustern des Frontends umgesetzt — PrimeNG ist zum Zeitpunkt dieser
  Story noch nicht als Abhängigkeit installiert (`package.json` enthält kein `primeng`). Die neue
  `ProcessingButtonComponent` ist bewusst so gebaut (reines `<button>` + CSS-Klassen, keine Bibliotheks-
  Kopplung), dass sie in US-047 durch eine PrimeNG-`p-button`-Variante mit `loading`-State ersetzt bzw.
  darauf migriert werden kann, ohne dass die Aufrufstellen in den Formular-Komponenten sich ändern müssen
  (Inputs `isSubmitting`/`label`/`submittingLabel` bleiben stabil).
- **Zoneless Change Detection (Angular 22, kein `zone.js` in `package.json`).** Beim Schreiben des
  Story-Tests hat sich gezeigt, dass ein zweiter `fixture.detectChanges()`-Aufruf nach einer *direkten*
  TS-Zustandsänderung (z. B. `component['onSubmit']()` gefolgt von einer zweiten `detectChanges()`) in
  diesem zonelosen Setup **nicht** zuverlässig ein erneutes Rendering auslöst, selbst mit
  `changeDetectorRef.markForCheck()`. Ursache: Angular plant Re-Checks zonelos nur auf Basis von echten
  „Producern“ (Signals, `async`-Pipe, DOM-Events) — eine rohe Zuweisung außerhalb eines DOM-Event-Handlers
  wird nicht automatisch gemeldet. Sichtbare Zustandswechsel im Story-Test werden deshalb über einen
  echten `button.click()` (statt eines direkten Methodenaufrufs) ausgelöst, wenn im selben Test danach
  noch ein DOM-Zustand geprüft wird; wo nur die TS-Property geprüft wird (Akzeptanzkriterium 1/3/4),
  bleibt der direkte Methodenaufruf unverändert zulässig. Diese Erkenntnis ist für künftige Stories mit
  DOM-Assertions nach asynchronen Zustandswechseln relevant und wird hier dokumentiert, damit sie nicht
  erneut aufwendig recherchiert werden muss.

### So probierst du es aus

1. Gesamtsystem starten: `docker-compose up` (siehe README.md).
2. Als Admin anmelden (Seed-Admin-Zugangsdaten laut US-005/README) und einen Klickpfad mit
   Schreib-Request wählen, z. B.:
   - Projekt-Workspace → Stakeholder-Liste → Formular „Stakeholder anlegen“ ausfüllen und
     „Anlegen“ klicken: Button zeigt sofort „Wird angelegt…“ mit Spinner und ist gesperrt, bis die
     Antwort eintrifft; ein zweiter Klick währenddessen tut nichts.
   - Admin-Bereich → Nutzerverwaltung → „Passwort zurücksetzen“ neben einem Nutzer klicken: nur der
     angeklickte Zeilen-Button zeigt „Wird zurückgesetzt…“, die übrigen Zeilen bleiben unverändert
     bedienbar.
   - Stakeholder-Detailseite → Assessment-Tab der eigenen Rolle → „Speichern“ klicken: Button zeigt
     „Wird gespeichert…“ mit Spinner.
   - Login-Screen bzw. erzwungene Passwortänderung: „Anmelden“/„Passwort ändern“ zeigen jetzt
     ebenfalls Textwechsel + Spinner statt nur eines deaktivierten Buttons.
3. Erwartetes Ergebnis in jedem Fall: Button ist während der Verarbeitung sichtbar anders (nicht nur
   grau/deaktiviert) und wird nach Abschluss (Erfolg oder Fehler) wieder normal bedienbar.

**Story-Tests isoliert ausführen:**

```
ng test --include='**/us-043*.spec.ts'
```

**Gesamte Frontend-Testsuite:** `ng test` — 119 von 119 Tests grün (Stand dieser Story).
**Lint:** `ng lint` — fehlerfrei. **Build:** `ng build` — erfolgreich.

### Status

Fertig am 23.08.2026. Umsetzung: PR auf `main` (Branch
`feature/US-043-formular-feedback-doppelsubmit-schutz`), Auto-Merge gemäß ADR-0003 aktiviert.
