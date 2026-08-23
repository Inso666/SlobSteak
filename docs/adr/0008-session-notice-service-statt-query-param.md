# ADR 0008: Einmaliger `SessionNoticeService` statt Router-Query-Param für den 401-Hinweistext

**Status:** Akzeptiert
**Datum:** 2026-08-23
**Kontext-Story:** US-044 (Globales HTTP-Error-Handling inkl. automatischer Weiterleitung bei abgelaufener Sitzung)

## Kontext

`httpErrorInterceptor` muss bei einer `401`-Response das Token löschen, zu `/login` navigieren und
dabei einen für den Nutzer sichtbaren Hinweistext transportieren („Deine Sitzung ist abgelaufen.
Bitte melde dich erneut an.“, Akzeptanzkriterium 2). Der Interceptor selbst rendert kein UI — die
Meldung muss also über die Navigation hinweg an `LoginPageComponent` übergeben werden.

Zwei naheliegende Mechanismen standen zur Wahl:

1. **Router-Query-Param** (`router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } })`),
   von `LoginPageComponent` über `ActivatedRoute` gelesen.
2. **Ein eigener, minimaler State-Container** (`SessionNoticeService`, `providedIn: 'root'`), der die
   Meldung als Signal hält; der Interceptor setzt sie, `LoginPageComponent` liest und löscht sie in
   `ngOnInit` (einmalige Anzeige).

## Entscheidung

Variante 2 (`SessionNoticeService`). Gründe:

- **Kein URL-Leak:** Ein Query-Param wie `?sessionExpired=true` bleibt in der Browser-Historie/URL
  stehen, bis der Nutzer navigiert — ein Reload der Login-Seite würde die (dann veraltete) Meldung
  erneut anzeigen, sofern die Komponente nicht zusätzlich Logik zum Entfernen des Query-Params nach
  dem Lesen implementiert. Der Service kapselt „einmalige Anzeige, danach automatisch weg“ direkt in
  seiner `consume()`-Methode, ohne zusätzliche Router-Navigation nur zum Bereinigen der URL.
- **Geringere Kopplung an Routing-Details:** Der Interceptor muss keine Kenntnis von Query-Param-
  Namen haben, die andernorts (z. B. künftige Deep-Links auf `/login`) kollidieren könnten.
- **Konsistent mit bestehendem Muster:** `TokenStorageService` (US-009) löst dieselbe Art von
  Anforderung — Zustand, der eine einzelne Navigation überlebt — bereits über einen eigenen,
  injizierbaren Service statt über Browser-native Mechanismen.

## Konsequenzen

- Positiv: `LoginPageComponent` bleibt unabhängig davon testbar, ob die Navigation dorthin über den
  Interceptor oder direkten Aufruf (`routerLink="/login"`) erfolgte — es reicht, `SessionNoticeService`
  vorab zu befüllen (siehe `login-page.component.spec.ts`).
- Negativ/Trade-off: Ein zusätzlicher, projektweiter Singleton-Service für einen einzigen
  Anwendungsfall. Sollten künftige Stories weitere „einmalige Hinweise nach Redirect“ benötigen
  (z. B. nach einer erzwungenen Abmeldung, US-045), kann derselbe Service wiederverwendet werden,
  statt für jeden Fall einen neuen Mechanismus einzuführen.
- Der Service hält seinen Zustand ausschließlich im Speicher (kein `localStorage`) — bei einem vollen
  Seiten-Reload zwischen 401-Redirect und Rendern von `/login` (in der Praxis nicht der Fall, da die
  Navigation clientseitig über den Angular-Router erfolgt) ginge die Meldung verloren. Das ist
  bewusst in Kauf genommen, da ein persistenter Hinweis über einen Reload hinaus fachlich nicht
  gefordert ist und Query-Params dasselbe Problem hätten, sofern die URL nicht erhalten bliebe.
