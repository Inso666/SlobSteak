import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { TokenStorageService } from './token-storage.service';
import { redirectIfAuthenticatedGuard } from './redirect-if-authenticated.guard';

describe('redirectIfAuthenticatedGuard', () => {
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStorageService, useValue: tokenStorageSpy }],
    });
  });

  it('should redirect to /projects when a token is stored', () => {
    tokenStorageSpy.getToken.and.returnValue('some-token');

    const result = TestBed.runInInjectionContext(() => redirectIfAuthenticatedGuard({} as never, {} as never));

    expect((result as UrlTree).toString()).toBe('/projects');
  });

  it('should allow activation when no token is stored', () => {
    tokenStorageSpy.getToken.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() => redirectIfAuthenticatedGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });
});
