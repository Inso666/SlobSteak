import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { AdminCommunicationType, AdminCommunicationTypesService } from './admin-communication-types.service';
import { CommunicationTypesAdminComponent } from './communication-types-admin/communication-types-admin.component';
import { TokenStorageService } from '../auth/token-storage.service';

/** Schlanker Ersatz für `login` — genügt als `adminGuard`-Umleitungsziel (Muster aus
 * us-056-admin-bereich-spec07-angleichen.spec.ts). */
@Component({ selector: 'app-us038-login-stub', standalone: true, template: 'Login-Stub' })
class LoginStubComponent {}

const ADMIN_ROUTES: Routes = [
  { path: 'login', component: LoginStubComponent },
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'communication-types', pathMatch: 'full' },
      { path: 'communication-types', component: CommunicationTypesAdminComponent },
    ],
  },
];

const EXISTING_TYPES: AdminCommunicationType[] = [
  { id: 'type-1', name: 'Newsletter', isActive: true, createdAt: new Date().toISOString() },
  { id: 'type-2', name: 'Pressemitteilung', isActive: false, createdAt: new Date().toISOString() },
];

/**
 * Story-Test US-038 „Kommunikationsarten-Katalog Admin-UI“ (QA-Konvention, `.claude/agents/qa.md`
 * Abschnitt 1): jeder Testfall bildet genau ein Akzeptanzkriterium aus
 * `docs/usecases/US-038-communication-type-katalog-ui.md` ab, in derselben Reihenfolge wie dort
 * gelistet. Generische, über die Akzeptanzkriterien hinausgehende Komponententests liegen getrennt
 * in `communication-types-admin.component.spec.ts`.
 */
describe('US-038: Kommunikationsarten-Katalog Admin-UI', () => {
  let adminCommunicationTypesServiceSpy: jasmine.SpyObj<AdminCommunicationTypesService>;

  beforeEach(async () => {
    adminCommunicationTypesServiceSpy = jasmine.createSpyObj('AdminCommunicationTypesService', [
      'listCommunicationTypes',
      'createCommunicationType',
      'renameCommunicationType',
      'setActive',
    ]);
    adminCommunicationTypesServiceSpy.listCommunicationTypes.and.returnValue(of(EXISTING_TYPES));

    await TestBed.configureTestingModule({
      imports: [CommunicationTypesAdminComponent],
      providers: [provideRouter([]), { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy }],
    }).compileComponents();
  });

  it('Akzeptanzkriterium 1: der Sub-Bereich zeigt eine Liste aller Einträge mit Status (aktiv/deaktiviert)', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.communication-type-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Newsletter');
    expect(cards[0].textContent).toContain('Aktiv');
    expect(cards[1].textContent).toContain('Pressemitteilung');
    expect(cards[1].textContent).toContain('Deaktiviert');
  });

  it('Akzeptanzkriterium 2: das Anlegen-Formular ruft POST /api/v1/admin/communication-types auf', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(of(EXISTING_TYPES[0]));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openCreateDialog']();
    component['createForm'].setValue({ name: 'Statusbericht' });
    component['onCreateType']();

    expect(adminCommunicationTypesServiceSpy.createCommunicationType).toHaveBeenCalledWith('Statusbericht');
  });

  it('Akzeptanzkriterium 2: ein Duplikat-Name (409) wird inline am Namensfeld angezeigt, statt den Dialog zu schließen', () => {
    adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openCreateDialog']();
    component['createForm'].setValue({ name: 'Newsletter' });
    component['onCreateType']();
    fixture.detectChanges();

    const errorElement = fixture.nativeElement.querySelector('#create-communication-type-error');
    expect(errorElement?.textContent).toContain('Diese Bezeichnung wird bereits verwendet.');
    expect(component['createDialogVisible']()).toBeTrue();
  });

  it('Akzeptanzkriterium 3: die „Umbenennen“-Aktion eines Eintrags löst PATCH mit dem neuen Namen aus', () => {
    adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...EXISTING_TYPES[0], name: 'Rundbrief' }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const renameButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === 'Umbenennen',
    ) as HTMLButtonElement;
    renameButton.click();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['renameForm'].setValue({ name: 'Rundbrief' });
    component['onRenameType']();

    expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
  });

  it('Akzeptanzkriterium 3: die „Aktivieren/Deaktivieren“-Aktion eines Eintrags löst PATCH mit dem umgekehrten Status aus', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...EXISTING_TYPES[0], isActive: false }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const deactivateButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === 'Deaktivieren',
    ) as HTMLButtonElement;
    deactivateButton.click();

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
  });

  it('Akzeptanzkriterium 3 (Gegenprobe): ein bereits deaktivierter Eintrag zeigt eine „Aktivieren“-Aktion, die ihn mit PATCH(isActive: true) reaktiviert', () => {
    adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...EXISTING_TYPES[1], isActive: true }));
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const activateButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === 'Aktivieren',
    ) as HTMLButtonElement;
    activateButton.click();

    expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-2', true);
  });

  describe('Akzeptanzkriterium 4: der Bereich ist ausschließlich für Systemadmins sichtbar/erreichbar', () => {
    let tokenStorage: TokenStorageService;
    let router: Router;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter(ADMIN_ROUTES),
          { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy },
        ],
      });
      tokenStorage = TestBed.inject(TokenStorageService);
      router = TestBed.inject(Router);
    });

    afterEach(() => tokenStorage.clearToken());

    it('ein Systemadmin erreicht /admin/communication-types und sieht dort die Kommunikationsarten-Liste', async () => {
      tokenStorage.setToken(fakeToken({ isSystemAdmin: true }));
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin/communication-types');

      expect(harness.routeNativeElement?.querySelector('app-communication-types-admin')).not.toBeNull();
      expect(harness.routeNativeElement?.textContent).toContain('Newsletter');
    });

    it('ein Nutzer ohne isSystemAdmin wird beim Aufruf von /admin/communication-types durch adminGuard zu /login umgeleitet', async () => {
      tokenStorage.setToken(fakeToken({ isSystemAdmin: false }));
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin/communication-types');

      expect(router.url).toBe('/login');
    });

    it('die Sub-Navigation des Admin-Tab-Host bietet einen sichtbaren Link zu „Kommunikationsarten“', () => {
      const fixture = TestBed.createComponent(AdminPageComponent);
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('a[href="/admin/communication-types"]') as HTMLAnchorElement | null;
      expect(link).not.toBeNull();
      expect(link?.textContent?.trim()).toBe('Kommunikationsarten');
    });
  });
});

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload) —
 * reicht für `TokenStorageService.getClaims()`, das keine Signaturprüfung vornimmt (siehe
 * us-046-admin-navigation.spec.ts). */
function fakeToken(claims: { isSystemAdmin: boolean }): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', ...claims }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
