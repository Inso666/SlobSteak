# ADR-0009: PrimeUI-Lizenzpflicht von PrimeNG — Community License ausstehend, kein Workaround

**Status:** Akzeptiert
**Datum:** 2026-08-24
**Kontext:** US-047 (Frontend-Design-Migration)

## Kontext

SPEC-00 §1.1/§1.3 schreibt PrimeNG als verbindliche Komponentenbibliothek vor (Custom-Preset auf
Basis eines dunklen PrimeNG-Presets). Die im Zuge von US-047 installierte Version `primeng@22.1.0`
verifiziert beim App-Start über das Paket `@primeui/license-manager` eine Lizenz
(`node_modules/primeng/fesm2022/primeng-config.mjs`, Aufruf `verifyLicense('primeui', …)`
innerhalb von `providePrimeNG`). Ohne gültigen Key blendet PrimeNG dauerhaft ein rotes
"Invalid PrimeUI License"-Banner unten rechts in der Anwendung ein
(`node_modules/primeng/fesm2022/primeng-license.mjs`). Dies wurde beim lokalen `ng serve`-Smoke-Check
dieser Story visuell bestätigt.

Laut `node_modules/@primeui/license-manager/LICENSE.md` bietet PrimeTek Informatics zwei Lizenzmodelle:

- **Community License (kostenlos):** für Organisationen mit < 1 Mio. USD Jahresumsatz,
  < 5 Entwicklern, < 10 Mitarbeitenden und < 3 Mio. USD Fremdfinanzierung — SlobSteak dürfte diese
  Kriterien ohne Weiteres erfüllen.
- **Commercial License (kostenpflichtig):** für Organisationen, die die obigen Kriterien nicht
  erfüllen.

Ein Key wird über `providePrimeNG({ …, license: '<KEY>' })` registriert (das Feature-Objekt
akzeptiert bereits ein `license`-Feld).

## Entscheidung

1. **Kein technischer Workaround.** Das Lizenzbanner wird nicht per CSS/JS ausgeblendet oder der
   Lizenzmechanismus umgangen — das widerspräche den Lizenzbedingungen ("Sie dürfen … die
   Lizenzmechanismen nicht entfernen") und wäre unabhängig davon unredlich.
2. **Kein autonomes Registrieren eines Keys durch einen Agenten.** Die Registrierung — auch der
   kostenlosen Community License — erfordert eine Konto-Anlage bei primeui.dev sowie eine
   rechtlich bindende Zusicherung der Eligibility-Kriterien im Namen der Organisation. Das
   überschreitet die Handlungsbefugnis eines Dev-Agenten (Konten anlegen ist projektweit
   untersagt) und ist eine Entscheidung mit geschäftlicher/rechtlicher Tragweite, die dem
   Projektverantwortlichen vorbehalten bleibt.
3. **Die PrimeNG-basierte Design-System-Migration wird trotzdem als inhaltlich abgeschlossen
   behandelt.** Der Code (Tokens, Preset, Komponenten, Tests) ist korrekt und vollständig; das
   fehlende Lizenzbanner-Problem ist ein rein operativer, vom Code entkoppelter Folge-Schritt.

## Konsequenzen

- Bis zur Registrierung eines Lizenz-Keys zeigt jede Umgebung (lokal, `docker-compose up`, künftig
  Produktion) das "Invalid PrimeUI License"-Banner. Das beeinträchtigt keine Funktionalität, ist
  aber ein sichtbarer Mangel und eine ungeklärte Lizenzfrage.
- **Follow-up (Projektverantwortlicher):** Community-License-Key unter
  https://primeui.dev/licenses/community registrieren (Eligibility-Kriterien oben prüfen) und in
  `frontend/src/app/app.config.ts` an `providePrimeNG({ theme: { … }, license: '<KEY>' })`
  ergänzen.
- Sollte SlobSteak die Community-Eligibility-Kriterien absehbar nicht mehr erfüllen (z. B.
  Wachstum über die Entwickler-/Umsatzgrenzen hinaus) oder der Projektverantwortliche eine
  kostenpflichtige Lizenz ablehnen, ist eine erneute Grundsatzentscheidung nötig (Commercial
  License vs. Wechsel auf eine andere, nicht lizenzpflichtige Komponentenbibliothek) — das würde
  eine eigene Story/ADR-Revision erfordern und SPEC-00 §1.1 entsprechend anpassen.

## Alternativen (verworfen)

- **Lizenzbanner per CSS ausblenden:** verworfen — verletzt die Lizenzbedingungen, löst die
  eigentliche Lizenzfrage nicht, sondern verschleiert sie.
- **PrimeNG durch eine unlizenzierte Komponentenbibliothek ersetzen:** verworfen für diese Story —
  widerspricht der expliziten SPEC-00-Vorgabe und wäre eine weit über den Presentation-Scope
  dieser Story hinausgehende Architekturentscheidung, die nicht ohne Rücksprache getroffen werden
  darf (CLAUDE.md Abschnitt 6, Punkt 3).
