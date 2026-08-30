import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Stakeholder, StakeholdersService } from './stakeholders.service';
import { ProjectOverviewItem, ProjectsService } from '../projects/projects.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { StakeholderCommunicationsService } from './stakeholder-communications.service';
import { AdminCommunicationTypesService } from '../admin/admin-communication-types.service';
import { StakeholderDetailComponent } from './stakeholder-detail/stakeholder-detail.component';

/**
 * Story-Test US-071 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-071-stakeholder-detail-zwei-spalten-layout.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument. Die beiden Akzeptanzkriterien
 * ohne Automatisierungs-Anteil (manueller Smoke-Test gegen `docker-compose up`; bestehende Tests
 * von `StakeholderDetailComponent`/`EditStakeholderFormComponent` bleiben grün) sind hier nicht als
 * eigener Testfall abgebildet — sie werden über den manuellen Smoke-Check (siehe PR-Beschreibung)
 * bzw. die unveränderten/angepassten Bestandstests der beiden Komponenten selbst nachgewiesen.
 */
describe('US-071: Stakeholder-Detailseite als Zwei-Spalten-Layout mit direkt editierbaren Stammdaten und Typ-Badge', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;

  const stakeholder: Stakeholder = {
    id: 'stakeholder-1',
    projectId: 'project-1',
    type: 'Person',
    name: 'Frank Vogel',
    organization: 'Rewe Group',
    position: 'Geschäftsführer Vertrieb',
    email: 'frank.vogel@rewe-group.example',
    phone: '+49 221 555 1234',
    locationDepartment: 'Köln, Geschäftsleitung',
    description: 'Zentraler Entscheider für das Rollout.',
    updatedByName: 'Anna Bauer',
    updatedAt: '2026-08-21T14:32:00Z',
    similarStakeholderWarning: null,
    deletedAt: null,
    deletedByName: null,
  };

  function configure(role: string): void {
    TestBed.resetTestingModule();
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', [
      'getStakeholder',
      'updateStakeholder',
      'getDeletionImpact',
      'deleteStakeholder',
    ]);
    stakeholdersServiceSpy.getStakeholder.and.returnValue(of(stakeholder));

    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['listMyProjects', 'getProject']);
    projectsServiceSpy.getProject.and.returnValue(of({ id: 'project-1', name: 'Projekt', role, stakeholderCount: 1 } as ProjectOverviewItem));

    const assessmentsServiceSpy = jasmine.createSpyObj('AssessmentsService', ['getAssessments', 'upsertAssessment']);
    assessmentsServiceSpy.getAssessments.and.returnValue(of([]));

    const stakeholderCommunicationsServiceSpy = jasmine.createSpyObj('StakeholderCommunicationsService', [
      'getAssignments',
      'assignCommunication',
      'updateAssignment',
      'removeAssignment',
    ]);
    stakeholderCommunicationsServiceSpy.getAssignments.and.returnValue(of([]));

    const adminCommunicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', ['listActiveCommunicationTypes']);
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
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } },
            snapshot: { paramMap: convertToParamMap({ stakeholderId: 'stakeholder-1' }) },
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(StakeholderDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 1: Zwei-Spalten-Layout — linke Spalte enthält Stammdaten- und
  // Kommunikationszuordnungen-Panel, rechte Spalte ausschließlich das Assessment-Panel.
  it('rendert ein Zwei-Spalten-Layout: Stammdaten + Kommunikationszuordnungen links, Assessment rechts', () => {
    configure('PL');
    const fixture = createComponent();

    const leftPanelTitles = fixture.debugElement
      .queryAll(By.css('.col-left .panel-title'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    const rightPanelTitles = fixture.debugElement
      .queryAll(By.css('.col-right .panel-title'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());

    expect(leftPanelTitles).toEqual(['Stammdaten', 'Kommunikationszuordnungen']);
    expect(rightPanelTitles).toEqual(['Assessment']);
  });

  // Akzeptanzkriterium 2: Für Nutzer mit Bearbeitungsrecht sind die Stammdatenfelder (Position,
  // E-Mail, Telefon, Standort/Abteilung, Beschreibung) direkt als Eingabefelder im
  // Stammdaten-Panel dargestellt — kein separater Lese-/Bearbeiten-Modus-Wechsel, kein zweites,
  // redundantes Formular mit erneuten Name-/Typ-/Organisation-Feldern.
  it('zeigt die Stammdatenfelder für Nutzer mit Bearbeitungsrecht immer direkt als Eingabefelder, ohne redundantes Name-/Typ-/Organisation-Formular', () => {
    configure('PL');
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('#f-position'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-email'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-phone'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-location'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-description'))).not.toBeNull();
    // Kein zweiter Umschalter/Button, der einen separaten Bearbeiten-Modus öffnet.
    expect(fixture.debugElement.query(By.css('button[data-testid="edit-toggle"]'))).toBeNull();
    // Kein zweites Formular mit erneuten Name-/Typ-/Organisation-Feldern im Stammdaten-Panel.
    expect(fixture.debugElement.query(By.css('.panel input[formControlName="name"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.panel select[formControlName="type"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.panel input[formControlName="organization"]'))).toBeNull();
  });

  // Akzeptanzkriterium 3: Name und Typ bleiben im Kopfbereich editierbar (dort integriert) — nicht
  // zusätzlich im Stammdaten-Panel dupliziert.
  it('lässt Name und Typ ausschließlich im Kopfbereich editierbar, nicht dupliziert im Stammdaten-Panel', () => {
    configure('PL');
    const fixture = createComponent();

    const nameInput = fixture.debugElement.query(By.css('.name-row input.page-title-input'));
    const typeSelect = fixture.debugElement.query(By.css('.name-row select[data-testid="type-badge"]'));

    expect(nameInput).not.toBeNull();
    expect((nameInput.nativeElement as HTMLInputElement).value).toBe('Frank Vogel');
    expect(typeSelect).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.panel input[formControlName="name"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.panel select[formControlName="type"]'))).toBeNull();
  });

  // Akzeptanzkriterium 4: „Speichern“ wird nur bei tatsächlicher Änderung an mindestens einem Feld
  // aktiv (Doppel-Submit-Schutz gemäß US-043); Validierungsregeln aus US-022 bleiben unverändert.
  it('aktiviert „Speichern“ erst bei tatsächlicher Änderung und behält die Validierungsregeln aus US-022 bei', () => {
    configure('PL');
    const fixture = createComponent();

    const saveButton = fixture.debugElement.query(By.css('app-processing-button button'));
    expect(saveButton.nativeElement.disabled).toBeTrue();

    const phoneInput = fixture.debugElement.query(By.css('#f-phone')).nativeElement as HTMLInputElement;
    phoneInput.value = '+49 221 555 9999';
    phoneInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.nativeElement.disabled).toBeFalse();

    const emailInput = fixture.debugElement.query(By.css('#f-email')).nativeElement as HTMLInputElement;
    emailInput.value = 'ungueltig';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.nativeElement.disabled).toBeTrue();
    expect(fixture.debugElement.query(By.css('#f-email-error'))).not.toBeNull();
  });

  // Akzeptanzkriterium 5: Der Namens-Header zeigt zusätzlich eine separate Typ-Badge-Pille
  // (z. B. „Person“/„Organisation“) neben dem Namen, getrennt von der bisherigen
  // Fließtext-Meta-Zeile.
  it('zeigt eine separate Typ-Badge-Pille neben dem Namen, getrennt von der Fließtext-Meta-Zeile', () => {
    configure('User');
    const fixture = createComponent();

    const badge = fixture.debugElement.query(By.css('[data-testid="type-badge"]'));
    const metaLine = fixture.debugElement.query(By.css('.last-modified'));

    expect(badge).not.toBeNull();
    expect((badge.nativeElement as HTMLElement).textContent).toContain('Person');
    expect(metaLine).not.toBeNull();
    expect((metaLine.nativeElement as HTMLElement).textContent).not.toContain('Person');
  });

  // Akzeptanzkriterium 6: Für Nutzer ohne Bearbeitungsrecht bleiben die Stammdatenfelder als
  // reiner, nicht editierbarer Text sichtbar (kein Rückschritt gegenüber bestehendem Verhalten).
  it('zeigt die Stammdatenfelder für Nutzer ohne Bearbeitungsrecht weiterhin als reinen, nicht editierbaren Text', () => {
    configure('User');
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('#f-position'))).toBeNull();
    expect(fixture.debugElement.query(By.css('form'))).toBeNull();
    const dl = fixture.debugElement.query(By.css('dl.master-data'));
    expect(dl).not.toBeNull();
    expect((dl.nativeElement as HTMLElement).textContent).toContain('Geschäftsführer Vertrieb');
    expect((dl.nativeElement as HTMLElement).textContent).toContain('frank.vogel@rewe-group.example');
  });
});
