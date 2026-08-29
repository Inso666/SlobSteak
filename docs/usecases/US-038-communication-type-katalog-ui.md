**ID:** US-038
**Titel:** Kommunikationsarten-Katalog Admin-UI
**Bounded Context / Domain:** CommunicationCatalog
**Abhängigkeiten:** US-037, US-017

---

### 1. User Story

Als **Admin** möchte ich **den Kommunikationsarten-Katalog über eine Weboberfläche pflegen**, damit **ich ohne API-Kenntnisse konsistente Kommunikationsarten für alle Projekte bereitstellen kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S5 — Sub-Bereich Kommunikationsarten-Katalog)
- **Relevant für DDD:** Presentation-Schicht (CommunicationCatalog Context)

### 3. Akzeptanzkriterien

- [x] Sub-Bereich „Kommunikationsarten-Katalog“ zeigt eine Liste aller Einträge mit Status (aktiv/deaktiviert).
- [x] Formular „Anlegen“ ruft `POST /api/v1/admin/communication-types` auf; Duplikat-Fehler wird inline am Namensfeld angezeigt.
- [x] Je Eintrag existiert eine „Umbenennen“- und eine „Aktivieren/Deaktivieren“-Aktion, die die jeweiligen `PATCH`-Aufrufe auslösen.
- [x] Bereich ist ausschließlich für Systemadmins sichtbar/erreichbar.

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/admin/communication-types-admin/communication-types-admin.component.ts`
- `frontend/src/app/features/admin/admin-communication-types.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- Deaktivierte Einträge werden in der Liste weiterhin angezeigt (nicht ausgeblendet), aber klar als deaktiviert markiert.

---

### Status

Fertig am 29.08.2026. Branch `feature/US-038-communication-type-katalog-ui`, PR siehe GitHub.

### Anmerkungen des Agenten

- **Zwei getrennte Zeilenaktionen statt eines kombinierten Bearbeiten-Dialogs (Abweichung von SPEC-07 §1.5, CLAUDE.md Abschnitt 6).** `docs/specs/SPEC-07-Admin.md` §1.5 skizziert für diesen Tab nur ein Stift-/Bearbeiten-Icon je Zeile, das einen einzigen Dialog mit Namensfeld **und** `Aktiv`-Toggle öffnet. Diese Story fordert in Akzeptanzkriterium 3 wörtlich „eine „Umbenennen“- und eine „Aktivieren/Deaktivieren“-Aktion“ — zwei separate, eigenständig auslösbare Aktionen je Eintrag. Da die Story-Akzeptanzkriterien selbst (nicht eine dritte Quelle) von der Screen-Spec abweichen, wurde die wörtliche Story-Vorgabe umgesetzt: „Umbenennen“ öffnet einen `p-dialog` mit ausschließlich dem Namensfeld (`PATCH {name}`), „Aktivieren“/„Deaktivieren“ ist ein direkter Zeilen-Button ohne Dialog (`PATCH {isActive}`), sofort auslösend. Beide lösen unabhängig voneinander den jeweiligen `PATCH`-Aufruf aus, wie im Akzeptanzkriterium verlangt.
- **Kartenlisten-Layout statt `<p-table>`/`<p-toast>`/`<p-confirmdialog>`-Pseudocode aus SPEC-07 §1.5 (CLAUDE.md Abschnitt 6).** Die Screen-Spec skizziert für den Admin-Bereich `<p-table>` mit Zeilen-Icon-Aktion sowie globale `<p-toast>`/`<p-confirmdialog>`-Rückmeldungen. Die beiden bereits umgesetzten Admin-Tabs `UsersAdminComponent`/`ProjectsAdminComponent` (US-016/US-017/US-056) weichen von genau diesem Pseudocode bereits dokumentiert ab und verwenden stattdessen ein Kartenlisten-Layout mit `ViewState`/`ProcessingButtonComponent`/inline `p-message`-Fehlern, ohne Toast/Confirm-Dialog. Diese Story übernimmt aus Konsistenzgründen exakt dasselbe, bereits etablierte Muster statt eine dritte, abweichende Admin-Tab-Optik einzuführen — Deaktivieren ist zudem keine destruktive/irreversible Aktion (jederzeit reaktivierbar, kein Datenverlust), weshalb bewusst auf einen zusätzlichen Bestätigungsdialog verzichtet wurde (anders als „Passwort zurücksetzen“/„Mitgliedschaft entfernen“, die echten, mit Datenverlust verbundenen Charakter haben).
- **Kein neues CSS-Token für „deaktiviert“ nötig.** Für die Statusdarstellung wird der bereits bestehende, globale `.status-tag`/`.status-tag--archived`-Baustein aus `frontend/src/styles.css` (SPEC-00 §1.3) wiederverwendet statt eines neuen Modifiers — „deaktiviert“ ist semantisch dieselbe neutral-gedämpfte Darstellung wie „archiviert“ bei Projekten.
- **Kein `activeOnly`-Query-Parameter im Admin-Bereich.** Der Admin-Katalog lädt bewusst `GET /api/v1/communication-types` ohne `activeOnly=true`, damit auch deaktivierte Einträge sichtbar bleiben (Story „Wichtige Invarianten“ sowie US-037 Akzeptanzkriterium 4) — die gefilterte Variante (`activeOnly=true`) ist für die spätere Zuordnungs-Auswahl (US-040) vorgesehen, nicht für diesen Screen.
