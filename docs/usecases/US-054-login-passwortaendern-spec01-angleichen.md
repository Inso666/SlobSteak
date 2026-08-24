**ID:** US-054
**Titel:** Login- und Passwort-Änderungs-Masken gemäß SPEC-01 angleichen
**Bounded Context / Domain:** IdentityAccess (Presentation)
**Abhängigkeiten:** US-008, US-009, US-047, US-053

**Status:** offen

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

- [ ] Login-Seite zeigt den Markenblock (Logo-Icon aus US-053, „SlobSteak“-Schriftzug, Tagline) oberhalb der Login-Karte.
- [ ] Login-Seite zeigt die Footnote „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.“ (oder eine vom Projektverantwortlichen bestätigte, inhaltsgleiche Formulierung).
- [ ] Login-Seite zeigt einen erkennbaren Bootstrapping-/Lade-Skeleton-Zustand, solange die Seite selbst noch initialisiert (SPEC-00 §3 Skeleton-Baustein, keine neue Lösung).
- [ ] Passwort-Änderungs-Dialog zeigt den Icon-Badge (Schloss-Icon auf amberfarbenem Kreis, SPEC-00-Tokens statt der alten SPEC-01-Hex-/Variablennamen).
- [ ] Passwort-Änderungs-Dialog verlangt sowohl „Neues Passwort“ als auch „Passwort bestätigen“; ein Formular-Submit ist bei ungleichen Werten nicht möglich, mit einer verständlichen deutschen Fehlermeldung am `confirmPassword`-Feld (SPEC-00 §2 Fehlermuster: Rahmenfarbe + Icon + Text, `aria-invalid`/`aria-describedby`).
- [ ] Mindestlänge und zugehöriger Fehlertext sind konsistent zwischen SPEC-01 und der tatsächlichen Umsetzung — bei einer bewussten Abweichung (z. B. weil 8 Zeichen aus einer verbindlichen PRD-Vorgabe stammen) wird das im PR unter „Anmerkungen des Dev-Agenten“ begründet, statt stillschweigend SPEC-01 zu ignorieren (CLAUDE.md Abschnitt 6).
- [ ] Durchgängig informelle Anrede („du“) auf beiden Masken, konsistent mit dem übrigen Frontend.
- [ ] Alle Formularfelder folgen weiterhin dem SPEC-00 §2-Muster (verknüpftes Label, Fehlerdarstellung durch Rahmenfarbe **und** Icon **und** Text).
- [ ] Bestehende Story-Tests zu US-008/US-009 bleiben grün bzw. werden um den neuen `confirmPassword`-Fall ergänzt (nicht ersetzt).
- [ ] `ng test`/`ng lint` bleiben grün.

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
