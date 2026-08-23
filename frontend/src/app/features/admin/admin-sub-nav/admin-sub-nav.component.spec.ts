import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminSubNavComponent } from './admin-sub-nav.component';

describe('AdminSubNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminSubNavComponent],
      providers: [provideRouter([])],
    });
  });

  it('should render one link per configured admin sub-nav entry', () => {
    const fixture = TestBed.createComponent(AdminSubNavComponent);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(fixture.componentInstance['links'].length);
  });

  it('should render a link to /admin/users labelled „Nutzer" and one to /admin/projects labelled „Projekte"', () => {
    const fixture = TestBed.createComponent(AdminSubNavComponent);
    fixture.detectChanges();

    const usersLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement;
    const projectsLink = fixture.nativeElement.querySelector(
      'a[href="/admin/projects"]',
    ) as HTMLAnchorElement;

    expect(usersLink?.textContent?.trim()).toBe('Nutzer');
    expect(projectsLink?.textContent?.trim()).toBe('Projekte');
  });
});
