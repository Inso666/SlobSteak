**ID:** US-042
**Titel:** Verteilerlisten-UI: Filter, Tabelle, Copy-E-Mails, CSV-Export
**Bounded Context / Domain:** DistributionList
**Abhängigkeiten:** US-041, US-019

---

### 1. User Story

Als **PL oder Coreteam-Mitglied** möchte ich **Stakeholder über eine Filterleiste nach Kommunikationsart, Frequenz, Kanal und Typ filtern und das Ergebnis als E-Mail-Liste kopieren oder als CSV exportieren**, damit **ich die gefilterte Empfängerliste direkt in mein E-Mail-Programm einfügen oder weiterverarbeiten kann, ohne Mailversand aus der Anwendung heraus zu benötigen**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F4.1
- **Relevant für DDD:** Presentation-Schicht (DistributionList Context)

### 3. Akzeptanzkriterien

- [x] Tab „Verteiler“ (nur sichtbar für `PL`/`Coreteam`, siehe US-019) zeigt eine Filterleiste (Kommunikationsart, Frequenz, Kanal, Stakeholder-Typ) und eine Ergebnistabelle (Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal), gespeist aus US-041.
- [x] Button „E-Mails kopieren“ kopiert alle E-Mail-Adressen der gefilterten Liste kommasepariert in die Zwischenablage und **schließt** Zeilen mit `hasEmail: false` aus.
- [x] Button „CSV exportieren“ erzeugt eine CSV-Datei mit Spalten Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal und löst einen Datei-Download aus.
- [x] Zeilen ohne hinterlegte E-Mail-Adresse zeigen ein Hinweis-Icon in der Tabelle.
- [x] Leeres Filterergebnis zeigt eine klare Leerzustand-Meldung statt einer leeren Tabelle.
- [x] Kein Mailversand-Button/-Formular ist Teil dieser Ansicht (bewusst außerhalb des MVP-Scopes, Abschnitt 5).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.ts`
- `frontend/src/app/features/distribution/csv-export.util.ts`
- `frontend/src/app/features/distribution/distribution-list.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- „E-Mails kopieren“ schließt Einträge ohne E-Mail-Adresse aus (F4.1 Edge Case).
- Kein SMTP-/Mailversand-Feature im MVP (Abschnitt 1.4, Abschnitt 5).

---

### Status

Fertig am 30.08.2026. PR: `feature/US-042-distribution-list-ui` → `main` (siehe PR-Beschreibung für Details).

**So probierst du es aus:**

1. `docker-compose up -d --build`, dann als Systemadmin (`admin@example.com` / initiales Passwort aus `SEED_ADMIN_PASSWORD`, Passwortänderung beim ersten Login erzwungen) unter `http://localhost:4200` anmelden.
2. Im Admin-Bereich ein Projekt anlegen, dich selbst (oder einen Testnutzer) als `PL` oder `Coreteam` zuweisen, mindestens zwei Stakeholder anlegen (einer mit, einer ohne E-Mail-Adresse), eine Kommunikationsart anlegen und beiden Stakeholdern zuordnen (Frequenz/Kanal frei wählbar).
3. Im Projekt-Workspace auf den Tab „Verteiler“ wechseln: Filterleiste + Tabelle mit beiden Stakeholdern erscheinen, die Zeile ohne E-Mail zeigt das Warn-Icon + „keine E-Mail hinterlegt“.
4. „E-Mails kopieren“ klicken → Erfolgs-Toast nennt Anzahl kopierter/ausgeschlossener Adressen, Zwischenablage enthält nur die E-Mail-Adresse mit hinterlegter Adresse.
5. „CSV exportieren“ klicken → Datei-Download `verteiler-<projektId>-<Datum>.csv` mit beiden Zeilen (inkl. leerer E-Mail-Zelle für den zweiten Stakeholder).
6. Einen Filter setzen, der zu keinem Treffer führt (z. B. Kanal „Report“, sofern nicht zugeordnet) → Leerzustand-Meldung statt leerer Tabelle; „Filter zurücksetzen“ stellt die volle Liste wieder her.

Story-Tests isoliert ausführen: `ng test --include='**/us-042-verteilerlisten-ui.spec.ts'` (aus `frontend/`).

### Anmerkungen des Agenten

Gemäß CLAUDE.md Abschnitt 6 dokumentiert (keine stillen Abweichungen):

1. **Spalte „Organisation“ nicht im US-041-Response-Contract enthalten.** `DistributionListEntryResponse` (US-041, bereits auf `main` gemergt) führt `stakeholderId`, `name`, `stakeholderType`, `hasEmail`, `email`, `communicationTypeId`, `communicationTypeName`, `frequency`, `channel` — **kein** `organization`-Feld, obwohl sowohl diese Story (Akzeptanzkriterium 1/3) als auch SPEC-05 die Spalte „Organisation“ explizit fordern. Da US-041 laut „Abhängigkeiten“ bereits abgeschlossen ist und diese Story rein Frontend-seitig ist, wurde kein Backend-Contract-Änderung vorgenommen. Stattdessen reichert `DistributionListService.getDistributionList` jeden Eintrag über einen zusätzlichen, parallelen Request gegen die bereits bestehende, für dieselben Rollen erreichbare Stakeholderliste (`GET /api/v1/projects/{projectId}/stakeholders`) um die Organisation an (Join per `stakeholderId`, `forkJoin`). Das ist die PRD-konformste, am wenigsten überraschende Lösung — sie erfüllt das Akzeptanzkriterium vollständig, ohne eine Fachentscheidung vorwegzunehmen oder das Kriterium stillschweigend wegzulassen. **Empfohlenes Follow-up:** `organization` direkt in `DistributionListEntryResponse` aufnehmen (kleine Backend-Änderung), um den zusätzlichen Request künftig einzusparen — nicht Teil dieser Story, da reiner Optimierungsschritt ohne fachliche Auswirkung.
2. **Native `<table>`/`<select>` statt `p-table`/`p-select` aus dem SPEC-05-Pseudocode.** SPEC-05 §1 schlägt `p-table`/`p-select`/`p-button`(-Element) vor. Das tatsächlich in diesem Repository durchgängig etablierte Muster (Stakeholder-Liste, Stakeholder-Map, alle Admin-Screens) verwendet stattdessen native `<table>`/`<select>`-Elemente mit denselben zentralen Design-Tokens (siehe `styles.css`-Kommentar „noch nicht auf p-select migriert“) — `p-table` wird an keiner bestehenden Stelle im Projekt verwendet. Diese Story folgt konsequent dem etablierten Repo-Muster statt `p-table`/`p-select` als bislang ungenutzte Komponenten neu einzuführen; alle SPEC-00-Vorgaben (Label-Verknüpfung, Fehler-/Leer-/Lade-Zustands-Muster, Fokus-Ring, Tokens) sind davon unberührt vollständig erfüllt. `p-toast` + `MessageService` sind dagegen ein begrenzter, sinnvoller Erstgebrauch (siehe Punkt 4).
3. **Trennzeichen „E-Mails kopieren“: Komma statt Semikolon.** SPEC-05 §2.2 schlägt `; ` vor, überlässt die Wahl aber ausdrücklich dem Frontend-Agenten („keine harte Vorgabe aus dem Wireframe ableitbar“) — zu dem Zeitpunkt lag der endgültige Story-Wortlaut noch nicht vor. Diese Story (Akzeptanzkriterium 2) fordert wörtlich „kommasepariert“. Der Story-Wortlaut hat Vorrang: implementiert ist `, ` als Trennzeichen. Der CSV-Export bleibt `;`-getrennt (SPEC-05 §2.3, keine Story-Vorgabe zum Trennzeichen dort, `;` ist zudem die gängige Konvention für deutschsprachige Excel-Gebietsschemata).
4. **Farbe des „keine E-Mail hinterlegt“-Hinweises: `--app-attention` statt `var(--yellow-500)`.** SPEC-05 §1.2/§3.6 schlägt `var(--yellow-500)` vor und merkt selbst an, dass die konkrete Farbwahl gegen die tatsächliche Preset-Palette zu verifizieren ist. `var(--yellow-500)` ist kein in SPEC-00 §1.2 definiertes Token — SPEC-00 ist laut CLAUDE.md/frontend.md die einzige Quelle der Wahrheit für Farben, ein Screen darf keine Ad-hoc-Farbe verwenden. Verwendet wurde stattdessen `--app-attention` (`#F2A93B`), das laut SPEC-00 §1.2 exakt für „‚Braucht Aufmerksamkeit‘-Signal“ reserviert ist — inhaltlich passend für eine fehlende E-Mail-Adresse als Datenlücke, die vor dem Kopieren Aufmerksamkeit verdient.
5. **Fußzeile ohne unfilterte Gesamtzahl.** Das SPEC-05-Wireframe zeigt „N von M Stakeholdern entsprechen dem Filter“ (M = unfilterte Gesamtzahl). Diese Kennzahl ist weder in den Akzeptanzkriterien dieser Story noch als konkreter Wert im Wireframe spezifiziert (Designer-Notiz: „illustrative Beispielansicht“) und würde einen zusätzlichen, unfilterten Baseline-Request erfordern, den keine Story-Anforderung rechtfertigt. Umgesetzt wurde stattdessen „N Einträge in der Verteilerliste · M mit E-Mail-Adresse (K ohne E-Mail-Adresse)“ — deckt die tatsächlich geforderte, nie-stillschweigende Ausschluss-Information vollständig ab, ohne den zusätzlichen Request.
6. **CSV-Dateiname nutzt die Projekt-ID statt eines „Projekt-Slug“.** SPEC-05 §2.3 schlägt `verteiler-${projectSlug}-${datum}.csv` vor; der Projekt-Contract (`ProjectOverviewItem`) führt kein Slug-Feld. Verwendet wurde stattdessen die (ohnehin eindeutige) Projekt-ID: `verteiler-<projectId>-<yyyy-MM-dd>.csv`.
