**ID:** US-046
**Titel:** Admin-Bereich über globale Navigation erreichbar machen
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-016, US-017, US-045

---

### 1. User Story

Als **Systemadmin** möchte ich den Admin-Bereich (Nutzerverwaltung, Projektverwaltung) über einen sichtbaren Navigationseintrag erreichen und zwischen seinen Sub-Bereichen wechseln können, damit ich ihn nicht mehr über eine manuell eingegebene URL aufrufen muss.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** PRD Abschnitt 6.3 (Sidebar-Eintrag „Admin (nur `is_system_admin`)“) sowie Abschnitt 6.2 Screen S5 (Sub-Bereiche „Nutzer“/„Projekte“/„Kommunikationsarten-Katalog“). Aktuell ist `/admin/users` **an keiner Stelle der UI verlinkt** (bestätigt per Volltextsuche über den gesamten Frontend-Code) — erreichbar ausschließlich durch manuelle URL-Eingabe; `/admin/projects` ist nur indirekt über den „Neues Projekt“-Button der Projektübersicht (nur für Systemadmins sichtbar) erreichbar. UX-Review vom 23.08.2026, Befund „P0 #4“.
- **Relevant für DDD:** Presentation-Schicht, IdentityAccess/ProjectManagement (Admin-UI-Sichtbarkeit).

### 3. Akzeptanzkriterien

- [ ] Die in US-045 eingeführte globale Navigation zeigt einen zusätzlichen Eintrag „Admin“, ausschließlich für Nutzer mit `isSystemAdmin = true` (`TokenStorageService.getClaims()`), analog zur bestehenden serverseitigen/clientseitigen Regel aus `admin.guard.ts`.
- [ ] Für Nutzer ohne `isSystemAdmin` ist der Eintrag „Admin“ nicht im DOM vorhanden (nicht nur per CSS versteckt) — Komponententest prüft dies analog zum bestehenden Muster aus US-030 Akzeptanzkriterium 3.
- [ ] Klick auf „Admin“ navigiert zu `/admin/users` als Standard-Einstieg in den Admin-Bereich.
- [ ] `UsersAdminComponent` und `ProjectsAdminComponent` erhalten je einen sichtbaren Sub-Navigations-Link zum jeweils anderen Bereich („Nutzer“ ↔ „Projekte“), sodass ein Systemadmin zwischen beiden wechseln kann, ohne zur globalen Navigation zurückzukehren — spiegelt die in PRD 6.2 (S5) beschriebene Sub-Bereichs-Struktur.
- [ ] Der aktive Sub-Bereich ist in der Sub-Navigation visuell hervorgehoben (analog zu `routerLinkActive` in `project-workspace-layout.component.html`).
- [ ] Direkter Aufruf von `/admin/users` bzw. `/admin/projects` durch einen Nicht-Admin bleibt weiterhin durch den bestehenden `adminGuard` zu `/login` umgeleitet (unverändertes, bereits getestetes Verhalten — Regressionstest bestätigt dies weiterhin grün).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.ts` (+ `.html`, ergänzt um bedingten Admin-Link; aus US-045)
- `frontend/src/app/features/admin/users-admin/users-admin.component.html` (+ `.ts` falls nötig, Sub-Navigation)
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.html` (+ `.ts` falls nötig, Sub-Navigation)

**Wichtige Invarianten & Validierungsregeln:**

- Die clientseitige Sichtbarkeit des „Admin“-Eintrags ist eine reine UX-Ergänzung; die eigentliche Absicherung bleibt `adminGuard` (clientseitig) und die serverseitige `SystemAdmin`-Policy (US-012/US-013, CLAUDE.md Abschnitt 3.1) — diese Story ändert daran nichts.

### Anmerkungen des Dev-Agenten

- Der PRD-seitig unter Screen S5 genannte dritte Sub-Bereich „Kommunikationsarten-Katalog“ existiert im Frontend noch nicht (folgt erst mit US-038) — die hier eingeführte Sub-Navigation zwischen „Nutzer“ und „Projekte“ ist so zu bauen, dass ein dritter Eintrag später ohne strukturellen Umbau ergänzt werden kann (z. B. einfache Liste von `routerLink`-Einträgen, kein hartcodiertes Zwei-Elemente-Layout).

_(Weitere Anmerkungen vom Dev-Agenten bei Umsetzung zu ergänzen, falls Abweichungen vom PRD/dieser Story nötig werden.)_
