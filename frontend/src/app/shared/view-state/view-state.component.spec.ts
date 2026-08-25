import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ViewState } from './view-state';
import { ViewStateComponent } from './view-state.component';

/** Host-Wrapper, um den projizierten Inhalt (`<ng-content>`) im Zustand `content` zu prüfen. */
@Component({
  standalone: true,
  imports: [ViewStateComponent],
  template: `
    <app-view-state [state]="state" emptyMessage="Nichts vorhanden." [skeletonCount]="2">
      <p class="projected">Inhalt</p>
    </app-view-state>
  `,
})
class HostComponent {
  state: ViewState = 'loading';
  cdr = inject(ChangeDetectorRef);
}

describe('ViewStateComponent', () => {
  function render(state: ViewState) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.state = state;
    fixture.detectChanges();
    return fixture;
  }

  it('should render exactly skeletonCount skeleton placeholders and no content/empty text in the loading state', () => {
    const fixture = render('loading');
    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.querySelectorAll('p-skeleton').length).toBe(2);
    expect(nativeElement.querySelector('.projected')).toBeNull();
    expect(nativeElement.querySelector('.empty-state')).toBeNull();
  });

  it('should render the empty message and no skeleton/content in the empty state', () => {
    const fixture = render('empty');
    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.querySelector('.empty-state')?.textContent).toContain('Nichts vorhanden.');
    expect(nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(nativeElement.querySelector('.projected')).toBeNull();
  });

  it('should render the projected content and no skeleton/empty text in the content state', () => {
    const fixture = render('content');
    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.querySelector('.projected')?.textContent).toContain('Inhalt');
    expect(nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(nativeElement.querySelector('.empty-state')).toBeNull();
  });

  it('should switch from the skeleton to the projected content when `state` changes after the initial render (zoneless: requires the host to mark itself for check, analog to the `markForCheck()`-Aufrufe in den fünf produktiven Ladefunktionen)', () => {
    const fixture = render('loading');
    fixture.componentInstance.state = 'content';
    fixture.componentInstance.cdr.markForCheck();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.projected')?.textContent).toContain('Inhalt');
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
  });

  it('should render neither skeleton, empty text, nor projected content in the error state (existing US-044 error banner stays the single source of error UI)', () => {
    const fixture = render('error');
    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(nativeElement.querySelector('.empty-state')).toBeNull();
    expect(nativeElement.querySelector('.projected')).toBeNull();
  });
});
