**ID:** US-086
**Titel:** Stakeholder-Detail: Kopfbereich mit Titel und Typ-Chip, rollenfarbige Assessment-Tabs und Slider, kompakte Kommunikationszuordnungen
**Bounded Context / Domain:** StakeholderManagement / StakeholderAssessment (Presentation-Schicht)
**Abhängigkeiten:** US-071, US-080, US-084
**Status:** offen

---

### 1. User Story

Als **Nutzer** möchte ich auf der Stakeholder-Detailseite sofort erkennen, wessen Datensatz ich betrachte und aus welcher Rollenperspektive ich gerade bewerte, damit die Seite nicht wie ein zusammenhangloses Formular wirkt.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** [Issue #128](https://github.com/Inso666/SlobSteak/issues/128), QA-Design-Abgleich vom 04.09.2026, gegen `docs/design/Detail.dc.html`. Baut auf dem in US-071 (Issue #102) umgesetzten Zwei-Spalten-Layout auf und ergänzt die dort noch nicht behandelten Punkte.

**Kopfbereich.** Design: großer Name in `--app-font-family-display`, daneben ein Typ-Chip („PERSON"), darunter „Organisation · Position" und die Meta-Zeile; rechts der Danger-Button „Löschen". App: Name, Typ und Organisation stehen als rohe Eingabefelder ganz oben — ein Text-Input mit dem Namen, ein natives `<select>`, ein Input mit der Organisation. Es gibt keine Titel-Typografie und keinen Typ-Chip.

**Assessment-Panel**

| Punkt | Design | App |
|---|---|---|
| Tabs | Unterstrich-Tabs mit farbigem Punkt je Rolle; aktiver Tab in Rollenfarbe mit gleichfarbigem Unterstrich | gefüllte Pill-Tabs (`.tab-pill`), keine Rollenfarbe |
| Wert | großer Zahlenwert rechts über dem Slider, in Rollenfarbe | im Labeltext eingebettet: „Einfluss (65)" |
| Slider | gefüllte Spur in Rollenfarbe, Skalenbeschriftung 0 / 50 / 100 | graue Spur, keine Skalenbeschriftung |
| „Speichern" | kompakt, rechtsbündig unter der Notiz | über die volle Panelbreite |

**Kommunikationszuordnungen.** Design: kompakte Liste der zugeordneten Arten (Icon plus Name links, „monatlich · E-Mail" rechts) und darunter eine Zeile „+ Kommunikationsart hinzufügen". App: drei dauerhaft ausgeklappte Auswahlfelder plus Button — das Anlegeformular ist immer sichtbar statt hinter der Hinzufügen-Aktion.

### 3. Akzeptanzkriterien

- [ ] Der Kopfbereich zeigt den Stakeholder-Namen als Seitentitel in `--app-font-family-display`, daneben einen Typ-Chip („Person" / „Organisation"), darunter „Organisation · Position" sowie die bestehende Meta-Zeile „Zuletzt geändert von … am …".
- [ ] Die Bearbeitbarkeit der Stammdaten aus US-071 bleibt erhalten — der Kopfbereich ist eine Darstellungsänderung, keine Rückkehr zu einer reinen Leseansicht.
- [ ] Die Assessment-Tabs sind Unterstrich-Tabs; der aktive Tab trägt Text und Unterstrich in der Rollenfarbe, jeder Tab einen farbigen Punkt. Die Sichtbarkeits- und Schreibregeln aus US-029/US-030 bleiben unverändert (nur die eigene Rolle ist editierbar; für Rolle `User` sind alle Tabs ausgeblendet).
- [ ] Einfluss und Interesse zeigen ihren Wert als großen Zahlenwert in `--app-font-family-mono` und Rollenfarbe rechts über dem Slider; der Wert verschwindet aus dem Labeltext.
- [ ] Die Slider-Spur ist bis zum Wert in der Rollenfarbe gefüllt und trägt die Skalenbeschriftung 0 / 50 / 100.
- [ ] „Speichern" steht kompakt und rechtsbündig unter dem Notizfeld, nicht über die volle Panelbreite.
- [ ] Die Kommunikationszuordnungen erscheinen als kompakte Liste; das Anlegeformular ist eingeklappt und wird über „+ Kommunikationsart hinzufügen" geöffnet. Bestehende Zuordnungen bleiben wie bisher bearbeit- und entfernbar (US-040).
- [ ] Der Kontrast aller rollenfarbigen Texte gegen ihren Hintergrund beträgt mindestens 4,5:1 (Werte aus US-078).
- [ ] Automatisierte Tests (Angular `TestBed`) belegen: Titel und Typ-Chip, Unterstrich-Tabs mit Rollenfarbe, Zahlenwert außerhalb des Labels, eingeklapptes Anlegeformular, unveränderte Rollenschreibregel.
- [ ] Manueller Smoke-Test gegen `docker compose up` für die Rollen PL und User — Screenshot-Nachweis im PR.
- [ ] Story-Test gemäß `.claude/agents/qa.md`-Konvention.
- [ ] Bestehende Tests bleiben grün (insbesondere US-022, US-029, US-030, US-040, US-069, US-071).

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/stakeholders/**` (Detailseite, Kopfbereich, Kommunikationszuordnungen)
- `frontend/src/app/features/assessments/**` (Tabs, Slider)
- zugehörige `.spec.ts`-Dateien

**Wichtige Invarianten:**
- PRD 4.3: höchstens ein Assessment je Rolle und Stakeholder; nur die eigene Rolle ist schreibend. Die Optimistic-Locking-Konfliktregel aus US-028 bleibt unverändert.
- SPEC-00 §4: Rolle „User" erhält keinen Rollen-Badge und keine Rollenfarbe.
- Keine Backend-Änderung, keine Migration.
