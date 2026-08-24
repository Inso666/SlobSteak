**ID:** US-056
**Titel:** Admin-Bereich gemäß SPEC-07 angleichen (Tab-Host mit Dialog-Formularen)
**Bounded Context / Domain:** IdentityAccess / ProjectManagement (Presentation)
**Abhängigkeiten:** US-016, US-017, US-046, US-047, US-055

**Status:** offen

---

### 1. User Story

Als **Systemadministrator** möchte ich den Admin-Bereich (Nutzer- und Projektverwaltung) in der im Wireframe/Spec vorgesehenen Form nutzen — als einen zusammenhängenden Bereich mit Tabs und Dialog-Formularen zum Anlegen/Zuweisen —, statt als zwei separate Seiten mit dauerhaft sichtbaren Inline-Formularen.

### 2. Fachlicher & Technischer Kontext

- **Bug-Herkunft:** `docs/bugs/bugs.md`, Abschnitt „Design“: „Der Admin Bereich entspricht nicht den Wireframes.“
- **Verifikation durch PO (Abgleich `SPEC-07-Admin.md` gegen aktuellen Code):**
  - **Struktur:** SPEC-07 §1.2 definiert einen einzigen **Tab-Host** (`admin-page.component.html`) mit `<p-tabs>`, dessen Tabs „Nutzer“, „Projekte“ und „Kommunikationsarten“ sind. Die aktuelle Umsetzung hat stattdessen **zwei getrennte Routen** (`/admin/users`, `/admin/projects`) mit einer eigens gebauten Pill-Navigation (`AdminSubNavComponent`, native `<a routerLink>`-Elemente) statt der spezifizierten `<p-tabs>`-Komponente. (Der dritte Tab „Kommunikationsarten“ existiert erwartungsgemäß noch nicht — das zugehörige Feature US-037/US-038 ist laut `BACKLOG.md` noch nicht umgesetzt und ist **kein** Bestandteil dieses Bugs.)
  - **Formulare:** SPEC-07 §1.3/§1.4/§2.1–2.3 spezifiziert die Formulare „Nutzer anlegen“, „Projekt anlegen“ und „Mitglied zuweisen“ jeweils als **Dialog** (`p-dialog`, per Button geöffnet). Die aktuelle Umsetzung zeigt alle drei Formulare **dauerhaft inline** unterhalb der jeweiligen Liste (`users-admin.component.html` Zeile 34 ff. `<h2>Nutzer anlegen</h2><form …>`, analog `projects-admin.component.html` und `project-membership-manager.component.html`) — nicht als auf Wunsch einblendbaren Dialog.
  - **Passwort-Reset:** SPEC-07 §2.5 „Passwort zurücksetzen — kein Formular“ (Bestätigungs-Interaktion direkt am Listen-Eintrag) — das entspricht bereits weitgehend der aktuellen Umsetzung (Button je Zeile ohne eigenes Formular), hier besteht kein wesentlicher Delta.
- **Abgrenzung zu anderen Stories:** Das Kartenlayout der Listen selbst (statt Tabellen) wurde bereits in US-047 umgesetzt und entspricht dem Design-System — diese Story ändert daran nichts, sondern ausschließlich die Rahmenstruktur (Tab-Host statt getrennter Routen) und die Formular-Darstellung (Dialog statt Inline).
- **Relevant für DDD:** Reine Presentation-Schicht. Ein Wechsel von zwei Routen auf einen Tab-Host innerhalb einer Route berührt `app.routes.ts` (`adminGuard`), aber keine Backend-Contracts.

### 3. Akzeptanzkriterien

- [ ] Nutzerverwaltung und Projektverwaltung sind über einen gemeinsamen Tab-Host mit `<p-tabs>` erreichbar, konsistent mit SPEC-07 §1.2 (finale Routing-Entscheidung — eine Route mit clientseitigem Tab-State vs. zwei Routen mit `<p-tabs>` als Navigationsdarstellung — wird vom Dev-Agenten getroffen und im PR begründet, sofern SPEC-07 dazu keine eindeutige Aussage über die URL-Struktur trifft).
- [ ] „Nutzer anlegen“, „Projekt anlegen“ und „Mitglied zuweisen“ öffnen jeweils als `p-dialog` über einen Button, statt dauerhaft sichtbar zu sein — Formularinhalt/Validierung/Verhalten bleiben aus US-012/US-014/US-015/US-016/US-017 unverändert erhalten, nur die Präsentation ändert sich.
- [ ] Kein Akzeptanzkriterium aus US-016/US-017 wird durch die Umstrukturierung verletzt (Liste, Passwort-Reset, Mitgliederverwaltung bleiben vollständig funktionsfähig).
- [ ] `AdminSubNavComponent` wird durch die spezifizierte `<p-tabs>`-Struktur abgelöst oder — falls der Dev-Agent aus triftigem Grund bei einer eigenen Pill-Navigation bleibt — die Abweichung wird gemäß CLAUDE.md Abschnitt 6 explizit begründet und dokumentiert.
- [ ] Alle betroffenen Bestandteile nutzen ausschließlich SPEC-00-Tokens/-Bausteine (keine neuen hartkodierten Werte).
- [ ] Bestehende Tests zu US-016/US-017/US-046 (`users-admin.component.spec.ts`, `projects-admin.component.spec.ts`, `project-membership-manager.component.spec.ts`, `admin-sub-nav.component.spec.ts`, `us-046-admin-navigation.spec.ts`) bleiben grün bzw. werden an die neue Struktur angepasst (nicht entfernt).
- [ ] `ng test`/`ng lint`/`ng build` bleiben grün.

### 4. Technische Hinweise für den Dev-Agenten

**Zu ändernde Dateien:**
- `frontend/src/app/features/admin/users-admin/users-admin.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/projects-admin/projects-admin.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/projects-admin/project-membership-manager.component.ts` / `.html` / `.css`
- `frontend/src/app/features/admin/admin-sub-nav/` (ggf. obsolet, siehe Akzeptanzkriterium 4)
- `frontend/src/app/app.routes.ts` (falls Routing-Struktur sich ändert)

**Wichtige Invarianten:**
- Keine Änderung an `admin-users.service.ts`/`admin-projects.service.ts` oder deren API-Verträgen.
- Die dritte Tab-Spalte „Kommunikationsarten“ (SPEC-07 §1.5) wird **nicht** vorgezogen gebaut — sie gehört zu US-037/US-038 und liegt außerhalb dieser Story (kein Vorgriff, CLAUDE.md Abschnitt 3).

### Anmerkungen des Product Owners

Diese Story ist bewusst nach US-055 (vertikale Sidebar) einsortiert, da SPEC-07 §1.1 den Admin-Bereich explizit im Kontext derselben App-Shell beschreibt („Sidebar zeigt beim Routing auf den Admin-Bereich keinen Projekt-Kontext/-Switcher“) — eine Umsetzung vor der Sidebar-Migration würde denselben Navigationskontext zweimal anfassen.
