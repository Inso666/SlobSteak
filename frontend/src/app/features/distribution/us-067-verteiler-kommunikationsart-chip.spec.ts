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
 * Story-Test US-067 „Kommunikationsart-Spalte im Verteiler als Chip darstellen“ (QA-Konvention
 * `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die in
 * `docs/usecases/US-067-verteiler-kommunikationsart-chip.md` gelisteten, automatisierbaren
 * Akzeptanzkriterien 1–4, je Kriterium ein Testfall, in derselben Reihenfolge wie im
 * Story-Dokument. Die übrigen Akzeptanzkriterien (5: manueller Docker-Compose-Smoke-Test mit
 * Screenshot, 6: Story-Test-Konvention — dieser Datei selbst, 7: Regressionsschutz der
 * bestehenden Tests) sind Meta-Kriterien, die nicht durch einen einzelnen Testfall in dieser
 * Datei abgebildet werden.
 */
describe('US-067: Kommunikationsart-Spalte im Verteiler als Chip darstellen', () => {
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

  function createComponent() {
    const fixture = TestBed.createComponent(DistributionListPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function chipElement(fixture: ReturnType<typeof TestBed.createComponent>): HTMLElement | null {
    return fixture.nativeElement.querySelector('tbody tr .dl-communication-type-chip');
  }

  // Akzeptanzkriterium 1: Der Wert der Spalte „Kommunikationsart“ wird in einem <span>-Element mit
  // eigenem, abgesetztem Hintergrund und abgerundeten Ecken (Pillenform) dargestellt, statt als
  // reiner Zellentext.
  it('renders the communication-type cell content as a rounded chip span with its own background, not as plain cell text', () => {
    configure({ rows: [row({ communicationTypeName: 'Statusbericht' })], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const chip = chipElement(fixture);
    expect(chip).not.toBeNull();
    expect(chip!.tagName).toBe('SPAN');
    expect(chip!.textContent?.trim()).toBe('Statusbericht');

    const computed = getComputedStyle(chip!);
    // Pillenform: Randradius mindestens halbe Zeilenhöhe (praktisch: der --app-radius-full-Wert,
    // 9999px), niemals 0 (reiner Zellentext hätte keinen Randradius).
    expect(parseFloat(computed.borderRadius)).toBeGreaterThan(50);
    // Eigener, vom Zeilenhintergrund abgesetzter Hintergrund statt transparent/reinem Zellentext.
    expect(computed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(computed.backgroundColor).not.toBe('transparent');
  });

  // Akzeptanzkriterium 2: Das Chip-Styling nutzt ausschließlich bestehende SPEC-00-Tokens (kein
  // neu erfundenes Farb-/Radius-Token) — hier verifiziert, indem der tatsächlich gerenderte
  // Hintergrund/Randradius exakt den bestehenden `--app-color-surface-hover`/`--app-radius-full`
  // Token-Werten aus `styles.css` entspricht, statt eines ad-hoc gewählten Werts.
  it('uses only existing SPEC-00 design tokens for the chip background and border radius (no ad-hoc value)', () => {
    configure({ rows: [row({})], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const chip = chipElement(fixture)!;
    const rootStyle = getComputedStyle(document.documentElement);
    const expectedBackground = rootStyle.getPropertyValue('--app-color-surface-hover').trim();
    const expectedRadius = rootStyle.getPropertyValue('--app-radius-full').trim();

    // Referenzelement mit denselben Token-Werten inline gesetzt, um den vom Browser aufgelösten
    // Vergleichswert (z. B. `rgb(...)`/`px`) unabhängig vom Chip-Element zu ermitteln.
    const reference = document.createElement('span');
    reference.style.background = expectedBackground;
    reference.style.borderRadius = expectedRadius;
    document.body.appendChild(reference);
    const referenceStyle = getComputedStyle(reference);

    expect(getComputedStyle(chip).backgroundColor).toBe(referenceStyle.backgroundColor);
    expect(getComputedStyle(chip).borderRadius).toBe(referenceStyle.borderRadius);
    // Kein Inline-Style/Hex-Wert direkt am Element (SPEC-00: keine Ad-hoc-Farbe in der Komponente).
    expect(chip.getAttribute('style')).toBeFalsy();

    document.body.removeChild(reference);
  });

  // Akzeptanzkriterium 3: Chip bleibt bei langen Kommunikationsart-Namen lesbar (kein
  // abgeschnittener Text ohne Tooltip/vollständigen Inhalt).
  it('keeps a long communication-type name fully readable in the chip without truncating it', () => {
    const longName =
      'Sehr ausführliche Kommunikationsart-Bezeichnung für den regelmäßigen Statusbericht an alle Stakeholder';
    configure({ rows: [row({ communicationTypeName: longName })], totalStakeholderCount: 1 });
    const fixture = createComponent();

    const chip = chipElement(fixture)!;
    expect(chip.textContent?.trim()).toBe(longName);

    const computed = getComputedStyle(chip);
    expect(computed.textOverflow).not.toBe('ellipsis');
    expect(computed.whiteSpace).not.toBe('nowrap');
  });

  // Akzeptanzkriterium 4: Automatisierter Test (Angular TestBed) belegt: Zelle enthält ein
  // Chip-Element mit dem korrekten Namen der Kommunikationsart als Inhalt.
  it('renders a chip element with the exact communication-type name for each row, even with several rows', () => {
    configure({
      rows: [
        row({ stakeholderId: 'sh-1', communicationTypeName: 'Newsletter' }),
        row({ stakeholderId: 'sh-2', name: 'Erika Beispiel', communicationTypeName: 'Statusbericht' }),
      ],
      totalStakeholderCount: 2,
    });
    const fixture = createComponent();

    const chips = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('tbody tr .dl-communication-type-chip'),
    );
    expect(chips.length).toBe(2);
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['Newsletter', 'Statusbericht']);
  });
});
