**ID:** US-049
**Titel:** Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart
**Bounded Context / Domain:** Shared Kernel / Infrastructure (cross-cutting, betrifft Backend-Start und Frontend-Login gleichermaßen)
**Abhängigkeiten:** US-001, US-006, US-009

**Status:** offen

---

### 1. User Story

Als **Nutzer**, der die Anwendung direkt nach `docker-compose up` (bzw. nach einem Neustart der Container) zum ersten Mal aufruft, möchte ich mich innerhalb einer nachvollziehbaren, kurzen Zeit anmelden können — und falls das System noch hochfährt, eine erkennbare Rückmeldung statt eines Anmeldeformulars sehen, das wie eingefroren wirkt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt `/ (login)`: „Die allererste Anmeldung dauert sehr lange. Finde den Grund heraus und schlage Lösungsansätze vor.“
- **Verifikation durch PO (Code-Review, keine Laufzeitmessung möglich):** Drei voneinander unabhängige, sich gegenseitig verstärkende Ursachen im aktuellen Code gefunden, jede für sich plausibel ausreichend für eine spürbare Verzögerung ausschließlich beim allerersten Request:
  1. **`docker-compose.yml`:** Der Service `api` hat **keinen** `healthcheck`. Der Service `frontend` hat `depends_on: - api` **ohne** `condition: service_healthy` (Default ist `service_started`). D. h. Docker Compose startet den `frontend`-Container, sobald der `api`-Container-Prozess *gestartet* wurde — nicht, sobald ASP.NET Core tatsächlich Requests entgegennimmt. In der Zeitspanne dazwischen (siehe Punkt 2) laufen die ersten Browser-Requests gegen ein noch nicht bereites Backend.
  2. **`src/SlobSteak.Api/Program.cs`:** In der Development-Umgebung (Default von `docker-compose.yml`, `ASPNETCORE_ENVIRONMENT=Development`) ruft der Host synchron `dbContext.Database.Migrate()` auf, **bevor** `app.Run()` den Server startet — bei einer frischen Datenbank (erster Start überhaupt, z. B. nach `docker volume rm`/Erstinstallation) wird dabei die komplette Migrationshistorie angewendet. Zusätzlich läuft `SeedAdminHostedService` als `IHostedService`, dessen `StartAsync` laut ASP.NET-Core-Hosting-Modell ebenfalls vor Annahme von Requests abgeschlossen sein muss.
  3. **.NET-Cold-Start-Effekt:** JIT-Kompilierung der Minimal-Hosting-Pipeline sowie EF-Core-Modell-/Query-Kompilierung beim allerersten tatsächlichen HTTP-Request sind ein bekanntes, ausschließlich einmaliges Phänomen unmittelbar nach Containerstart.
  4. **Fehlende Nutzer-Rückmeldung:** `login-page.component.ts`/`.html` zeigt zwar während eines laufenden Login-Requests einen Verarbeitungs-Zustand (`app-processing-button`, US-043), aber keinerlei Hinweis darauf, dass das *Backend selbst* noch hochfährt bzw. ungewöhnlich lange braucht (kein Timeout-Hinweis, kein Retry, keine Information für den Nutzer, ob er warten oder neu laden soll).
- Diese Story deckt sich mit dem in `SPEC-01-Login.md` §1.2 bereits vorgesehenen, aber **nicht implementierten** `bootstrapping`-Ladezustand (Skeleton statt Formular) — siehe auch US-054, die die visuelle Umsetzung dieses Zustands übernimmt. Diese Story (US-049) behandelt die eigentliche Ursache der Verzögerung sowie die Orchestrierung/Diagnostik; US-054 den Login-spezifischen visuellen Ladezustand gemäß SPEC-01.

### 3. Akzeptanzkriterien

- [ ] Es liegt eine dokumentierte, im PR nachvollziehbare Ursachenanalyse vor (Backend-Agent), welcher der oben genannten Faktoren (oder ein anderer, während der Umsetzung gefundener) tatsächlich für die berichtete Verzögerung ursächlich ist — mit Zeitmessung (`docker-compose up` von einem frischen Zustand aus, Zeitstempel erster erfolgreicher Login vs. Containerstart).
- [ ] `api` besitzt einen `healthcheck` in `docker-compose.yml` (z. B. gegen `/api/v1/health`), und `frontend` erhält `condition: service_healthy` für seine Abhängigkeit von `api` — ein `docker-compose up` liefert das Frontend erst aus, wenn das Backend tatsächlich Requests beantworten kann, oder zumindest terminiert der erste Request nicht mehr gegen ein nicht erreichbares Backend.
- [ ] Migrations- und Seed-Admin-Startzeit sind gemessen und, falls sie einen relevanten Anteil der Verzögerung ausmachen, optimiert oder zumindest im Log klar sichtbar (Start-/Ende-Zeitstempel), damit künftige Regressionen sofort auffallen.
- [ ] Der allererste erfolgreiche Login nach einem frischen `docker-compose up` (leeres `db-data`-Volume) dauert nachweislich spürbar kürzer als im aktuellen Zustand — konkreter Zielwert wird vom Backend-Agenten anhand der Ursachenanalyse vorgeschlagen und im PR begründet, sofern keine feste PRD-Vorgabe existiert.
- [ ] Reagiert der Login-Request länger als üblich (z. B. > 3s), erhält der Nutzer eine sichtbare, ehrliche Rückmeldung statt eines UI, das nur wie „hängt“ wirkt (Umsetzung des visuellen Ladezustands selbst gehört zu US-054 — diese Story stellt sicher, dass ein technischer Anknüpfungspunkt/Zustand dafür vorhanden ist, z. B. ein erkennbarer Unterschied zwischen „Formular wartet auf Nutzereingabe“ und „Request läuft bereits ungewöhnlich lange“).
- [ ] Kein bestehender Test wird gebrochen; `dotnet test` und `ng test` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu prüfende/ändernde Dateien:**
- `docker-compose.yml` (Healthcheck `api`, `depends_on`-Bedingung `frontend`)
- `src/SlobSteak.Api/Program.cs` (Migrations-/Hosted-Service-Timing, ggf. Logging ergänzen)
- `src/SlobSteak.Api/Bootstrap/SeedAdminHostedService.cs`
- ggf. `frontend/src/app/features/auth/login-page/login-page.component.ts` für einen Anknüpfungspunkt an den in US-054 umzusetzenden Ladezustand

**Wichtige Invarianten:**
- Kein automatisches Anwenden von Migrationen in Produktion einführen/ändern (CLAUDE.md Abschnitt 3.4 bzw. bestehender Kommentar in `Program.cs`) — Scope ist ausschließlich die lokale/Dev-Umgebung über `docker-compose up`.
- Keine Änderung an der fachlichen Login-Logik (US-006/US-008) — ausschließlich Start-Orchestrierung, Diagnostik und ggf. Timeout-/Rückmeldungs-Verhalten.

### Anmerkungen des Product Owners

Diese Ursachenzuordnung basiert auf Code-Review, nicht auf einer tatsächlichen Zeitmessung in einer laufenden Umgebung (in dieser Session nicht verfügbar) — der Dev-Agent muss die Hypothese vor der Umsetzung durch eine reale Messung verifizieren oder falsifizieren und das Ergebnis dokumentieren (CLAUDE.md Abschnitt 6).
