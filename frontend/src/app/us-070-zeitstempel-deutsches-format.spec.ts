import { LOCALE_ID } from '@angular/core';
import { formatDate, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { createAppConfig } from './app.config';
import { AssessmentConflictDialogComponent } from './features/assessments/assessment-conflict-dialog/assessment-conflict-dialog.component';
import { AssessmentTabsComponent } from './features/assessments/assessment-tabs/assessment-tabs.component';
import { AssessmentRole, AssessmentsService } from './features/assessments/assessments.service';
import { AdminCommunicationTypesService } from './features/admin/admin-communication-types.service';
import { ProjectOverviewItem, ProjectsService } from './features/projects/projects.service';
import { EditStakeholderFormComponent } from './features/stakeholders/edit-stakeholder-form/edit-stakeholder-form.component';
import { StakeholderDetailComponent } from './features/stakeholders/stakeholder-detail/stakeholder-detail.component';
import { StakeholderListComponent } from './features/stakeholders/stakeholder-list/stakeholder-list.component';
import { StakeholderCommunicationsService } from './features/stakeholders/stakeholder-communications.service';
import { Stakeholder, StakeholdersService } from './features/stakeholders/stakeholders.service';

// Muss vor jeder `formatDate`/`date`-Pipe-Nutzung mit Locale 'de-DE' laufen — genau wie in
// app.config.ts (siehe dort für die Begründung).
registerLocaleData(localeDe);

/**
 * Story-Test US-070 „Zeitstempel systemweit im deutschen Format (TT.MM.JJJJ, 24h) statt US-Format
 * darstellen" (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1). Jeder Testfall bildet genau ein
 * Akzeptanzkriterium aus der Story-Datei ab, in derselben Reihenfolge.
 *
 * Akzeptanzkriterium 5 (manueller Smoke-Test gegen `docker-compose up`, Screenshot-Nachweis) ist
 * laut Story-Dokument ausdrücklich manuell verifiziert und daher kein automatisierter Testfall
 * hier. Akzeptanzkriterium 7 (bestehende Tests bleiben grün) wird durch den vollständigen
 * `ng test`-Lauf nachgewiesen, nicht durch einen isolierten Testfall in dieser Datei.
 */
describe('US-070: Zeitstempel systemweit im deutschen Format darstellen', () => {
  const knownTimestamp = '2026-08-21T12:32:00Z';

  const baseStakeholder: Stakeholder = {
    id: 'stakeholder-1',
    projectId: 'project-1',
    type: 'Person',
    name: 'Max Mustermann',
    organization: 'ACME GmbH',
    position: 'CTO',
    email: 'max@example.com',
    phone: null,
    locationDepartment: null,
    description: null,
    updatedByName: 'Anna Bauer',
    updatedAt: knownTimestamp,
    similarStakeholderWarning: null,
    deletedAt: null,
    deletedByName: null,
  };

  /**
   * Erwarteter Anzeige-Text für das Format `dd.MM.yyyy, HH:mm`, aus denselben lokalen
   * Datumsanteilen berechnet, die auch `DatePipe` ohne explizites Timezone-Argument verwendet —
   * dadurch ist der Vergleich unabhängig von der Zeitzone der jeweiligen Testumgebung (lokal vs.
   * CI), ohne die zu prüfende Formatierungslogik (Trennzeichen, führende Nullen, 24h) selbst
   * vorwegzunehmen.
   */
  function expectedGermanTimestamp(iso: string): string {
    const value = new Date(iso);
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}, ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  function assertGermanFormat(renderedText: string, iso: string): void {
    expect(renderedText).toContain(expectedGermanTimestamp(iso));
    expect(renderedText).not.toMatch(/\d{2}:\d{2}:\d{2}/); // keine Sekunden mehr (bisher 'medium')
    // Kein 12h-US-Format: nach der Uhrzeit direkt gefolgt von "AM"/"PM" (nicht zu verwechseln mit
    // dem deutschen Wort "am" in "… geändert von X am 21.08.2026, 14:32").
    expect(renderedText).not.toMatch(/\d{2}:\d{2}\s*(AM|PM)\b/i);
  }

  // Akzeptanzkriterium 1: Angular-Locale de-DE ist global registriert (registerLocaleData +
  // LOCALE_ID-Provider in app.config.ts), sodass date-Pipes ohne explizites locale-Argument
  // deutsches Format liefern.
  it('Akzeptanzkriterium 1: app.config.ts registriert die Locale de-DE und stellt sie als LOCALE_ID bereit', () => {
    // Wäre die Locale nicht registriert, würfe formatDate für 'de-DE' (Angular kennt die
    // Locale-Daten dann nicht).
    expect(() => formatDate(new Date(knownTimestamp), 'dd.MM.yyyy', 'de-DE')).not.toThrow();

    const providers = createAppConfig(null).providers;
    const localeProvider = providers.find(
      (provider): provider is { provide: unknown; useValue: unknown } =>
        typeof provider === 'object' && provider !== null && 'provide' in provider && (provider as { provide: unknown }).provide === LOCALE_ID,
    );

    expect(localeProvider).toBeTruthy();
    expect(localeProvider?.useValue).toBe('de-DE');
  });

  // Akzeptanzkriterium 2: alle fünf date-Pipe-Fundstellen zeigen Datum als dd.MM.yyyy und Uhrzeit
  // im 24-Stunden-Format ohne Sekunden. Zugleich deckt der Fall „StakeholderDetailComponent"
  // Akzeptanzkriterium 4 ab (repräsentativer Nachweis anhand eines bekannten DateTimeOffset-Werts).
  describe('Akzeptanzkriterium 2 (und 4): alle fünf Fundstellen zeigen dd.MM.yyyy, HH:mm ohne Sekunden', () => {
    it('assessment-conflict-dialog.component.html (modifiedAt)', () => {
      TestBed.configureTestingModule({
        imports: [AssessmentConflictDialogComponent],
        providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }],
      });
      const fixture = TestBed.createComponent(AssessmentConflictDialogComponent);
      fixture.componentInstance.modifiedBy = 'Peter PL';
      fixture.componentInstance.modifiedAt = knownTimestamp;
      fixture.detectChanges();

      assertGermanFormat(fixture.nativeElement.textContent, knownTimestamp);
    });

    it('assessment-tabs.component.html (role.updatedAt)', () => {
      const roles: AssessmentRole[] = [
        {
          role: 'PL',
          status: 'ASSESSED',
          influence: 40,
          interest: 60,
          notes: 'PL-Notiz',
          updatedByName: 'Peter PL',
          updatedAt: knownTimestamp,
          version: 1,
        },
        { role: 'Coreteam', status: 'NOT_ASSESSED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
        { role: 'Architect', status: 'NO_ROLE_ASSIGNED', influence: null, interest: null, notes: null, updatedByName: null, updatedAt: null, version: null },
      ];
      const assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService> = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
      assessmentsServiceSpy.getAssessments.and.returnValue(of(roles));

      TestBed.configureTestingModule({
        imports: [AssessmentTabsComponent],
        providers: [
          { provide: AssessmentsService, useValue: assessmentsServiceSpy },
          { provide: LOCALE_ID, useValue: 'de-DE' },
        ],
      });
      const fixture = TestBed.createComponent(AssessmentTabsComponent);
      fixture.componentInstance.stakeholderId = 'stakeholder-1';
      fixture.componentInstance.currentUserRole = 'PL';
      fixture.detectChanges();

      assertGermanFormat(fixture.nativeElement.textContent, knownTimestamp);
    });

    // US-071 (Issue #102): `EditStakeholderFormComponent` zeigte die „Zuletzt geändert von/am“-Zeile
    // bislang redundant zum Namens-Header von `StakeholderDetailComponent` erneut an (eigene
    // Überschrift „Stakeholder bearbeiten“ + eigene Meta-Zeile). Diese Fundstelle wurde im Zuge des
    // Zwei-Spalten-Layout-Umbaus konsolidiert — die Zeitstempel-Anzeige existiert seither nur noch
    // an einer Stelle (Namens-Header), nicht mehr dupliziert im Stammdaten-Panel. Der ursprünglich
    // hier geprüfte fachliche Sachverhalt (deutsches Zeitformat für „zuletzt geändert“) bleibt durch
    // den nachfolgenden Testfall „stakeholder-detail.component.html“ vollständig abgedeckt — kein
    // Verlust einer geprüften Aussage, nur Wegfall einer durch US-071 bewusst entfernten Dopplung
    // (CLAUDE.md Abschnitt 6).

    // Akzeptanzkriterium 4: repräsentativer Nachweis anhand von StakeholderDetailComponent, dass
    // ein bekannter DateTimeOffset-Wert im erwarteten deutschen Format gerendert wird.
    it('stakeholder-detail.component.html (stakeholder.updatedAt) — zugleich Akzeptanzkriterium 4', () => {
      const stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService> = jasmine.createSpyObj('StakeholdersService', [
        'getStakeholder',
        'updateStakeholder',
        'getDeletionImpact',
        'deleteStakeholder',
      ]);
      stakeholdersServiceSpy.getStakeholder.and.returnValue(of(baseStakeholder));

      const projectsServiceSpy: jasmine.SpyObj<ProjectsService> = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
      projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'User', stakeholderCount: 1 } as ProjectOverviewItem));

      const assessmentsServiceSpy: jasmine.SpyObj<AssessmentsService> = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
      assessmentsServiceSpy.getAssessments.and.returnValue(of([]));

      const stakeholderCommunicationsServiceSpy: jasmine.SpyObj<StakeholderCommunicationsService> = jasmine.createSpyObj('StakeholderCommunicationsService', [
        'getAssignments',
        'assignCommunication',
        'updateAssignment',
        'removeAssignment',
      ]);
      stakeholderCommunicationsServiceSpy.getAssignments.and.returnValue(of([]));

      const adminCommunicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService> = jasmine.createSpyObj('AdminCommunicationTypesService', [
        'listActiveCommunicationTypes',
      ]);
      adminCommunicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of([]));

      TestBed.configureTestingModule({
        imports: [StakeholderDetailComponent],
        providers: [
          provideRouter([]),
          { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: AssessmentsService, useValue: assessmentsServiceSpy },
          { provide: StakeholderCommunicationsService, useValue: stakeholderCommunicationsServiceSpy },
          { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy },
          { provide: LOCALE_ID, useValue: 'de-DE' },
          {
            provide: ActivatedRoute,
            useValue: {
              parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } },
              snapshot: { paramMap: convertToParamMap({ stakeholderId: 'stakeholder-1' }) },
            },
          },
        ],
      });

      const fixture = TestBed.createComponent(StakeholderDetailComponent);
      fixture.detectChanges();

      assertGermanFormat(fixture.nativeElement.textContent, knownTimestamp);
    });

    it('stakeholder-list.component.html (deletedAt, „Gelöscht am")', () => {
      const deletedStakeholder: Stakeholder = { ...baseStakeholder, deletedAt: knownTimestamp, deletedByName: 'Anna Bauer' };
      const stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService> = jasmine.createSpyObj('StakeholdersService', [
        'listStakeholders',
        'createStakeholder',
        'updateStakeholder',
        'getDeletionImpact',
        'deleteStakeholder',
        'restoreStakeholder',
      ]);
      stakeholdersServiceSpy.listStakeholders.and.returnValue(of([baseStakeholder]));

      const projectsServiceSpy: jasmine.SpyObj<ProjectsService> = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
      projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role: 'PL', stakeholderCount: 1 } as ProjectOverviewItem));

      TestBed.configureTestingModule({
        imports: [StakeholderListComponent],
        providers: [
          provideRouter([]),
          { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
          { provide: ProjectsService, useValue: projectsServiceSpy },
          { provide: LOCALE_ID, useValue: 'de-DE' },
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } } },
        ],
      });

      const fixture = TestBed.createComponent(StakeholderListComponent);
      fixture.detectChanges();

      stakeholdersServiceSpy.listStakeholders.and.returnValue(of([deletedStakeholder]));
      fixture.componentInstance['onToggleDeleted'](true);
      fixture.detectChanges();

      assertGermanFormat(fixture.nativeElement.textContent, knownTimestamp);
    });
  });

  // Akzeptanzkriterium 3: kein Wechsel des zugrundeliegenden Zeitwerts oder der Zeitzone —
  // ausschließlich die Anzeige-Formatierung ändert sich.
  it('Akzeptanzkriterium 3: der zugrundeliegende Zeitwert bleibt unverändert, nur die Darstellung wechselt', () => {
    const stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService> = jasmine.createSpyObj('StakeholdersService', ['createStakeholder', 'updateStakeholder']);

    TestBed.configureTestingModule({
      imports: [EditStakeholderFormComponent],
      providers: [
        { provide: StakeholdersService, useValue: stakeholdersServiceSpy },
        { provide: LOCALE_ID, useValue: 'de-DE' },
      ],
    });
    const fixture = TestBed.createComponent(EditStakeholderFormComponent);
    fixture.componentRef.setInput('stakeholder', baseStakeholder);
    fixture.detectChanges();

    // Keine Komponente transformiert `updatedAt` selbst — der ursprüngliche ISO-8601-Wert (UTC)
    // bleibt exakt erhalten und wird ausschließlich über die `date`-Pipe zur Anzeige formatiert.
    expect(fixture.componentInstance.stakeholder.updatedAt).toBe(knownTimestamp);
  });
});
