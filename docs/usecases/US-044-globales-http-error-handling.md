**ID:** US-044
**Titel:** Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-006, US-009, US-018, US-019
**Status:** fertig am 23.08.2026, PR siehe Feature-Branch `feature/US-044-http-error-handling`

---

### 1. User Story

Als **Nutzer** möchte ich bei einer abgelaufenen Sitzung oder einem fehlgeschlagenen Request eine klare, konsistente Rückmeldung erhalten — inklusive automatischer Weiterleitung zum Login bei `401`, statt vor einer leeren oder eingefrorenen Seite zu sitzen — damit ich sofort verstehe, was passiert ist und wie ich weiterarbeiten kann.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** CLAUDE.md Abschnitt 3.7 („`HttpClient`-Fehler werden zentral über einen `HttpInterceptor` behandelt (z. B. globales Mapping von `401`/`403` auf Redirect/Fehlermeldung)“) — dieser Interceptor existiert aktuell nicht; nur `authInterceptor` (Token anhängen) ist registriert. UX-Review vom 23.08.2026, Befund „P0 #2“.
- **Relevant für DDD:** Presentation-Schicht (Composition Root `app.config.ts`), quer zu allen Bounded Contexts, da jede Feature-Komponente betroffen ist, die `HttpClient` nutzt.

### 3. Akzeptanzkriterien

- [x] Ein neuer `httpErrorInterceptor` ist über `provideHttpClient(withInterceptors([...]))` in `app.config.ts` **nach** `authInterceptor` global registriert.
- [x] Bei HTTP `401 Unauthorized` löscht der Interceptor das gespeicherte Token (`TokenStorageService.clearToken()`) und navigiert zu `/login` (sofern der Nutzer sich nicht bereits dort befindet), inklusive eines für den Nutzer sichtbaren Hinweistexts („Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.“).
- [x] Bei HTTP `403 Forbidden` erfolgt **kein** automatischer Redirect (da `403` auch fachlich gültige, dauerhafte Zustände abbildet, z. B. fehlende Projektrolle) — der Fehler wird unverändert an die aufrufende Komponente durchgereicht, jedoch zusätzlich zentral protokolliert (mindestens `console.error` mit Request-URL und Status als Ansatzpunkt für künftiges Client-seitiges Logging).
- [x] Die bislang fehlenden `error`-Handler bei lesenden (`GET`) Requests werden ergänzt in: `stakeholder-list.component.ts` (`loadStakeholders`), `project-overview.component.ts` (`ngOnInit`), `project-workspace-layout.component.ts` (`ngOnInit`), `users-admin.component.ts` (`loadUsers`), `projects-admin.component.ts` (`loadProjects`) — jeweils mit einer konsistenten Fehlermeldung („Daten konnten nicht geladen werden. Bitte versuche es erneut.“) statt einer stumm leeren Ansicht.
- [x] Ein Interceptor-Test (`http-error.interceptor.spec.ts`) verifiziert das Verhalten isoliert über `HttpTestingController` für `401`, `403` und einen generischen `5xx`-Fehler.
- [x] Mindestens ein Komponententest (z. B. auf `project-workspace-layout.component.spec.ts`) verifiziert, dass bei einem simulierten `401`-Response `TokenStorageService.clearToken()` aufgerufen und zu `/login` navigiert wird (End-to-End innerhalb des Interceptor+Komponenten-Zusammenspiels, nicht nur isoliert im Interceptor-Test).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/core/interceptors/http-error.interceptor.ts` (neu) + `http-error.interceptor.spec.ts`
- `frontend/src/app/app.config.ts` (Interceptor registrieren, Reihenfolge beachten)
- `frontend/src/app/features/stakeholders/stakeholder-list/stakeholder-list.component.ts`
- `frontend/src/app/features/projects/project-overview/project-overview.component.ts`
- `frontend/src/app/features/workspace/project-workspace-layout/project-workspace-layout.component.ts`
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts`
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Der Interceptor ist eine reine Client-UX-Schicht und ersetzt nicht die serverseitige Autorisierung (CLAUDE.md Abschnitt 3.1) — `[Authorize]`/Policy-Checks im Backend bleiben unverändert die eigentliche Sicherheitsgrenze.
- Die Reihenfolge der Interceptoren ist relevant: `authInterceptor` muss vor `httpErrorInterceptor` laufen, damit ein Request überhaupt mit (ggf. abgelaufenem) Token abgeschickt wird, bevor der Error-Interceptor auf die `401`-Response reagiert.

### Anmerkungen des Dev-Agenten

- Diese Story ist unabhängig von US-045 (Abmelden-Funktion) umsetzbar — der Redirect-Zielpfad `/login` existiert bereits unabhängig davon. Beide Stories teilen sich denselben Baustein `TokenStorageService.clearToken()`; keine gegenseitige Blockade, aber bei paralleler Umsetzung auf Merge-Konflikte in `app.config.ts` achten.
- **Umsetzung (23.08.2026):** Der sichtbare Hinweistext bei `401` wird über einen neuen, minimalen `SessionNoticeService` (`core/services/session-notice.service.ts`) transportiert statt über einen Router-Query-Param — Begründung und Alternativen siehe `docs/adr/0008-session-notice-service-statt-query-param.md`.
- Beide Wortlaute („Sitzung abgelaufen“ und „Daten konnten nicht geladen werden“) liegen zentral in `core/messages/http-error-messages.ts` (frontend.md Abschnitt 2: UI-Texte nicht verteilt hartcodieren), damit künftige Wording-Anpassungen (UX/UI) an einer Stelle erfolgen.
- Für den GET-Fehlerzustand der fünf betroffenen Komponenten wurde eine gemeinsame, globale CSS-Klasse `.load-error` in `src/styles.css` ergänzt (kein `::ng-deep`, kein dupliziertes Component-CSS je Komponente), analog zur Begründung in frontend.md Abschnitt 2 „globale Anpassungen gehören in ein gemeinsames Stylesheet“.
- Keine Abweichung von PRD/Story-Vorgaben; alle fünf Akzeptanzkriterien sind 1:1 umgesetzt.
