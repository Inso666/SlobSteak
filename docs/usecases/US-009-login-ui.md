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
