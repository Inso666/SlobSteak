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
 * us-038-communication-type-katalog-ui.spec.ts). */
@Component({ selector: 'app-us065-login-stub', standalone: true, template: 'Login-Stub' })
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
 * Story-Test US-065 „Kommunikationsarten-Katalog Admin-UI als kompaktes Listen-Panel statt
 * Einzelkarten“ (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): jeder Testfall bildet genau
 * ein Akzeptanzkriterium aus `docs/usecases/US-065-communication-type-katalog-listenpanel.md` ab,
 * in derselben Reihenfolge wie dort gelistet. Generische, über die Akzeptanzkriterien
 * hinausgehende Komponententests liegen getrennt in `communication-types-admin.component.spec.ts`.
 *
 * Nicht als eigener Testfall abgebildet: Akzeptanzkriterium 6 (Existenz automatisierter
 * Angular-Tests — durch dieses Datei plus `communication-types-admin.component.spec.ts` selbst
 * erfüllt), Akzeptanzkriterium 7 (manueller Smoke-Test gegen `docker-compose up`, siehe PR-Text)
 * und Akzeptanzkriterium 9 (bestehende Tests bleiben grün — Regressionsschutz über die gesamte
 * Suite, kein eigener Einzeltest).
 */
describe('US-065: Kommunikationsarten-Katalog Admin-UI als kompaktes Listen-Panel', () => {
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

  it('Akzeptanzkriterium 1: alle Katalog-Einträge liegen als kompakte Zeilen in einem gemeinsamen, umrandeten Panel — keine eigenständige Card je Eintrag', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const panels = fixture.nativeElement.querySelectorAll('.catalog-panel');
    expect(panels.length).toBe(1);

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catalog-row');
    expect(rows.length).toBe(EXISTING_TYPES.length);
    rows.forEach((row) => expect(panels[0].contains(row)).toBeTrue());

    // Das vormalige Kartenlayout (US-038) darf nicht mehr existieren.
    expect(fixture.nativeElement.querySelectorAll('.communication-type-card').length).toBe(0);
  });

  it('Akzeptanzkriterium 2: jede Zeile zeigt Name und Status-Pill über den bestehenden .status-tag/.status-tag--archived-Baustein', () => {
    const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
    fixture.detectChanges();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catalog-row');

    expect(rows[0].textContent).toContain('Newsletter');
    const activeTag = rows[0].querySelector('.status-tag');
    expect(activeTag?.textContent?.trim()).toBe('Aktiv');
    expect(activeTag?.classList.contains('status-tag--archived')).toBeFalse();

    expect(rows[1].textContent).toContain('Pressemitteilung');
    const archivedTag = rows[1].querySelector('.status-tag');
    expect(archivedTag?.textContent?.trim()).toBe('Deaktiviert');
    expect(archivedTag?.classList.contains('status-tag--archived')).toBeTrue();
  });

  describe('Akzeptanzkriterium 3: genau ein Bearbeiten-Icon je Zeile öffnet einen Dialog mit Namensfeld und Aktiv-Toggle', () => {
    it('jede Zeile zeigt genau ein Bearbeiten-Icon, keinen permanent sichtbaren Text-Button mehr', () => {
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catalog-row');
      rows.forEach((row) => {
        expect(row.querySelectorAll('.catalog-row__edit').length).toBe(1);
      });

      // Die vormals permanent sichtbaren Text-Buttons „Umbenennen“/„Aktivieren“/„Deaktivieren“
      // (US-038) existieren nicht mehr.
      const textButtons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((button) => (button as HTMLButtonElement).textContent?.trim());
      expect(textButtons).not.toContain('Umbenennen');
      expect(textButtons).not.toContain('Aktivieren');
      expect(textButtons).not.toContain('Deaktivieren');
    });

    it('das Icon öffnet den Dialog vorbefüllt mit Namensfeld und Aktiv-Toggle des Eintrags', () => {
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      const editButton = fixture.nativeElement.querySelector('[aria-label="Kommunikationsart Pressemitteilung bearbeiten"]') as HTMLButtonElement;
      expect(editButton).not.toBeNull();
      editButton.click();

      expect(component['editDialogVisible']()).toBeTrue();
      expect(component['editForm'].getRawValue()).toEqual({ name: 'Pressemitteilung', active: false });
    });

    it('Speichern übernimmt einen geänderten Namen per renameCommunicationType', () => {
      adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...EXISTING_TYPES[0], name: 'Rundbrief' }));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openEditDialog'](EXISTING_TYPES[0]);
      component['editForm'].setValue({ name: 'Rundbrief', active: true });
      component['onSubmitEdit']();

      expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
      expect(adminCommunicationTypesServiceSpy.setActive).not.toHaveBeenCalled();
    });

    it('Speichern übernimmt einen geänderten Aktiv-Status per setActive', () => {
      adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...EXISTING_TYPES[0], isActive: false }));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openEditDialog'](EXISTING_TYPES[0]);
      component['editForm'].setValue({ name: 'Newsletter', active: false });
      component['onSubmitEdit']();

      expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
      expect(adminCommunicationTypesServiceSpy.renameCommunicationType).not.toHaveBeenCalled();
    });

    it('Speichern übernimmt Name UND Aktiv-Status sequenziell, wenn beide geändert wurden', () => {
      adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(of({ ...EXISTING_TYPES[0], name: 'Rundbrief' }));
      adminCommunicationTypesServiceSpy.setActive.and.returnValue(of({ ...EXISTING_TYPES[0], name: 'Rundbrief', isActive: false }));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openEditDialog'](EXISTING_TYPES[0]);
      component['editForm'].setValue({ name: 'Rundbrief', active: false });
      component['onSubmitEdit']();

      expect(adminCommunicationTypesServiceSpy.renameCommunicationType).toHaveBeenCalledWith('type-1', 'Rundbrief');
      expect(adminCommunicationTypesServiceSpy.setActive).toHaveBeenCalledWith('type-1', false);
    });
  });

  describe('Akzeptanzkriterium 4: eine neue Kommunikationsart wird über eine inline Zeile am Panel-Ende angelegt, kein separater Button/Dialog', () => {
    it('kein separater „Kommunikationsart anlegen“-Button existiert mehr außerhalb des Panels', () => {
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      const toolbarButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (button) => (button as HTMLButtonElement).textContent?.trim() === 'Kommunikationsart anlegen',
      );
      expect(toolbarButton).toBeUndefined();
    });

    it('die inline „Kommunikationsart hinzufügen“-Zeile öffnet ein Eingabefeld mit Bestätigen-Aktion in derselben Zeile, statt einen modalen Dialog zu öffnen', () => {
      adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(of(EXISTING_TYPES[0]));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      const addTrigger = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
        (button as HTMLButtonElement).textContent?.trim().includes('Kommunikationsart hinzufügen'),
      ) as HTMLButtonElement;
      expect(addTrigger).toBeDefined();
      addTrigger.click();
      fixture.detectChanges();

      expect(component['isAddingType']).toBeTrue();
      // Kein `p-dialog` wird für das Anlegen geöffnet — nur der bestehende Bearbeiten-Dialog kann sichtbar sein.
      expect(component['editDialogVisible']()).toBeFalse();

      const inlineInput = fixture.nativeElement.querySelector('#communication-type-name') as HTMLInputElement;
      expect(inlineInput).not.toBeNull();

      component['createForm'].setValue({ name: 'Statusbericht' });
      component['onCreateType']();

      expect(adminCommunicationTypesServiceSpy.createCommunicationType).toHaveBeenCalledWith('Statusbericht');
    });
  });

  describe('Akzeptanzkriterium 5: bestehende fachliche Funktionen bleiben unverändert erhalten', () => {
    it('ein Duplikat-Name (409) beim inline Anlegen wird inline am Namensfeld angezeigt (US-038 Akzeptanzkriterium 2)', () => {
      adminCommunicationTypesServiceSpy.createCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openInlineAdd']();
      component['createForm'].setValue({ name: 'Newsletter' });
      component['onCreateType']();
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('#create-communication-type-error');
      expect(errorElement?.textContent).toContain('Diese Bezeichnung wird bereits verwendet.');
      expect(component['isAddingType']).toBeTrue();
    });

    it('ein Duplikat-Name (409) beim Umbenennen im kombinierten Bearbeiten-Dialog wird inline am Namensfeld angezeigt', () => {
      adminCommunicationTypesServiceSpy.renameCommunicationType.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component['openEditDialog'](EXISTING_TYPES[1]);
      component['editForm'].setValue({ name: 'Newsletter', active: false });
      component['onSubmitEdit']();
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('#edit-communication-type-error');
      expect(errorElement?.textContent).toContain('Diese Bezeichnung wird bereits verwendet.');
      expect(component['editDialogVisible']()).toBeTrue();
    });

    it('deaktivierte Einträge bleiben in der Liste sichtbar (US-038 „Wichtige Invarianten“)', () => {
      const fixture = TestBed.createComponent(CommunicationTypesAdminComponent);
      fixture.detectChanges();

      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catalog-row');
      const inactiveRow = Array.from(rows).find((row) => row.textContent?.includes('Pressemitteilung'));
      expect(inactiveRow).toBeDefined();
      expect(inactiveRow?.textContent).toContain('Deaktiviert');
    });

    describe('der Bereich bleibt ausschließlich für Systemadmins erreichbar (US-038 Akzeptanzkriterium 4)', () => {
      let tokenStorage: TokenStorageService;
      let router: Router;

      beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [provideRouter(ADMIN_ROUTES), { provide: AdminCommunicationTypesService, useValue: adminCommunicationTypesServiceSpy }],
        });
        tokenStorage = TestBed.inject(TokenStorageService);
        router = TestBed.inject(Router);
      });

      afterEach(() => tokenStorage.clearToken());

      it('ein Systemadmin erreicht /admin/communication-types und sieht dort das neue Listen-Panel', async () => {
        tokenStorage.setToken(fakeToken({ isSystemAdmin: true }));
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/admin/communication-types');

        expect(harness.routeNativeElement?.querySelector('.catalog-panel')).not.toBeNull();
        expect(harness.routeNativeElement?.textContent).toContain('Newsletter');
      });

      it('ein Nutzer ohne isSystemAdmin wird beim Aufruf von /admin/communication-types durch adminGuard zu /login umgeleitet', async () => {
        tokenStorage.setToken(fakeToken({ isSystemAdmin: false }));
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/admin/communication-types');

        expect(router.url).toBe('/login');
      });
    });
  });
});

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload) —
 * reicht für `TokenStorageService.getClaims()`, das keine Signaturprüfung vornimmt (siehe
 * us-038-communication-type-katalog-ui.spec.ts). */
function fakeToken(claims: { isSystemAdmin: boolean }): string {
  const payload = btoa(JSON.stringify({ sub: 'user-1', ...claims }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
