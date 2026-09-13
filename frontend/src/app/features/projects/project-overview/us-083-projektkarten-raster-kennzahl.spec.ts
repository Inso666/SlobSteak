import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { ProjectOverviewComponent } from './project-overview.component';

/**
 * Story-Test US-083 „Projektübersicht: Drei-Spalten-Raster, hervorgehobene Stakeholder-Kennzahl und
 * Karten als echte Links" (Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Jeder Testfall
 * bildet genau ein fachliches Akzeptanzkriterium aus der Story-Datei ab, in derselben Reihenfolge
 * wie dort gelistet. Die vier abschließenden, rein prozessualen DoD-Punkte der Story-Datei
 * („Automatisierte Tests belegen …", manueller Smoke-Test, Story-Test-Existenz, bestehende Tests
 * bleiben grün) sind Prozessnachweise, keine für sich genommen testbaren fachlichen Kriterien —
 * ihnen entspricht kein eigener Testfall, siehe PR-Beschreibung/Story-Datei „Anmerkungen des
 * Agenten" für den jeweiligen Nachweis.
 *
 * Die Rasterspalten-Regel und der Breakpoint werden bewusst über das CSSOM (`document.styleSheets`)
 * statt über `getComputedStyle` geprüft: Karma/ChromeHeadless läuft in diesem Projekt ohne
 * konfigurierte Fenstergröße (Default < 1024px, siehe `karma.conf.js`), sodass eine
 * `getComputedStyle`-Prüfung der Spaltenzahl in der Testumgebung immer den Mobile-Breakpoint träfe,
 * unabhängig vom tatsächlichen Desktop-Verhalten. Das CSSOM liest die geparsten Regeln selbst, nicht
 * das aktuell zutreffende Ergebnis der Media Query, und ist damit viewport-unabhängig.
 */
describe('US-083: Projektübersicht — Drei-Spalten-Raster, Stakeholder-Kennzahl, Karten als Links', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  const myProjects: ProjectOverviewItem[] = [
    {
      id: 'project-1',
      name: 'Berta-Projekt',
      role: 'PL',
      stakeholderCount: 3,
      status: 'Active',
      createdAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'project-2',
      name: 'Anton-Projekt',
      role: 'Coreteam',
      stakeholderCount: 12,
      status: 'Archived',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];
  const allProjects: AdminProject[] = [
    {
      id: 'project-3',
      name: 'Fremdprojekt',
      description: null,
      status: 'Active',
      memberCount: 4,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  function configure(isSystemAdmin: boolean) {
    TestBed.resetTestingModule();
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects']);
    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects']);
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);
    projectsServiceSpy.listMyProjects.and.returnValue(of(myProjects));
    adminProjectsServiceSpy.listProjects.and.returnValue(of(allProjects));
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin });

    TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });
  }

  function cardFor(fixture: ReturnType<typeof TestBed.createComponent>, name: string): HTMLElement {
    const cards: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.project-card'),
    );
    return cards.find((card) => card.textContent?.includes(name))!;
  }

  /** Sucht eine Basis-Regel (kein `@media`) über alle geladenen Stylesheets — CSSOM statt
   * `getComputedStyle`, siehe Begründung im Beschreibungskommentar oben. */
  function findStyleRule(selectorIncludes: string): CSSStyleRule | undefined {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText?.includes(selectorIncludes)) {
          return rule;
        }
      }
    }
    return undefined;
  }

  /** Wie {@link findStyleRule}, aber mit exaktem Selektor-Match statt Substring-Suche — nötig, um
   * z. B. `.project-card` von `.project-cards`/`.project-card:hover`/`.project-card.archived`/
   * `.project-card__head` zu unterscheiden (alle enthalten „project-card" als Substring), bzw. die
   * produktweite `:focus-visible`-Basis-Regel von spezifischeren PrimeNG-`:focus-visible`-Regeln
   * (z. B. für `p-button`), die denselben Substring enthalten. Angulars
   * Emulated-Encapsulation-Attributselektor (`[_ngcontent-xyz]`) wird dabei ignoriert. */
  function findExactSelectorRule(exactSelector: string): CSSStyleRule | undefined {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) {
          continue;
        }
        const matches = rule.selectorText
          ?.split(',')
          .some((part) => part.trim().replace(/\[_ngcontent-[^\]]*\]/g, '') === exactSelector);
        if (matches) {
          return rule;
        }
      }
    }
    return undefined;
  }

  /** Analog {@link findStyleRule}, aber innerhalb einer `@media`-Regel, deren `conditionText` den
   * übergebenen Ausschnitt enthält. */
  function findMediaStyleRule(
    mediaIncludes: string,
    selectorIncludes: string,
  ): CSSStyleRule | undefined {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule && rule.conditionText?.includes(mediaIncludes)) {
          for (const inner of Array.from(rule.cssRules)) {
            if (inner instanceof CSSStyleRule && inner.selectorText?.includes(selectorIncludes)) {
              return inner;
            }
          }
        }
      }
    }
    return undefined;
  }

  it('Akzeptanzkriterium 1: das Kartenraster zeigt drei Spalten, unter 1024px eine Spalte mit voller Kartenbreite', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const gridRule = findStyleRule('project-cards');
    expect(gridRule).withContext('Basis-Regel .project-cards nicht gefunden').toBeDefined();
    expect(gridRule!.style.gridTemplateColumns.replace(/\s/g, '')).toContain('repeat(3,');

    const mobileRule = findMediaStyleRule('1023px', 'project-cards');
    expect(mobileRule)
      .withContext('Media-Query-Regel .project-cards für <1024px nicht gefunden')
      .toBeDefined();
    expect(mobileRule!.style.gridTemplateColumns.trim()).toBe('1fr');
  });

  it('Akzeptanzkriterium 2: die Stakeholder-Zahl nutzt die Daten-Schriftgröße in Mono-Schrift, das Label bleibt in Body-Größe/gedämpfter Farbe', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const card = cardFor(fixture, 'Berta-Projekt');
    const statNum: HTMLElement = card.querySelector('.stat-num')!;
    const statLabel: HTMLElement = card.querySelector('.stat-label')!;

    // --app-font-size-data (1.75rem) bei ungesetzter Root-Font-Size (Browser-Default 16px) = 28px.
    expect(getComputedStyle(statNum).fontSize).toBe('28px');
    expect(getComputedStyle(statNum).fontFamily).toContain('IBM Plex Mono');

    // Label bleibt bei Body-Größe (14px) — deutlich kleiner als die Kennzahl.
    expect(getComputedStyle(statLabel).fontSize).toBe('14px');
  });

  it('Akzeptanzkriterium 3: vor dem Rollen-Badge steht das Label „Meine Rolle"', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const card = cardFor(fixture, 'Berta-Projekt');
    const roleRow: HTMLElement = card.querySelector('.role-row')!;
    expect(roleRow).not.toBeNull();
    expect(roleRow.querySelector('.role-label')?.textContent?.trim()).toBe('Meine Rolle');
    expect(roleRow.querySelector('.role-badge--pl')?.textContent?.trim()).toBe('PL');

    // Label steht im Markup VOR dem Badge (Reihenfolge wie im Design).
    const label = roleRow.querySelector('.role-label')!;
    const badge = roleRow.querySelector('.role-badge')!;
    expect(label.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Akzeptanzkriterium 4: der Kartenradius entspricht --app-radius-lg (10px)', () => {
    configure(false);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const card = cardFor(fixture, 'Berta-Projekt');
    expect(getComputedStyle(card).borderRadius).toBe('10px');
  });

  it('Akzeptanzkriterium 5: jede Projektkarte ist ein <a [routerLink]> mit sprechendem aria-label (aktiv/archiviert)', () => {
    configure(true);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const activeCard = cardFor(fixture, 'Berta-Projekt');
    expect(activeCard.tagName).toBe('A');
    expect(activeCard.getAttribute('href')).toBe('/projects/project-1');
    expect(activeCard.getAttribute('aria-label')).toBe('Projekt Berta-Projekt öffnen');

    const archivedCard = cardFor(fixture, 'Anton-Projekt');
    expect(archivedCard.tagName).toBe('A');
    expect(archivedCard.getAttribute('href')).toBe('/projects/project-2');
    expect(archivedCard.getAttribute('aria-label')).toBe('Archiviertes Projekt Anton-Projekt öffnen');

    // „Alle Projekte"-Tab (Admin): dieselbe Link-Semantik gilt auch dort.
    const allTab: HTMLButtonElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.tab-pill'),
    ).find((button) => button.textContent?.includes('Alle Projekte'))!;
    allTab.click();
    fixture.detectChanges();

    const adminCard = cardFor(fixture, 'Fremdprojekt');
    expect(adminCard.tagName).toBe('A');
    expect(adminCard.getAttribute('href')).toBe('/projects/project-3');
    expect(adminCard.getAttribute('aria-label')).toBe('Projekt Fremdprojekt öffnen');
  });

  it('Akzeptanzkriterium 6: der produktweite Fokus-Ring greift auch auf der Karte, die Toolbar-Reihenfolge (Tabs → Suche/Sortierung → „Neues Projekt" → Karten) bleibt unverändert', () => {
    configure(true);
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    // Kein lokales `outline: none` auf `.project-card`, das den globalen Fokus-Ring
    // (`:focus-visible` in `styles.css`) überschreiben würde.
    const cardRule = findExactSelectorRule('.project-card');
    expect(cardRule).withContext('Basis-Regel .project-card nicht gefunden').toBeDefined();
    expect(cardRule!.style.outline).toBe('');

    // Exakter Selektor-Match statt Substring: PrimeNG definiert eigene, spezifischere
    // `:focus-visible`-Regeln (z. B. für `p-button`), die denselben Substring enthalten — gesucht
    // ist die produktweite Basis-Regel aus `styles.css` (SPEC-00 §2), reiner `:focus-visible`-Selektor.
    const globalFocusRule = findExactSelectorRule(':focus-visible');
    expect(globalFocusRule)
      .withContext('globale :focus-visible-Regel nicht gefunden')
      .toBeDefined();
    expect(globalFocusRule!.style.outlineStyle || globalFocusRule!.style.outline).toContain(
      'solid',
    );

    // Fokussierbare Reihenfolge bleibt wie vor dieser Story (kein Regressions-Umbau der Toolbar):
    // Tabs → Suche/Sortierung → „Neues Projekt" → Karten.
    const tabPills: HTMLElement = fixture.nativeElement.querySelector('.tab-pills');
    const searchSort: HTMLElement = fixture.nativeElement.querySelector('.search-sort');
    const createButton: HTMLElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Neues Projekt')!;
    const firstCard: HTMLElement = fixture.nativeElement.querySelector('.project-card');

    const before = (a: Node, b: Node) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(before(tabPills, searchSort)).toBeTruthy();
    expect(before(searchSort, createButton)).toBeTruthy();
    expect(before(createButton, firstCard)).toBeTruthy();
  });
});
