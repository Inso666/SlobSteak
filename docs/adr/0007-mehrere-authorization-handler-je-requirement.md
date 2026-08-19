# ADR 0007: Mehrere Authorization-Handler je ProjectRoleRequirement statt eines projectId-Zwangs

**Status:** Akzeptiert
**Datum:** 2026-08-19
**Kontext-Story:** US-022 (Stakeholder-Stammdaten bearbeiten)

## Kontext

`RequireProjectRoleAttribute`/`ProjectRoleAuthorizationHandler` (US-007) sichern Controller-Actions
rollenbasiert ab, indem sie ein `projectId`-Routensegment auslesen, das referenzierte Projekt laden
und die Mitgliedschaft des angemeldeten Nutzers prüfen. Das funktioniert für alle bisherigen Routen
(`POST /api/v1/projects/{projectId}/stakeholders` usw.), die das Projekt direkt in der Route führen.

US-022 führt `PATCH /api/v1/stakeholders/{id}` ein — laut Story-Vorgabe ohne `projectId`-Segment,
da ein Stakeholder über seine eigene Id eindeutig adressiert wird. Die Rollenprüfung muss dennoch
gegen das Projekt erfolgen, dem der referenzierte Stakeholder angehört. Zusätzlich verlangt
Akzeptanzkriterium 5, dass ein `PATCH` auf einen bereits soft-gelöschten Stakeholder `404` liefert
— auch für einen ansonsten berechtigten Nutzer, nicht `403`.

**Konflikt:** Der bestehende Handler kann `projectId` nicht aus einer Route ohne dieses Segment
lesen. Alternativen wären (a) eine Sonderbehandlung direkt im Controller (Repository-Zugriff aus
der Api-Schicht, gegen die etablierte Schichtenregel aus CLAUDE.md Abschnitt 3.1) oder (b) ein für
diese eine Route zuständiger, eigenständiger Autorisierungsmechanismus außerhalb des
`[RequireProjectRole(...)]`-Attributs (Bruch mit dem deklarativen Stil, der für alle anderen
rollenbasierten Endpunkte gilt).

## Entscheidung

Ein zweiter `IAuthorizationHandler<ProjectRoleRequirement>`
(`StakeholderProjectRoleAuthorizationHandler`) wird zusätzlich zum bestehenden
`ProjectRoleAuthorizationHandler` registriert. ASP.NET Core erlaubt mehrere Handler je
Requirement-Typ; die Autorisierung gilt als erfüllt, sobald irgendeiner `context.Succeed(...)`
ruft. Der neue Handler:

- liest ein `id`-Routensegment (Stakeholder-Id) statt `projectId`,
- löst darüber den Stakeholder **inklusive soft-gelöschter** (`includeDeleted: true`) über
  `IStakeholderRepository` auf, um dessen `ProjectId` zu ermitteln,
- lädt das Projekt und prüft die Mitgliedschaft exakt wie der bestehende Handler (dieselbe
  framework-freie `ProjectRolePolicy.IsAllowed`).

Damit bleibt `[RequireProjectRole(...)]` als einheitliches, deklaratives Muster für alle
rollenbasierten Endpunkte erhalten — unabhängig davon, ob die Route das Projekt direkt oder
indirekt (über ein referenziertes Kind-Aggregat) benennt.

**Bewusst `includeDeleted: true`:** Würde der Handler einen soft-gelöschten Stakeholder wie einen
nicht existierenden behandeln (keine Autorisierung möglich → `403`), bekäme ein eigentlich
berechtigter Nutzer den fachlich falschen Statuscode. Der Handler autorisiert daher unabhängig vom
Soft-Delete-Status; das Application-Layer (`UpdateStakeholderDetailsService`, das
`includeDeleted: false` verwendet) liefert danach den korrekten `404`.

## Konsequenzen

- Positiv: Zukünftige Stories mit ähnlichen Routen (z. B. `DELETE`/Soft-Delete auf
  `/api/v1/stakeholders/{id}`, US-023; `StakeholderAssessment`-Routen mit `stakeholderId`) können
  denselben Handler-Ansatz wiederverwenden oder einen analogen dritten Handler ergänzen, ohne den
  bestehenden Mechanismus zu verändern.
- Negativ/Trade-off: Zwei Handler-Implementierungen mit strukturell ähnlichem Code (Route-Value
  lesen → Repository laden → `ProjectRolePolicy.IsAllowed` prüfen). Eine gemeinsame Basisklasse
  wurde bewusst nicht eingeführt, um die Route-Value-Auflösung (unterschiedliche Routenschlüssel,
  unterschiedliche Repository-Typen) nicht vorschnell zu abstrahieren, bevor ein dritter
  Anwendungsfall das tatsächliche gemeinsame Muster zeigt.
- Für einen tatsächlich nicht existierenden Stakeholder (falsche Id, kein Soft-Delete-Fall)
  liefert die Route weiterhin `403` statt `404`, da kein Handler zustimmen kann (das Projekt lässt
  sich nicht auflösen) — bewusst kein Existenz-Leak über den Statuscode, konsistent mit dem
  Verhalten bestehender projektbezogener Endpunkte.
