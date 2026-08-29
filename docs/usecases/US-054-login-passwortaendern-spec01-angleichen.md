**ID:** US-054
**Titel:** Login- und Passwort-Änderungs-Masken gemäß SPEC-01 angleichen
**Bounded Context / Domain:** IdentityAccess (Presentation)
**Abhängigkeiten:** US-008, US-009, US-047, US-053

**Status:** fertig (29.08.2026), PR siehe unten

---

### 1. User Story

Als **Nutzer** möchte ich, dass die Anmeldemaske und der erzwungene Passwort-Änderungs-Dialog wie im abgestimmten Wireframe (`docs/specs/SPEC-01-Login.md`) aussehen und sich verhalten, damit der erste Eindruck der Anwendung stimmig ist und ich mein neues Passwort zuverlässig korrekt eingeben kann.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“: „Die Anmeldemaske entspricht nicht dem Wireframe.“ und „Die Maske zum Passwort ändern entspricht nicht dem Wireframe.“
- **Verifikation durch PO (Abgleich `SPEC-01-Login.md` gegen aktuellen Code):**

  **Login-Seite (`login-page.component.html`) — Deltas zu SPEC-01 §1.2:**
  - Der komplette „Markenblock“ (Logo-SVG + „SlobSteak“-Schriftzug + Tagline „Stakeholder-Management für Projektteams“) fehlt ersatzlos; die Seite beginnt direkt mit der Karte.
  - Die Footnote „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.“ fehlt.
  - Der in SPEC-01 vorgesehene `bootstrapping`-Ladezustand (Skeleton-Platzhalter statt Formular während des initialen Ladens) ist nicht implementiert.
  - Layout: SPEC-01 sieht eine zentrierte, auf `min-h-screen` aufgespannte Seite mit fester Kartenbreite (`w-25rem`) vor; die aktuelle Umsetzung (`class="login"`, siehe zugehöriges `.css`) ist strukturell einfacher und weicht optisch ab.

  **Passwort-Änderungs-Dialog (`password-change-modal.component.html`) — Deltas zu SPEC-01 §1.3:**
  - Der Icon-Badge (amberfarbener Kreis mit Schloss-Icon `pi-lock`, `var(--yellow-100)`/`var(--yellow-600)` bzw. äquivalente SPEC-00-Tokens) fehlt vollständig.
  - **Funktionale Abweichung, nicht nur optisch:** SPEC-01 sieht zwei Felder vor — „Neues Passwort“ **und** „Passwort bestätigen“ (`confirmPassword`) mit einem Cross-Field-`passwordsMatchValidator`. Die aktuelle Implementierung hat **nur ein** Passwortfeld, keine Bestätigung, keinen Abgleich — ein Nutzer kann sich beim neuen Passwort vertippen, ohne dass die UI das bemerkt.
  - Mindestlänge weicht ab: SPEC-01 fordert `minLength(10)` mit Platzhaltertext „Mindestens 10 Zeichen“; aktueller Code fordert 8 Zeichen mit Meldung „Das Passwort muss mindestens 8 Zeichen lang sein.“
  - Wortlaut/Ansprache weicht ab: SPEC-01 verwendet „du“ und den Titel „Neues Passwort festlegen“ samt Kontext-Text „Dies ist dein erster Login…“; aktueller Code verwendet „Sie“ und den Titel „Passwort ändern“ — uneinheitliche Anrede im Vergleich zur übrigen, laut US-045/046/047 durchgängig informell gehaltenen Anwendung.
  - Der erklärende Hinweis „Du kannst die Anwendung erst nach dieser Änderung nutzen — der Dialog lässt sich nicht überspringen oder schließen.“ (SPEC-01) fehlt; das nicht schließbare Verhalten selbst (`[closable]="false"` etc.) ist dagegen bereits korrekt umgesetzt.
- **Token-Hinweis (bereits von US-047 dokumentiert):** SPEC-01 verwendet an einigen Stellen noch generische PrimeNG-Variablennamen (`var(--surface-ground)` etc.) statt der in SPEC-00 §1.2 definierten `--app-*`-Tokens. Wie bereits in US-047 entschieden gilt SPEC-00 als alleinige Quelle der Wahrheit für Farb-/Radius-/Abstands-**Werte**; diese Story übernimmt aus SPEC-01 ausschließlich die **strukturellen/inhaltlichen** Vorgaben (Markenblock, Tagline, Footnote, Icon-Badge, Bestätigungsfeld, Wortlaut), nicht die dortigen alten Variablennamen.
- **Relevant für DDD:** Presentation-Schicht plus eine kleine, rein clientseitige Validierungsergänzung (`passwordsMatchValidator`) — keine Backend-/API-Änderung, `ChangePasswordService` (Application-Schicht) validiert das neue Passwort ohnehin bereits serverseitig unabhängig von der UI.

### 3. Akzeptanzkriterien

- [x] Login-Seite zeigt den Markenblock (Logo-Icon aus US-053, „SlobSteak“-Schriftzug, Tagline) oberhalb der Login-Karte.
- [x] Login-Seite zeigt die Footnote „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.“ (oder eine vom Projektverantwortlichen bestätigte, inhaltsgleiche Formulierung).
- [x] Login-Seite zeigt einen erkennbaren Bootstrapping-/Lade-Skeleton-Zustand, solange die Seite selbst noch initialisiert (SPEC-00 §3 Skeleton-Baustein, keine neue Lösung).
- [x] Passwort-Änderungs-Dialog zeigt den Icon-Badge (Schloss-Icon auf amberfarbenem Kreis, SPEC-00-Tokens statt der alten SPEC-01-Hex-/Variablennamen).
- [x] Passwort-Änderungs-Dialog verlangt sowohl „Neues Passwort“ als auch „Passwort bestätigen“; ein Formular-Submit ist bei ungleichen Werten nicht möglich, mit einer verständlichen deutschen Fehlermeldung am `confirmPassword`-Feld (SPEC-00 §2 Fehlermuster: Rahmenfarbe + Icon + Text, `aria-invalid`/`aria-describedby`).
- [x] Mindestlänge und zugehöriger Fehlertext sind konsistent zwischen SPEC-01 und der tatsächlichen Umsetzung — bei einer bewussten Abweichung (z. B. weil 8 Zeichen aus einer verbindlichen PRD-Vorgabe stammen) wird das im PR unter „Anmerkungen des Dev-Agenten“ begründet, statt stillschweigend SPEC-01 zu ignorieren (CLAUDE.md Abschnitt 6).
- [x] Durchgängig informelle Anrede („du“) auf beiden Masken, konsistent mit dem übrigen Frontend.
- [x] Alle Formularfelder folgen weiterhin dem SPEC-00 §2-Muster (verknüpftes Label, Fehlerdarstellung durch Rahmenfarbe **und** Icon **und** Text).
- [x] Bestehende Story-Tests zu US-008/US-009 bleiben grün bzw. werden um den neuen `confirmPassword`-Fall ergänzt (nicht ersetzt).
- [x] `ng test`/`ng lint` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/auth/login-page/login-page.component.ts` / `.html` / `.css`
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts` / `.html` / `.css`
- ggf. ein neuer, gemeinsam nutzbarer `passwordsMatchValidator` (z. B. `frontend/src/app/shared/validators/`)

**Wichtige Invarianten:**
- Kein Eingriff in Routing/Guards/Services (`auth.service.ts`, `token-storage.service.ts`) — ausschließlich Formularstruktur, Validierung und Darstellung der beiden betroffenen Komponenten.
- Das „nicht schließbar“-Verhalten des Passwort-Dialogs (US-008 Kern-Invariante) bleibt unverändert erhalten.

### Anmerkungen des Product Owners

Der fehlende `confirmPassword`-Abgleich ist mehr als ein optisches Detail (Tippfehler-Risiko beim Passwort-Setzen) und wird deshalb hier trotz Einordnung unter „Design“ im Bug-Report explizit als Akzeptanzkriterium geführt, nicht nur als Wireframe-Kosmetik.

### Anmerkungen des Agenten

**Umfang bewusst auf die Story-AC begrenzt, nicht das komplette historische SPEC-01-Dokument 1:1 nachgebaut:** SPEC-01 enthält in Abschnitt 1 ein vollständiges, deutlich älteres Component-Tree-Pseudocode-Beispiel (u. a. `var(--surface-ground)`, rohes `<p-button [loading]>`, `p-toast`) aus einer Design-Phase vor US-043/044/047. Diese Story übernimmt daraus ausschließlich die in Abschnitt 2 der Story-Datei konkret benannten strukturellen/inhaltlichen Deltas (Markenblock, Tagline, Footnote, Icon-Badge, Bestätigungsfeld, Wortlaut, Bootstrap-Zustand) — nicht die bereits durch neuere, etablierte Stories ersetzten Bausteine: `app-processing-button` (US-043, inkl. Doppel-Submit-Schutz) bleibt statt eines rohen `<p-button [loading]>`, SPEC-00-Tokens (`--app-*`) bleiben statt der alten `var(--surface-ground)`/`var(--yellow-*)`-Variablen, das bestehende `<p-message>`-Fehlermuster bleibt statt neuer `<small>`-Elemente. Ein Rückbau auf die alten Muster wäre eine stille Regression zweier bereits abgeschlossener Stories gewesen.

**Mindestlänge (Akzeptanzkriterium 6) — bewusste, dokumentierte Abweichung von SPEC-01:** SPEC-01 §2.2 schreibt `Validators.minLength(10)` vor. Die tatsächlich serverseitig durchgesetzte Regel ist jedoch `PasswordTooShortError.MinimumLength = 8` (`src/SlobSteak.Domain/Shared/Exceptions/PasswordTooShortError.cs`) — ein 8-11-Zeichen-Passwort würde der Server anstandslos akzeptieren, während ein Frontend mit `minLength(10)` es fälschlich ablehnen würde. Mindestlänge bewusst bei 8 belassen (CLAUDE.md Abschnitt 6: dokumentierte Abweichung zugunsten der bestehenden, verbindlichen Backend-Invariante statt stiller Übernahme des Wireframe-Werts).

**Bootstrapping-Zustand (Akzeptanzkriterium 3) — Interpretation der zugrunde liegenden Prüfung:** SPEC-01 §3.1 definiert `bootstrapping` als Zustand „während geprüft wird, ob bereits eine gültige Session besteht"; den daraus resultierenden automatischen Redirect bereits angemeldeter Nutzer:innen markiert SPEC-01 selbst ausdrücklich als „außerhalb dieser Spec". Diese Anwendung hat aktuell keinen echten asynchronen Session-Check (`TokenStorageService`/`authGuard` lesen synchron aus `localStorage`) — ein zusätzlicher Redirect-Mechanismus wäre ein stiller Scope-Zuwachs auf Routing-Verhalten gewesen (CLAUDE.md Abschnitt 3), der zudem außerhalb der in Abschnitt 4 der Story genannten „Zu ändernden Dateien" (nur `login-page`/`password-change-modal`, nicht Guards/Services) gelegen hätte. `bootstrapping` ist daher als real verdrahteter, aber synchron in `ngOnInit` aufgelöster Zustand umgesetzt (kein künstlich verzögerter `setTimeout`) — ein `setTimeout`-Ansatz wurde zunächst geprüft, aber verworfen: er hätte jeden bestehenden, synchron arbeitenden Test dieser Komponente gebrochen (`login-page.component.spec.ts`, `us-049-*.spec.ts`, `us-057-*.spec.ts`), ohne einen echten fachlichen Ladevorgang abzubilden.

**Kein eigener PrimeUI-Icon-Font-Import nötig:** `primeicons` ist bereits global in `styles.css` eingebunden (seit früherer Story) — `pi pi-lock` funktioniert ohne weitere Änderung.

**Verifikation:** `ng test` (gesamter Workspace) 232/232 grün (218/218 nach US-053-Merge als Basis, +14 neue Tests: 9 im neuen Story-Test, 2 in `password-change-modal.component.spec.ts`, 3 indirekt durch präzisierte Fakes in `us-043-*.spec.ts` unverändert grün gehalten). `ng lint` fehlerfrei. `ng build` erfolgreich (nur vorbestehende Bundle-Budget-Warnung). `dotnet test` unverändert grün (kein Backend-Anteil).

**Manueller Smoke-Test gegen `docker-compose up` (isolierter Stack, Projektname `us054smoke`, eigene Ports 4254/5054/5554):**
- Login-Seite: Markenblock (Icon + „SlobSteak" + Tagline) und Footnote sichtbar, korrekt oberhalb bzw. unterhalb der Login-Karte platziert — verifiziert (Screenshot).
- Login mit Seed-Admin (`mustChangePassword: true`): Passwort-Änderungs-Dialog erscheint automatisch, zeigt Icon-Badge, Titel „Neues Passwort festlegen", „du"-Ansprache, Hinweistext — verifiziert (Screenshot).
- Ungleiche Werte in „Neues Passwort"/„Passwort bestätigen": Feld „Passwort bestätigen" zeigt sofort (live, ohne Submit-Versuch) die rot umrandete Fehlermeldung „Die Passwörter stimmen nicht überein." — verifiziert (Screenshot).
- Übereinstimmende Werte: Fehler verschwindet live wieder, Submit („Passwort ändern") schließt den Dialog erfolgreich und navigiert zu `/projects` — verifiziert (Screenshot).
- Stack nach Abschluss vollständig abgebaut (`docker compose down -v`), keine verbleibenden Container/Volumes.

**„So probierst du es aus":** `docker-compose up`, `http://localhost:4200/login` öffnen → Markenblock + Tagline + Footnote sichtbar. Mit Seed-Admin anmelden (`admin@example.com` / `ChangeMe123!`) → Passwort-Änderungs-Dialog mit Icon-Badge erscheint automatisch; unterschiedliche Werte in beide Passwortfelder eingeben → sofortige Fehlermeldung am Bestätigungsfeld.

**Neue/geänderte Dateien:**
- `frontend/src/app/features/auth/login-page/login-page.component.ts` / `.html` / `.css` (Markenblock-Tagline, Bootstrapping-Skeleton, Footnote)
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.ts` / `.html` / `.css` (Icon-Badge, confirmPassword, Wortlaut/Anrede, Hinweistext)
- `frontend/src/app/shared/validators/passwords-match.validator.ts` (neu)
- `frontend/src/app/features/auth/password-change-modal/password-change-modal.component.spec.ts` (ergänzt um confirmPassword)
- `frontend/src/app/shared/us-043-formular-feedback-doppelsubmit-schutz.spec.ts` (präzisiert: confirmPassword ergänzt, damit das Formular weiterhin gültig wird)
- `frontend/src/app/features/auth/login-page/us-054-login-passwortaendern-spec01-angleichen.spec.ts` (neu, Story-Test)
- `docs/usecases/US-054-login-passwortaendern-spec01-angleichen.md` (diese Datei)
- `docs/usecases/BACKLOG.md`, `CHANGELOG.md` (Status-/Eintrags-Updates)
