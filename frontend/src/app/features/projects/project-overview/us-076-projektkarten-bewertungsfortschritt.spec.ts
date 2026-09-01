import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminProject, AdminProjectsService } from '../../admin/admin-projects.service';
import { TokenStorageService } from '../../auth/token-storage.service';
import { ProjectOverviewItem, ProjectsService } from '../projects.service';
import { ProjectOverviewComponent } from './project-overview.component';

/**
 * Story-Test US-076 „Rollen-Bewertungsfortschritt (Progress-Ringe) und „unbewertet"-Hinweis auf
 * Projektkarten" (Konvention siehe `.claude/agents/qa.md` Abschnitt 1) — ausschließlich der
 * Frontend-Anteil. Jeder Testfall bildet genau ein Akzeptanzkriterium aus der Story-Datei ab, in
 * derselben Reihenfolge wie dort gelistet. Die Backend-Anteile (`Project.UpdatedAt`,
 * `ProjectAssessmentProgressQuery`, additive Response-Erweiterung) deckt
 * `US076_ProjektkartenBewertungsfortschrittTests` (`SlobSteak.Api.Tests`) ab.
 */
describe('US-076: Projektkarten — Rollen-Bewertungsfortschritt (Progress-Ringe) und „unbewertet"-Hinweis', () => {
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let adminProjectsServiceSpy: jasmine.SpyObj<AdminProjectsService>;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  const myProjects: ProjectOverviewItem[] = [
    {
      id: 'project-pl',
      name: 'PL-Projekt',
      role: 'PL',
      stakeholderCount: 8,
      status: 'Active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // vor 2 Std.
      pl: { percent: 75, unassessedCount: 2 },
      coreteam: { percent: 100, unassessedCount: 0 },
      architect: { percent: 50, unassessedCount: 4 },
    },
    {
      id: 'project-user',
      name: 'User-Projekt',
      role: 'User',
      stakeholderCount: 5,
      status: 'Active',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // vor 1 Tag
      pl: { percent: 20, unassessedCount: 4 },
      coreteam: { percent: 40, unassessedCount: 3 },
      architect: { percent: 60, unassessedCount: 2 },
    },
    {
      id: 'project-fully-assessed',
      name: 'Vollstaendig-Projekt',
      role: 'Coreteam',
      stakeholderCount: 3,
      status: 'Active',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // vor 1 Woche
      pl: { percent: 100, unassessedCount: 0 },
      coreteam: { percent: 100, unassessedCount: 0 },
      architect: { percent: 100, unassessedCount: 0 },
    },
    {
      id: 'project-archived',
      name: 'Archiviertes-Projekt',
      role: 'PL',
      stakeholderCount: 2,
      status: 'Archived',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // vor 1 Monat
      pl: { percent: 0, unassessedCount: 2 },
      coreteam: { percent: 0, unassessedCount: 2 },
      architect: { percent: 0, unassessedCount: 2 },
    },
  ];
  const allProjects: AdminProject[] = [];

  function configure() {
    TestBed.resetTestingModule();
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects']);
    adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects']);
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);
    projectsServiceSpy.listMyProjects.and.returnValue(of(myProjects));
    adminProjectsServiceSpy.listProjects.and.returnValue(of(allProjects));
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin: false });

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

  it('Akzeptanzkriterium 4: jede Projektkarte zeigt drei Fortschritts-Ringe (PL/CT/AR) mit dem korrekten Prozentwert je Rolle', () => {
    configure();
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const card = cardFor(fixture, 'PL-Projekt');
    const rings: HTMLElement[] = Array.from(card.querySelectorAll('app-role-progress-ring'));
    expect(rings.length).toBe(3);
    expect(rings[0].textContent).toContain('PL');
    expect(rings[0].textContent).toContain('75%');
    expect(rings[1].textContent).toContain('CT');
    expect(rings[1].textContent).toContain('100%');
    expect(rings[2].textContent).toContain('AR');
    expect(rings[2].textContent).toContain('50%');
  });

  it('Akzeptanzkriterium 5: der „unbewertet · deine Sicht"-Hinweis erscheint nur für die eigene Rolle mit tatsächlich unbewerteten Stakeholdern und nie für Rolle „User"', () => {
    configure();
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    // Eigene Rolle PL, 2 unbewertet -> Banner sichtbar mit korrekter Zahl.
    const plCard = cardFor(fixture, 'PL-Projekt');
    expect(plCard.querySelector('.attention')?.textContent?.trim()).toBe(
      '2 unbewertet · deine Sicht',
    );

    // Eigene Rolle Coreteam, 0 unbewertet (vollständig bewertet) -> kein Banner, obwohl PL/Architect
    // theoretisch unbewertete Stakeholder hätten (irrelevant, da nicht die eigene Rolle).
    const fullyAssessedCard = cardFor(fixture, 'Vollstaendig-Projekt');
    expect(fullyAssessedCard.querySelector('.attention')).toBeNull();

    // Rolle „User" hat keine eigene Perspektive -> nie ein Banner, obwohl alle drei Rollen dort
    // unbewertete Stakeholder hätten.
    const userCard = cardFor(fixture, 'User-Projekt');
    expect(userCard.querySelector('.attention')).toBeNull();
  });

  it('Akzeptanzkriterium 6: die Kartenfußzeile zeigt „Aktualisiert vor …" als relative Zeitangabe basierend auf UpdatedAt', () => {
    configure();
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const plCard = cardFor(fixture, 'PL-Projekt');
    expect(plCard.querySelector('.meta')?.textContent?.trim()).toBe('Aktualisiert vor 2 Std.');

    const userCard = cardFor(fixture, 'User-Projekt');
    expect(userCard.querySelector('.meta')?.textContent?.trim()).toBe('Aktualisiert vor 1 Tag');
  });

  it('Akzeptanzkriterium 7: das Sortier-Dropdown bietet zusätzlich „Zuletzt aktualisiert" an, sortiert absteigend nach UpdatedAt', () => {
    configure();
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#project-sort');
    const optionLabels = Array.from(select.options).map((option) => option.textContent?.trim());
    expect(optionLabels).toContain('Zuletzt aktualisiert');

    fixture.componentInstance['filterForm'].controls.sortBy.setValue('lastUpdated');
    fixture.detectChanges();

    // Neuestes UpdatedAt zuerst: PL-Projekt (vor 2 Std.) vor User-Projekt (vor 1 Tag) vor
    // Vollstaendig-Projekt (2026-08-01) vor Archiviertes-Projekt (2025-06-01).
    const titles: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.project-card h2'),
    );
    expect(titles.map((title) => title.textContent)).toEqual([
      'PL-Projekt',
      'User-Projekt',
      'Vollstaendig-Projekt',
      'Archiviertes-Projekt',
    ]);
  });

  // Regressionsschutz (kein eigenes Akzeptanzkriterium, aber Teil der optischen Übereinstimmung
  // mit docs/design/Main.dc.html Karte 5/SPEC-02 §3.5): archivierte Karten zeigen weder
  // Fortschritts-Ringe noch den Attention-Hinweis.
  it('archivierte Projekte zeigen weder Fortschritts-Ringe noch den „unbewertet"-Hinweis', () => {
    configure();
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const archivedCard = cardFor(fixture, 'Archiviertes-Projekt');
    expect(archivedCard.querySelectorAll('app-role-progress-ring').length).toBe(0);
    expect(archivedCard.querySelector('.attention')).toBeNull();
    expect(archivedCard.querySelector('.meta')?.textContent?.trim()).toBe(
      'Aktualisiert vor 1 Monat',
    );
  });
});
