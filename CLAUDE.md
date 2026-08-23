# System Context: Projekt „SlobSteak“

Diese Datei ist verbindlicher, rollenübergreifender Systemkontext für **jeden** Agenten, der an diesem Repository arbeitet. Sie gilt für jede Iteration, in der eine User Story aus `docs/usecases/BACKLOG.md` umgesetzt wird — ausnahmslos.

Für konkrete Architektur-, Test- und Coding-Regeln liest jeder Agent zusätzlich die für seine Rolle zuständige Datei unter `.claude/agents/` (siehe Abschnitt 1). Diese Datei hier enthält nur, was für **alle** Rollen gleichermaßen gilt.

Referenzdokumente, die vor jeder Story gelesen werden müssen — rollenunabhängig:
- `docs/PRD-SlobSteak.md` — fachliche Quelle der Wahrheit
- `docs/usecases/BACKLOG.md` — Reihenfolge, Bounded Contexts, Abhängigkeiten
- `docs/usecases/US-[NNN]-*.md` — die konkret zu bearbeitende Story

---

## 0. Technologie-Stack (verbindlich)

- **Backend:** C# / .NET (aktuelle LTS-Version), ASP.NET Core Web API.
- **Datenbank:** PostgreSQL, Anbindung über Entity Framework Core (Code-First, Migrationen).
- **Frontend:** Angular (aktuelle Version, Standalone Components), TypeScript.
- **Test-Frameworks:** xUnit (+ FluentAssertions, Moq oder NSubstitute) im Backend; Standard-Angular-Testing (Jasmine/Karma über Angular CLI) im Frontend.
- **Containerisierung:** Docker / `docker-compose` für API, Frontend und PostgreSQL — kein Cloud-Zwang (PRD Abschnitt 1.5).

Kein anderer Stack, kein anderes ORM, keine andere Frontend-Technologie wird ohne ausdrückliche Freigabe des Projektverantwortlichen eingeführt.

---

## 1. Rollen

Dieses Projekt wird von mehreren spezialisierten Agenten bearbeitet. Jeder Agent liest **zusätzlich** zu dieser Datei die für ihn zuständige Rollendatei, bevor er an einer Story arbeitet:

| Rolle | Datei | Verantwortung |
|---|---|---|
| Backend | `.claude/agents/backend.md` | .NET/DDD-Domänenlogik, Application-Services, API, Persistenz |
| Frontend | `.claude/agents/frontend.md` | Angular-Umsetzung, Komponenten, State, Services |
| QA | `.claude/agents/qa.md` | Story-Tests, Testpyramide, Regression, E2E, Testabdeckung |
| UX/UI | `.claude/agents/ux-ui.md` | Interaktions- und Visualdesign, Usability, Barrierefreiheit, Wording |

Eine Story kann mehrere Rollen betreffen (z. B. UX/UI → Frontend → QA, oder Backend + Frontend). Jeder Agent bearbeitet nur den Anteil seiner Rolle und übergibt nachvollziehbar an die nächste (Abschnitt 3.1).

Rollenübergreifend gilt: **Du triffst keine stillen Abweichungen vom PRD.** Wenn eine Story fachlich unklar oder widersprüchlich zum PRD ist, hältst du inne und dokumentierst die Unklarheit (Abschnitt 6), statt zu raten.

---

## 2. Verbindliche Kernregeln (rollenübergreifend)

Diese Regeln sind nicht verhandelbar — die konkrete Umsetzung je Rolle steht in der jeweiligen Rollendatei:

1. **Architektur-Grenzen sind bindend.** Jede Rolle hält sich an die in ihrer Rollendatei definierten Leitplanken (z. B. DDD-Schichtentrennung im Backend, Feature-Ordner-Struktur im Frontend).
2. **Automatisierte Tests sind Pflicht für jede neue Logik.** Kein Code gilt als fertig, solange er nicht nach dem für seine Rolle geltenden Standard getestet ist.
3. **Ein eigenständiger Story-Test pro User Story ist Pflicht.** Zu jeder Story `US-[NNN]` existiert ein dedizierter Testfall, der ausschließlich die im Story-Dokument gelisteten Akzeptanzkriterien prüft — Konvention siehe `.claude/agents/qa.md`.
4. **Lokale Verifizierbarkeit nach jeder Story.** Die Anwendung startet reproduzierbar über `docker-compose up`; die Story-spezifischen Tests laufen über einen dokumentierten Einzelbefehl; wo die Story eine UI oder einen API-Endpoint liefert, existiert eine kurze manuelle Anleitung. Kein Task gilt als abgeschlossen, ohne dass der Agent das Ergebnis selbst verifiziert hat.
5. **Dokumentation je User Story ist Pflicht.** Kein Code ohne Doku-Update (Abschnitt 5).

---

## 3. Workflow je User Story

**Definition of Ready** — vor Start:
- Alle in „Abhängigkeiten“ der Story genannten Vorgänger-Stories sind abgeschlossen (Tests grün, dokumentiert).
- Die Story-Datei wurde vollständig gelesen; Unklarheiten gegenüber dem PRD sind vorab geklärt (Abschnitt 6).
- Ein neuer Feature-Branch für genau diese Story wurde von einem aktuellen `main` erstellt (Abschnitt 4).

**Doing:**
- Es wird ausschließlich an der aktuellen Story gearbeitet; kein Vorgriff auf spätere Stories, kein Vermischen mehrerer Stories in einem Arbeitsschritt.
- Commits sind klein, thematisch fokussiert und tragen die Story-ID im Prefix (Abschnitt 4).

**Definition of Done** — vor Abschluss, alle Punkte zwingend erfüllt:
- [ ] Alle Akzeptanzkriterien der Story sind als automatisierte Tests abgebildet und grün (rollenspezifische Frameworks siehe jeweilige Rollendatei).
- [ ] Story-Test (Kernregel 3) existiert und ist eindeutig der Story zugeordnet.
- [ ] Die vollständige Testsuite aller an der Story beteiligten Rollen läuft grün — nicht nur die neuen Tests.
- [ ] Lokale Verifizierbarkeit ist gegeben und vom Agenten selbst ausgeführt (Kernregel 4).
- [ ] Dokumentation ist aktualisiert (Abschnitt 5).
- [ ] Linting/Formatierung aller betroffenen Rollen läuft ohne Fehler.
- [ ] `docs/usecases/BACKLOG.md` ist um den Status der Story aktualisiert (Spalte „Status“: `offen` / `in Arbeit` / `fertig`, plus Datum).
- [ ] Keine offenen TODOs im produktiven Code ohne verlinktes Follow-up.
- [ ] Alle Commits sind gepusht und ein PR mit aktiviertem Auto-Merge ist eröffnet (Abschnitt 4) — die Aufgabe des Agenten gilt bereits damit als abgeschlossen.
- [ ] Führt die Story neue Komponenten ein (neue Test-Projekte, E2E-Tests, Migrationen), ist `.github/workflows/pr-checks.yml` im selben PR entsprechend erweitert (Abschnitt 5.1).

### 3.1 Zusammenarbeit zwischen Rollen

- Eine Story mit mehreren betroffenen Rollen wird trotzdem in **einem** gemeinsamen Feature-Branch und **einem** gemeinsamen PR abgeschlossen — nicht in separaten PRs je Rolle (siehe „ein PR pro Story“ in Abschnitt 4).
- UX/UI-Vorgaben (falls die Story welche erfordert) liegen vor Beginn der Frontend-Umsetzung vor oder werden gemeinsam mit ihr abgestimmt. Backend-Contracts (DTOs/Endpunkte) sind vor Beginn der Frontend-Integration stabil oder werden innerhalb derselben Story gemeinsam festgelegt.
- Wird eine Story von mehreren Agenten nacheinander bearbeitet, hinterlässt jeder Agent eine kurze Übergabenotiz im PR-Beschreibungstext, damit der nächste Agent den Stand nachvollziehen kann.

---

## 4. Git & Commit-Konventionen (verbindlich für jede Rolle)

- **Ein Feature-Branch pro Story — verpflichtend, keine Ausnahme.** Bevor auch nur eine Zeile Code für eine Story geändert wird, wird von einem aktuellen `main` ein neuer Branch erstellt und ausgecheckt:
  ```
  git checkout main
  git pull
  git checkout -b feature/US-[NNN]-kurzbeschreibung
  ```
  Der Branchname folgt exakt dem Schema `feature/US-[NNN]-kurzbeschreibung` (z. B. `feature/US-021-stakeholder-anlegen`). Es wird nie direkt auf `main` committet und nie ein bestehender Feature-Branch für eine andere Story weiterverwendet.
- Commit-Messages folgen Conventional Commits und referenzieren die Story-ID, z. B. `feat(US-021): Stakeholder anlegen — API + Formular`.
- Kein Commit fasst mehrere User Stories zusammen.
- EF-Core-Migrations-Commits (`dotnet ef migrations add ...`) sind von Feature-Commits getrennt und eindeutig als solche erkennbar, z. B. `chore(US-020): EF-Core-Migration für Stakeholder-Tabelle`.
- **Pull Request nach Abschluss der Story — verpflichtend.** Sobald alle Punkte der Definition of Done (Abschnitt 3) erfüllt sind, werden alle Commits des Feature-Branches gepusht und ein Pull Request vom Feature-Branch auf `main` eröffnet, z. B.:
  ```
  git push -u origin feature/US-[NNN]-kurzbeschreibung
  gh pr create --base main --head feature/US-[NNN]-kurzbeschreibung \
    --title "feat(US-[NNN]): <Story-Titel>" \
    --body "<siehe unten>"
  ```
  Der PR-Titel referenziert die Story-ID. Der PR-Beschreibungstext enthält mindestens:
  - Kurzzusammenfassung der Story und der Umsetzung,
  - Checkliste der erfüllten Akzeptanzkriterien,
  - Nachweis der lokalen Verifizierbarkeit (Testergebnisse `dotnet test` / `ng test`, Smoke-Check),
  - ggf. Abweichungen/Anmerkungen gemäß Abschnitt 6,
  - ggf. Hinweise auf enthaltene EF-Core-Migrationen,
  - ggf. Übergabenotizen zwischen Rollen (Abschnitt 3.1).
  - Pro Story wird genau **ein** PR eröffnet; mehrere Stories werden nie in einem gemeinsamen PR zusammengefasst.
- **Auto-Merge — verbindlich für jeden Story-PR (seit ADR-0003).** Der PR wird nicht nur eröffnet, sondern zwingend mit aktiviertem GitHub-Auto-Merge und Squash-Merge-Strategie erstellt, sodass er automatisch nach `main` gemerged wird, sobald alle sechs in `.github/workflows/pr-checks.yml` definierten Required Status Checks (Branch-Protection-Regel auf `main`, siehe README.md „PR-Checks / Required Status Checks“) grün sind. Ab dem Zeitpunkt der PR-Erstellung findet **kein manuelles Review mehr statt, bevor gemerged wird** — die CI-Jobs sind das alleinige Merge-Gate.
  - Mit der GitHub CLI: `gh pr create --base main --head feature/US-[NNN]-kurzbeschreibung --title "feat(US-[NNN]): <Story-Titel>" --body "<siehe oben>" --auto --squash` (fällt die installierte `gh`-Version zurück, weil sie `--auto`/`--squash` nicht an `pr create` kennt, ersatzweise unmittelbar danach `gh pr merge --auto --squash` auf denselben PR anwenden).
  - Mit GitHub-MCP-Tools: das Auto-Merge-Flag direkt bei der PR-Erstellung setzen oder unmittelbar danach das entsprechende Auto-Merge-Tool auf den erzeugten PR anwenden.
  - **Zwingende Voraussetzung:** `main` muss eine Branch-Protection-Regel besitzen, die genau die sechs Job-Namen aus `pr-checks.yml` (`Backend: Build (Release)`, `Backend: Tests (dotnet test)`, `Backend: Code-Format (dotnet format)`, `Frontend: Build`, `Frontend: Lint (ng lint)`, `Frontend: Tests (ng test)`) als Required Status Checks listet. Ohne diese Regel merged GitHub sofort und unabhängig vom CI-Ergebnis — Auto-Merge darf daher **niemals** aktiviert werden, ohne vorher per `gh api repos/{owner}/{repo}/branches/main/protection` zu verifizieren, dass diese Regel aktiv ist. Führt eine Story neue Prüf-Jobs in `pr-checks.yml` ein (Abschnitt 5.1), wird die Branch-Protection-Regel im selben Arbeitsschritt um diese Jobs ergänzt.
  - **Wartebedingung & Handoff:** Sobald der PR mit aktiviertem Auto-Merge erstellt wurde, gilt die Aufgabe des Agenten bezüglich Code-Erstellung als abgeschlossen; es wird nicht manuell im Terminal auf das Ende der Actions gewartet — GitHub übernimmt das Mergen automatisch, sobald alle Required Status Checks bestanden wurden. Schlägt ein Required Check fehl, bleibt der PR offen (Auto-Merge wird von GitHub verworfen); die Behebung erfolgt in einem neuen Commit auf demselben Feature-Branch, nicht in einem neuen PR.

---

## 5. Dokumentationspflichten je Story (rollenübergreifend)

- Story-Datei `docs/usecases/US-[NNN]-*.md`: Statuszeile ergänzen (fertig am [Datum], PR/Commit-Referenz).
- Architekturentscheidungen mit Tragweite (unabhängig davon, welche Rolle sie trifft, z. B. Wahl des Concurrency-Mechanismus, JWT- vs. Cookie-Auth) werden als kurzes ADR (`docs/adr/NNNN-titel.md`) festgehalten.
- `CHANGELOG.md` im Projektroot erhält je abgeschlossener Story einen Eintrag unter „Unreleased“.
- Rollenspezifische Doku-Pflichten (Code-Kommentare, API-Doku, Komponentendoku) stehen in den jeweiligen Rollendateien.

### 5.1 CI-Erweiterungspflicht

Wenn eine User Story neue Komponenten einführt (z. B. neue Test-Projekte, End-to-End-Tests, Datenbank-Migrationen, neue Linting-Regeln), MUSS der zuständige Agent `.github/workflows/pr-checks.yml` im selben Pull Request so anpassen, dass diese neuen Test-Suites oder Validierungsschritte im CI-Workflow mitgeprüft werden. Der PR-Text nennt explizit, welche(r) Job(s) in `pr-checks.yml` neu hinzugekommen sind oder angepasst wurden, damit die Branch-Protection-Required-Status-Checks entsprechend nachgezogen werden können. Rollenspezifische Details (z. B. welche Jobs für Backend-Testprojekte bzw. E2E-Tests konkret nötig sind) stehen in `.claude/agents/backend.md` bzw. `.claude/agents/qa.md`.

---

## 6. Eskalation & Abweichungen vom PRD

Wenn eine Story-Anforderung dem PRD widerspricht, technisch nicht wie beschrieben umsetzbar ist, oder eine Entscheidung erfordert, die über die Story hinausgeht (z. B. Wahl einer konkreten NuGet-/npm-Library, die nicht im PRD vorgegeben ist):

1. Die Abweichung/Unklarheit wird explizit im PR-/Commit-Text sowie in der Story-Datei unter einem Abschnitt „Anmerkungen des Agenten“ festgehalten.
2. Es wird die PRD-konformste, am wenigsten überraschende Interpretation gewählt und diese Wahl begründet — keine stille Feature-Erweiterung, kein stilles Weglassen eines Akzeptanzkriteriums.
3. Betrifft die Abweichung eine zentrale Invariante aus PRD Abschnitt 4.3, wird die Umsetzung gestoppt und Rückmeldung eingeholt, statt eine potenziell falsche Fachlogik zu implementieren.

---

*Gilt für alle Iterationen ab sofort, rollenübergreifend. Diese Datei wird nicht im Rahmen einer einzelnen User Story verändert, sondern nur bei expliziter Anpassung der Entwicklungsrichtlinien durch den Projektverantwortlichen. Die Rollendateien unter `.claude/agents/` unterliegen derselben Änderungsregel.*
