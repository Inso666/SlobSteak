**ID:** US-052
**Titel:** Stakeholderverwaltung nach Projektauswahl zuverlässig anzeigen
**Bounded Context / Domain:** ProjectManagement / StakeholderManagement (Frontend-Shell-Schnittstelle)
**Abhängigkeiten:** US-019, US-025, US-026, US-044

**Status:** offen

---

### 1. User Story

Als **Projektmitglied** möchte ich nach einem Klick auf ein Projekt in der Projektübersicht zuverlässig die Stakeholderverwaltung dieses Projekts sehen — oder, falls ich fachlich keinen Zugriff habe, eine klare, verständliche Erklärung dafür, statt einer wirkungslos aussehenden, leeren Seite.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt `/projects/:id/stakeholders`: „Bei Klick auf ein Projekt in der Projektübersicht komme ich zu einer leeren Seite. Sollte die Stakeholderverwaltung bereits implementiert sein, würde ich diese hier erwarten.“
- **Verifikation durch PO (Code-Review):** Die Stakeholderverwaltung **ist** bereits vollständig implementiert (US-025/US-026, `StakeholderListComponent`) und in `app.routes.ts` korrekt unter `projects/:id/stakeholders` (Default-Redirect von `projects/:id`) eingehängt. Der berichtete leere Bildschirm ist damit kein fehlendes Feature, sondern ein konkreter, im Code nachvollziehbarer Fehlerfall:
  1. `roleGuard` (`core/guards/role.guard.ts`) prüft die Rolle des Nutzers **in diesem Projekt** per eigenem `GET`-Aufruf (`ProjectsService.getProject`). Hat der Nutzer **keine** Mitgliedschaft in diesem Projekt (z. B. ein Systemadmin, der ein Projekt über `/admin/projects` angelegt, sich selbst aber nicht als Mitglied zugewiesen hat — laut PRD Abschnitt 2.3 fachlich korrekt kein Zugriff), schlägt dieser Aufruf fehl bzw. liefert eine Rolle außerhalb der erlaubten Liste; der Guard leitet dann korrekt auf die Kind-Route `/projects/:id/access-denied` um.
  2. **Der eigentliche Fehler:** `ProjectWorkspaceLayoutComponent` (Elternroute `projects/:id`) führt in seiner eigenen `ngOnInit()` **unabhängig vom Guard einen zweiten, identischen** `getProject()`-Aufruf aus, um Titel/Rollen-Badge zu befüllen. Für denselben nicht-berechtigten Nutzer schlägt **dieser** Aufruf ebenfalls fehl → `loadError = LOAD_ERROR_MESSAGE` (Text: „Daten konnten nicht geladen werden. Bitte versuche es erneut.“) und `project` bleibt `null`.
  3. Das Template `project-workspace-layout.component.html` rendert Header, Tab-Navigation **und den `<router-outlet>`** ausschließlich innerhalb von `@if (project) { … }`. Da `project` in diesem Fall `null` bleibt, wird der gesamte Block — inklusive des `<router-outlet>`, in dem die vom Guard korrekt angesteuerte `AccessDeniedComponent` mit ihrer erklärenden Meldung („Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle in diesem Projekt.“) liegen würde — **gar nicht gerendert**. Sichtbar ist für den Nutzer ausschließlich die knappe, optisch unauffällige, generische `LOAD_ERROR_MESSAGE`-Zeile, keine Seiten-Chrome, keine Erklärung, keine Stakeholderverwaltung — exakt das vom Bug-Melder beschriebene „leere Seite“-Erlebnis.
  4. Dieselbe Doppel-Fetch-Falle greift analog auch für Nutzer, die zwar berechtigt sind, deren Requests aber (siehe US-049) beim allerersten Laden nach Systemstart ungewöhnlich lange dauern — auch dort könnte der zweite, redundante Aufruf unnötig zur wahrgenommenen Verzögerung/Fehleranfälligkeit beitragen.
- **Relevant für DDD:** Reine Presentation-Schicht (Angular Guard + Layout-Komponente), keine Backend-Änderung nötig.

### 3. Akzeptanzkriterien

- [ ] Ein Projektmitglied mit gültiger Rolle sieht nach Klick auf sein Projekt zuverlässig die Stakeholderverwaltung (`StakeholderListComponent`) als Standard-Tab — keine Regression zu US-025/US-026.
- [ ] Ein Nutzer ohne Mitgliedschaft im gewählten Projekt (inkl. Systemadmin ohne eigene Zuweisung) sieht die vorhandene, erklärende „Kein Zugriff“-Meldung (`AccessDeniedComponent`) — nicht die generische, nichtssagende Lade-Fehlermeldung und nicht nur eine leere/kaum sichtbare Textzeile.
- [ ] `ProjectWorkspaceLayoutComponent` führt keinen redundanten, mit dem Guard doppelten `getProject()`-Aufruf mehr aus, dessen Fehlschlag das Rendering des `router-outlet` verhindert (z. B. durch Wiederverwendung des vom Guard bereits geladenen Projekts, oder durch Entkopplung: Header/Tabs-Fehler blockieren nicht mehr das Rendering des `router-outlet`).
- [ ] Ein automatisierter Test bildet exakt dieses Szenario ab: Guard leitet zu `access-denied` um, `ProjectWorkspaceLayoutComponent`s eigener Ladevorgang schlägt (zeitgleich) fehl — Ergebnis: die „Kein Zugriff“-Meldung ist sichtbar im DOM, nicht `LOAD_ERROR_MESSAGE` anstelle der gesamten Seite.
- [ ] Bestehende Tests zu US-019/US-025/US-026/US-044 (insbesondere der `project-workspace-layout.component.ts (ngOnInit)`-Fall in `us-044-http-error-handling.spec.ts`) bleiben grün bzw. werden präzisiert, falls sich ihr bisheriges Verhalten (kompletter `loadError`-Block statt Router-Outlet) durch den Fix ändert — CLAUDE.md Abschnitt 3 Definition of Done gilt unverändert (Test anpassen, nicht entfernen).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts` / `.html`
- `frontend/src/app/core/guards/role.guard.ts` (ggf. zur Wiederverwendung des bereits geladenen Projekts, z. B. über einen Route-`resolve`r oder einen einfachen In-Memory-Cache je Navigation, statt zwei unabhängiger Requests)
- `frontend/src/app/core/interceptors/us-044-http-error-handling.spec.ts` (betroffener Testfall, siehe oben)

**Wichtige Invarianten:**
- Die serverseitige Autorisierung (US-007) bleibt unverändert die eigentliche Sicherheitsgrenze — diese Story behebt ausschließlich die clientseitige Darstellung/Orchestrierung.
- Keine Änderung an der Sichtbarkeitsmatrix für Map-/Verteiler-Tab (US-019 Akzeptanzkriterium 3/4).

### Anmerkungen des Product Owners

Diese Story wurde bewusst **nicht** als „Stakeholderverwaltung fehlt“ formuliert (das Feature existiert bereits vollständig, siehe US-025/US-026), sondern als der tatsächlich im Code gefundene Anzeige-Fehler — CLAUDE.md Abschnitt 6: „keine stille Feature-Erweiterung, kein stilles Weglassen“. Sollte die Reproduktion beim Dev-Agenten einen anderen Auslöser als den hier beschriebenen Doppel-Fetch zeigen, ist das entsprechend zu dokumentieren.
