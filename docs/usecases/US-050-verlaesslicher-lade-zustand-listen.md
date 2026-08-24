**ID:** US-050
**Titel:** Verlässlicher Lade-Zustand statt fälschlicher Leer-/Stale-Darstellung auf Listen-/Übersichtsseiten
**Bounded Context / Domain:** Frontend-Shell (cross-cutting, analog zu US-043/US-044)
**Abhängigkeiten:** US-016, US-017, US-018, US-044

**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich, dass mir bereits vorhandene Daten (meine Projekte, angelegte Nutzer, angelegte Projekte, zuweisbare Mitglieder) beim Laden einer Seite bzw. direkt nach einer Aktion angezeigt werden, ohne dass ich erst irgendeine unabhängige Interaktion (Tab wechseln, Feld antippen, Auswahl wiederholen) auslösen muss, damit die Liste „aufwacht“.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, fünf Einzelbefunde mit identischem Symptommuster, zusammengefasst zu einer Story:
  1. `/projects`: „Die Projekte denen ich zugewiesen bin tauchen erst in der Anzeige auf, nachdem ich zu ‚Alle Projekte‘ gewechselt habe.“
  2. `/admin/users`: „Die Liste der Benutzer ist leer, obwohl bereits ein Benutzer existiert. Diese wird erst angezeigt, wenn ich im Feld ‚Name‘ etwas eintrage.“
  3. `/admin/projects`: „Die Liste in der Projektverwaltung ist leer, obwohl bereits ein Projekt existiert. Diese wird erst angezeigt, wenn ich im Feld ‚Name‘ etwas eintrage.“
  4. `/admin/projects` → „Mitglieder verwalten“: „die Liste mit potentiellen Nutzern [ist] leer. Die Liste wird erst gefüllt, wenn ich sie erneut auswähle.“
  5. `/admin/projects` → „Hinzufügen“: „Wähle ich einen Nutzer und eine Rolle aus und klicke auf ‚Hinzufügen‘, passiert nichts. Erst bei der nächsten Interaktion wird die Liste der Mitglieder aktualisiert.“
- **Verifikation durch PO (Code-Review):** In allen fünf betroffenen Komponenten (`project-overview.component.ts`, `users-admin.component.ts`, `projects-admin.component.ts`, `project-membership-manager.component.ts`) ist die Lade-Logik selbst korrekt (`ngOnInit`/Erfolgs-Handler weisen die geladenen Daten korrekt einer Komponenten-Property zu, keine `OnPush`-Change-Detection, kein Zoneless-Setup in `app.config.ts`/`main.ts` gefunden). Es gibt jedoch in **keiner** der fünf Stellen einen von „leer“ unterscheidbaren Lade-Zustand: Der `@for`-Block mit `@empty`-Fallback zeigt sofort „Keine Nutzer angelegt.“ / „Es existieren noch keine Projekte.“ / „Du bist noch keinem Projekt zugewiesen.“ / „Noch keine Mitglieder zugewiesen.“ an, **während** der zugehörige `GET`-Request noch läuft — nicht erst, nachdem er fehlgeschlagen oder mit einer tatsächlich leeren Antwort zurückgekommen ist.
- Das ist eine direkte Verletzung von `docs/specs/SPEC-00-Design-System.md` §3 („Event-Handling-Grundsatz: Zustandswechsel (Laden → Inhalt/Leer/Fehler) werden als diskrete, exklusive Zustände eines Screens modelliert … nicht als kombinierbare Boolean-Flags — verhindert widersprüchliche gleichzeitige Darstellung von Skeleton und Empty-State“) sowie des dort in §3 definierten Skeleton-Loading-Bausteins, der in keiner der fünf Stellen verwendet wird.
- **Warum das die berichteten Symptome erklärt:** Ist der erste Request nach Systemstart langsam (siehe US-049), zeigt die Seite in der Zwischenzeit fälschlich „leer“ an. Sobald die Antwort eintrifft, aktualisiert Angular zwar die zugrunde liegenden Daten, aber ohne einen für den Nutzer sichtbaren Unterschied zum vorherigen „leer“-Zustand bemerkt er die Aktualisierung leicht erst bei einer zufällig folgenden eigenen Interaktion (Tab-Wechsel, Tippen, erneute Auswahl) — er interpretiert diese Interaktion fälschlich als Auslöser, obwohl die Daten in Wahrheit bereits vorher angekommen waren. Bei Fall 5 (Mitglied hinzufügen) gilt dasselbe Muster für den POST-Request und den anschließenden Neu-Ladevorgang der Mitgliederliste.
- **Relevant für DDD:** Ausschließlich Presentation-Schicht, keine Änderung an Services/Endpunkten/Validierung.

### 3. Akzeptanzkriterien

- [ ] Jede der fünf betroffenen Stellen unterscheidet sichtbar (Skeleton/Ladezustand gemäß SPEC-00 §3) zwischen „lädt noch“ und „wirklich leer“ — der `@empty`-Text erscheint ausschließlich, wenn der zugehörige Request tatsächlich abgeschlossen ist und ein leeres Ergebnis geliefert hat.
- [ ] Nach Abschluss des jeweiligen Requests erscheinen die Daten ohne jede weitere Nutzerinteraktion — verifiziert durch einen Test, der nach `flush()`/Antwort **ohne** einen zusätzlichen simulierten Klick/Tastatureingabe prüft, dass die gerenderte Liste die neuen Daten enthält.
- [ ] `/projects`: „Meine Projekte“ zeigt zugewiesene Projekte unmittelbar nach dem Laden, unabhängig vom Tab „Alle Projekte“.
- [ ] `/admin/users`: die Nutzerliste ist beim Laden der Seite gefüllt, ohne dass eine Eingabe im Formular nötig ist.
- [ ] `/admin/projects`: die Projektliste ist beim Laden der Seite gefüllt, ohne dass eine Eingabe im Formular nötig ist.
- [ ] `/admin/projects` → „Mitglieder verwalten“: die Liste potenzieller Nutzer ist beim ersten Öffnen bereits gefüllt, ohne erneute Auswahl.
- [ ] `/admin/projects` → „Hinzufügen“: die Mitgliederliste aktualisiert sich unmittelbar nach erfolgreicher Zuweisung, ohne weitere Interaktion.
- [ ] Der neue Ladezustand nutzt ausschließlich die in SPEC-00 §1.2/§3 definierten Tokens/Bausteine (`<p-skeleton>` in `color.surface-hover` auf `color.surface`), keine neue, lokal erfundene Lade-Darstellung.
- [ ] Bestehende Tests (insbesondere `us-044-http-error-handling.spec.ts`, das `loadError`-Verhalten der fünf Komponenten prüft) bleiben grün bzw. werden um den neuen Lade-Zustand ergänzt, nicht ersetzt.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/projects/project-overview/project-overview.component.ts` / `.html`
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` / `.html`
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` / `.html`
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` / `.html`
- ggf. ein gemeinsamer, wiederverwendbarer Baustein für den Skeleton-Zustand (z. B. `frontend/src/app/shared/`), damit die fünf Stellen keine eigene Lösung erfinden (SPEC-00 §3).

**Wichtige Invarianten:**
- Kein kombinierbarer Boolean-Zustand (`isLoading && !hasData`), sondern ein diskreter State (`'loading' | 'content' | 'empty' | 'error'`), gemäß SPEC-00 §3 Event-Handling-Grundsatz.
- Reine Presentation-/State-Änderung — keine neuen Endpunkte, keine Änderung an `*.service.ts`-Signaturen.

### Anmerkungen des Product Owners

Diese fünf Einzelbefunde wurden bewusst zu **einer** Story zusammengefasst, da Code-Review dieselbe strukturelle Lücke (fehlender diskreter Lade-Zustand, SPEC-00 §3) an allen fünf Stellen bestätigt — eine separate Story je Screen hätte denselben Fix fünfmal unkoordiniert repliziert. Sollte sich während der Umsetzung herausstellen, dass eine der fünf Stellen eine andere, unabhängige Ursache hat, ist das gemäß CLAUDE.md Abschnitt 6 zu dokumentieren und ggf. als eigene Folge-Story abzuspalten.
