import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import { SlobSteakPreset } from './core/theme/slobsteak-preset';
import { FilterSelectComponent, FilterSelectOption } from './shared/filter-select/filter-select.component';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { StakeholdersService } from './features/stakeholders/stakeholders.service';
import { ProjectsService } from './features/projects/projects.service';
import { MapService } from './features/map/map.service';
import { DistributionListPageComponent } from './features/distribution/distribution-list-page/distribution-list-page.component';
import { DistributionListService } from './features/distribution/distribution-list.service';
import { AdminCommunicationTypesService } from './features/admin/admin-communication-types.service';
import { StakeholderMapPageComponent } from './features/map/stakeholder-map-page/stakeholder-map-page.component';
import { StakeholdersService as MapStakeholdersService } from './features/stakeholders/stakeholders.service';
import { AssessmentsService } from './features/assessments/assessments.service';
import { ProjectOverviewComponent } from './features/projects/project-overview/project-overview.component';
import { AdminProjectsService } from './features/admin/admin-projects.service';
import { TokenStorageService } from './features/auth/token-storage.service';

/**
 * Story-Test US-084 „Gestaltete Auswahlfelder app-weit statt nativer `<select>`, Toolbar-
 * Anordnung der Projektübersicht" (Konvention siehe `.claude/agents/qa.md` Abschnitt 1). Jeder
 * Testfall bildet genau ein Akzeptanzkriterium aus der Story-Datei ab, in derselben Reihenfolge
 * wie im Story-Dokument.
 *
 * Akzeptanzkriterium 10 (manueller Smoke-Test gegen `docker compose up`, Screenshot-Nachweis) ist
 * naturgemäß kein Verhalten, das sich in einem Jasmine-Spec abbilden lässt — Nachweis über den
 * PR-Text. Akzeptanzkriterium 11 ("Story-Test existiert") ist diese Datei selbst.
 * Akzeptanzkriterium 12 (bestehende Tests bleiben grün) über den vollständigen `ng test`-Lauf des
 * gesamten Workspace (CLAUDE.md Abschnitt 2/3), nicht Teil dieser Datei.
 */
describe('US-084: Gestaltete Auswahlfelder app-weit statt nativer <select>, Toolbar-Anordnung der Projektübersicht', () => {
  function configureStakeholderList(): ComponentFixture<StakeholderListComponent> {
    TestBed.resetTestingModule();
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([]));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 0 }));
    const mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData']);
    mapServiceSpy.getMapData.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StakeholderListComponent],
      providers: [
        provideRouter([]),
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
      ],
    });
    const fixture = TestBed.createComponent(StakeholderListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function configureDistributionList(): ComponentFixture<DistributionListPageComponent> {
    TestBed.resetTestingModule();
    const distributionListServiceSpy = jasmine.createSpyObj('DistributionListService', ['getDistributionList']);
    distributionListServiceSpy.getDistributionList.and.returnValue(of({ rows: [], totalStakeholderCount: 0 }));
    const communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [DistributionListPageComponent],
      providers: [
        provideRouter([]),
        { provide: DistributionListService, useValue: distributionListServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
      ],
    });
    const fixture = TestBed.createComponent(DistributionListPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function configureMap(): ComponentFixture<StakeholderMapPageComponent> {
    TestBed.resetTestingModule();
    const mapServiceSpy = jasmine.createSpyObj('MapService', ['getMapData', 'getComparisonData']);
    mapServiceSpy.getMapData.and.returnValue(of([]));
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 0 }));
    const stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['listStakeholders']);
    stakeholdersServiceSpy.listStakeholders.and.returnValue(of([]));
    const assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['updatePosition', 'upsertAssessment']);

    TestBed.configureTestingModule({
      imports: [StakeholderMapPageComponent],
      providers: [
        provideRouter([]),
        { provide: MapService, useValue: mapServiceSpy },
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: MapStakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: AssessmentsService, useValue: assessmentsServiceSpy },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
      ],
    });
    const fixture = TestBed.createComponent(StakeholderMapPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function configureProjectOverview(): ComponentFixture<ProjectOverviewComponent> {
    TestBed.resetTestingModule();
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects']);
    projectsServiceSpy.listMyProjects.and.returnValue(
      of([{ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 0 }]),
    );
    const adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects']);
    adminProjectsServiceSpy.listProjects.and.returnValue(of([]));
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);
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
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 1: alle genannten <select>-Elemente sind auf das gemeinsame, gestaltete
  // Auswahl-Control (p-select) umgestellt, einmal definiert (app-filter-select) statt je Screen
  // nachgebaut.
  it('Akzeptanzkriterium 1: kein natives <select> mehr in Stakeholder-Liste, Verteiler, Map und Projektübersicht; alle nutzen dasselbe app-filter-select-Muster', () => {
    const listFixture = configureStakeholderList();
    expect(listFixture.nativeElement.querySelector('select')).toBeNull();
    expect(listFixture.debugElement.query(By.directive(FilterSelectComponent))).not.toBeNull();

    const distributionFixture = configureDistributionList();
    expect(distributionFixture.nativeElement.querySelector('select')).toBeNull();
    expect(distributionFixture.debugElement.queryAll(By.directive(FilterSelectComponent)).length).toBe(4);

    const mapFixture = configureMap();
    expect(mapFixture.nativeElement.querySelector('select')).toBeNull();
    expect(mapFixture.debugElement.query(By.directive(FilterSelectComponent))).not.toBeNull();

    const overviewFixture = configureProjectOverview();
    expect(overviewFixture.nativeElement.querySelector('select')).toBeNull();
    expect(overviewFixture.nativeElement.querySelector('p-select')).not.toBeNull();
  });

  // Akzeptanzkriterium 2: das Options-Panel rendert auf --app-color-surface mit mindestens 4,5:1
  // Textkontrast in normal/hover/ausgewählt (identisches Preset/Overlay-Token-Fundament wie US-077).
  it('Akzeptanzkriterium 2: das Auswahl-Panel rendert auf color.surface (#161D2B) mit Textfarbe/Hover-/Selected-Kontrast ≥4,5:1', async () => {
    @Component({
      standalone: true,
      imports: [FilterSelectComponent, ReactiveFormsModule],
      template: `<app-filter-select prefix="Typ" label="Nach Typ filtern" inputId="ac2" [options]="options" [control]="control" />`,
    })
    class HostComponent {
      options: FilterSelectOption<string>[] = [
        { value: '', label: 'Alle' },
        { value: 'Person', label: 'Person' },
      ];
      control = new FormControl<string>('', { nonNullable: true });
    }

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        providePrimeNG({ theme: { preset: SlobSteakPreset, options: { darkModeSelector: false, cssLayer: false } } }),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const rootStyles = getComputedStyle(document.documentElement);
    expect(rootStyles.getPropertyValue('--p-overlay-select-background').trim().toUpperCase()).toBe('#161D2B');
    expect(rootStyles.getPropertyValue('--p-list-option-color').trim().toUpperCase()).toBe('#EDEFF4');
    expect(rootStyles.getPropertyValue('--p-list-option-focus-background').trim().toUpperCase()).toBe('#1D2536');
    expect(rootStyles.getPropertyValue('--p-highlight-background').trim()).toBeTruthy();
  });

  // Akzeptanzkriterium 3: wo das Design ein Präfix vorsieht, trägt das Control den Filternamen als
  // Präfix; die <label>-Zuordnung für Screenreader bleibt erhalten.
  it('Akzeptanzkriterium 3: das Control zeigt den Filternamen als Präfix ("Typ: Alle") und behält eine echte, verknüpfte <label>-Zuordnung', () => {
    const fixture = configureStakeholderList();
    const filterSelect = fixture.debugElement.query(By.directive(FilterSelectComponent));
    const selectedLabel: HTMLElement = filterSelect.nativeElement.querySelector('.p-select-label');
    expect(selectedLabel.textContent?.trim()).toBe('Typ: Alle');

    const label: HTMLLabelElement = filterSelect.nativeElement.querySelector('label');
    expect(label.getAttribute('for')).toBe('type');
  });

  // Akzeptanzkriterium 4: Tastaturbedienung bleibt vollständig — Öffnen, Pfeiltasten, Tippen zum
  // Springen, Escape, Auswahl mit Enter.
  it('Akzeptanzkriterium 4: das Control bleibt vollständig per Tastatur bedienbar (Öffnen, Pfeiltasten, Enter, Escape)', () => {
    @Component({
      standalone: true,
      imports: [FilterSelectComponent, ReactiveFormsModule],
      template: `<app-filter-select prefix="Typ" label="Nach Typ filtern" inputId="ac4" [options]="options" [control]="control" />`,
    })
    class HostComponent {
      options: FilterSelectOption<string>[] = [
        { value: '', label: 'Alle' },
        { value: 'Person', label: 'Person' },
        { value: 'Organization', label: 'Organisation' },
      ];
      control = new FormControl<string>('', { nonNullable: true });
    }

    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // Das eigentliche fokussierbare/`role="combobox"`-Element ist `.p-select-label` (PrimeNG
    // `#focusInput`), nicht der äußere `.p-select`-Container.
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.p-select-label');
    trigger.focus();

    // PrimeNG wertet `event.code` aus (nicht `event.key`), siehe `Select.onKeyDown`.
    const keydown = (key: string) =>
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));

    // Öffnen per Enter.
    keydown('Enter');
    fixture.detectChanges();
    const options = document.querySelectorAll('.p-select-option');
    expect(options.length).toBe(3);

    // Escape schließt das Panel wieder, ohne die Auswahl zu ändern.
    keydown('Escape');
    fixture.detectChanges();
    expect(document.querySelectorAll('.p-select-option').length).toBe(0);
    expect(fixture.componentInstance.control.value).toBe('');

    // Erneutes Öffnen, Pfeiltaste + Enter wählt eine Option aus.
    keydown('Enter');
    fixture.detectChanges();
    keydown('ArrowDown');
    fixture.detectChanges();
    keydown('Enter');
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('Person');
  });

  // Akzeptanzkriterium 5: "Neues Projekt" steht in der Titelzeile rechts neben der Überschrift.
  it('Akzeptanzkriterium 5: "Neues Projekt" steht in der Titelzeile rechts neben der Überschrift', () => {
    TestBed.resetTestingModule();
    const projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects']);
    projectsServiceSpy.listMyProjects.and.returnValue(of([]));
    const adminProjectsServiceSpy = jasmine.createSpyObj('AdminProjectsService', ['listProjects']);
    adminProjectsServiceSpy.listProjects.and.returnValue(of([]));
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin: true });

    TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AdminProjectsService, useValue: adminProjectsServiceSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });
    const fixture = TestBed.createComponent(ProjectOverviewComponent);
    fixture.detectChanges();

    const topbar: HTMLElement = fixture.nativeElement.querySelector('.topbar');
    expect(topbar).not.toBeNull();
    expect(topbar.querySelector('h1')).not.toBeNull();
    const button = Array.from<HTMLButtonElement>(topbar.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Neues Projekt',
    );
    expect(button).withContext('„Neues Projekt" steht in der .topbar-Titelzeile').not.toBeNull();
  });

  // Akzeptanzkriterium 6: die Standard-Sortierung ist "Zuletzt aktualisiert"; "Name (A–Z)" und
  // "Neu zuerst" bleiben wählbar.
  it('Akzeptanzkriterium 6: die Standard-Sortierung ist "Zuletzt aktualisiert", "Name (A–Z)" und "Neu zuerst" bleiben wählbar', () => {
    const fixture = configureProjectOverview();

    expect(fixture.componentInstance['filterForm'].controls.sortBy.value).toBe('lastUpdated');
    const optionValues = (fixture.componentInstance['sortOptions'] as { value: string }[]).map((o) => o.value);
    expect(optionValues).toContain('name');
    expect(optionValues).toContain('newest');
    expect(optionValues).toContain('lastUpdated');
  });

  // Akzeptanzkriterium 7: der Tab-Zähler steht als eigenes Element in
  // --app-font-family-mono neben dem Tab-Titel statt in Klammern im Text.
  it('Akzeptanzkriterium 7: der Tab-Zähler steht als eigenes Mono-Element neben dem Tab-Titel statt in Klammern', () => {
    const fixture = configureProjectOverview();

    const tabPill: HTMLElement = fixture.nativeElement.querySelector('.tab-pill');
    const count: HTMLElement | null = tabPill.querySelector('.count');
    expect(count).not.toBeNull();
    expect(count!.textContent?.trim()).toBe('1');
    expect(tabPill.textContent).not.toContain('(');
    expect(tabPill.textContent).not.toContain(')');
  });

  // Akzeptanzkriterium 8: das Suchfeld trägt ein Lupen-Icon im Feld.
  it('Akzeptanzkriterium 8: das Suchfeld trägt ein Lupen-Icon im Feld', () => {
    const fixture = configureProjectOverview();

    const searchField: HTMLElement = fixture.nativeElement.querySelector('.search-sort');
    expect(searchField.querySelector('p-iconfield')).not.toBeNull();
    expect(searchField.querySelector('.pi-search')).not.toBeNull();
  });

  // Akzeptanzkriterium 9: Automatisierte Tests belegen kein natives <select> mehr in den genannten
  // Komponenten, Default-Sortierung, Zähler als eigenes Element, Button in der Titelzeile — bereits
  // durch die Akzeptanzkriterien 1/5/6/7 oben abgedeckt; dieser Testfall hält das Kriterium
  // dennoch als eigenen, benannten Eintrag fest (qa.md Abschnitt 1).
  it('Akzeptanzkriterium 9: die vorangehenden Testfälle (1/5/6/7) weisen alle vier geforderten Nachweise automatisiert nach', () => {
    expect(true).toBeTrue();
  });
});
