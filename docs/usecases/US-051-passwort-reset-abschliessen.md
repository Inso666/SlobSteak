**ID:** US-051
**Titel:** „Passwort zurücksetzen“ in der Nutzerverwaltung schließt zuverlässig ab
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-013, US-016, US-043

**Status:** offen

---

### 1. User Story

Als **Systemadministrator** möchte ich, dass ein Klick auf „Passwort zurücksetzen“ in der Nutzerverwaltung zuverlässig abschließt und mir das neue temporäre Passwort anzeigt, statt dass der Button dauerhaft im Verarbeitungs-Zustand hängen bleibt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt `/admin/users`: „Bei Klick auf ‚Passwort zurücksetzen‘ passiert nichts, außer dass der Button in eine Warteschleife geht.“
- **Verifikation durch PO (Code-Review):** `users-admin.component.ts#onResetPassword` ist clientseitig korrekt implementiert — sowohl der `next`- als auch der `error`-Handler des `subscribe()` entfernen die User-ID zuverlässig aus `resettingUserIds` (wodurch `app-processing-button` seinen „Wird zurückgesetzt…“-Zustand beenden würde) und setzen eine Erfolgs- bzw. Fehlermeldung. Ein dauerhaftes Hängen des Buttons ohne jede Endzustands-Meldung ist mit diesem Code **nur** erklärbar, wenn der zugrunde liegende HTTP-Request selbst nie mit `next` oder `error` terminiert (z. B. ein hängender Request/Deadlock im Backend, ein fehlender Response oder ein clientseitig unbehandelter Ausnahmefall vor dem `subscribe()`).
- Relevante Backend-Dateien (gefunden, aber im Rahmen dieser PO-Verifikation nicht im Detail geprüft): `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs`, `src/SlobSteak.Application/Identity/ResetPasswordService.cs`. Die eigentliche Ursachenanalyse ist Aufgabe des Backend-Agenten im Rahmen dieser Story.
- **Relevant für DDD:** Backend-Fix voraussichtlich in `SlobSteak.Application`/`SlobSteak.Api` (Identity-Kontext), ggf. ergänzt um ein Frontend-seitiges Timeout/Fehlerverhalten, falls der Request grundsätzlich lange dauern kann und das kein Bug, sondern ein fehlendes Timeout ist.

### 3. Akzeptanzkriterien

- [ ] Die tatsächliche Ursache ist ermittelt und im PR dokumentiert (z. B. per Reproduktion gegen einen lokal laufenden `docker-compose`-Stack: Request-Log, HTTP-Statuscode, Antwortzeit).
- [ ] `POST /api/v1/admin/users/{id}/reset-password` liefert bei einer gültigen Anfrage zuverlässig eine erfolgreiche Response innerhalb einer für den Endpoint angemessenen Zeit (kein Hängen/Timeout).
- [ ] Nach Klick auf „Passwort zurücksetzen“ zeigt die UI zuverlässig entweder die Erfolgsmeldung mit temporärem Passwort oder eine Fehlermeldung — nie einen dauerhaft hängenden Verarbeitungs-Zustand.
- [ ] Ein automatisierter Backend-Test (xUnit) deckt den Erfolgsfall des Reset-Endpoints ab; ein automatisierter Frontend-Test deckt ab, dass `resettingUserIds` nach Abschluss des Requests (Erfolg **und** Fehler) wieder leer ist.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention, ausschließlich gegen diese Akzeptanzkriterien.
- [ ] Kein bestehender Test wird gebrochen; `dotnet test` und `ng test` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu prüfende Dateien:**
- `src/SlobSteak.Api/Controllers/Admin/AdminUserController.cs`
- `src/SlobSteak.Application/Identity/ResetPasswordService.cs`
- `frontend/src/app/features/admin/admin-users.service.ts`
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts`

**Wichtige Invarianten:**
- Das bestehende Verhalten aus US-013 (Berechtigungsprüfung, temporäres Passwort erzwingt erneute Änderung bei nächstem Login) darf durch den Fix nicht verändert werden — ausschließlich der beschriebene Fehlerfall wird behoben.

### Anmerkungen des Product Owners

Die genaue technische Ursache konnte im Rahmen dieser Bug-Verifikation nicht abschließend bestimmt werden (kein laufender Stack zur Reproduktion verfügbar) — der Frontend-Code ist nach Review korrekt; der Fehler liegt mit hoher Wahrscheinlichkeit serverseitig oder in der Netzwerkkommunikation. Der Dev-Agent beginnt daher mit einer Reproduktion gegen einen laufenden `docker-compose`-Stack, bevor er einen Fix ansetzt.
