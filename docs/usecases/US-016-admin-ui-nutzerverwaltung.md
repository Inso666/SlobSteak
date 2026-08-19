**ID:** US-016
**Titel:** Admin-Bereich UI: Nutzerverwaltung
**Bounded Context / Domain:** IdentityAccess
**Abhängigkeiten:** US-012, US-013

---

### 1. User Story

Als **Admin** möchte ich **Nutzerkonten über eine Weboberfläche anlegen, in einer Liste einsehen und ihr Passwort zurücksetzen**, damit **ich Teammitglieder verwalten kann, ohne die API direkt aufrufen zu müssen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S5 — Admin-Bereich, Sub-Bereich Nutzer)
- **Relevant für DDD:** Presentation-Schicht (IdentityAccess Context)

### 3. Akzeptanzkriterien

- [ ] Sub-Bereich „Nutzer“ zeigt eine Liste aller Nutzer mit Name und E-Mail.
- [ ] Formular „Nutzer anlegen“ erfasst Name, E-Mail, initiales Passwort und ruft `POST /api/v1/admin/users` auf; bei `409 EMAIL_ALREADY_IN_USE` wird ein Inline-Fehler am E-Mail-Feld angezeigt.
- [ ] Je Listeneintrag existiert eine „Passwort zurücksetzen“-Aktion, die `POST .../reset-password` aufruft und eine Erfolgsbestätigung anzeigt.
- [ ] Bereich ist nur für Nutzer mit `is_system_admin = true` in der Navigation sichtbar und erreichbar (clientseitige Route zusätzlich serverseitig durch US-012/US-013 geschützt).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/admin/users-admin/users-admin.component.ts`
- `frontend/src/app/features/admin/admin-users.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- UI-Sichtbarkeit ersetzt nicht die serverseitige Absicherung — beide Ebenen sind erforderlich.

### Anmerkungen des Dev-Agenten

- Die Story setzt eine Nutzerliste voraus, für die es noch keinen Backend-Endpoint gab (nur
  `POST /api/v1/admin/users` existierte bislang). Ergänzt: `IUserRepository.FindAllAsync`,
  Application Service `ListUsersService`, `GET /api/v1/admin/users` — notwendige Infrastruktur zur
  Erfüllung von Akzeptanzkriterium 1, kein Vorgriff auf eine spätere Story.
- Clientseitige Admin-Sichtbarkeit (AC 4) über neuen `adminGuard` (liest `isSystemAdmin` aus dem im
  JWT enthaltenen Claim, rein für UX — die serverseitige `SystemAdmin`-Policy aus US-007 bleibt die
  eigentliche Absicherung) sowie `TokenStorageService.getClaims()`.
- „Passwort zurücksetzen“-Aktion generiert clientseitig ein zufälliges temporäres Passwort und
  zeigt es in der Erfolgsbestätigung an (die Story spezifiziert keinen eigenen Eingabe-Dialog dafür).
- Ein sichtbarer Navigationseintrag für den Admin-Bereich existiert noch nicht, da die
  Workspace-Shell (Tab-Navigation) erst mit US-019 entsteht — die Route `/admin/users` ist bereits
  vollständig funktions- und zugriffsgeschützt erreichbar, nur (noch) ohne Menüpunkt.

### Status

Fertig am 19.08.2026. Umsetzung: PR auf `main` (Branch `feature/US-016-admin-ui-nutzerverwaltung`),
Auto-Merge gemäß ADR-0003 aktiviert.
