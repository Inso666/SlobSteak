# SPEC: Verteiler / E-Mail-Verteilerliste

**Screen:** S3 — Tab „Verteiler" im Projekt-Workspace
**Feature-Referenz:** F4.1
**Sichtbarkeit:** ausschließlich Rollen **PL** und **Coreteam** — für **Architect** und **User** vollständig ausgeblendet (nicht nur deaktiviert)
**Vorschlag Feature-Ordner** (nicht verbindlich, vom Frontend-Agenten zu bestätigen): `frontend/src/app/features/distribution-list/`

> **Bewusste Auslassung (kein Bug, kein fehlendes Feature):** Es gibt in diesem Screen keinerlei Mailversand-Funktion aus der Anwendung heraus (kein "Senden"-Button, kein Compose-Dialog, keine SMTP-Integration). Der Funktionsumfang beschränkt sich auf Anzeige, Filterung, Zwischenablage-Kopie und CSV-Export. Das ist laut Designer-Notiz explizit außerhalb des MVP-Scopes und darf vom Frontend-Agenten nicht "vervollständigt" werden.

---

## 1. PrimeNG Component Tree & Layout

### 1.1 Grundannahmen
- Angular Standalone Components, PrimeNG mit Standalone-Imports (kein NgModule-Wrapping).
- Dropdown-Komponente wird als `p-select` referenziert (aktuelle PrimeNG-Bezeichnung für den ehemaligen `p-dropdown`). Ist im Projekt eine ältere PrimeNG-Major-Version im Einsatz, ist `p-select` 1:1 durch `p-dropdown` mit identischer API zu ersetzen — vom Frontend-Agenten anhand der tatsächlich installierten PrimeNG-Version zu verifizieren.
- Layout ausschließlich über PrimeFlex-Utility-Klassen (`flex`, `align-items-center`, `gap-2`, `flex-wrap`, gängige Spacing-/Typo-Utilities) und PrimeNG-CSS-Variablen. Keine Pixel-/Hex-Werte aus dem Wireframe (`--bg`, `--surface`, `--attn` etc.) direkt übernehmen — das sind reine Wireframe-Prototyping-Farben, keine Zielwerte.
- Die im Wireframe gezeigte Sidebar/Navigation (`.sidebar`, `nav.primary-nav`) ist Teil des bestehenden App-Shells (Shared Layout) und **nicht** Bestandteil dieser Feature-Spec — hier nur der Bereich `<main class="main">` ab dem Seitentitel.
- Im Wireframe-Markup existiert **keine Checkbox-Spalte und keine Zeilenauswahl** in der Tabelle. "E-Mails kopieren" und "CSV exportieren" wirken laut Fußzeilentext ("18 von 32 Stakeholdern entsprechen dem Filter") auf die **gesamte gefilterte Ergebnismenge**, nicht auf eine manuelle Selektion. `p-tableHeaderCheckbox`/`p-tableCheckbox` werden daher **nicht** eingesetzt — sollte eine spätere Story eine Mehrfachauswahl unabhängig vom Filter fordern, ist das eine Erweiterung außerhalb dieser Spec.

### 1.2 Component Tree

```
<section class="distribution-list-page" aria-labelledby="dl-page-title">

  <!-- Seitenkopf (Projektname + Rollen-Badge, aus App-Shell/Projekt-Kontext übernommen) -->
  <header class="flex align-items-center gap-2 mb-3">
    <h1 id="dl-page-title" class="text-2xl font-semibold m-0">{{ projectName }}</h1>
    <p-tag [value]="currentUserRoleLabel" severity="contrast" [rounded]="true" styleClass="dl-role-badge" />
    <!-- Rollen-Badge zeigt die aktuelle Projekt-Rolle des Users (im Wireframe: "PL") -->
  </header>

  <!-- Toolbar: Filterleiste -->
  <form [formGroup]="filterForm" class="dl-toolbar flex align-items-center gap-3 flex-wrap mb-3">

    <div class="flex align-items-center gap-2">
      <label for="dl-filter-kommunikationsart" class="text-sm text-color-secondary">Kommunikationsart:</label>
      <p-select
        inputId="dl-filter-kommunikationsart"
        formControlName="kommunikationsart"
        [options]="kommunikationsartOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Alle"
        [showClear]="false"
        styleClass="dl-filter-select" />
    </div>

    <div class="flex align-items-center gap-2">
      <label for="dl-filter-frequenz" class="text-sm text-color-secondary">Frequenz:</label>
      <p-select
        inputId="dl-filter-frequenz"
        formControlName="frequenz"
        [options]="frequenzOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Alle"
        styleClass="dl-filter-select" />
    </div>

    <div class="flex align-items-center gap-2">
      <label for="dl-filter-kanal" class="text-sm text-color-secondary">Kanal:</label>
      <p-select
        inputId="dl-filter-kanal"
        formControlName="kanal"
        [options]="kanalOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Alle"
        styleClass="dl-filter-select" />
    </div>

    <div class="flex align-items-center gap-2">
      <label for="dl-filter-typ" class="text-sm text-color-secondary">Typ:</label>
      <p-select
        inputId="dl-filter-typ"
        formControlName="typ"
        [options]="typOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Alle"
        styleClass="dl-filter-select" />
    </div>

    <p-button
      label="Filter zurücksetzen"
      [link]="true"
      styleClass="dl-reset-link text-sm"
      [disabled]="!hasActiveFilters()"
      (onClick)="resetFilters()" />

    <span class="flex-1"></span>
  </form>

  <!-- Hauptpanel: Tabelle + Fußzeile -->
  <p-table
    #dt
    [value]="filteredStakeholders()"
    [loading]="isLoading()"
    dataKey="stakeholderId"
    styleClass="dl-table p-datatable-sm"
    [rowHover]="true"
    responsiveLayout="scroll"
    [paginator]="false">

    <ng-template pTemplate="header">
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Organisation</th>
        <th scope="col">E-Mail</th>
        <th scope="col">Kommunikationsart</th>
        <th scope="col">Frequenz</th>
        <th scope="col">Kanal</th>
      </tr>
    </ng-template>

    <ng-template pTemplate="body" let-row>
      <tr>
        <td class="font-semibold">{{ row.name }}</td>
        <td>{{ row.organisation || '—' }}</td>
        <td>
          @if (row.email) {
            <span class="dl-mail-cell font-mono text-sm">{{ row.email }}</span>
          } @else {
            <span class="dl-mail-cell dl-mail-cell--missing flex align-items-center gap-2 text-sm"
                  [pTooltip]="'Für diesen Eintrag ist keine E-Mail-Adresse hinterlegt. Er wird bei \'E-Mails kopieren\' automatisch ausgeschlossen.'"
                  tooltipPosition="top">
              <i class="pi pi-exclamation-triangle" style="color: var(--yellow-500)" aria-hidden="true"></i>
              <span>keine E-Mail hinterlegt</span>
            </span>
          }
        </td>
        <td><p-tag [value]="row.kommunikationsart" [rounded]="true" severity="secondary" /></td>
        <td>{{ row.frequenz }}</td>
        <td>{{ row.kanal }}</td>
      </tr>
    </ng-template>

    <!-- Loading-State: Skeleton-Zeilen statt Body-Template -->
    <ng-template pTemplate="loadingbody">
      <tr *ngFor="let i of skeletonRows">
        <td><p-skeleton width="70%" height="1rem" /></td>
        <td><p-skeleton width="60%" height="1rem" /></td>
        <td><p-skeleton width="80%" height="1rem" /></td>
        <td><p-skeleton width="50%" height="1.25rem" borderRadius="999px" /></td>
        <td><p-skeleton width="50%" height="1rem" /></td>
        <td><p-skeleton width="40%" height="1rem" /></td>
      </tr>
    </ng-template>

    <!-- Empty-State: kein Stakeholder entspricht dem aktiven Filter -->
    <ng-template pTemplate="emptymessage">
      <tr>
        <td colspan="6">
          <div class="dl-empty-panel flex flex-column align-items-center gap-2 text-center p-5"
               style="border: 1px dashed var(--surface-border); border-radius: var(--border-radius);">
            <div class="dl-icon-circle flex align-items-center justify-content-center"
                 style="width:40px;height:40px;border-radius:50%;background:var(--surface-100);border:1px solid var(--surface-border);">
              <i class="pi pi-search" style="color: var(--text-color-secondary)" aria-hidden="true"></i>
            </div>
            <h3 class="text-base font-medium m-0">Keine Stakeholder entsprechen diesem Filter</h3>
            <p class="text-sm text-color-secondary m-0" style="max-width:360px;">
              Ändere die Filterkombination oder setze sie zurück, um Stakeholder zu sehen.
            </p>
          </div>
        </td>
      </tr>
    </ng-template>

  </p-table>

  <!-- Fußzeile: Zählinfo + Aktionen (nur sichtbar, wenn Ergebnisliste nicht leer bzw. immer sichtbar mit "0 von …") -->
  <div class="dl-foot-row flex align-items-center justify-content-between p-3"
       style="border-top: 1px solid var(--surface-border);">
    <span class="dl-foot-info text-sm text-color-secondary">
      {{ filteredCount() }} von {{ totalCount() }} Stakeholdern entsprechen dem Filter
      · {{ withEmailCount() }} mit E-Mail-Adresse
      @if (excludedCount() > 0) {
        <span class="dl-excluded-note">({{ excludedCount() }} ausgeschlossen)</span>
      }
    </span>
    <div class="flex gap-2">
      <p-button
        label="E-Mails kopieren"
        icon="pi pi-copy"
        [outlined]="true"
        severity="secondary"
        [disabled]="withEmailCount() === 0 || isLoading()"
        (onClick)="onCopyEmails()" />
      <p-button
        label="CSV exportieren"
        icon="pi pi-download"
        [disabled]="filteredCount() === 0 || isLoading()"
        (onClick)="onExportCsv()" />
    </div>
  </div>

</section>

<!-- Globales Feedback für Kopier-Aktion (und ggf. Export-/Ladefehler) -->
<p-toast position="top-right" />
```

### 1.3 Komponenten-Mapping-Tabelle

| Wireframe-Element | PrimeNG-Komponente | Bemerkung |
|---|---|---|
| Rollen-Badge "PL" | `p-tag` | rund, kontrastreiche `severity` |
| Filter-Dropdowns (Kommunikationsart/Frequenz/Kanal/Typ) | `p-select` (bzw. `p-dropdown` je PrimeNG-Version) | 4× identisches Pattern, `formControlName` gebunden |
| "Filter zurücksetzen" | `p-button` mit `[link]="true"` | kein eigenständiger Icon-Button im Wireframe, reiner Text-Link |
| Verteilerliste | `p-table` | kein `[selectionMode]`, da im Wireframe keine Checkbox-Spalte |
| "Statusbericht"-Chip | `p-tag` `[rounded]="true"` | entspricht `.chip`-Klasse im Wireframe |
| "keine E-Mail hinterlegt"-Hinweis | Icon `pi pi-exclamation-triangle` + Text + `pTooltip` | Farbe `var(--yellow-500)`, niemals nur farblich kodiert |
| Ladezustand der Tabelle | `p-table` `pTemplate="loadingbody"` + `p-skeleton` | pro Spalte passende Skeleton-Breite |
| Leerer Filter-Treffer | `p-table` `pTemplate="emptymessage"` | entspricht `.empty-panel` im Wireframe |
| "E-Mails kopieren" | `p-button` (`outlined`, `severity="secondary"`, `icon="pi pi-copy"`) | entspricht `.btn-secondary` |
| "CSV exportieren" | `p-button` (`icon="pi pi-download"`, Default/primary) | entspricht `.btn-primary` |
| Kopier-Feedback | `p-toast` | `severity="success"`/`"warn"`/`"error"` je nach Ergebnis |

---

## 2. Forms, Directives & Validation

### 2.1 Filterformular (Reactive Forms)

```ts
this.filterForm = this.fb.group({
  kommunikationsart: this.fb.control<string | null>(null),
  frequenz: this.fb.control<string | null>(null),
  kanal: this.fb.control<string | null>(null),
  typ: this.fb.control<string | null>(null),
});
```

- Reine **Filter-Controls**, keine Formular-Validierung im klassischen Sinn (kein Pflichtfeld, kein Submit-Button) — es gibt keine fehlerbehafteten Zustände, daher keine `Validators`.
- Jeder `valueChanges`-Emit auf `filterForm` triggert (debounced, z. B. `debounceTime(0)`/synchron reicht bei Client-seitigem Filtern; bei Server-seitigem Filtern `debounceTime(150)` + `distinctUntilChanged`) eine Neuberechnung der `filteredStakeholders()`-Quelle (Signal oder Observable je nach Projektkonvention).
- **Annahme (explizit zu bestätigen, da im Wireframe nicht eindeutig):** Der Ausgangszustand aller vier Filter ist `null` ("Alle"). Der im Wireframe abgebildete Zustand ("Kommunikationsart: Statusbericht") ist eine illustrative Beispielansicht des Designers, kein spezifizierter Default. Der Frontend-Agent implementiert `null`/"Alle" als Startwert für alle vier Filter, sofern die Story nicht explizit einen anderen Default vorgibt.
- `resetFilters()` ruft `this.filterForm.reset({ kommunikationsart: null, frequenz: null, kanal: null, typ: null })` auf. Der "Filter zurücksetzen"-Link ist deaktiviert (`[disabled]`), wenn kein Filter aktiv ist (`hasActiveFilters()` prüft, ob mindestens ein Control ≠ `null`).
- Optionslisten (`kommunikationsartOptions`, `frequenzOptions`, `kanalOptions`, `typOptions`) kommen aus dem zugehörigen Feature-Service (`DistributionListService` o. ä.), Wertebereich richtet sich nach den Backend-Enums aus dem entsprechenden DTO — im Wireframe nicht abschließend spezifiziert, daher hier keine konkreten Werte über "Statusbericht"/"monatlich"/"E-Mail" hinaus erfunden.

### 2.2 "E-Mails kopieren" — Logik

```ts
onCopyEmails(): void {
  const rows = this.filteredStakeholders();
  const withEmail = rows.filter(r => !!r.email?.trim());
  const excluded = rows.length - withEmail.length;

  if (withEmail.length === 0) {
    this.toast.add({ severity: 'warn', summary: 'Keine E-Mail-Adressen',
      detail: 'Keine der gefilterten Zeilen hat eine hinterlegte E-Mail-Adresse.' });
    return;
  }

  const emailList = withEmail.map(r => r.email!.trim()).join('; ');

  this.clipboard.writeText(emailList) // z.B. Angular CDK Clipboard oder navigator.clipboard.writeText
    .then(() => {
      this.toast.add({
        severity: 'success',
        summary: 'E-Mails kopiert',
        detail: excluded > 0
          ? `${withEmail.length} Adressen kopiert · ${excluded} ohne hinterlegte E-Mail ausgeschlossen`
          : `${withEmail.length} Adressen kopiert`,
      });
    })
    .catch(() => {
      this.toast.add({ severity: 'error', summary: 'Kopieren fehlgeschlagen',
        detail: 'Die E-Mail-Adressen konnten nicht in die Zwischenablage kopiert werden.' });
    });
}
```

- **Zwingende Regel aus der Designer-Notiz:** Der Ausschluss von Zeilen ohne E-Mail erfolgt **nie stillschweigend**. Die Erfolgsmeldung nennt sowohl die Anzahl kopierter als auch — falls > 0 — die Anzahl ausgeschlossener Adressen. Dieselbe Information steht zusätzlich dauerhaft (nicht nur transient im Toast) in der Fußzeile (`dl-foot-info`).
- Trennzeichen der kopierten Liste (`; ` in obigem Beispiel) ist eine Implementierungsentscheidung des Frontend-Agenten — falls das Backend/E-Mail-Client-Konventionen andere Trennzeichen vorgeben, ist das mit `;`-getrennter To-Feld-Syntax gängiger Mail-Clients abzugleichen; keine harte Vorgabe aus dem Wireframe ableitbar.
- Clipboard-Zugriff über die Clipboard API (`navigator.clipboard.writeText`) bzw. das projektüblich genutzte Angular-CDK-`Clipboard`-Service — Wahl liegt beim Frontend-Agenten, sofern konsistent mit bestehenden Konventionen im Repo.

### 2.3 "CSV exportieren" — Logik

```ts
onExportCsv(): void {
  const rows = this.filteredStakeholders();
  const csv = this.distributionListService.buildCsv(rows); // Name;Organisation;E-Mail;Kommunikationsart;Frequenz;Kanal
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `verteiler-${this.projectSlug}-${this.today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

- CSV-Export enthält **alle gefilterten Zeilen inkl. Zeilen ohne E-Mail** (die fehlende E-Mail wird als leeres Feld oder als Marker-Text exportiert, z. B. leere Zelle) — Export ist ein vollständiger Datenexport, im Unterschied zum bewusst gefilterten "E-Mails kopieren". Diese Unterscheidung ist im Component Tree/Service explizit zu kommentieren, damit sie im Code nicht versehentlich angeglichen wird.
- Spalten der CSV entsprechen den sichtbaren Tabellenspalten (Name, Organisation, E-Mail, Kommunikationsart, Frequenz, Kanal).
- Kein Server-Roundtrip im Wireframe erkennbar (kein Ladezustand-Icon am Button) → Client-seitige CSV-Generierung aus bereits geladenen `filteredStakeholders()`-Daten, kein zusätzlicher API-Call vorausgesetzt (falls das Backend einen dedizierten Export-Endpunkt liefert, ist das mit der zuständigen Backend-Story abzugleichen — hier nicht spezifiziert, da im Wireframe nicht erkennbar).

---

## 3. UI States & Event Handling

### 3.1 Rollen-/Sichtbarkeitsstatus (übergreifend für alle folgenden Zustände)

- Der Sub-Nav-Eintrag „Verteiler" sowie die Route dieses Screens sind **nur** sichtbar/erreichbar für Projekt-Rollen `PL` und `Coreteam`.
- Umsetzung: `*ngIf`/`@if` auf dem Nav-Item **und** ein Route-Guard (`canActivate`) auf der Verteiler-Route, der bei fehlender Berechtigung nicht auf eine Fehlerseite weiterleitet, sondern den Eintrag/die Route so behandelt, als existiere sie für diese Rolle nicht (ausgeblendet, nicht deaktiviert/gesperrt-mit-Hinweis).
- Für Architect/User darf kein direkter Tiefenlink (URL-Eingabe) den Screen rendern — der Guard muss serverseitig/route-seitig greifen, nicht nur UI-seitig über verstecktes Markup.

### 3.2 Initial-/Default-Zustand

- Beim Betreten des Tabs wird die Verteilerliste für das aktuelle Projekt geladen, alle vier Filter stehen auf "Alle" (siehe Annahme 2.1).
- Toolbar (Filter + Reset-Link) ist sofort interaktiv, unabhängig vom Ladezustand der Tabelle.

### 3.3 Loading-Zustand

- Auslöser: initialer Seitenaufruf sowie jede Neuberechnung nach Filteränderung, sofern serverseitig gefiltert wird (bei rein clientseitigem Filtern über bereits geladene Daten entfällt ein sichtbarer Ladezustand nach dem Erststart).
- Darstellung: `p-table` im `[loading]="true"`-Zustand mit `pTemplate="loadingbody"` → `p-skeleton`-Platzhalterzeilen in Spaltenbreite der jeweiligen Spalte (siehe 1.2).
- Fußzeile: Zählangaben zeigen während des Ladens keine widersprüchlichen Zahlen — entweder ausgeblendet oder mit Platzhalter (`p-skeleton` inline), Aktions-Buttons sind `[disabled]="isLoading()"`.

### 3.4 Empty-Zustand — kein Treffer für aktive Filterkombination

- Auslöser: `filteredStakeholders().length === 0` bei aktivem Filter (mindestens ein Control ≠ `null`) **oder** wenn im Projekt grundsätzlich keine Stakeholder mit Kontaktdaten für den Verteiler existieren.
- Darstellung: `p-table`-`emptymessage`-Template gemäß Wireframe-„Vorschau: leeres Filterergebnis" — Icon-Kreis mit Lupe-Icon, Überschrift „Keine Stakeholder entsprechen diesem Filter", Hinweistext „Ändere die Filterkombination oder setze sie zurück, um Stakeholder zu sehen."
- Fußzeile zeigt in diesem Fall „0 von N Stakeholdern entsprechen dem Filter · 0 mit E-Mail-Adresse", beide Aktions-Buttons sind deaktiviert (`filteredCount() === 0` bzw. `withEmailCount() === 0`).
- Hinweis: Das Wireframe zeigt diesen Zustand als separaten Vorschau-Block unterhalb der befüllten Tabelle — das ist eine Design-Dokumentations-Konvention (zwei Zustände nebeneinander zur Abnahme), **kein** gleichzeitig sichtbares UI-Element. Im produktiven Screen ersetzt der Empty-State die Tabellenzeilen, er wird nicht zusätzlich unterhalb der Tabelle angezeigt.

### 3.5 Success-Zustand (Standardfall: Tabelle mit Treffern)

- Tabelle zeigt alle gefilterten Zeilen, Fußzeile nennt Treffer-/E-Mail-/Ausschluss-Zahlen wie in 2.2 beschrieben.
- Zeilen ohne E-Mail bleiben **sichtbar** (kein Herausfiltern aus der Anzeige!) — sie erhalten lediglich die visuelle Kennzeichnung aus 1.2/3.6. Nur die Aktion "E-Mails kopieren" schließt sie aus der kopierten Liste aus, niemals aus der Tabellenanzeige.

### 3.6 Hinweis "keine E-Mail hinterlegt" — Barrierefreiheit

- Kodierung **nicht nur farblich**: Icon (`pi pi-exclamation-triangle`, `var(--yellow-500)`) **und** sichtbarer Text „keine E-Mail hinterlegt" **und** `pTooltip` mit erläuterndem Text zur Konsequenz für "E-Mails kopieren".
- Icon selbst `aria-hidden="true"`, da der begleitende Text die Information redundant und vollständig für Screenreader trägt (kein zusätzliches `aria-label` am Icon nötig, um Doppel-Ansagen zu vermeiden).
- Kontrastanforderung: Text-/Icon-Kombination muss WCAG 2.1 AA-Kontrast gegen `var(--surface-card)`/Zeilenhintergrund erfüllen — konkrete Farbwahl (`var(--yellow-500)` vs. `var(--orange-500)`) ist vom Frontend-/UX-Agenten gegen die tatsächliche PrimeNG-Theme-Palette zu verifizieren, sofern das Standard-Gelb den AA-Kontrast auf hellem/dunklem Theme nicht erreicht.

### 3.7 Event-Handling "E-Mails kopieren" (End-to-End-Ablauf)

1. Klick auf `p-button` „E-Mails kopieren" → `onCopyEmails()`.
2. Ausgangsmenge = aktuell gefilterte Liste (`filteredStakeholders()`), **nicht** die ungefilterte Gesamtliste.
3. Filterung dieser Menge auf Einträge mit nicht-leerer E-Mail (`row.email?.trim()`).
4. Ergebnisliste wird zu einem String zusammengefügt und über die Clipboard-API in die Zwischenablage geschrieben.
5. Erfolgsfall → `p-toast` `severity="success"`, Text nennt **immer** die Anzahl kopierter Adressen, **zusätzlich** die Anzahl ausgeschlossener Zeilen, sofern > 0 (siehe 2.2 für exakten Text).
6. Sonderfall "0 Adressen mit E-Mail in der gefilterten Menge" → Aktion wird gar nicht erst ausgeführt (Button bereits `[disabled]`), alternativ falls dennoch ausgelöst: `p-toast` `severity="warn"` statt eines leeren Kopiervorgangs.
7. Fehlerfall (Clipboard-API nicht verfügbar/Berechtigung verweigert) → `p-toast` `severity="error"` mit Hinweistext, keine stille Fehlbehandlung.

### 3.8 Event-Handling "CSV exportieren"

1. Klick auf `p-button` „CSV exportieren" → `onExportCsv()`.
2. Export operiert auf derselben gefilterten Menge wie die Tabellenanzeige (inkl. Zeilen ohne E-Mail, siehe 2.3).
3. Datei-Download wird über Blob + `<a download>` clientseitig ausgelöst, kein serverseitiger Report-Generierungsschritt im Wireframe erkennbar.
4. Kein Toast im Wireframe für diesen Fall abgebildet — optionales `p-toast` `severity="success"` nach erfolgreichem Download-Trigger liegt im Ermessen des Frontend-Agenten (nicht zwingend, da Browser-Download selbst sichtbares Feedback liefert), ein Fehlerfall (z. B. Blob-Erzeugung schlägt fehl) sollte analog zu 3.7 Schritt 7 über `p-toast` `severity="error"` kommuniziert werden.

### 3.9 Filter-Interaktion

- Änderung eines beliebigen `p-select` → `filterForm.valueChanges` → Neuberechnung von `filteredStakeholders()`, `filteredCount()`, `withEmailCount()`, `excludedCount()`.
- Klick auf „Filter zurücksetzen" → `resetFilters()`, danach zeigt die Tabelle wieder die ungefilterte Gesamtmenge (bzw. den in 2.1 beschriebenen Default).
- Der Link ist bei bereits zurückgesetztem Zustand (`hasActiveFilters() === false`) deaktiviert, um keine wirkungslose Aktion anzubieten.

---

## 4. Acceptance Criteria (DoD)

- [ ] Der Tab „Verteiler" (Sub-Nav-Item + Route) ist für Rollen `PL` und `Coreteam` sichtbar und erreichbar, für `Architect` und `User` **vollständig ausgeblendet** (kein Nav-Eintrag, kein Direktzugriff über URL) — verifiziert per Route-Guard, nicht nur per Template-Bedingung.
- [ ] Die vier Filter (Kommunikationsart, Frequenz, Kanal, Typ) sind als `p-select`-gebundenes `FormGroup` umgesetzt, jede Änderung aktualisiert Tabelle und Fußzeilen-Zahlen ohne Seiten-Reload.
- [ ] „Filter zurücksetzen" setzt alle vier Filter zurück und ist deaktiviert, wenn kein Filter aktiv ist.
- [ ] Zeilen ohne hinterlegte E-Mail bleiben in der Tabelle sichtbar, sind durch Icon **und** Text **und** Tooltip als "keine E-Mail hinterlegt" gekennzeichnet (nicht nur farblich) und erfüllen WCAG 2.1 AA-Kontrastanforderungen.
- [ ] "E-Mails kopieren" schließt Zeilen ohne E-Mail nachweislich aus der kopierten Liste aus, **niemals stillschweigend**: Erfolgs-Toast und Fußzeile nennen jeweils explizit die Anzahl ausgeschlossener Adressen, sobald diese > 0 ist.
- [ ] "CSV exportieren" exportiert die vollständige aktuell gefilterte Menge (inkl. Zeilen ohne E-Mail) als Datei-Download.
- [ ] Loading-Zustand zeigt Skeleton-Zeilen (`p-skeleton`) statt eines leeren/eingefrorenen Tabellenkörpers; Aktions-Buttons sind während des Ladens deaktiviert.
- [ ] Empty-Zustand (kein Treffer für aktive Filter bzw. keine Stakeholder mit Kontaktdaten im Projekt) zeigt das definierte `emptymessage`-Template statt einer leeren Tabelle, beide Aktions-Buttons sind in diesem Zustand deaktiviert.
- [ ] Es existiert keinerlei Mailversand-UI (kein Senden-Button, kein Compose-Dialog) — bewusste, dokumentierte Auslassung, nicht nachzuholen.
- [ ] Alle Texte sind auf Deutsch und terminologisch konsistent mit dem Wireframe ("Verteiler", "E-Mails kopieren", "CSV exportieren", "keine E-Mail hinterlegt", "Filter zurücksetzen").
- [ ] Layout ausschließlich über PrimeFlex-Klassen und PrimeNG-CSS-Variablen umgesetzt, keine aus dem Wireframe kopierten Hex-/Pixelwerte im produktiven Code.
- [ ] Automatisierte Tests (gemäß `.claude/agents/frontend.md`/`.claude/agents/qa.md`) decken mindestens ab: Filterlogik, Kopier-Ausschlusslogik inkl. Zählwerten, Empty-/Loading-Renderpfade, Rollen-Sichtbarkeitsguard.
