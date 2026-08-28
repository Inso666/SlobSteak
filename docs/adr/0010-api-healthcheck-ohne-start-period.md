# ADR 0010: `docker-compose`-Healthcheck für `api` ohne `start_period`, db-Poll-Intervall verkürzt

**Status:** Akzeptiert
**Datum:** 2026-08-28
**Kontext-Story:** US-049 (Verlässliche Antwortzeit & Statusrückmeldung beim ersten Request nach Systemstart)

## Kontext

`frontend` startete bislang, sobald der `api`-Container-Prozess lediglich *gestartet* war
(`depends_on: - api` ohne `condition`), nicht erst, wenn ASP.NET Core tatsächlich Requests
beantworten konnte (Migration/Seed-Admin laufen davor). Die reale Zeitmessung dieser Story (siehe
Story-Datei „Anmerkungen des Agenten“) bestätigte ein reproduzierbares Zeitfenster von ca.
1,2–1,4 s, in dem `frontend` bereits erreichbar, `api` aber noch nicht bereit war.

Der naheliegende Fix — ein `healthcheck` für `api` gegen `/api/v1/health` plus
`depends_on: api: condition: service_healthy` bei `frontend` — wurde zunächst mit
`start_period: 5s` konfiguriert, in der Annahme, das sei laut Docker-Dokumentation lediglich eine
Kulanzfrist, in der fehlgeschlagene Checks nicht gegen `retries` zählen. Die reale Messung gegen die
tatsächlich installierte Docker-Engine (Docker Desktop 4.87.0 / Engine 29.7.2) zeigte jedoch: der
allererste Probe-Lauf wurde um die volle `start_period`-Dauer verzögert, statt sofort (oder nach dem
ersten `interval`) zu starten — `frontend` startete dadurch ca. 4 s **nach** tatsächlicher
API-Bereitschaft statt der erwarteten ca. 1–2 s.

## Entscheidung

1. **Kein `start_period` für den `api`-Healthcheck.** Ein früher, ins Leere laufender Check
   (`Connection Refused`, solange `dotnet SlobSteak.Api.dll` den Port noch nicht gebunden hat) ist
   auf Docker-Netzwerkebene ein sofortiger Fehlschlag, kein Hängenbleiben — es gibt daher keinen
   Vorteil, den ersten Check künstlich zu verzögern, wohl aber einen messbaren Nachteil.
2. **`interval`/`timeout` des `db`-Healthchecks von 5s/5s auf 2s/3s verkürzt** (`retries` von 10 auf
   30 erhöht, damit die maximale Gesamtwartezeit trotzdem bei ca. 60s bleibt). Die Messung zeigte,
   dass Postgres bei einem leeren Erststart-Volume typischerweise deutlich schneller intern bereit
   ist, als das vorherige 5s-Intervall es erkennen konnte — dieser Anteil erwies sich als der mit
   Abstand größte Einzelposten der gesamten Kaltstart-Zeitspanne (5,7–7,0 s in den beiden
   Messläufen), nicht Migration/Seed-Admin/JIT wie ursprünglich vom PO vermutet.
3. Derselbe `interval`/`timeout` (2s/3s) wurde konsistent auch für den neuen `api`-Healthcheck
   übernommen.

## Konsequenzen

- Positiv: `frontend` startet nachweislich nie mehr vor einer als „healthy“ erkannten `api` —
  Akzeptanzkriterium 2 vollständig erfüllt, das vorher gemessene ~1,2–1,4 s-Fenster fehlschlagender
  Login-Requests ist auf 0 reduziert.
- Trade-off: Die absolute Wartezeit bis `docker-compose up` tatsächlich einsatzbereit ist, sinkt
  dadurch **nicht garantiert** messbar — sie wird überwiegend von Postgres' eigener, schwankender
  Erstinitialisierungsdauer dominiert, die außerhalb der Kontrolle dieser Story liegt (siehe
  Story-Datei für die ehrlich dokumentierte Lauf-zu-Lauf-Varianz). Das kürzere Poll-Intervall senkt
  nur die theoretische Erkennungslatenz pro Zyklus (max. 5s → max. 2s), keine feste Zeitersparnis.
- Der `api`-Healthcheck benötigt `curl` im Runtime-Image (`mcr.microsoft.com/dotnet/aspnet:8.0`
  bringt weder `curl` noch `wget` mit) — `src/SlobSteak.Api/Dockerfile` installiert es minimal
  (`apt-get install --no-install-recommends curl`, ca. 2 MB zusätzliches Layer-Gewicht).
