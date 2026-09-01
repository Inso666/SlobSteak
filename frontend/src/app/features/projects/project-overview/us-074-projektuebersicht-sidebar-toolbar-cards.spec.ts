import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppNavigationComponent } from '../../../core/navigation/app-navigation/app-navigation.component';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { ProjectOverviewComponent } from './project-overview.component';

@Component({ selector: 'app-us074-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload) —
 * analog zum bereits etablierten Muster in `us-046-admin-navigation.spec.ts`, hier zusätzlich mit
 * `name` (US-074 Akzeptanzkriterium „Nutzerkarte"). Reicht für `TokenStorageService.getClaims()`,
 * das keine Signaturprüfung vornimmt. */
function fakeToken(claims: { isSystemAdmin: boolean; name?: string }): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', ...claims }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

/**
 * Story-Test US-074 „Projektübersicht: Sidebar-Icons/Nutzerkarte, Toolbar (Tabs/Suche/Sortierung)
 * und Karten-Grundlayout gemäß Main.dc.html" (Konvention siehe `.claude/agents/qa.md` Abschnitt 1).
 * Jeder Testfall bildet genau ein Akzeptanzkriterium aus der Story-Datei ab, in derselben
 * Reihenfolge wie dort gelistet. Deckt sowohl den Sidebar-Anteil (`AppNavigationComponent`) als
 * auch den Toolbar-/Karten-Anteil (`ProjectOverviewComponent`) ab — beide Screens ändert dieselbe
 * Story, ein gemeinsamer Story-Test-Datei folgt damit demselben Muster wie bereits
 * `us-046-admin-navigation.spec.ts` (dort: `AppNavigationComponent` + `AdminPageComponent`).
 */
describe('US-074: Projektübersicht — Sidebar-Icons/Nutzerkarte, Toolbar (Tabs/Suche/Sortierung), Karten-Grundlayout', () => {
  describe('Sidebar', () => {
    let tokenStorage: TokenStorageService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [AppNavigationComponent],
        providers: [
          provideRouter([{ path: 'login', component: DummyRouteComponent }]),
          // US-055: erzwingt die Desktop-Sidebar statt des mobilen Drawers (Chrome Headless startet
          // standardmäßig unterhalb des 960px-Breakpoints), siehe Begründung in
          // `app-navigation.component.spec.ts`.
          { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        ],
      });
      tokenStorage = TestBed.inject(TokenStorageService);
      tokenStorage.setToken(fakeToken({ isSystemAdmin: true, name: 'Petra Ziegler' }));
    });

    afterEach(() => tokenStorage.clearToken());

    it('Akzeptanzkriterium 1: jeder Eintrag der Hauptnavigation (inkl. Admin-Link) zeigt zusätzlich zum Label ein passendes Icon', () => {
      const fixture = TestBed.createComponent(AppNavigationComponent);
      fixture.detectChanges();

      const links: HTMLAnchorElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.app-navigation__links a'),
      );
      expect(links.length).toBeGreaterThanOrEqual(2); // Projektübersicht + Admin (isSystemAdmin: true)
      links.forEach((link) => {
        expect(link.querySelector('i[aria-hidden="true"]')).not.toBeNull();
      });
    });

    it('Akzeptanzkriterium 2: unterhalb der Navigationslinks, über dem „Abmelden"-Eintrag, erscheint eine Nutzerkarte (Avatar-Initialen + angemeldeter Name) aus der vorhandenen Session', () => {
      const fixture = TestBed.createComponent(AppNavigationComponent);
      fixture.detectChanges();

      const aside: HTMLElement = fixture.nativeElement.querySelector('aside.app-navigation');
      const userCard: HTMLElement | null = aside.querySelector('.app-navigation__user-card');
      expect(userCard).not.toBeNull();
      expect(userCard!.querySelector('.app-navigation__avatar')?.textContent?.trim()).toBe('PZ');
      expect(userCard!.querySelector('.app-navigation__user-name')?.textContent?.trim()).toBe(
        'Petra Ziegler',
      );

      const nav = aside.querySelector('nav') as HTMLElement;
      const logout = aside.querySelector('.app-navigation__logout') as HTMLElement;
      const position = (a: Node, b: Node) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(position(nav, userCard!)).toBeTruthy(); // Nutzerkarte kommt nach der Navigation …
      expect(position(userCard!, logout)).toBeTruthy(); // … und vor „Abmelden".
    });
  });

  describe('Toolbar & Karten', () => {
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
        id: 'project-1',
        name: 'Berta-Projekt',
        description: null,
        status: 'Active',
        memberCount: 4,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'project-3',
        name: 'Fremdprojekt',
        description: null,
        status: 'Archived',
        memberCount: 1,
        createdAt: '2026-02-01T00:00:00Z',
      },
    ];

    function configure(isSystemAdmin: boolean) {
      // Manche Testfälle rufen `configure()` zweimal auf (Gegenprobe admin/nicht-admin) — TestBed
      // lässt sich nach `createComponent()` nicht erneut konfigurieren, daher hier zurücksetzen.
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

    it('Akzeptanzkriterium 3: die Toolbar zeigt für ALLE Rollen Tabs „Meine Projekte (N)"/„Alle Projekte (N)" mit Live-Zähler — „Alle Projekte" bleibt ausschließlich für Systemadmins sichtbar', () => {
      configure(false);
      const nonAdminFixture = TestBed.createComponent(ProjectOverviewComponent);
      nonAdminFixture.detectChanges();

      const nonAdminTabs: HTMLButtonElement[] = Array.from(
        nonAdminFixture.nativeElement.querySelectorAll('.tab-pill'),
      );
      expect(nonAdminTabs.length).toBe(1);
      expect(nonAdminTabs[0].textContent?.trim()).toBe(`Meine Projekte (${myProjects.length})`);

      configure(true);
      const adminFixture = TestBed.createComponent(ProjectOverviewComponent);
      adminFixture.detectChanges();

      const adminTabs: HTMLButtonElement[] = Array.from(
        adminFixture.nativeElement.querySelectorAll('.tab-pill'),
      );
      expect(adminTabs.length).toBe(2);
      expect(adminTabs[0].textContent?.trim()).toBe(`Meine Projekte (${myProjects.length})`);
      expect(adminTabs[1].textContent?.trim()).toBe(`Alle Projekte (${allProjects.length})`);
    });

    it('Akzeptanzkriterium 4: ein Suchfeld „Projekte durchsuchen…" filtert die sichtbare Kartenliste client-seitig nach Projektname', () => {
      configure(false);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.project-card').length).toBe(
        myProjects.length,
      );

      const searchInput: HTMLInputElement = fixture.nativeElement.querySelector('#project-search');
      expect(searchInput.placeholder).toBe('Projekte durchsuchen…');
      searchInput.value = 'anton';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const cards: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.project-card'),
      );
      expect(cards.length).toBe(1);
      expect(cards[0].textContent).toContain('Anton-Projekt');
    });

    it('Akzeptanzkriterium 5: ein Sortier-Dropdown bietet „Name (A–Z)" und „Neu zuerst" (nach CreatedAt) an', () => {
      configure(false);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      // US-076 ergänzt eine dritte Option („Zuletzt aktualisiert") additiv — diese Story prüft
      // ausschließlich, dass ihre eigenen zwei Optionen weiterhin (in dieser Reihenfolge)
      // vorhanden sind, nicht die Gesamtzahl.
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('#project-sort');
      const optionLabels = Array.from(select.options).map((option) => option.textContent?.trim());
      expect(optionLabels.slice(0, 2)).toEqual(['Name (A–Z)', 'Neu zuerst']);

      // Default „Name (A–Z)": Anton-Projekt vor Berta-Projekt.
      let titles: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.project-card h2'),
      );
      expect(titles[0].textContent).toBe('Anton-Projekt');

      // Direktes `setValue()` auf dem `FormControl` statt eines simulierten DOM-`change`-Events —
      // konsistent mit dem bereits etablierten Testmuster für Auswahlfelder in
      // `stakeholder-list.component.spec.ts`.
      fixture.componentInstance['filterForm'].controls.sortBy.setValue('newest');
      fixture.detectChanges();

      // „Neu zuerst": Berta-Projekt (2026-06-01) ist jünger als Anton-Projekt (2026-01-01).
      titles = Array.from(fixture.nativeElement.querySelectorAll('.project-card h2'));
      expect(titles[0].textContent).toBe('Berta-Projekt');
    });

    it('Akzeptanzkriterium 6: der Button „Neues Projekt" bleibt ausschließlich für Systemadmins sichtbar', () => {
      configure(false);
      const nonAdminFixture = TestBed.createComponent(ProjectOverviewComponent);
      nonAdminFixture.detectChanges();
      const nonAdminButtons: HTMLButtonElement[] = Array.from(
        nonAdminFixture.nativeElement.querySelectorAll('button'),
      );
      expect(
        nonAdminButtons.some((button) => button.textContent?.trim() === 'Neues Projekt'),
      ).toBeFalse();

      configure(true);
      const adminFixture = TestBed.createComponent(ProjectOverviewComponent);
      adminFixture.detectChanges();
      const adminButtons: HTMLButtonElement[] = Array.from(
        adminFixture.nativeElement.querySelectorAll('button'),
      );
      expect(
        adminButtons.some((button) => button.textContent?.trim() === 'Neues Projekt'),
      ).toBeTrue();
    });

    it('Akzeptanzkriterium 7: jede Karte zeigt eine farbcodierte Rollen-Badge-Pille (PL/Coreteam/Architect)', () => {
      configure(false);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      const cards: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.project-card'),
      );
      const antonCard = cards.find((card) => card.textContent?.includes('Anton-Projekt'));
      const bertaCard = cards.find((card) => card.textContent?.includes('Berta-Projekt'));
      expect(bertaCard?.querySelector('.role-badge--pl')?.textContent?.trim()).toBe('PL');
      expect(antonCard?.querySelector('.role-badge--coreteam')?.textContent?.trim()).toBe(
        'Coreteam',
      );
    });

    it('Akzeptanzkriterium 8: die Stakeholder-Zahl wird in Mono-Schrift hervorgehoben dargestellt', () => {
      configure(false);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      const statNum: HTMLElement = fixture.nativeElement.querySelector('.stat-num');
      expect(statNum).not.toBeNull();
      expect(getComputedStyle(statNum).fontFamily).toContain('IBM Plex Mono');
    });

    it('Akzeptanzkriterium 9: archivierte Projekte (status === "Archived") erscheinen optisch gedimmt mit „Archiviert"-Tag', () => {
      configure(false);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();

      const cards: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.project-card'),
      );
      const archivedCard = cards.find((card) => card.textContent?.includes('Anton-Projekt'));
      const activeCard = cards.find((card) => card.textContent?.includes('Berta-Projekt'));

      expect(archivedCard?.classList.contains('archived')).toBeTrue();
      expect(archivedCard?.querySelector('.status-tag--archived')?.textContent?.trim()).toBe(
        'Archiviert',
      );
      expect(activeCard?.classList.contains('archived')).toBeFalse();
      expect(activeCard?.querySelector('.status-tag--archived')).toBeNull();
    });

    it('Akzeptanzkriterium 10: kein Rückschritt gegenüber der bestehenden Admin-„Alle Projekte"-Kartendarstellung (Status/Mitgliederzahl bleiben dort sichtbar)', () => {
      configure(true);
      const fixture = TestBed.createComponent(ProjectOverviewComponent);
      fixture.detectChanges();
      const allTab: HTMLButtonElement = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.tab-pill'),
      ).find((button) => button.textContent?.includes('Alle Projekte'))!;
      allTab.click();
      fixture.detectChanges();

      const cards: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.project-card'),
      );
      expect(cards.length).toBe(allProjects.length);

      const activeAdminCard = cards.find((card) => card.textContent?.includes('Berta-Projekt'));
      const archivedAdminCard = cards.find((card) => card.textContent?.includes('Fremdprojekt'));
      expect(activeAdminCard?.textContent).toContain('Mitglieder: 4');
      expect(activeAdminCard?.querySelector('.status-tag')?.textContent?.trim()).toBe('Aktiv');
      expect(archivedAdminCard?.textContent).toContain('Mitglieder: 1');
      expect(archivedAdminCard?.querySelector('.status-tag--archived')?.textContent?.trim()).toBe(
        'Archiviert',
      );
    });
  });
});
