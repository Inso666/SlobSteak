import { TestBed } from '@angular/core/testing';
import { AssessmentConflictDialogComponent } from './assessment-conflict-dialog.component';

describe('AssessmentConflictDialogComponent', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [AssessmentConflictDialogComponent] });
    const fixture = TestBed.createComponent(AssessmentConflictDialogComponent);
    fixture.componentInstance.modifiedBy = 'Peter PL';
    fixture.componentInstance.modifiedAt = '2026-08-19T11:00:00Z';
    fixture.detectChanges();
    return fixture;
  }

  it('should emit overwrite when confirmed', () => {
    const fixture = createComponent();
    const emitted = jasmine.createSpy('overwrite');
    fixture.componentInstance.overwrite.subscribe(emitted);

    fixture.componentInstance.overwrite.emit();

    expect(emitted).toHaveBeenCalled();
  });

  it('should emit cancelled when aborted', () => {
    const fixture = createComponent();
    const emitted = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(emitted);

    fixture.componentInstance.cancelled.emit();

    expect(emitted).toHaveBeenCalled();
  });
});
