import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { ProjectOverviewItem } from '../../../features/projects/projects.service';
import { CurrentProjectContextService } from '../../services/current-project-context.service';
import { AppNavigationComponent } from './app-navigation.component';

@Component({ selector: 'app-us082-dummy', standalone: true, template: 'dummy' })
class DummyRouteComponent {}

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload) —
 * analog zum bereits etablierten Muster in `us-046-admin-navigation.spec.ts`/
 * `us-074-projektuebersicht-sidebar-toolbar-cards.spec.ts`. Reicht für
 * `TokenStorageService.getClaims()`, das keine Signaturprüfung vornimmt. */
function fakeToken(claims: { isSystemAdmin: boolean; name?: string }): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', ...claims }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

function projectWithRole(role: string): ProjectOverviewItem {
  return { id: 'project-1', name: 'ERP-Einführung Rewe', role, stakeholderCount: 4 };
}

/**
 * Story-Test US-082 „Sidebar: Wording „Admin-Bereich", zweibuchstabige Avatar-Initialen und
 * Projektrolle in der Nutzerkarte" (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft
 * ausschließlich die in `docs/usecases/US-082-sidebar-wording-avatar-projektrolle.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument. Rein prozessuale/manuelle
 * Kriterien (automatisierter Test/Story-Test selbst, manueller Smoke-Test, „bestehende Tests bleiben
 * grün") sind hier bewusst nicht als eigene Testfälle abgebildet.
 */
describe('US-082: Sidebar — Wording „Admin-Bereich", zweibuchstabige Avatar-Initialen und Projektrolle in der Nutzerkarte', () => {
  let tokenStorage: TokenStorageService;
  let router: Router;

  function configureSidebar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideRouter([
          { path: 'login', component: DummyRouteComponent },
          { path: 'projects', component: DummyRouteComponent },
          { path: 'projects/:id/stakeholders', component: DummyRouteComponent },
        ]),
        // US-055: erzwingt die Desktop-Sidebar statt des mobilen Drawers, siehe Begründung in
        // `app-navigation.component.spec.ts`.
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      ],
    });
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
  }

  afterEach(() => tokenStorage.clearToken());

  it('Akzeptanzkriterium 1: der Navigationspunkt heißt „Admin-Bereich"', () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true, name: 'Petra Ziegler' }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const adminLink = fixture.nativeElement.querySelector(
      'a[href="/admin/users"]',
    ) as HTMLAnchorElement | null;
    expect(adminLink?.textContent?.trim()).toBe('Admin-Bereich');
  });

  it('Akzeptanzkriterium 2: der Avatar zeigt zwei Initialen aus Vor- und Nachname', () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false, name: 'Petra Ziegler' }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.app-navigation__avatar');
    expect(avatar?.textContent?.trim()).toBe('PZ');
  });

  it('Akzeptanzkriterium 2: bei einteiligem Namen liefern die ersten beiden Buchstaben die Initialen', () => {
    configureSidebar();
    // Realer Fall aus der Story-Datei (Ist-Zustand): der Seed-Admin trägt den einteiligen Namen
    // „System-Administrator" (kein Leerzeichen).
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true, name: 'System-Administrator' }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.app-navigation__avatar');
    expect(avatar?.textContent?.trim()).toBe('SY');
  });

  it('Akzeptanzkriterium 3: im Projektkontext zeigt die zweite Zeile der Nutzerkarte „<Rolle> in diesem Projekt"', async () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false, name: 'Petra Ziegler' }));
    await router.navigateByUrl('/projects/project-1/stakeholders');
    TestBed.inject(CurrentProjectContextService).setProject(projectWithRole('PL'));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const roleLine = fixture.nativeElement.querySelector('.app-navigation__user-role');
    expect(roleLine?.textContent?.trim()).toBe('PL in diesem Projekt');
  });

  it('Akzeptanzkriterium 3: außerhalb des Projektkontexts zeigt die zweite Zeile „System-Admin" für Systemadmins', async () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true, name: 'Petra Ziegler' }));
    await router.navigateByUrl('/projects');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const roleLine = fixture.nativeElement.querySelector('.app-navigation__user-role');
    expect(roleLine?.textContent?.trim()).toBe('System-Admin');
  });

  it('Akzeptanzkriterium 3: außerhalb des Projektkontexts zeigt die zweite Zeile nichts für einen Nicht-Systemadmin', async () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false, name: 'Petra Ziegler' }));
    await router.navigateByUrl('/projects');
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-navigation__user-role')).toBeNull();
  });

  it('Akzeptanzkriterium 3: die Zeile wechselt beim Verlassen des Projektkontexts ohne Reload zurück auf die instanzweite Rolle', async () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: true, name: 'Petra Ziegler' }));
    await router.navigateByUrl('/projects/project-1/stakeholders');
    TestBed.inject(CurrentProjectContextService).setProject(projectWithRole('PL'));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-navigation__user-role')?.textContent?.trim()).toBe(
      'PL in diesem Projekt',
    );

    await router.navigateByUrl('/projects');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-navigation__user-role')?.textContent?.trim()).toBe(
      'System-Admin',
    );
  });

  it('Akzeptanzkriterium 4: für Rolle „User" wird die Zeile korrekt angezeigt und ohne Rollenfarbe dargestellt', async () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false, name: 'Petra Ziegler' }));
    await router.navigateByUrl('/projects/project-1/stakeholders');
    TestBed.inject(CurrentProjectContextService).setProject(projectWithRole('User'));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const roleLine: HTMLElement = fixture.nativeElement.querySelector('.app-navigation__user-role');
    expect(roleLine.textContent?.trim()).toBe('User in diesem Projekt');
    // SPEC-00 §4: Rolle „User" erhält bewusst keinen (farbcodierten) Rollen-Badge — keine
    // `role-badge`/`role-badge--*`-Modifier-Klasse auf der Zeile.
    expect(roleLine.className).not.toContain('role-badge');
  });

  it('Akzeptanzkriterium 5: die Sidebar-Breite und der Innenabstand entsprechen den Design-Werten (240px/24px 16px)', () => {
    configureSidebar();
    tokenStorage.setToken(fakeToken({ isSystemAdmin: false, name: 'Petra Ziegler' }));
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const aside: HTMLElement = fixture.nativeElement.querySelector('aside.app-navigation');
    const style = getComputedStyle(aside);
    expect(style.width).toBe('240px');
    expect(style.paddingTop).toBe('24px');
    expect(style.paddingBottom).toBe('24px');
    expect(style.paddingLeft).toBe('16px');
    expect(style.paddingRight).toBe('16px');
  });
});
