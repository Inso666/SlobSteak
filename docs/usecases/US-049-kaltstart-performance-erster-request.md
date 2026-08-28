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

### Anmerkungen des Agenten (Backend, US-049)

**Messaufbau (reale Messung, kein Code-Review):** isolierter `docker-compose`-Stack unter eigenem Projektnamen (`-p us049perf`) und eigener, vollständig eigenständiger Compose-Datei `docker-compose.us049-perf.yml` (umgemappte Ports 15432/15000/14200, frisches `db-data`-Volume je Messlauf) — der reguläre Stack des Nutzers (Standardports, Präfix `steakholder-*`) blieb unangetastet. Reproduktion:

```
docker compose -p us049perf -f docker-compose.us049-perf.yml build
docker compose -p us049perf -f docker-compose.us049-perf.yml down -v   # sicherstellen: frisches Volume
docker compose -p us049perf -f docker-compose.us049-perf.yml up -d
docker compose -p us049perf -f docker-compose.us049-perf.yml logs api --timestamps
```

Gemessen wurden die realen `docker inspect`-Zeitstempel (`State.StartedAt`) der drei Container plus die in `Program.cs`/`SeedAdminHostedService.cs` neu ergänzten Start-/Ende-Log-Zeilen (siehe AC 3) — nicht manuell gestoppte Uhrzeiten, um Mess-Overhead durch Agenten-Tool-Round-Trips auszuschließen.

**Ergebnis — Vorher (unfixierter Zustand, kein api-Healthcheck, `frontend` ohne `condition`, db-Healthcheck-Intervall 5s):**

| Ereignis | Zeitstempel (UTC) | Delta |
|---|---|---|
| `db`-Container gestartet | 16:36:43.4148Z | — |
| `api`-Container gestartet | 16:36:49.0960Z | +5681 ms nach db-Start (Postgres-Erstinit + grobes 5s-Healthcheck-Polling) |
| Migration gestartet (intern) | 16:36:49.4808Z | 176 ms seit Prozessstart |
| Migration abgeschlossen | 16:36:50.2078Z | **727 ms** Migrationsdauer |
| Seed-Admin gestartet | 16:36:50.2615Z | — |
| Seed-Admin abgeschlossen | 16:36:50.4804Z | **218 ms** Seed-Admin-Dauer |
| API bereit für Requests | 16:36:50.4984Z | **1196 ms** seit Prozessstart, **1402 ms** seit Container-Start |
| `frontend`-Container gestartet | 16:36:49.2592Z | nur **163 ms** nach api-Container-Start — **~1,24 s BEVOR die API tatsächlich bereit ist** |

**Ergebnis — Nachher (mit AC-2-Fix: api-Healthcheck gegen `/api/v1/health`, `frontend` wartet auf `condition: service_healthy`, db-Healthcheck-Intervall 2s, kein `start_period`):**

| Ereignis | Zeitstempel (UTC) | Delta |
|---|---|---|
| `db`-Container gestartet | 16:42:13.4759Z | — |
| `api`-Container gestartet | 16:42:20.4813Z | +7005 ms nach db-Start (Lauf-zu-Lauf-Varianz, siehe unten) |
| Migration abgeschlossen | 16:42:21.5755Z | 712 ms Migrationsdauer |
| Seed-Admin abgeschlossen | 16:42:21.8572Z | 230 ms Seed-Admin-Dauer |
| API bereit für Requests | 16:42:21.8752Z | 1181 ms seit Prozessstart |
| `frontend`-Container gestartet | 16:42:23.1679Z | **erst 1293 ms NACH API-Bereitschaft** (ein Healthcheck-Poll-Intervall) — Rennen vollständig eliminiert |

**Welche der drei PO-Hypothesen hat sich bestätigt?**

- **Hypothese 1 (fehlender Healthcheck/`depends_on`-Bedingung) — BESTÄTIGT, aber Fenster kleiner als vermutet.** `frontend` war im unfixierten Zustand ca. 1,2–1,4 s reproduzierbar erreichbar, bevor die API tatsächlich Requests beantworten konnte. Ein Login-Versuch in diesem Fenster trifft über den nginx-`proxy_pass http://api:8080` auf einen Port, auf dem noch nichts lauscht — TCP liefert dafür sofort `Connection Refused` (nginx quittiert mit `502`, kein Hängenbleiben auf TCP-Ebene). Nach dem Fix (AC 2) startet `frontend` nachweislich nie mehr vor einer gesunden API — das Fenster ist auf 0 reduziert, nicht nur verkleinert.
- **Hypothese 2 (synchrones `Migrate()` + `SeedAdminHostedService` vor `app.Run()`) — WIDERLEGT als dominanter Faktor.** Migration (712–727 ms) und Seed-Admin (218–250 ms) summieren sich in beiden Messläufen auf konsistent **unter 1 Sekunde** bei einer komplett leeren, frischen Datenbank (8 Tabellen, alle Indizes). Das ist real messbar (jetzt dank AC 3 im Log sichtbar), aber bei weitem nicht „sehr lange“.
- **Hypothese 3 (.NET-JIT-/EF-Core-Kaltstart) — WIDERLEGT als dominanter Faktor.** Prozessstart bis Migrationsbeginn: nur 166–205 ms. Prozessstart bis „Anwendung bereit für Requests“: durchgehend **1,18–1,4 Sekunden gesamt** — für .NET 8 unauffällig schnell, kein erkennbarer Kaltstart-Ausreißer.
- **Vierter, während der Messung gefundener Faktor (nicht in den PO-Hypothesen) — der tatsächlich dominante Anteil:** Die Zeit vom `db`-Container-Start bis der `api`-Container überhaupt erst startet (weil `api` korrekterweise bereits vor dieser Story auf `db: condition: service_healthy` wartet) betrug in beiden Messläufen **5,7–7,0 Sekunden** — Postgres-Erstinitialisierung (`initdb`) auf einem leeren Volume plus die Granularität des Healthcheck-Pollings. Das ist der mit Abstand größte Einzelposten der gesamten Kaltstart-Zeitspanne, un­abhängig von Migration/Seed/JIT, und nur bedingt durch diese Story beeinflussbar (Postgres-eigene Initialisierungszeit ist nicht durch Anwendungscode kontrollierbar; das Healthcheck-Intervall wurde von 5s auf 2s verkürzt, siehe `docker-compose.yml`). Ehrlich dokumentiert: in den beiden realen Messläufen dieser Story zeigte sich dabei erhebliche Lauf-zu-Lauf-Varianz (5,7 s vs. 7,0 s trotz kürzerem Intervall im zweiten Lauf) — die Intervall-Verkürzung senkt die theoretische Erkennungslatenz (maximal 5s → maximal 2s pro Poll-Zyklus), garantiert auf diesem Testsystem aber keine messbar kürzere Gesamtzeit, da Postgres' eigene Initialisierungsdauer selbst schwankt.
- **Zusätzlicher, nicht vollständig ausgemessener Kandidat:** Ein wirklich allererster `docker-compose up` auf einer Maschine ohne jemals gebaute Images löst zusätzlich einen vollständigen Multi-Stage-Build aus (`dotnet restore`/`publish`, `npm ci`/`ng build`) — das kann je nach Netzwerk/Hardware ohne weiteres 1–3+ Minuten dauern und damit alle oben genannten Laufzeit-Anteile um ein Vielfaches übersteigen. Das passt inhaltlich am besten zur wörtlichen Formulierung „dauert sehr lange" im Bug-Report, wurde hier aber nicht mit vollständig geleertem Docker-Build-Cache nachgemessen (hätte den bestehenden, produktiven Layer-Cache des Nutzers beeinträchtigt) und ist durch Code in dieser Story nicht weiter reduzierbar — die Layer-Reihenfolge in beiden Dockerfiles (zuerst `*.csproj`/`package.json` kopieren, dann restaurieren, erst danach den restlichen Quellcode) folgt bereits der empfohlenen Docker-Best-Practice für maximale Cache-Wiederverwendung (seit US-001).

**Zielwert (Akzeptanzkriterium 4), begründet:** Da der größte Zeitanteil (Postgres-Erstinit) außerhalb der Kontrolle dieser Story liegt und selbst schwankt, ist ein einzelner „X Sekunden schneller"-Wert nicht seriös versprechbar. Der gewählte, zuverlässig reproduzierbare Zielwert lautet daher: **0 fehlgeschlagene Login-Requests durch ein noch nicht bereites Backend** (statt vorher einem nachgewiesenen, reproduzierbaren Zeitfenster von ca. 1,2–1,4 s pro Kaltstart, in dem `frontend` bereits erreichbar, `api` aber noch nicht bereit war) — vollständig erreicht durch den AC-2-Fix, da `frontend` jetzt nachweislich nie mehr vor einer als „healthy" erkannten API startet. Ergänzend: die Erkennungslatenz für „Datenbank bereit" wurde von maximal 5s auf maximal 2s pro Poll-Zyklus reduziert (Best-Effort-Verbesserung, siehe Kommentar in `docker-compose.yml`), und Migration/Seed-Admin sind jetzt dank AC 3 im Log sichtbar, sodass ein künftiger Anstieg (z. B. durch viele neue Migrationen) sofort auffällt statt sich unbemerkt zu häufen.

**Wichtiger Nebenfund (Healthcheck-`start_period`):** Ein initial gesetztes `start_period: 5s` für den api-Healthcheck verzögerte in der real getesteten Docker-Engine-Version (Docker Desktop 4.87.0 / Engine 29.7.2) den allerersten Probe-Lauf um seine volle Dauer, statt — wie die Docker-Dokumentation für „grace period" nahelegt — nur Fehlversuche währenddessen nicht gegen `retries` zu zählen. Das hätte den Fix im Endeffekt verlangsamt statt beschleunigt und wurde deshalb wieder entfernt (kein `start_period` gesetzt); ein früher, ins Leere laufender Check schadet nichts (`Connection Refused`, keine Hängezeit).

**Frontend-Anknüpfungspunkt für AC 5 (Hinweis für den nachfolgenden Frontend-Agenten):** `LoginPageComponent.onSubmit()` setzt aktuell ausschließlich das binäre Flag `isSubmitting` (US-043); `ProcessingButtonComponent` kennt nur diesen einen Zustand (Input `isSubmitting: boolean`). Es existiert **kein** Zustand, der zwischen „Request läuft seit &lt; 3s“ und „Request läuft bereits ungewöhnlich lange“ unterscheidet — dieser fehlt vollständig und muss vom Frontend-Agenten ergänzt werden, z. B. ein zusätzliches `setTimeout(…, 3000)` in `onSubmit()`, das (falls zu diesem Zeitpunkt `isSubmitting` noch `true` ist) ein neues Flag wie `isTakingLonger` setzt, in beiden `subscribe`-Callbacks (`next`/`error`) wieder zurückgesetzt/`clearTimeout`. Kein globaler `HttpClient`-Timeout ist aktuell konfiguriert (`app.config.ts`), daher gibt es auch keinen Konflikt mit einem bestehenden Timeout-Mechanismus. Zusätzlicher, unabhängiger Befund (nicht Teil dieser Story, zur Kenntnis für Frontend/UX): Der `error`-Handler in `onSubmit()` zeigt bei **jedem** Fehler unterschiedslos „E-Mail oder Passwort ist falsch.“ an — auch bei einem `502`/Netzwerkfehler durch ein noch nicht bereites Backend, was Nutzer in genau der in dieser Story untersuchten Situation fälschlich glauben lässt, ihre (korrekten) Zugangsdaten seien falsch.
