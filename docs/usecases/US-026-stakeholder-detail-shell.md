**ID:** US-026
**Titel:** Stakeholder-Detailseite Shell (S4)
**Bounded Context / Domain:** StakeholderManagement
**Abhängigkeiten:** US-022, US-025

---

### 1. User Story

Als **beliebiger Projekt-Nutzer** möchte ich **eine Stakeholder-Detailseite mit Kopfbereich (Name, Typ, Organisation, Änderungsverlauf) und Stammdaten-Bereich öffnen**, damit **ich alle Informationen zu einem Stakeholder an einem Ort einsehen und (mit passender Rolle) bearbeiten kann**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** Abschnitt 6.2 (S4 — Stakeholder-Detail)
- **Relevant für DDD:** Presentation-Schicht (Composition Root für StakeholderManagement; Platzhalter-Slots für Assessment- und Kommunikations-Bereiche folgender Stories)

### 3. Akzeptanzkriterien

- [ ] Route/Modal `S4` zeigt Kopfbereich mit Name, Typ, Organisation und „zuletzt geändert von/am“ aus US-022.
- [ ] Stammdaten-Bereich zeigt alle Felder aus F1.1 und ist für `PL`/`Coreteam`/`Architect` editierbar (nutzt US-022), für `User` read-only.
- [ ] Seite reserviert klar erkennbare Platzhalter-Slots für „Kommunikationszuordnungen“ (wird in US-040 befüllt) und „Assessment-Tabs“ (wird in US-029 befüllt).
- [ ] CTA „Löschen“ ist ausschließlich für `PL`/Admin(mit PL-Zuweisung) sichtbar und ruft den Soft-Delete-Flow aus US-023 auf.
- [ ] Aufruf der Route mit der ID eines soft-gelöschten Stakeholders liefert eine „Nicht gefunden“-Ansicht (konsistent mit `404` aus US-022/US-023).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `frontend/src/app/features/stakeholders/stakeholder-detail/stakeholder-detail.component.ts`
- `src/SlobSteak.Api/Controllers/StakeholderController.cs` (`GET /api/v1/stakeholders/{id}`)

**Wichtige Invarianten & Validierungsregeln:**

- Detailansicht respektiert dieselbe Sichtbarkeits-/Schreibregel wie Liste und Bearbeiten (Berechtigungsmatrix Abschnitt 2.3).
