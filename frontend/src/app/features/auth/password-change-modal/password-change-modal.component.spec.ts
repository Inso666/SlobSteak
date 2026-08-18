import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PasswordChangeModalComponent } from './password-change-modal.component';
import { AuthService } from '../auth.service';

describe('PasswordChangeModalComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['changePassword']);

    await TestBed.configureTestingModule({
      imports: [PasswordChangeModalComponent],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should mark the form invalid for a password shorter than 8 characters', () => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;

    component['form'].controls.newPassword.setValue('short');

    expect(component['form'].invalid).toBeTrue();
  });

  it('should not call AuthService.changePassword when the form is invalid', () => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;

    component['form'].controls.newPassword.setValue('short');
    component['onSubmit']();

    expect(authServiceSpy.changePassword).not.toHaveBeenCalled();
  });

  it('should call AuthService.changePassword and emit passwordChanged on valid submit', () => {
    authServiceSpy.changePassword.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.passwordChanged, 'emit');

    component['form'].controls.newPassword.setValue('new-super-secret');
    component['onSubmit']();

    expect(authServiceSpy.changePassword).toHaveBeenCalledWith('new-super-secret');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should show an error message when AuthService.changePassword fails', () => {
    authServiceSpy.changePassword.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;

    component['form'].controls.newPassword.setValue('new-super-secret');
    component['onSubmit']();

    expect(component['errorMessage']).toBeTruthy();
  });
});
