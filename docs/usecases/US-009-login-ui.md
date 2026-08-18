**ID:** US-009
**Titel:** Login-Screen UI (S1)
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-006, US-008

---

### 1. User Story

Als **Nutzer** möchte ich **mich über ein Login-Formular mit E-Mail und Passwort in der Weboberfläche anmelden**, damit **ich ohne technisches Vorwissen Zugriff auf meine Projekte erhalte**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S1 — Login)
- **Relevant für DDD:** Presentation-Schicht (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] Screen `S1` zeigt Formularfelder E-Mail und Passwort sowie einen Submit-Button „Anmelden“.
- [ ] Bei erfolgreichem Login navigiert die Anwendung zur Projektübersicht (S2, siehe US-018) bzw. bei `must_change_password = true` zunächst zum Passwort-Änderungs-Modal (US-008).
- [ ] Bei `401`-Antwort der Login-API zeigt das Formular eine nicht-blockierende Fehlermeldung „E-Mail oder Passwort ist falsch.“ und leert das Passwortfeld.
- [ ] Submit-Button ist deaktiviert, solange E-Mail oder Passwort leer sind (Client-seitige Basisvalidierung, ersetzt nicht die Server-Validierung).
- [ ] E2E-/Komponententest deckt erfolgreichen Login und Fehlerfall ab.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/auth/login-page/login-page.component.ts`
- `frontend/src/app/features/auth/auth.service.ts`
- Komponententest `frontend/src/app/features/auth/login-page/login-page.component.spec.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Kein Registrierungslink/-formular auf dem Login-Screen (keine Selbstregistrierung, Abschnitt 1.4).

### Anmerkungen des Dev-Agenten

- `/projects` (Projektübersicht, S2) existiert als Ziel-Screen im Backlog erst ab US-018. Die
  Navigation dorthin ist bereits vollständig verdrahtet (`Router.navigate(['/projects'])`); solange
  US-018 nicht umgesetzt ist, führt sie auf eine noch nicht registrierte Route. Dies wird nicht als
  Vorgriff auf US-018 gewertet, da kein Zielscreen-Code vorweggenommen wird — nur der bereits durch
  diese Story geforderte Navigationsaufruf.
- Grundlegende Routing- (`app.routes.ts`, `provideRouter`) und Session-Infrastruktur
  (`TokenStorageService`, `authInterceptor`) neu eingeführt, da sie für „nach erfolgreichem Login
  navigieren“ sowie für die authentifizierten Requests des in US-008 bereits gebauten
  Passwort-Änderungs-Modals zwingend nötig sind — schließt den in der US-008-Story-Datei
  angekündigten Integrationsschritt ab.
- `frontend/nginx.conf` um einen Reverse-Proxy für `/api/` auf den `api`-Container ergänzt: Der
  Angular-Code ruft bewusst nur relative `/api/v1/...`-Pfade auf (kein hartkodiertes
  Backend-Origin); ohne Proxy hätte nginx in der docker-compose-Umgebung jeden `/api/`-Request
  fälschlich als SPA-Route behandelt. Per Smoke-Test verifiziert (Login über
  `http://localhost:4200/api/v1/auth/login` liefert `200`).
- Wurzelkomponente `App` erhält einen `<router-outlet>` (vorher reine Platzhalterseite aus US-001).

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-009-login-ui`), Auto-Merge
gemäß ADR-0003 aktiviert.
