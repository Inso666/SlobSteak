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

- [ ] Alle produktiven Buttons, die einen schreibenden HTTP-Request auslösen, erhalten ein `isSubmitting`-Flag (oder gleichwertiges Signal), das ab Request-Start `true` ist: Stakeholder anlegen, Stakeholder bearbeiten, Stakeholder-Löschen bestätigen, Stakeholder wiederherstellen, Assessment speichern, Nutzer anlegen, Nutzer-Passwort zurücksetzen, Projekt anlegen, Projektmitglied hinzufügen/entfernen/Rolle ändern (`ProjectMembershipManagerComponent`).
- [ ] Solange `isSubmitting === true` ist der auslösende Button über `[disabled]` gesperrt **und** zeigt einen sichtbar veränderten Zustand (z. B. Textwechsel „Wird gespeichert…“/„Wird gelöscht…“ und/oder ein einfacher Inline-Spinner) — ein reines `[disabled]` ohne visuellen Unterschied zum Normalzustand gilt als nicht erfüllt.
- [ ] Ein zweiter Klick bzw. ein zweites `ngSubmit` während eines laufenden Requests löst nachweislich keinen zweiten HTTP-Request aus; mindestens ein Komponententest pro Formular-Typ (z. B. `create-stakeholder-form`, `assessment-tabs`) simuliert einen Doppel-Trigger und verifiziert über `HttpTestingController`, dass genau ein Request ausstehend ist.
- [ ] `isSubmitting` wird sowohl im `next`- als auch im `error`-Callback wieder auf `false` gesetzt, sodass ein fehlgeschlagener Request erneut versucht werden kann, ohne die Seite neu laden zu müssen.
- [ ] Das bestehende `isSubmitting`-Verhalten in `login-page.component.ts` und `password-change-modal.component.ts` wird auf dasselbe sichtbare Muster (Textwechsel/Spinner statt nur `[disabled]`) angeglichen, damit die App ein einheitliches Verarbeitungs-Feedback zeigt.

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

_(vom Dev-Agenten bei Umsetzung zu ergänzen, falls Abweichungen vom PRD/dieser Story nötig werden.)_
