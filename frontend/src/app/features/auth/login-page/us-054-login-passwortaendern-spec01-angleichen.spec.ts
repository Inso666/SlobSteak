import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../auth.service';
import { PasswordChangeModalComponent } from '../password-change-modal/password-change-modal.component';
import { By } from '@angular/platform-browser';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';

/**
 * Story-Test US-054 (QA-Konvention, `.claude/agents/qa.md` Abschnitt 1): prüft ausschließlich die
 * in `docs/usecases/US-054-login-passwortaendern-spec01-angleichen.md` gelisteten
 * Akzeptanzkriterien, in derselben Reihenfolge wie im Story-Dokument. Deckt beide betroffenen
 * Komponenten (Login-Seite + Passwort-Änderungs-Dialog) in einer Datei ab, da beide Teile
 * desselben Screens (S1) sind (qa.md Abschnitt 1 erlaubt mehrere Testdateien je Story — hier
 * bewusst eine gemeinsame, weil kein Akzeptanzkriterium eine Komponente isoliert ohne Bezug zur
 * anderen betrifft). Akzeptanzkriterium 9 (bestehende US-008/US-009-Tests bleiben grün) und
 * Akzeptanzkriterium 10 (`ng test`/`ng lint` grün) sind keine eigenen Testfälle, sondern werden
 * durch den grünen Gesamtlauf selbst nachgewiesen (CLAUDE.md Abschnitt 2/3, qa.md Abschnitt 2).
 */
describe('US-054: Login- und Passwort-Änderungs-Masken gemäß SPEC-01 angleichen', () => {
  describe('Login-Seite', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
      authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

      await TestBed.configureTestingModule({
        imports: [LoginPageComponent],
        providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
      }).compileComponents();
    });

    it('Akzeptanzkriterium 1: zeigt den Markenblock (Icon + „SlobSteak" + Tagline) oberhalb der Login-Karte', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      const brandMark = fixture.debugElement.query(By.directive(BrandMarkComponent));
      expect(brandMark).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('SlobSteak');
      expect(fixture.nativeElement.textContent).toContain('Stakeholder-Management für Projektteams');

      // Markenblock steht strukturell VOR der p-card (Login-Karte) im DOM.
      const brandBlock: HTMLElement = fixture.nativeElement.querySelector('.brand-block');
      const card: HTMLElement = fixture.nativeElement.querySelector('p-card');
      expect(brandBlock).not.toBeNull();
      expect(card).not.toBeNull();
      expect(brandBlock.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Akzeptanzkriterium 2: zeigt die Footnote „Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein."', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Kein eigenes Konto? Ein Administrator richtet deinen Zugang ein.');
    });

    it('Akzeptanzkriterium 3: zeigt einen Bootstrapping-Skeleton-Zustand, solange die Seite noch initialisiert', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);

      // Vor dem ersten detectChanges() (das ngOnInit auslöst) ist der deklarierte Ausgangswert
      // der Komponente `bootstrapping = true` — der technische Anknüpfungspunkt für den
      // Skeleton-Zustand existiert unabhängig davon, wie schnell er in dieser Umgebung wieder
      // verlassen wird (siehe Komponenten-Kommentar zur bewussten Synchronität).
      expect(fixture.componentInstance['bootstrapping']).toBeTrue();

      // Das Skeleton-Template selbst wird korrekt gerendert, wenn `bootstrapping` aktiv ist
      // (unabhängig vom genauen Zeitpunkt, zu dem das in der realen Anwendung der Fall ist).
      // Zoneless: eine reine Feldzuweisung von außerhalb markiert die Komponente nicht
      // automatisch für die nächste Change-Detection-Runde (dasselbe Muster wie in US-050/US-057/
      // US-051/US-052 dokumentiert) — hier bewusst per `markForCheck()` explizit nachgeholt, da es
      // sich um eine gezielte Testmanipulation handelt, keinen echten Produktionscode-Pfad.
      const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
      fixture.detectChanges(); // ngOnInit läuft, bootstrapping wird synchron false
      fixture.componentInstance['bootstrapping'] = true;
      changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.bootstrap-skeleton')).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThanOrEqual(4);
      expect(fixture.nativeElement.querySelector('#login-title')).toBeNull();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();

      fixture.componentInstance['bootstrapping'] = false;
      changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.bootstrap-skeleton')).toBeNull();
      expect(fixture.nativeElement.querySelector('#login-title')).not.toBeNull();
    });

    it('Akzeptanzkriterium 7 (Login-Anteil): keine förmliche Anrede mehr auf der Login-Seite', () => {
      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Sie');
      expect(fixture.nativeElement.textContent).not.toContain('Ihr');
    });
  });

  describe('Passwort-Änderungs-Dialog', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
      authServiceSpy = jasmine.createSpyObj('AuthService', ['changePassword']);

      await TestBed.configureTestingModule({
        imports: [PasswordChangeModalComponent],
        providers: [{ provide: AuthService, useValue: authServiceSpy }],
      }).compileComponents();
    });

    it('Akzeptanzkriterium 4: zeigt den Icon-Badge (Schloss-Icon auf amberfarbenem Kreis)', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();

      const badge: HTMLElement = fixture.nativeElement.querySelector('.icon-badge');
      expect(badge).not.toBeNull();
      expect(badge.querySelector('.pi-lock')).not.toBeNull();
    });

    it('Akzeptanzkriterium 5: verlangt "Neues Passwort" UND "Passwort bestätigen"; ein Submit bei ungleichen Werten ist nicht möglich, mit einer verständlichen Fehlermeldung am confirmPassword-Feld', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      const component = fixture.componentInstance;

      component['form'].controls.newPassword.setValue('new-super-secret');
      component['form'].controls.confirmPassword.setValue('different-value');
      component['form'].controls.confirmPassword.markAsTouched();
      fixture.detectChanges();

      expect(component['form'].invalid).toBeTrue();
      component['onSubmit']();
      expect(authServiceSpy.changePassword).not.toHaveBeenCalled();

      const errorEl: HTMLElement = fixture.nativeElement.querySelector('#confirm-password-error');
      expect(errorEl).not.toBeNull();
      expect(errorEl.textContent).toContain('Die Passwörter stimmen nicht überein.');
      expect(fixture.nativeElement.querySelector('[formcontrolname="confirmPassword"]')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('Akzeptanzkriterium 6: Mindestlänge (8 Zeichen) und zugehöriger Fehlertext sind konsistent — bewusste, dokumentierte Abweichung von SPEC-01s 10 Zeichen, da 8 die tatsächlich serverseitig durchgesetzte PasswordTooShortError-Regel ist', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      const component = fixture.componentInstance;

      component['form'].controls.newPassword.setValue('short7c');
      component['form'].controls.newPassword.markAsTouched();
      fixture.detectChanges();
      expect(component['form'].controls.newPassword.invalid).toBeTrue();
      expect(fixture.nativeElement.querySelector('#new-password-error')?.textContent).toContain('mindestens 8 Zeichen');

      component['form'].controls.newPassword.setValue('exactly8');
      fixture.detectChanges();
      expect(component['form'].controls.newPassword.errors?.['minlength']).toBeUndefined();
    });

    it('Akzeptanzkriterium 7 (Dialog-Anteil): durchgängig informelle Anrede ("du"), kein "Sie"', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Dies ist dein erster Login');
      expect(fixture.nativeElement.textContent).toContain('bevor du fortfährst');
      expect(fixture.nativeElement.textContent).toContain('Du kannst die Anwendung erst nach dieser Änderung nutzen');
      expect(fixture.nativeElement.textContent).not.toContain('Sie');
      expect(fixture.nativeElement.textContent).not.toContain('Ihr');
    });

    it('Akzeptanzkriterium 8: alle Formularfelder haben ein verknüpftes Label und zeigen Fehler als Text (nicht nur Farbe)', () => {
      const fixture = TestBed.createComponent(PasswordChangeModalComponent);
      const component = fixture.componentInstance;

      component['form'].markAllAsTouched();
      fixture.detectChanges();

      const newPasswordLabel: HTMLLabelElement = fixture.nativeElement.querySelector('label[for="new-password"]');
      const confirmPasswordLabel: HTMLLabelElement = fixture.nativeElement.querySelector('label[for="confirm-password"]');
      expect(newPasswordLabel).not.toBeNull();
      expect(confirmPasswordLabel).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#new-password-error').textContent.trim().length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('#confirm-password-error').textContent.trim().length).toBeGreaterThan(0);
    });
  });
});
