# System Context: Projekt „SlobSteak"

Diese Datei ist verbindlicher Systemkontext für den Agenten, der an diesem Repository arbeitet. Sie gilt für jede Iteration, in der eine User Story aus `docs/usecases/BACKLOG.md` umgesetzt wird — ausnahmslos.

Eine Story wird vollständig von **einem** Agenten bearbeitet, unabhängig davon, welche Disziplin(en) sie berührt — es gibt keine separaten Rollen-Agenten mehr. Für konkrete Architektur-, Test- und Coding-Regeln liest der Agent zusätzlich jede für die Story zutreffende Rollendatei unter `.claude/agents/` (siehe Abschnitt 1). Diese Datei hier enthält nur, was für **alle** Disziplinen gleichermaßen gilt.

Referenzdokumente, Pflicht vor jeder Story — rollenunabhängig:
- `docs/PRD-SlobSteak.md` — fachliche Quelle der Wahrheit
- `docs/usecases/BACKLOG.md` — Reihenfolge, Bounded Contexts, Abhängigkeiten
- `docs/usecases/US-[NNN]-*.md` — konkret zu bearbeitende Story

---

## 0. Technologie-Stack (verbindlich)

- **Backend:** C# / .NET (aktuelle LTS-Version), ASP.NET Core Web API.
- **Datenbank:** PostgreSQL, Anbindung über Entity Framework Core (Code-First, Migrationen).
- **Frontend:** Angular (aktuelle Version, Standalone Components), TypeScript.
- **Test-Frameworks:** xUnit (+ FluentAssertions, Moq oder NSubstitute) Backend; Standard-Angular-Testing (Jasmine/Karma über Angular CLI) Frontend.
- **Containerisierung:** Docker / `docker-compose` für API, Frontend und PostgreSQL — kein Cloud-Zwang (PRD Abschnitt 1.5).

Kein anderer Stack/ORM/Frontend-Tech ohne ausdrückliche Freigabe des Projektverantwortlichen.

---

## 1. Rollen(-disziplinen)

Kein separater Agent pro Rolle mehr. **Ein** Agent bearbeitet jede User Story vollständig, von Anfang bis Ende — inklusive aller Disziplinen, die die Story berührt.

Vor Story-Start ermittelt der Agent anhand der Story-Datei (`docs/usecases/US-[NNN]-*.md`), welche der folgenden Disziplinen betroffen sind, und liest **zusätzlich** zu dieser Datei jede zutreffende Rollendatei vollständig, bevor er an der Story arbeitet:

| Disziplin | Datei | Verantwortung |
|---|---|---|
| Backend | `.claude/agents/backend.md` | .NET/DDD-Domänenlogik, Application-Services, API, Persistenz |
| Frontend | `.claude/agents/frontend.md` | Angular-Umsetzung, Komponenten, State, Services |
| QA | `.claude/agents/qa.md` | Story-Tests, Testpyramide, Regression, E2E, Testabdeckung |
| UX/UI | `.claude/agents/ux-ui.md` | Interaktions- und Visualdesign, Usability, Barrierefreiheit, Wording |

Eine Story kann mehrere Disziplinen betreffen (z. B. UX/UI → Frontend → QA, oder Backend + Frontend). In diesem Fall arbeitet der Agent alle zutreffenden Rollendateien in fachlich sinnvoller Reihenfolge ab (siehe 3.1) — innerhalb eines durchgehenden Arbeitsschritts, ohne Übergabe an einen anderen Agenten. Für jeden Disziplin-Anteil gelten die Regeln der jeweils zutreffenden Rollendatei uneingeschränkt; bei widersprüchlichen Vorgaben zwischen Rollendateien entscheidet, was für die konkrete Story fachlich korrekt ist, und die Abweichung wird nach Abschnitt 6 dokumentiert.

Disziplinübergreifend gilt: **Du triffst keine stillen Abweichungen vom PRD.** Wenn eine Story fachlich unklar oder widersprüchlich zum PRD ist, hältst du inne und dokumentierst die Unklarheit (Abschnitt 6), statt zu raten.

---

## 2. Verbindliche Kernregeln (rollenübergreifend)

Regeln nicht verhandelbar — konkrete Umsetzung je Rolle steht in jeweiliger Rollendatei:

1. **Architektur-Grenzen bindend.** Jede Rolle hält Leitplanken der Rollendatei ein (z.B. DDD-Schichtentrennung Backend, Feature-Ordner-Struktur Frontend).
2. **Automatisierte Tests Pflicht für jede neue Logik.** Code erst fertig, wenn nach Rollenstandard getestet.
3. **Eigener Story-Test pro User Story Pflicht.** Jede Story `US-[NNN]` hat dedizierten Testfall, prüft nur die im Story-Dokument gelisteten Akzeptanzkriterien — Konvention siehe `.claude/agents/qa.md`.
4. **Lokale Verifizierbarkeit nach jeder Story.** App startet reproduzierbar via `docker-compose up`; Story-Tests laufen via dokumentiertem Einzelbefehl; bei UI/API-Endpoint kurze manuelle Anleitung. Task erst abgeschlossen, wenn Agent Ergebnis selbst verifiziert hat.
5. **Dokumentation je User Story Pflicht.** Kein Code ohne Doku-Update (Abschnitt 5).

---

## 3. Workflow je User Story

**Definition of Ready** — vor Start:
- Alle in „Abhängigkeiten" der Story genannten Vorgänger-Stories abgeschlossen (Tests grün, dokumentiert).
- Story-Datei vollständig gelesen; Unklarheiten ggü. PRD vorab geklärt (Abschnitt 6).
- Neuer Feature-Branch für genau diese Story von aktuellem `main` erstellt (Abschnitt 4).

**Doing:**
- Nur an aktueller Story arbeiten; kein Vorgriff auf spätere Stories, kein Vermischen mehrerer Stories in einem Schritt.
- Commits klein, thematisch fokussiert, Story-ID im Prefix (Abschnitt 4).

**Definition of Done** — vor Abschluss, alle Punkte zwingend erfüllt:
- [ ] Alle Akzeptanzkriterien der Story als automatisierte Tests abgebildet und grün (rollenspezifische Frameworks siehe jeweilige Rollendatei).
- [ ] Story-Test (Kernregel 3) existiert, eindeutig der Story zugeordnet.
- [ ] Vollständige Testsuite aller beteiligten Rollen läuft grün — nicht nur neue Tests.
- [ ] Lokale Verifizierbarkeit gegeben, vom Agenten selbst ausgeführt (Kernregel 4).
- [ ] Dokumentation aktualisiert (Abschnitt 5).
- [ ] Linting/Formatierung aller betroffenen Rollen fehlerfrei.
- [ ] `docs/usecases/BACKLOG.md` um Status der Story aktualisiert (Spalte „Status": `offen` / `in Arbeit` / `fertig`, plus Datum).
- [ ] Keine offenen TODOs im produktiven Code ohne verlinktes Follow-up.
- [ ] Alle Commits gepusht, PR mit aktiviertem Auto-Merge eröffnet (Abschnitt 4) — Agenten-Aufgabe damit bereits abgeschlossen.
- [ ] Bei neuen Komponenten der Story (Test-Projekte, E2E-Tests, Migrationen): `.github/workflows/pr-checks.yml` im selben PR entsprechend erweitert (Abschnitt 5.1).

### 3.1 Zusammenarbeit zwischen Disziplinen

- Eine Story mit mehreren betroffenen Disziplinen wird trotzdem in **einem** gemeinsamen Feature-Branch und **einem** gemeinsamen PR abgeschlossen — nicht in separaten PRs je Disziplin (siehe „ein PR pro Story" in Abschnitt 4).
- UX/UI-Vorgaben (falls die Story welche erfordert) liegen vor Beginn der Frontend-Umsetzung vor oder werden im selben Arbeitsschritt vorab festgelegt. Backend-Contracts (DTOs/Endpunkte) sind vor Beginn der Frontend-Integration stabil oder werden innerhalb derselben Story vorab festgelegt.
- Empfohlene Reihenfolge innerhalb einer Story mit mehreren Disziplinen: UX/UI-Vorgaben (falls nötig) → Backend-Contracts/-Logik → Frontend-Integration → QA/Story-Test. Abweichungen sind zulässig, wenn fachlich sinnvoller.
- Der PR-Beschreibungstext hält kurz fest, welche Disziplinen (Backend/Frontend/QA/UX-UI) die Story berührt und bearbeitet hat — als Nachvollziehbarkeit für spätere Reviews, nicht als Übergabe zwischen Agenten.

---

## 4. Git & Commit-Konventionen (verbindlich für jede Rolle)

- **Ein Feature-Branch pro Story — verpflichtend, keine Ausnahme.** Vor jeder Code-Änderung für eine Story: neuer Branch von aktuellem `main` erstellt und ausgecheckt:
  ```
  git checkout main
  git pull
  git checkout -b feature/US-[NNN]-kurzbeschreibung
  ```
  Branchname folgt exakt Schema `feature/US-[NNN]-kurzbeschreibung` (z. B. `feature/US-021-stakeholder-anlegen`). Nie direkt auf `main` committen, nie bestehenden Feature-Branch für andere Story weiterverwenden.
- Commit-Messages folgen Conventional Commits, referenzieren Story-ID, z. B. `feat(US-021): Stakeholder anlegen — API + Formular`.
- Kein Commit fasst mehrere User Stories zusammen.
- EF-Core-Migrations-Commits (`dotnet ef migrations add ...`) getrennt von Feature-Commits, eindeutig erkennbar, z. B. `chore(US-020): EF-Core-Migration für Stakeholder-Tabelle`.
- **Pull Request nach Story-Abschluss — verpflichtend.** Sobald DoD (Abschnitt 3) erfüllt: alle Commits des Feature-Branches gepusht, PR vom Feature-Branch auf `main` eröffnet, z. B.:
  ```
  git push -u origin feature/US-[NNN]-kurzbeschreibung
  gh pr create --base main --head feature/US-[NNN]-kurzbeschreibung \
    --title "feat(US-[NNN]): <Story-Titel>" \
    --body "<siehe unten>"
  ```
  PR-Titel referenziert Story-ID. PR-Beschreibungstext enthält mindestens:
  - Kurzzusammenfassung Story + Umsetzung,
  - Checkliste der erfüllten Akzeptanzkriterien,
  - Nachweis lokaler Verifizierbarkeit (Testergebnisse `dotnet test` / `ng test`, Smoke-Check),
  - ggf. Abweichungen/Anmerkungen gemäß Abschnitt 6,
  - ggf. Hinweise auf enthaltene EF-Core-Migrationen,
  - ggf. Hinweis, welche Disziplinen (Backend/Frontend/QA/UX-UI) bearbeitet wurden (Abschnitt 3.1).
  - Pro Story wird genau **ein** PR eröffnet; mehrere Stories werden nie in einem gemeinsamen PR zusammengefasst.
- **Auto-Merge — verbindlich für jeden Story-PR (seit ADR-0003).** Der PR wird nicht nur eröffnet, sondern zwingend mit aktiviertem GitHub-Auto-Merge und Squash-Merge-Strategie erstellt, sodass er automatisch nach `main` gemerged wird, sobald alle sechs in `.github/workflows/pr-checks.yml` definierten Required Status Checks (Branch-Protection-Regel auf `main`, siehe README.md „PR-Checks / Required Status Checks") grün sind. Ab dem Zeitpunkt der PR-Erstellung findet **kein manuelles Review mehr statt, bevor gemerged wird** — die CI-Jobs sind das alleinige Merge-Gate.
  - Mit der GitHub CLI: `gh pr create --base main --head feature/US-[NNN]-kurzbeschreibung --title "feat(US-[NNN]): <Story-Titel>" --body "<siehe oben>" --auto --squash` (fällt die installierte `gh`-Version zurück, weil sie `--auto`/`--squash` nicht an `pr create` kennt, ersatzweise unmittelbar danach `gh pr merge --auto --squash` auf denselben PR anwenden).
  - Mit GitHub-MCP-Tools: das Auto-Merge-Flag direkt bei der PR-Erstellung setzen oder unmittelbar danach das entsprechende Auto-Merge-Tool auf den erzeugten PR anwenden.
  - **Zwingende Voraussetzung:** `main` muss eine Branch-Protection-Regel besitzen, die genau die sechs Job-Namen aus `pr-checks.yml` (`Backend: Build (Release)`, `Backend: Tests (dotnet test)`, `Backend: Code-Format (dotnet format)`, `Frontend: Build`, `Frontend: Lint (ng lint)`, `Frontend: Tests (ng test)`) als Required Status Checks listet. Ohne diese Regel merged GitHub sofort und unabhängig vom CI-Ergebnis — Auto-Merge darf daher **niemals** aktiviert werden, ohne vorher per `gh api repos/{owner}/{repo}/branches/main/protection` zu verifizieren, dass diese Regel aktiv ist. Führt eine Story neue Prüf-Jobs in `pr-checks.yml` ein (Abschnitt 5.1), wird die Branch-Protection-Regel im selben Arbeitsschritt um diese Jobs ergänzt.
  - **Wartebedingung & Handoff:** Sobald der PR mit aktiviertem Auto-Merge erstellt wurde, gilt die Aufgabe des Agenten bezüglich Code-Erstellung als abgeschlossen; es wird nicht manuell im Terminal auf das Ende der Actions gewartet — GitHub übernimmt das Mergen automatisch, sobald alle Required Status Checks bestanden wurden. Schlägt ein Required Check fehl, bleibt der PR offen (Auto-Merge wird von GitHub verworfen); die Behebung erfolgt in einem neuen Commit auf demselben Feature-Branch, nicht in einem neuen PR.

---

## 5. Dokumentationspflichten je Story (rollenübergreifend)

- Story-Datei `docs/usecases/US-[NNN]-*.md`: Statuszeile ergänzen (fertig am [Datum], PR/Commit-Referenz).
- Architekturentscheidungen mit Tragweite (rollenunabhängig, z. B. Wahl des Concurrency-Mechanismus, JWT- vs. Cookie-Auth) als kurzes ADR (`docs/adr/NNNN-titel.md`) festhalten.
- `CHANGELOG.md` im Projektroot erhält je abgeschlossener Story einen Eintrag unter „Unreleased".
- Rollenspezifische Doku-Pflichten (Code-Kommentare, API-Doku, Komponentendoku) stehen in jeweiligen Rollendateien.

### 5.1 CI-Erweiterungspflicht

Führt User Story neue Komponenten ein (z. B. neue Test-Projekte, End-to-End-Tests, Datenbank-Migrationen, neue Linting-Regeln): zuständiger Agent MUSS `.github/workflows/pr-checks.yml` im selben Pull Request so anpassen, dass diese neuen Test-Suites oder Validierungsschritte im CI-Workflow mitgeprüft werden. PR-Text nennt explizit, welche(r) Job(s) in `pr-checks.yml` neu hinzugekommen oder angepasst wurden, damit Branch-Protection-Required-Status-Checks entsprechend nachgezogen werden können. Rollenspezifische Details (z. B. welche Jobs für Backend-Testprojekte bzw. E2E-Tests konkret nötig sind) stehen in `.claude/agents/backend.md` bzw. `.claude/agents/qa.md`.

---

## 6. Eskalation & Abweichungen vom PRD

Wenn Story-Anforderung dem PRD widerspricht, technisch nicht wie beschrieben umsetzbar ist, oder Entscheidung erfordert, die über Story hinausgeht (z. B. Wahl einer konkreten NuGet-/npm-Library, nicht im PRD vorgegeben):

1. Abweichung/Unklarheit explizit im PR-/Commit-Text sowie in Story-Datei unter Abschnitt „Anmerkungen des Agenten" festhalten.
2. PRD-konformste, am wenigsten überraschende Interpretation wählen und diese Wahl begründen — keine stille Feature-Erweiterung, kein stilles Weglassen eines Akzeptanzkriteriums.
3. Betrifft Abweichung zentrale Invariante aus PRD Abschnitt 4.3: Umsetzung stoppen, Rückmeldung einholen statt potenziell falsche Fachlogik implementieren.

---

*Gilt ab sofort für alle Iterationen, rollenübergreifend. Diese Datei wird nicht im Rahmen einer einzelnen User Story verändert, sondern nur bei expliziter Anpassung der Entwicklungsrichtlinien durch Projektverantwortlichen. Rollendateien unter `.claude/agents/` unterliegen derselben Änderungsregel.*
