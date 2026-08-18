# ADR 0005: JWT-Bearer-Token statt serverseitiger Session für die Login-API

**Status:** Akzeptiert
**Datum:** 2026-08-19
**Kontext-Story:** US-006 (Login-API mit Session/Token-Ausstellung)

## Kontext

US-006 lässt in den technischen Hinweisen explizit offen, ob `POST /api/v1/auth/login` ein JWT
oder eine serverseitige Session-ID ausstellt ("Session-Token (JWT oder serverseitige
Session-ID)"). CLAUDE.md Abschnitt 4 verlangt für solche über die Story hinausgehenden
Architekturentscheidungen eine dokumentierte, PRD-konformste Wahl statt einer stillen Annahme;
Abschnitt 3.6 nennt „JWT- vs. Cookie-Auth“ explizit als Beispiel für eine ADR-pflichtige
Entscheidung.

Die bereits im Backlog vorgesehene Folge-Story US-007 (Rollenbasierte
Authorization-Middleware) spricht in ihren Akzeptanzkriterien konkret von „JWT-Bearer-Token“ und
Claims, die „aus dem JWT“ stammen (`sub`/`userId`, `isSystemAdmin`) — die Wahl ist damit durch den
Backlog selbst bereits weitgehend vorgezeichnet.

## Entscheidung

`POST /api/v1/auth/login` stellt ein signiertes JWT (HMAC-SHA256, `System.IdentityModel.Tokens.Jwt`)
aus, keine serverseitige Session. Das Token trägt ausschließlich die Claims `sub` (Nutzer-Id) und
`isSystemAdmin` — bewusst keine projektbezogenen Rollen (US-006 Akzeptanzkriterium 4), diese werden
laut US-007 pro Request aus `project_memberships` nachgeladen. Gültigkeitsdauer 8 Stunden, Issuer
`SlobSteak`, Audience `SlobSteak.Api`. Der symmetrische Signierschlüssel wird ausschließlich über
die Umgebungsvariable `JWT_SIGNING_KEY` konfiguriert (kein Secret im Code/`appsettings.json`,
CLAUDE.md Abschnitt 3.7), analog zu `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` aus US-005.

Der Port `IJwtTokenGenerator` ist in `SlobSteak.Application.Identity` definiert; die konkrete
Implementierung (`JwtTokenGenerator`, mit Abhängigkeit auf `System.IdentityModel.Tokens.Jwt`) liegt
in der Composition Root `SlobSteak.Api`, da `SlobSteak.Application` laut CLAUDE.md Abschnitt 3.1
ausschließlich `SlobSteak.Domain` referenzieren darf und `SlobSteak.Infrastructure` keine
Abhängigkeit auf `SlobSteak.Application` hat, um das Interface zu implementieren.

Die Validierung eingehender JWTs (Authentication Middleware, `401` bei fehlendem/ungültigem Token)
ist bewusst **nicht** Teil dieser Story — das ist laut Backlog explizit Akzeptanzkriterium 4 von
US-007 und würde einen Vorgriff auf eine spätere Story darstellen (CLAUDE.md Abschnitt 3.3).

## Konsequenzen

- Positiv: Zustandslos — kein serverseitiger Session-Store nötig, passt zum SPA-Charakter des
  Angular-Frontends und zur reinen Rest-API ohne Cookie-/CSRF-Komplexität. Direkt kompatibel mit der
  in US-007 bereits vorgesehenen `AddAuthentication().AddJwtBearer(...)`-Middleware.
  Rollenwechsel (`ProjectMembership.Role`) wirken laut US-007 sofort, weil sie nicht im Token,
  sondern bei jedem Request aus der Datenbank gelesen werden — kein Token-Refresh nötig.
- Negativ/Trade-off: Ein ausgestelltes JWT kann vor Ablauf nicht serverseitig widerrufen werden
  (kein Session-Store). Für den MVP-Kontext (interne Anwendung, PRD Abschnitt 1.5) wird dies mit der
  vergleichsweise kurzen Gültigkeitsdauer (8 Stunden) als akzeptabel bewertet; eine spätere
  Token-Blacklist/Revocation-Story kann bei Bedarf nachgezogen werden, ohne diese Entscheidung zu
  brechen (Wechsel auf `AddJwtBearer` mit Revocation-Check bleibt additiv möglich).
