**ID:** US-057
**Titel:** Login-Flow bleibt nach erfolgreicher Anmeldung dauerhaft im Verarbeitungs-Zustand hängen
**Bounded Context / Domain:** Frontend-Shell (cross-cutting, analog zu US-043/US-044/US-050)
**Abhängigkeiten:** US-009, US-043, US-050

**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich nach erfolgreicher Anmeldung zuverlässig zur Projektübersicht (bzw. bei erzwungener Passwort-Änderung zum entsprechenden Dialog) weitergeleitet werden, statt dass der „Anmelden“-Button dauerhaft im Zustand „Wird angemeldet…“ hängen bleibt, obwohl die Anmeldung serverseitig bereits erfolgreich war.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** Während der QA-Verifikation von US-050 (explorativer Test, 25.08.2026) festgestellt — kein Einzelbefund aus `docs/bugs/bugs.md`, sondern ein während dieser Story neu entdeckter Regressions-/Bestandsfehler.
- **Reproduktion:** Frisches System, gültige Zugangsdaten (z. B. `admin@example.com` + Seed-Passwort) in das Login-Formular eingeben, „Anmelden“ klicken. `POST /api/v1/auth/login` antwortet laut Netzwerk-Log erfolgreich mit `200 OK`. Erwartet: Weiterleitung zu `/projects` (bzw. Anzeige des `PasswordChangeModalComponent`, falls `mustChangePassword: true`). Tatsächlich: Der Button bleibt dauerhaft im Verarbeitungs-Zustand „Wird angemeldet…“ hängen, keine Weiterleitung, keine Fehlermeldung — die Seite bleibt unverändert auf `/login` stehen.
- **Root Cause (bereits identifiziert, siehe `docs/usecases/US-050-verlaesslicher-lade-zustand-listen.md`, Abschnitt „Anmerkungen des Dev-Agenten“):** Das Frontend läuft zoneless (kein `zone.js`, Angular `^22.1.0`). `LoginPageComponent.onSubmit()` (`frontend/src/app/features/auth/login-page/login-page.component.ts`) setzt in den `next`-/`error`-Handlern des `AuthService.login(...).subscribe(...)`-Aufrufs u. a. `this.isSubmitting = false` per reiner Feldzuweisung, **ohne** anschließenden `ChangeDetectorRef.markForCheck()`-Aufruf. Da der HTTP-Response außerhalb eines von Angular beobachteten Ereignisses eintrifft, wird die Komponente nicht für die nächste Change-Detection-Runde markiert — das DOM (insbesondere der an `isSubmitting` gebundene Zustand von `app-processing-button`, US-043) aktualisiert sich nicht sichtbar, obwohl die zugrunde liegende Property korrekt gesetzt wurde. Exakt dasselbe Muster, das in US-050 an fünf anderen Stellen behoben wurde.
- **Schweregrad:** Betrifft **jeden** Login-Vorgang, nicht nur Randfälle — insbesondere blockiert es jeden neu angelegten Nutzer mit `mustChangePassword: true` vollständig am Systemzugang, da dieser nie über den Login-Screen hinauskommt.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht (`LoginPageComponent`), keine Änderung an `AuthService`, Endpunkten oder Validierung.

### 3. Akzeptanzkriterien

- [ ] Nach einer erfolgreichen Anmeldung (`mustChangePassword: false`) navigiert die Anwendung ohne jede weitere Nutzerinteraktion zuverlässig zu `/projects`.
- [ ] Nach einer erfolgreichen Anmeldung mit `mustChangePassword: true` erscheint ohne weitere Nutzerinteraktion das `PasswordChangeModalComponent`.
- [ ] Bei einer fehlgeschlagenen Anmeldung (z. B. `401`) verlässt der Button ohne weitere Nutzerinteraktion zuverlässig den Verarbeitungs-Zustand und die Fehlermeldung „E-Mail oder Passwort ist falsch.“ erscheint.
- [ ] Ein automatisierter Test (`HttpTestingController`, analog zum in US-050 etablierten Muster) beweist für Erfolgs- **und** Fehlerfall: nach `flush()` **ohne** zusätzliche simulierte Interaktion zeigt das DOM den jeweils korrekten Endzustand (Navigation ausgelöst bzw. Fehlermeldung sichtbar, Button nicht mehr im Verarbeitungs-Zustand).
- [ ] Bestehende Tests (`login-page.component.spec.ts`, `us-043-*.spec.ts` sofern dort Login-Bezug, `us-044-http-error-handling.spec.ts`) bleiben grün bzw. werden ergänzt, nicht ersetzt.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention (`us-057*.spec.ts`), ausschließlich gegen obige Akzeptanzkriterien, ein Testfall je Kriterium in Dokument-Reihenfolge.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Datei:**
- `frontend/src/app/features/auth/login-page/login-page.component.ts` (`onSubmit()`: `ChangeDetectorRef` injizieren, `markForCheck()` im `next`- und `error`-Handler analog zu den in US-050 gefixten Stellen aufrufen).

**Wichtige Invarianten:**
- Reine Presentation-/Reaktivitäts-Änderung — keine Änderung an `AuthService`, keine Änderung des fachlichen Ablaufs aus US-008/US-009/US-013 (Login, erzwungene Passwort-Änderung), keine neuen Endpunkte.
- Kein neues, lokal erfundenes Ladezustands-Muster — `isSubmitting`/`app-processing-button` (US-043) bleiben unverändert, es wird ausschließlich die fehlende Change-Detection-Markierung ergänzt.

**Hinweis zum verwandten Backlog-Eintrag `US-051`:** Die dort dokumentierte PO-Diagnose („Frontend-Code nach Review korrekt, Fehler vermutlich serverseitig“) wurde vor der Root-Cause-Erkenntnis aus US-050 erstellt. Das dort beschriebene Symptom (Button hängt dauerhaft im Verarbeitungs-Zustand nach `onResetPassword`) folgt strukturell demselben Muster wie hier — bevor an US-051 mit einer Backend-Fehlersuche begonnen wird, sollte zuerst geprüft werden, ob dort ebenfalls nur das fehlende `markForCheck()` die Ursache ist. Keine Änderung an US-051 im Rahmen dieser Story (eigener Scope), nur als Hinweis für die Story-Reihenfolge festgehalten.

### Anmerkungen des Product Owners

Diese Story wurde unmittelbar nach Abschluss von US-050 auf Empfehlung des QA-Agenten aus dessen explorativem Test heraus angelegt (siehe „Anmerkungen des QA-Agenten“ in `US-050-verlaesslicher-lade-zustand-listen.md`). Bewusst **nicht** in US-050 mit-gefixt, da `LoginPageComponent` nicht zu den dort in Abschnitt 4 benannten fünf Fundstellen gehörte (CLAUDE.md Abschnitt 3: „nur an aktueller Story arbeiten, kein Vermischen“). Bewusst auch **nicht** als „Zoneless-Reaktivität systematisch nachziehen“-Sammelstory für alle vom Dev-Agenten in US-050 zusätzlich genannten, noch unbehobenen Stellen (`onCreateUser`, `onChangeRole`, `onRemoveMember` in den Admin-Komponenten, `project-workspace-layout.component.ts`, `stakeholder-list.component.ts`) geschnitten, da diese Story hier gezielt den einen bereits konkret reproduzierten, hochpriorisierten Login-Blocker behebt. Eine separate Folge-Story für die verbleibenden, noch nicht konkret reproduzierten Verdachtsstellen bleibt offen für spätere Priorisierung.
