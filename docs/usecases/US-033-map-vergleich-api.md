**ID:** US-033
**Titel:** Vergleichsmodus-Query-API (zwei Perspektiven)
**Bounded Context / Domain:** StakeholderMap
**Abhängigkeiten:** US-031

---

### 1. User Story

Als **Nutzer mit perspektiv-tragender Rolle** möchte ich **über die API die Assessment-Werte zweier Perspektiven gleichzeitig für alle Stakeholder eines Projekts abrufen**, damit **Wahrnehmungsunterschiede zwischen Rollen als Datenbasis für die Vergleichsansicht verfügbar sind**.

### 2. Fachlicher & Technischer Kontext

- **Zuordnung im TRD:** F3.2
- **Relevant für DDD:** Query `StakeholderMapComparisonQuery` (StakeholderMap Context)

### 3. Akzeptanzkriterien

- [ ] `GET /api/v1/projects/{projectId}/map/compare?primary={Rolle}&secondary={Rolle}` liefert je Stakeholder mit Assessment in **mindestens einer** der beiden Rollen ein Objekt mit optionalen Feldern `primary: {influence, interest} | null` und `secondary: {influence, interest} | null`.
- [ ] Ist `primary` gleich `secondary`, liefert der Endpoint `400 Bad Request`.
- [ ] Stakeholder ganz ohne Assessment in beiden Perspektiven sind nicht im Ergebnis enthalten.
- [ ] Endpoint liefert `403 Forbidden` für Rolle `User`.
- [ ] Integrationstest deckt: Stakeholder mit Assessment in beiden Rollen, nur einer Rolle, keiner Rolle (ausgeschlossen).

### 4. Technische Hinweise für den Dev-Agenten

**Zu erstellende/ändernde Dateien oder Module:**

- `src/SlobSteak.Application/Map/StakeholderMapComparisonQuery.cs`
- `src/SlobSteak.Api/Controllers/MapController.cs` (`GET .../map/compare`)

**Wichtige Invarianten & Validierungsregeln:**

- Ergebnis enthält nur Stakeholder mit mindestens einem Assessment in einer der beiden gewählten Perspektiven.
