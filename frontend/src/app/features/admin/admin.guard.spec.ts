import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { TokenStorageService } from '../auth/token-storage.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getClaims']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
    });
  });

  it('should allow activation when the token claims mark the user as system admin', () => {
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin: true });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('should redirect to /login when the user is not a system admin', () => {
    tokenStorageSpy.getClaims.and.returnValue({ sub: 'user-1', isSystemAdmin: false });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).not.toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should redirect to /login when there are no token claims at all', () => {
    tokenStorageSpy.getClaims.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect((result as UrlTree).toString()).toBe('/login');
  });
});
