import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { TokenStorageService } from './token-storage.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
    });
  });

  it('should allow activation when a token is stored', () => {
    tokenStorageSpy.getToken.and.returnValue('some-token');

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('should redirect to /login when no token is stored', () => {
    tokenStorageSpy.getToken.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect((result as UrlTree).toString()).toBe('/login');
  });
});
