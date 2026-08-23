**ID:** US-045
**Titel:** Globale Navigation (Shell) inkl. Abmelden-Funktion
**Bounded Context / Domain:** Frontend-Shell
**Abhängigkeiten:** US-006, US-009, US-018
**Status:** fertig (23.08.2026), PR #39

---

### 1. User Story

Als **angemeldeter Nutzer** möchte ich über eine app-weit sichtbare Navigation jederzeit zur Projektübersicht zurückkehren und mich aktiv abmelden können, damit ich die Anwendung gemäß der in PRD Abschnitt 6.3 vorgesehenen Navigationsstruktur konsistent bedienen und meine Sitzung selbst beenden kann (z. B. auf einem gemeinsam genutzten Rechner).

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** PRD Abschnitt 6.3 (Navigationsstruktur): „Sidebar (global): Projektübersicht — [Aktuelles Projekt] → Stakeholder/Map/Verteiler — Admin (nur `is_system_admin`) — Abmelden“. Aktuell ist `app.html` ein statischer Titel ohne jede Navigation; es existiert **keine** Möglichkeit, sich abzumelden (`TokenStorageService.clearToken()` wird im gesamten Code nirgends aufgerufen). US-019 hat diesen Punkt bereits explizit als „außerhalb des Scopes“ vermerkt (siehe dortige Anmerkungen des Dev-Agenten) und auf eine künftige App-weite Shell-Komponente verwiesen — das ist diese Story. UX-Review vom 23.08.2026, Befund „P0 #3“.
- **Relevant für DDD:** Presentation-Schicht (Composition Root `AppComponent`/`app.html`), IdentityAccess (Session-Beendigung).

### 3. Akzeptanzkriterien

- [ ] Eine neue, app-weit eingebundene Navigationskomponente ersetzt den bisherigen statischen Titel in `app.html` und wird ausschließlich angezeigt, wenn ein gültiges Session-Token vorhanden ist (auf `/login` bleibt sie ausgeblendet).
- [ ] Die Navigation enthält mindestens die Einträge „Projektübersicht“ (Link zu `/projects`) und „Abmelden“, gemäß PRD 6.3 (der Eintrag „Admin“ folgt in US-046).
- [ ] Die Sichtbarkeit der Navigation reagiert auf Navigationswechsel (z. B. Login/Logout), ohne dass ein manueller Seiten-Reload nötig ist.
- [ ] Klick auf „Abmelden“ ruft `TokenStorageService.clearToken()` auf und navigiert zu `/login`.
- [ ] Nach dem Abmelden führt ein erneuter Aufruf einer geschützten Route (z. B. `/projects`) wieder über `authGuard` zurück zu `/login` — ein Komponenten-/Guard-Test verifiziert dieses Verhalten nach ausgelöstem Logout.
- [ ] Komponententest der neuen Navigationskomponente deckt ab: Navigation ist bei fehlendem Token nicht sichtbar/nicht im DOM; Navigation ist bei vorhandenem Token sichtbar; Klick auf „Abmelden“ löst `clearToken()` und die Navigation zu `/login` aus.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/core/navigation/app-navigation/app-navigation.component.ts` (neu) + `.html` + `.css` + `.spec.ts`
- `frontend/src/app/app.html` (bindet die neue Navigationskomponente ein)
- `frontend/src/app/app.ts` (falls für die Sichtbarkeitslogik/Router-Events benötigt)

**Wichtige Invarianten & Validierungsregeln:**

- Das Backend führt aktuell keine serverseitige Session-/Token-Verwaltung mit Widerruf (kein Logout-Endpoint, kein Token-Blacklisting) — Login ist rein tokenbasiert (`TokenStorageService`). „Abmelden“ ist daher in dieser Story bewusst eine **rein clientseitige** Aktion (Token aus `localStorage` entfernen); es wird **kein** neuer Backend-Endpoint eingeführt, um den PRD-Rahmen nicht stillschweigend zu erweitern (CLAUDE.md Abschnitt 4). Sollte serverseitiger Token-Widerruf künftig gebraucht werden, ist das eine eigene, separat zu begründende Story.
- Die clientseitige Sichtbarkeitsprüfung (Token vorhanden ja/nein) ist reine UX — sie ersetzt nicht die serverseitige Autorisierung einzelner Endpunkte (CLAUDE.md Abschnitt 3.1).

### Anmerkungen des Dev-Agenten

- Diese Story liefert bewusst nur die Navigations-Shell + „Projektübersicht“ + „Abmelden“; der PRD-seitig ebenfalls in der Sidebar vorgesehene Eintrag „Admin (nur `is_system_admin`)“ ist Gegenstand von US-046, die auf dieser Story aufbaut, damit beide unabhängig überprüfbar bleiben.
- Eine Namensanzeige des angemeldeten Nutzers ist **kein** Akzeptanzkriterium dieser Story: Das JWT führt laut `TokenClaims` (`token-storage.service.ts`) aktuell nur `sub` (User-ID) und `isSystemAdmin`, keinen Namen — eine Namensanzeige würde entweder eine JWT-Claim-Erweiterung (Backend-Änderung, außerhalb des hier beschriebenen Frontend-Scopes) oder einen zusätzlichen `GET /api/v1/users/me`-Aufruf erfordern. Beides ist bewusst nicht Teil dieser Story, um sie klein und PRD-treu zu halten; bei Bedarf als Folge-Story anlegen.

- Beim manuellen Smoke-Test gegen `docker-compose up` fiel auf, dass ein im Browser noch
  vorhandenes Session-Token die Navigation auch auf `/login` einblendete, wenn ein bereits
  angemeldeter Nutzer diese Route manuell erneut aufruft (kein Guard verhindert das — `authGuard`
  greift nur bei fehlendem Token, nicht bei vorhandenem). Das widerspräche Akzeptanzkriterium 1
  („auf /login bleibt sie ausgeblendet“). Behoben, indem die Sichtbarkeit zusätzlich zur
  Token-Prüfung explizit die aktuelle Route ausschließt (`AppNavigationComponent.computeVisibility`)
  — ein eigener Testfall deckt diesen Randfall jetzt ab (`us-045-app-navigation.spec.ts`).
- „Admin“-Eintrag bewusst nicht Teil dieser Story (siehe oben, folgt in US-046); Nav-Items sind als
  Konfigurationsliste (`nav-items.ts`) modelliert, damit US-046 dort ergänzen kann, ohne das
  Template der Navigationskomponente anzufassen.

### Lokale Verifizierbarkeit

- **Story-Tests isoliert ausführen:** `ng test --include='**/us-045*.spec.ts'` (in `frontend/`).
- **Gesamte Frontend-Suite:** `ng test` (112/112 grün zum Zeitpunkt des Abschlusses).
- **Manueller Smoke-Test** (gegen `docker-compose up --build`, `http://localhost:4200`):
  1. `http://localhost:4200/login` ohne gespeichertes Token öffnen → keine Navigation sichtbar.
  2. Mit `admin@example.com` / dem in `docker-compose.yml` konfigurierten `SEED_ADMIN_PASSWORD`
     anmelden (bei Erstanmeldung folgt der erzwungene Passwortwechsel aus US-008) → Navigation
     erscheint mit „SlobSteak“, „Projektübersicht“ (aktiv markiert) und „Abmelden“.
  3. Auf „Abmelden“ klicken → Redirect zu `/login`, Navigation verschwindet, Token ist aus
     `localStorage` entfernt.
  4. `/projects` erneut manuell aufrufen → `authGuard` leitet wieder auf `/login` um.
