import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Stakeholder, StakeholdersService } from '../stakeholders.service';
import { EditStakeholderFormComponent } from './edit-stakeholder-form.component';

describe('EditStakeholderFormComponent', () => {
  let stakeholdersServiceSpy: jasmine.SpyObj<StakeholdersService>;

  const stakeholder: Stakeholder = {
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
    updatedByName: 'Anna Admin',
    updatedAt: '2026-08-19T10:00:00Z',
    similarStakeholderWarning: null,
    deletedAt: null,
    deletedByName: null,
  };

  beforeEach(async () => {
    stakeholdersServiceSpy = jasmine.createSpyObj('StakeholdersService', ['createStakeholder', 'updateStakeholder']);

    await TestBed.configureTestingModule({
      imports: [EditStakeholderFormComponent],
      providers: [{ provide: StakeholdersService, useValue: stakeholdersServiceSpy }],
    }).compileComponents();
  });

  function createComponent(canEdit = true): ReturnType<typeof TestBed.createComponent<EditStakeholderFormComponent>> {
    const fixture = TestBed.createComponent(EditStakeholderFormComponent);
    fixture.componentRef.setInput('stakeholder', stakeholder);
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
    return fixture;
  }

  it('should pre-fill the internal form (incl. name/type/organization for the header) from the given stakeholder', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance['form'].getRawValue()).toEqual(
      jasmine.objectContaining({ name: 'Max Mustermann', type: 'Person', organization: 'ACME GmbH', position: 'CTO' }),
    );
  });

  // US-071 Akzeptanzkriterium 3/5: Name/Typ/Organisation werden über public Getter für die
  // `[formControl]`-Bindung im Namens-Header von `StakeholderDetailComponent` bereitgestellt.
  it('should expose the name/type/organization controls for the header binding', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.nameControl).toBe(component['form'].controls.name);
    expect(component.typeControl).toBe(component['form'].controls.type);
    expect(component.organizationControl).toBe(component['form'].controls.organization);
    expect(component.nameControl.value).toBe('Max Mustermann');
  });

  // US-071 Akzeptanzkriterium 2: für canEdit=true sind die Stammdatenfelder direkt als
  // Eingabefelder gerendert — kein Lese-/Bearbeiten-Modus-Wechsel.
  it('should render the Stammdaten fields as inputs when canEdit is true', () => {
    const fixture = createComponent(true);

    expect(fixture.debugElement.query(By.css('#f-position'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-email'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-phone'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-location'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('#f-description'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('dl.master-data'))).toBeNull();
  });

  // US-071 Akzeptanzkriterium 6: für canEdit=false bleiben die Stammdatenfelder reiner,
  // nicht editierbarer Text (kein Rückschritt gegenüber dem bisherigen Verhalten).
  it('should render the Stammdaten fields as read-only text when canEdit is false', () => {
    const fixture = createComponent(false);
    const text: string = fixture.nativeElement.textContent;

    expect(fixture.debugElement.query(By.css('form'))).toBeNull();
    expect(fixture.debugElement.query(By.css('#f-position'))).toBeNull();
    expect(text).toContain('CTO');
    expect(text).toContain('max@example.com');
  });

  // Unverändert aus US-022 übernommene Fachregel (kein neues Akzeptanzkriterium dieser Story):
  // Position/Funktion ergibt für Typ „Organisation“ keinen Sinn. Prüfung bewusst nur auf dem
  // Komponenten-Getter, nicht auf dem DOM — ein reiner TypeScript-Methodenaufruf von außen löst in
  // diesem zoneless Frontend selbst mit anschließendem `fixture.detectChanges()` kein DOM-Update
  // aus (siehe `us-061-map-zoom-skalierung.spec.ts`, ausführlich dokumentiertes, projektweites
  // Muster); ein DOM-Nachweis für den echten Interaktionspfad (Typ-Auswahl im Namens-Header)
  // erfolgt stattdessen per echtem `dispatchEvent` im Story-Test
  // `us-071-stakeholder-detail-zwei-spalten-layout.spec.ts`.
  it('should hide the position field for type Organization while editable', () => {
    const fixture = createComponent(true);
    const component = fixture.componentInstance;

    expect(component['isOrganizationType']).toBeFalse();
    component['form'].controls.type.setValue('Organization');

    expect(component['isOrganizationType']).toBeTrue();
  });

  // US-071 Akzeptanzkriterium 4: „Speichern“ ist erst bei tatsächlicher Änderung aktiv. Echte
  // Nutzer-Eingaben markieren ein `FormControl` automatisch als `dirty` (Reactive-Forms-Standard);
  // ein reiner `.setValue()`-Aufruf von außen (wie hier) tut das nicht — deshalb zusätzlich
  // `markAsDirty()`, um den echten Interaktionspfad nachzubilden (der Story-Test deckt denselben
  // Fall zusätzlich per echtem `dispatchEvent` End-to-End ab).
  it('should keep the form pristine (and thus Speichern inactive) until a value actually changes', () => {
    const fixture = createComponent(true);
    const component = fixture.componentInstance;

    expect(component['form'].pristine).toBeTrue();
    component['form'].controls.phone.setValue('+49 30 123');
    component['form'].controls.phone.markAsDirty();
    expect(component['form'].pristine).toBeFalse();
  });

  it('should call updateStakeholder with the current form values on submit', () => {
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(of({ ...stakeholder, name: 'Neuer Name' }));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['form'].controls.name.setValue('Neuer Name');
    component['form'].controls.name.markAsDirty();
    component['onSubmit']();

    expect(stakeholdersServiceSpy.updateStakeholder).toHaveBeenCalledWith(
      'stakeholder-1',
      jasmine.objectContaining({ name: 'Neuer Name' }),
    );
  });

  // US-043-Muster: kein zweiter Request, solange kein Feld tatsächlich geändert wurde (pristine).
  it('should not call updateStakeholder on submit while the form is pristine', () => {
    const fixture = createComponent();
    fixture.componentInstance['onSubmit']();

    expect(stakeholdersServiceSpy.updateStakeholder).not.toHaveBeenCalled();
  });

  it('should emit updated on success', () => {
    const updatedStakeholder = { ...stakeholder, name: 'Neuer Name' };
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(of(updatedStakeholder));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.updated, 'emit');

    component['form'].controls.name.setValue('Neuer Name');
    component['form'].controls.name.markAsDirty();
    component['onSubmit']();

    expect(emitSpy).toHaveBeenCalledWith(updatedStakeholder);
  });

  // US-071 (PO-Entscheidung Abschnitt 2): „Abbrechen“ setzt das Formular auf den zuletzt
  // gespeicherten Stand zurück (kein separater Modus mehr, den man verlassen könnte).
  it('should reset the form to the last saved stakeholder on cancel', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['form'].controls.name.setValue('Geänderter Name');
    component['onCancel']();

    expect(component['form'].controls.name.value).toBe('Max Mustermann');
    expect(component['form'].pristine).toBeTrue();
  });

  it('should show an error when the stakeholder was already deleted (404)', () => {
    stakeholdersServiceSpy.updateStakeholder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['form'].controls.name.setValue('Neuer Name');
    component['form'].controls.name.markAsDirty();
    component['onSubmit']();

    expect(component['errorMessage']).toContain('gelöscht');
  });
});
