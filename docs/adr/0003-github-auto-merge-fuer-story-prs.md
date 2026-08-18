# ADR 0003: GitHub Auto-Merge (Squash) für Story-Pull-Requests, gebunden an Required Status Checks

**Status:** Akzeptiert
**Datum:** 2026-08-18
**Kontext-Story:** Repository-weite Prozessänderung (kein einzelnes US-NNN), angefragt vom
Projektverantwortlichen.

## Kontext

CLAUDE.md Abschnitt 3.5 sah bisher vor, dass ein Story-PR nach Eröffnung standardmäßig zur
manuellen Review offen bleibt und nicht automatisch gemerged wird, es sei denn, der
Projektverantwortliche gibt dies für das jeweilige Repository ausdrücklich frei. Der
Projektverantwortliche hat diese Freigabe jetzt ausdrücklich erteilt: Story-PRs sollen
vollautomatisch nach `main` gemerged werden, sobald alle CI-Checks grün sind — ohne dass ein
Agent oder Mensch manuell auf das Ende der Actions wartet oder den Merge-Button betätigt.

**Wichtiger Befund vor der Umsetzung:** Zum Zeitpunkt der Anfrage lief zwar bereits
`.github/workflows/pr-checks.yml` (sechs Jobs: Backend Build/Test/Format, Frontend
Build/Lint/Test) bei jedem PR auf `main`, aber `main` besaß **keine Branch-Protection-Regel**
(`gh api repos/{owner}/{repo}/branches/main/protection` → `404 Branch not protected`). Ohne eine
Regel, die diese sechs Jobs als "Required Status Checks" listet, hätte GitHub Auto-Merge einen PR
sofort gemerged, unabhängig davon, ob `pr-checks.yml` überhaupt durchgelaufen oder fehlgeschlagen
war — Auto-Merge wäre also keine "Merge, sobald CI grün ist"-Regel gewesen, sondern faktisch ein
sofortiger, ungeprüfter Merge ohne jedes Gate (weder automatisiert noch menschlich). Das README
(Abschnitt "PR-Checks / Required Status Checks") empfahl das Nachziehen dieser Branch-Protection-
Regel bereits, sie war aber nie tatsächlich auf `main` angewendet worden.

## Entscheidung

1. **Branch-Protection auf `main`** wurde eingerichtet
   (`gh api -X PUT repos/{owner}/{repo}/branches/main/protection`) mit `required_status_checks`
   (strict, d. h. Branch muss aktuell sein) auf genau den sechs Job-Namen aus `pr-checks.yml`, plus
   `enforce_admins: true` und `allow_force_pushes: false` / `allow_deletions: false`. Damit ist
   sichergestellt, dass GitHub jeden Merge — auch Auto-Merge — erst zulässt, wenn alle sechs Jobs
   erfolgreich waren.
2. **CLAUDE.md Abschnitt 3.5** wurde um eine verbindliche "Auto-Merge"-Regel ergänzt: Jeder
   Story-PR wird mit aktiviertem GitHub-Auto-Merge und Squash-Strategie erstellt
   (`gh pr create ... --auto --squash` bzw. äquivalentes MCP-Tooling). Die bisherige "Merge
   erfolgt nicht automatisch"-Klausel wurde ersetzt. Die neue Regel macht die
   Branch-Protection-Voraussetzung aus Punkt 1 explizit zur Bedingung: Auto-Merge darf nur
   aktiviert werden, wenn zuvor verifiziert wurde, dass die Required-Status-Checks-Regel auf
   `main` aktiv ist.
3. Es wird **keine verpflichtende menschliche Review** (`required_pull_request_reviews`) als
   zusätzliches Gate verlangt — die sechs CI-Jobs sind das alleinige Merge-Gate, wie vom
   Projektverantwortlichen angefragt. Menschliches Review bleibt weiterhin möglich (PR-Kommentare
   vor dem Merge), ist aber keine Merge-Voraussetzung mehr.
4. Die DoD-Checkliste (CLAUDE.md Abschnitt 3.3) wurde entsprechend angepasst: Die Story gilt mit
   Eröffnung des Auto-Merge-PR als abgeschlossen; auf den tatsächlichen Merge wird nicht mehr
   gewartet.

## Konsequenzen

- Positiv: Story-Durchsatz steigt, da kein manueller Merge-Schritt mehr nötig ist; das Verhalten
  ist reproduzierbar über die dokumentierte Branch-Protection-Regel nachvollziehbar.
- Negativ/Trade-off: Es findet ab PR-Eröffnung keine inhaltliche menschliche Code-Review vor dem
  Merge nach `main` mehr statt — Fehler, die `pr-checks.yml` nicht erkennt (fachliche Fehler,
  Architekturabweichungen, die trotz grüner Tests durchrutschen), landen ungeprüft auf `main`.
  Dieses Risiko wird bewusst in Kauf genommen, weil der Projektverantwortliche es ausdrücklich so
  angefordert hat; ein Rückbau (Review wieder verpflichtend machen) ist jederzeit über eine erneute
  Anpassung der Branch-Protection-Regel (`required_pull_request_reviews`) sowie von CLAUDE.md
  Abschnitt 3.5 möglich.
- Wartungspflicht: Führt eine Story neue Jobs in `pr-checks.yml` ein, MUSS die
  Branch-Protection-Regel auf `main` im selben Arbeitsschritt um diese Jobs ergänzt werden (siehe
  CLAUDE.md Abschnitt 3.3 "Erweiterungspflicht" und Abschnitt 3.5) — sonst prüft Auto-Merge die
  neuen Jobs nicht mit.
