import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { of } from 'rxjs';
import {
  AdminCommunicationType,
  AdminCommunicationTypesService,
} from '../admin/admin-communication-types.service';
import { DistributionListResult, DistributionListRow, DistributionListService } from './distribution-list.service';
import { DistributionListPageComponent } from './distribution-list-page/distribution-list-page.component';

/**
 * Story-Test US-068 „‚Keine E-Mail hinterlegt‘-Hinweis: nur Icon in Attention-Farbe, Text
 * gedämpft“ (QA-Konvention `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die in
 * `docs/usecases/US-068-verteiler-mail-cell-attention-farbe.md` gelisteten, automatisierbaren
 * Akzeptanzkriterien, je Kriterium ein Testfall, in derselben Reihenfolge wie im Story-Dokument.
 * Die übrigen Akzeptanzkriterien (5: manueller Docker-Compose-Smoke-Test mit Screenshot,
 * 6: Story-Test-Konvention — dieser Datei selbst, 7: Regressionsschutz der bestehenden Tests)
 * sind Meta-Kriterien, die nicht durch einen einzelnen Testfall in dieser Datei abgebildet
 * werden.
 */
describe('US-068: „Keine E-Mail hinterlegt“-Hinweis: nur Icon in Attention-Farbe, Text gedämpft', () => {
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
      hasEmail: false,
      email: null,
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

  function createComponent() {
    const fixture = TestBed.createComponent(DistributionListPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function missingCell(fixture: ReturnType<typeof TestBed.createComponent>): HTMLElement {
    return fixture.nativeElement.querySelector('.dl-mail-cell--missing');
  }

  // Akzeptanzkriterium 1: Das Warn-Icon (`pi pi-exclamation-triangle`) in `.dl-mail-cell--missing`
  // bleibt in `var(--app-attention)` dargestellt.
  it('keeps the warning icon rendered in the --app-attention color', () => {
    configure({ rows: [row({})], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const icon = missingCell(fixture).querySelector<HTMLElement>('i.pi-exclamation-triangle')!;
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedColor = rootStyle.getPropertyValue('--app-attention').trim();

    const reference = document.createElement('span');
    reference.style.color = expectedColor;
    document.body.appendChild(reference);
    const expectedComputedColor = getComputedStyle(reference).color;
    document.body.removeChild(reference);

    expect(getComputedStyle(icon).color).toBe(expectedComputedColor);
  });

  // Akzeptanzkriterium 2: Der begleitende Text „keine E-Mail hinterlegt“ wird in gedämpftem
  // Grauton (`var(--app-color-text-faint)`) und kursiv dargestellt, nicht mehr in
  // `var(--app-attention)`.
  it('renders the accompanying text in --app-color-text-faint and italic, no longer in --app-attention', () => {
    configure({ rows: [row({})], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const label = Array.from(missingCell(fixture).querySelectorAll('span')).find(
      (span) => span.textContent?.trim() === 'keine E-Mail hinterlegt',
    )!;
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedColor = rootStyle.getPropertyValue('--app-color-text-faint').trim();

    const reference = document.createElement('span');
    reference.style.color = expectedColor;
    document.body.appendChild(reference);
    const expectedComputedColor = getComputedStyle(reference).color;
    document.body.removeChild(reference);

    expect(getComputedStyle(label).color).toBe(expectedComputedColor);
    expect(getComputedStyle(label).fontStyle).toBe('italic');
  });

  // Akzeptanzkriterium 3: Das `title`-Attribut/Tooltip-Verhalten der Zelle bleibt unverändert
  // erhalten.
  it('keeps the title attribute/tooltip of the cell unchanged', () => {
    configure({ rows: [row({})], totalStakeholderCount: 1 });
    const fixture = createComponent();

    expect(missingCell(fixture).getAttribute('title')).toBe(
      'Für diesen Eintrag ist keine E-Mail-Adresse hinterlegt. Er wird bei „E-Mails kopieren" automatisch ausgeschlossen.',
    );
  });

  // Akzeptanzkriterium 4: Automatisierter Test (Angular TestBed) belegt: berechnete Textfarbe des
  // Labels weicht von der berechneten Icon-Farbe ab.
  it('computes a different text color for the label than for the icon', () => {
    configure({ rows: [row({})], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const cell = missingCell(fixture);
    const icon = cell.querySelector<HTMLElement>('i.pi-exclamation-triangle')!;
    const label = Array.from(cell.querySelectorAll('span')).find(
      (span) => span.textContent?.trim() === 'keine E-Mail hinterlegt',
    )!;

    expect(getComputedStyle(label).color).not.toBe(getComputedStyle(icon).color);
  });
});
