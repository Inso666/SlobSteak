import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { of } from 'rxjs';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from '../admin/admin-communication-types.service';
import {
  DistributionListResult,
  DistributionListRow,
  DistributionListService,
} from './distribution-list.service';
import { DistributionListPageComponent } from './distribution-list-page/distribution-list-page.component';

/**
 * Story-Test US-066 „Verteiler-Fußzeile zeigt unfilterte Gesamtzahl der Projekt-Stakeholder“
 * (QA-Konvention `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die in
 * `docs/usecases/US-066-verteiler-fusszeile-gesamtzahl.md` gelisteten Akzeptanzkriterien 1–5, je
 * Kriterium ein Testfall, in derselben Reihenfolge wie im Story-Dokument. Die übrigen
 * Akzeptanzkriterien der Story (6: Testnachweis TestBed + `HttpTestingController`, 7:
 * Story-Test-Konvention, 8: Regressionsschutz) sind Meta-Kriterien über die Testsuite als Ganzes —
 * Kriterium 6 ist zusätzlich durch `distribution-list.service.spec.ts`
 * (`derives totalStakeholderCount from the already-loaded, unfiltered stakeholder list without an
 * additional request`, dort mit `HttpTestingController`) abgedeckt, hier wird
 * `DistributionListService` — wie in `distribution-list-page.component.spec.ts`/
 * `us-042-verteilerlisten-ui.spec.ts` — als Spy verwendet, da die Join-/HTTP-Logik selbst nicht
 * Gegenstand dieser Komponentenebene ist.
 */
describe('US-066: Verteiler-Fußzeile zeigt unfilterte Gesamtzahl der Projekt-Stakeholder', () => {
  let distributionListServiceSpy: jasmine.SpyObj<DistributionListService>;
  let communicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

  const catalog: AdminCommunicationType[] = [
    { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: '2026-01-01' },
  ];

  function row(overrides: Partial<DistributionListRow>): DistributionListRow {
    return {
      stakeholderId: 'sh-1',
      name: 'Max Mustermann',
      organization: 'ACME GmbH',
      hasEmail: true,
      email: 'max@example.com',
      communicationTypeId: 'type-1',
      communicationTypeName: 'Newsletter',
      frequency: 'Weekly',
      channel: 'Email',
      ...overrides,
    };
  }

  function configure(result: DistributionListResult): void {
    TestBed.resetTestingModule();
    distributionListServiceSpy = jasmine.createSpyObj('DistributionListService', [
      'getDistributionList',
    ]);
    distributionListServiceSpy.getDistributionList.and.returnValue(of(result));

    communicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', [
      'listActiveCommunicationTypes',
    ]);
    communicationTypesServiceSpy.listActiveCommunicationTypes.and.returnValue(of(catalog));

    TestBed.configureTestingModule({
      imports: [DistributionListPageComponent],
      providers: [
        provideRouter([]),
        { provide: DistributionListService, useValue: distributionListServiceSpy },
        { provide: AdminCommunicationTypesService, useValue: communicationTypesServiceSpy },
        { provide: Clipboard, useValue: jasmine.createSpyObj('Clipboard', ['copy']) },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'project-1' }) } } },
        },
      ],
    });
  }

  function footerText(fixture: ReturnType<typeof TestBed.createComponent>): string | null {
    return fixture.nativeElement.querySelector('.dl-foot-info')?.textContent ?? null;
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DistributionListPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  // Akzeptanzkriterium 1: Fußzeile zeigt die Anzahl unterschiedlicher Stakeholder im
  // Filterergebnis (Deduplizierung über stakeholderId, nicht Zeilenanzahl) im Format „N von M
  // Stakeholdern entsprechen dem Filter“.
  it('shows the number of distinct stakeholders in the filter result, deduplicated by stakeholderId, not the row count', () => {
    // sh-1 kommt zweimal vor (zwei Kommunikationszuordnungen), sh-2 einmal → 3 Zeilen, aber nur 2
    // unterschiedliche Stakeholder.
    configure({
      rows: [
        row({ stakeholderId: 'sh-1', communicationTypeId: 'type-1' }),
        row({ stakeholderId: 'sh-1', communicationTypeId: 'type-2' }),
        row({ stakeholderId: 'sh-2', name: 'Erika Beispiel' }),
      ],
      totalStakeholderCount: 5,
    });
    const fixture = createComponent();

    expect(footerText(fixture)).toContain('2 von 5 Stakeholdern entsprechen dem Filter');
  });

  // Akzeptanzkriterium 2: M ist die unfilterte Gesamtzahl aller aktiven Stakeholder des Projekts
  // (aus der bereits geladenen Stakeholderliste), unabhängig von der Größe des Filterergebnisses.
  it('shows the unfiltered total stakeholder count as M, independent of the filtered row count', () => {
    configure({
      rows: [row({ stakeholderId: 'sh-1' })],
      totalStakeholderCount: 32,
    });
    const fixture = createComponent();

    expect(footerText(fixture)).toContain('1 von 32 Stakeholdern entsprechen dem Filter');
  });

  // Akzeptanzkriterium 3: der bestehende Zusatz „… mit E-Mail-Adresse (K ausgeschlossen)“ bleibt
  // inhaltlich erhalten, bezogen auf die gefilterten Zeilen (unverändertes Verhalten aus US-042).
  it('keeps the "… mit E-Mail-Adresse (K ausgeschlossen)" addendum based on the filtered rows', () => {
    configure({
      rows: [
        row({ stakeholderId: 'sh-1', hasEmail: true }),
        row({ stakeholderId: 'sh-2', hasEmail: false, email: null }),
      ],
      totalStakeholderCount: 2,
    });
    const fixture = createComponent();

    expect(footerText(fixture)).toContain('1 mit E-Mail-Adresse');
    expect(footerText(fixture)).toContain('(1 ausgeschlossen)');
  });

  // Akzeptanzkriterium 4: ohne aktiven Filter gilt N = M (Fußzeile zeigt „M von M Stakeholdern
  // entsprechen dem Filter“).
  it('shows "M von M Stakeholdern entsprechen dem Filter" when no filter is active', () => {
    configure({
      rows: [
        row({ stakeholderId: 'sh-1' }),
        row({ stakeholderId: 'sh-2', name: 'Erika Beispiel' }),
        row({ stakeholderId: 'sh-3', name: 'Otto Ohne' }),
      ],
      totalStakeholderCount: 3,
    });
    const fixture = createComponent();

    expect(fixture.componentInstance['hasActiveFilters']).toBeFalse();
    expect(footerText(fixture)).toContain('3 von 3 Stakeholdern entsprechen dem Filter');
  });

  // Akzeptanzkriterium 5: Leerzustand (kein Treffer) bleibt unverändert; die Fußzeile wird in
  // diesem Zustand nicht angezeigt.
  it('does not show the footer when no rows match the filter', () => {
    configure({ rows: [], totalStakeholderCount: 10 });
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.dl-empty-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.dl-foot-row')).toBeNull();
  });
});
