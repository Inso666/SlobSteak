import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminUser } from '../admin-users.service';
import { UsersAdminComponent } from './users-admin.component';

/**
 * Story-Test US-051 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-051-passwort-reset-abschliessen.md` gelisteten Akzeptanzkriterien, in
 * derselben Reihenfolge wie im Story-Dokument — getrennt von den generischen Komponententests in
 * `users-admin.component.spec.ts`.
 *
 * Root Cause (Akzeptanzkriterium 1): `onResetPassword` in `users-admin.component.ts` rief in
 * seinen `subscribe()`-Callbacks (Erfolg **und** Fehler) `changeDetectorRef.markForCheck()` nicht
 * auf. Da das Frontend ohne `zone.js` läuft (zoneless), markiert eine reine Feldzuweisung/
 * `Set`-Mutation in einem `subscribe()`-Callback die Komponente nicht automatisch für die nächste
 * Change-Detection-Runde — derselbe Fehlermechanismus wie bereits in US-050/US-057 dokumentiert.
 * Der zugrunde liegende HTTP-Request selbst terminiert zuverlässig (siehe
 * `US051_PasswortResetAbschliessenTests` im Backend); der Button blieb rein clientseitig optisch
 * im Verarbeitungs-Zustand hängen, obwohl `resettingUserIds` intern bereits korrekt geleert war.
 *
 * Alle Tests verwenden bewusst `HttpTestingController` statt eines `AdminUsersService`-Spys mit
 * synchronem `of(...)`: nur ein über `flush()` erst nach dem ursprünglichen Aufruf aufgelöster
 * Request reproduziert das eigentliche Bug-Muster (Antwort trifft außerhalb eines von Angular
 * beobachteten Ereignisses ein). Nach `flush()` wird ausschließlich der reguläre
 * `fixture.detectChanges()`-Zyklus ausgelöst — bewusst KEIN zusätzlicher simulierter Klick.
 */
describe('US-051: "Passwort zurücksetzen" in der Nutzerverwaltung schließt zuverlässig ab', () => {
  let http: HttpTestingController;

  const targetUser: AdminUser = {
    id: 'user-1',
    name: 'Max Mustermann',
    email: 'max@example.com',
    isSystemAdmin: false,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };

  function createLoadedFixture(): ComponentFixture<UsersAdminComponent> {
    const fixture = TestBed.createComponent(UsersAdminComponent);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/users').flush([targetUser]);
    fixture.detectChanges();
    return fixture;
  }

  function resetButton(fixture: ComponentFixture<UsersAdminComponent>): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button.app-processing-button');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('Akzeptanzkriterium 2/3 (Erfolgsfall): nach erfolgreicher Response zeigt die UI ohne weitere Nutzerinteraktion die Erfolgsmeldung mit temporärem Passwort und verlässt zuverlässig den Verarbeitungs-Zustand', () => {
    const fixture = createLoadedFixture();
    const component = fixture.componentInstance;

    component['onResetPassword'](targetUser);

    http.expectOne('/api/v1/admin/users/user-1/reset-password').flush(null);
    // Bewusst KEIN simulierter Klick/kein manuelles Auslesen des internen Sets danach — nur der
    // reguläre CD-Zyklus, den Zone.js in Produktion automatisch auslösen würde.
    fixture.detectChanges();

    const button = resetButton(fixture);
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBeFalse();
    expect(button.textContent).toContain('Passwort zurücksetzen');
    expect(fixture.nativeElement.textContent).toContain('Passwort für Max Mustermann wurde zurückgesetzt. Temporäres Passwort:');
  });

  it('Akzeptanzkriterium 3 (Fehlerfall): nach einer fehlgeschlagenen Response zeigt die UI ohne weitere Nutzerinteraktion eine Fehlermeldung und verlässt zuverlässig den Verarbeitungs-Zustand, statt dauerhaft hängen zu bleiben', () => {
    const fixture = createLoadedFixture();
    const component = fixture.componentInstance;

    component['onResetPassword'](targetUser);

    http.expectOne('/api/v1/admin/users/user-1/reset-password').flush(
      { error: 'INTERNAL' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    const button = resetButton(fixture);
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.disabled).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Passwort für Max Mustermann konnte nicht zurückgesetzt werden.');
  });

  it('Akzeptanzkriterium 4: resettingUserIds ist nach Abschluss des Requests sowohl im Erfolgs- als auch im Fehlerfall wieder leer', () => {
    // Erfolgsfall
    let fixture = createLoadedFixture();
    fixture.componentInstance['onResetPassword'](targetUser);
    http.expectOne('/api/v1/admin/users/user-1/reset-password').flush(null);
    fixture.detectChanges();
    expect(fixture.componentInstance['resettingUserIds'].size).toBe(0);

    // Fehlerfall — frische Komponente, gleiche Testumgebung
    fixture = createLoadedFixture();
    fixture.componentInstance['onResetPassword'](targetUser);
    http.expectOne('/api/v1/admin/users/user-1/reset-password').flush(
      { error: 'INTERNAL' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();
    expect(fixture.componentInstance['resettingUserIds'].size).toBe(0);
  });
});
