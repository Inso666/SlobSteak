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

- [ ] Tab „Verteiler“ (nur sichtbar für `PL`/`Coreteam`, siehe US-019) zeigt eine Filterleiste (Kommunikationsart, Frequenz, Kanal, Stakeholder-Typ) und eine Ergebnistabelle (Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal), gespeist aus US-041.
- [ ] Button „E-Mails kopieren“ kopiert alle E-Mail-Adressen der gefilterten Liste kommasepariert in die Zwischenablage und **schließt** Zeilen mit `hasEmail: false` aus.
- [ ] Button „CSV exportieren“ erzeugt eine CSV-Datei mit Spalten Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal und löst einen Datei-Download aus.
- [ ] Zeilen ohne hinterlegte E-Mail-Adresse zeigen ein Hinweis-Icon in der Tabelle.
- [ ] Leeres Filterergebnis zeigt eine klare Leerzustand-Meldung statt einer leeren Tabelle.
- [ ] Kein Mailversand-Button/-Formular ist Teil dieser Ansicht (bewusst außerhalb des MVP-Scopes, Abschnitt 5).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/distribution/distribution-list-page/distribution-list-page.component.ts`
- `frontend/src/app/features/distribution/csv-export.util.ts`
- `frontend/src/app/features/distribution/distribution-list.service.ts`

**Wichtige Invarianten & Validierungsregeln:**

- „E-Mails kopieren“ schließt Einträge ohne E-Mail-Adresse aus (F4.1 Edge Case).
- Kein SMTP-/Mailversand-Feature im MVP (Abschnitt 1.4, Abschnitt 5).
