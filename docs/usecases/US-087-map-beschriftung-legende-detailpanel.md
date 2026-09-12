**ID:** US-087
**Titel:** Map: Punkt-Beschriftung, Legende, Verbindungs-Detailpanel und nutzbare Kartenfläche
**Bounded Context / Domain:** StakeholderMap (Presentation-Schicht)
**Abhängigkeiten:** US-034, US-036, US-063, US-064, US-080, US-084
**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich auf der Stakeholder-Map erkennen, welcher Punkt zu welchem Stakeholder gehört, was die verschiedenen Punktformen bedeuten und wie weit zwei Perspektiven auseinanderliegen, damit die Karte eine Entscheidungsgrundlage statt eines anonymen Punktefelds ist.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #115](https://github.com/Inso666/SlobSteak/issues/115) (vom Projektverantwortlichen gemeldet) und [Issue #127](https://github.com/Inso666/SlobSteak/issues/127), QA-Design-Abgleich vom 04.09.2026, gegen `docs/design/Map.dc.html`.
- **Gruppierung:** Beide Issues beschreiben denselben Informationsmangel derselben Komponente (`quadrant-chart`), und beide werden in denselben Dateien behoben. Issue #115 fragt nach „welcher Punkt ist wer", Issue #127 nach der Legende und dem Vergleichs-Detailpanel, das genau diese Frage für den Vergleichsmodus beantwortet.

**Fehlend gegenüber dem Design:**

1. **Punkt-Beschriftung.** Jeder Punkt trägt im Entwurf den Stakeholder-Namen direkt daneben. In der App sind die Punkte unbeschriftet.
2. **Legende.** Drei Einträge — gefüllter Kreis = eigene Sicht (ziehbar), Diamant = Vergleichssicht (nicht ziehbar), gestrichelte Linie = Bewertung in beiden Sichten — plus der erklärende Satz „Punkte ohne Bewertung in einer der gewählten Perspektiven zeigen keine Linie; Stakeholder ganz ohne Bewertung in beiden Sichten erscheinen nicht auf der Map."
3. **Panel „Ausgewählte Verbindung".** Einfluss und Interesse je Perspektive nebeneinander plus Differenz-Badge in `--app-attention`, mit dem Hinweis „Klick auf eine Verbindungslinie füllt diese Ansicht; Hover zeigt dieselbe Differenz als Tooltip direkt an der Linie."

**Weitere Abweichungen:**

| Punkt | Design | App |
|---|---|---|
| Zoom-Controls | vertikal gestapelt innerhalb der Karte unten links | oben rechts, überlagern das Quadranten-Label „ENG BETREUEN" |
| Kartenfläche | füllt das Panel, Panel auf `--surface` mit Rahmen und Radius | feste kleine Zeichenfläche (etwa 390×410px) auf Seitenhintergrund, rechts daneben rund 950px ungenutzt |
| Umschalter „Vergleichsmodus" | eingeschaltet farblich deutlich abgesetzt | eingeschalteter Zustand `rgb(216,219,228)` — hellgrau mit weißem Knopf, ein/aus optisch kaum unterscheidbar |

### 3. Akzeptanzkriterien

- [ ] Jeder Punkt trägt den Stakeholder-Namen als Beschriftung. Bei Überlappung bleibt die Lesbarkeit erhalten (Versatz, Auslassung ab einer Dichteschwelle oder Anzeige beim Hover) — die gewählte Strategie wird in der Story-Datei begründet.
- [ ] Ein Klick auf einen Punkt wählt ihn aus und zeigt seine Details; die Auswahl ist auch per Tastatur erreichbar und wird für Screenreader angekündigt (Muster aus US-062).
- [ ] Neben der Karte erscheint eine Legende mit den drei genannten Einträgen und dem erklärenden Hinweistext.
- [ ] Im Vergleichsmodus zeigt ein Panel „Ausgewählte Verbindung — <Name>" Einfluss und Interesse beider Perspektiven sowie die Differenz je Achse in `--app-attention`. Ohne Auswahl steht dort der Hinweis, wie eine Verbindung ausgewählt wird.
- [ ] Die Zoom-Controls sitzen innerhalb der Karte unten links und überlagern kein Quadranten-Label. Die Sichtbarkeit aus US-060 und das Skalierungsverhalten aus US-061 bleiben erhalten.
- [ ] Die Kartenfläche nutzt die verfügbare Breite des Panels und liegt auf `--app-color-surface` mit Rahmen und Radius (Panel-Klasse aus US-080).
- [ ] Der Umschalter „Vergleichsmodus" unterscheidet Ein und Aus über eine deutlich abgesetzte Zustandsfarbe, nicht nur über die Knopfposition.
- [ ] Wird der Vergleichsmodus aktiviert, ohne dass bereits eine Vergleichsperspektive gewählt ist, bleiben die Punkte der eigenen Sicht sichtbar; die Karte läuft nicht leer.
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: Beschriftung vorhanden, Auswahl per Klick und Tastatur, Legendeneinträge, Detailpanel mit Differenzwerten, Position der Zoom-Controls, Sichtbarkeit der eigenen Punkte ohne gewählte Vergleichsperspektive.
- [ ] Manueller Smoke-Test gegen `docker compose up` mit und ohne Vergleichsmodus — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-032, US-034, US-036, US-060 bis US-064).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/map/**` (`quadrant-chart`, `draggable-point`, Map-Seite inkl. Toolbar)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- PRD 4.3 / SPEC-04 §3.1: Vergleichspunkte sind nie ziehbar, auch wenn sie zufällig der eigenen Rolle entsprechen. Die Deckkraft gesperrter Punkte bleibt bei `--app-map-point-locked-opacity` (US-064).
- Rolle `User`: Der Map-Bereich bleibt vollständig ausgeblendet und die Route serverseitig geschützt (US-030, US-031).
- Keine Backend-Änderung erwartet — die Vergleichsdaten liefert bereits `GET /api/v1/projects/{projectId}/map/compare` (US-033). Sollte für die Differenzanzeige ein Feld fehlen, wird es additiv ergänzt und in der Story-Datei begründet.

### 5. Anmerkungen des Product Owners

Der in Issue #127 zusätzlich beobachtete Fall „Vergleichsmodus aktiviert, aber noch keine Vergleichsperspektive gewählt → 0 von 10 Stakeholdern sichtbar" ist als Akzeptanzkriterium aufgenommen, aber bewusst nicht als eigener Blocker gemeldet: Der Befund stammt aus einer Beobachtung ohne vollständige Ursachenanalyse. Ergibt die Umsetzung, dass dahinter ein Fehler in der Query statt in der Darstellung steckt, wird dafür eine eigene Story angelegt statt der Fehler stillschweigend in dieser Story mitbehoben (CLAUDE.md Abschnitt 6).
