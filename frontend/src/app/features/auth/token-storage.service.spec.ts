import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

/** Baut ein minimales, unsigniertes JWT mit den gewünschten Claims (Base64Url-kodierter Payload,
 * korrekt UTF-8-kodiert) — reicht für `TokenStorageService.getClaims()`, das keine
 * Signaturprüfung vornimmt. */
function utf8Token(claims: Record<string, unknown>): string {
  const json = JSON.stringify(claims);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
}

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => service.clearToken());

  it('stores and retrieves the raw token', () => {
    service.setToken('token-123');
    expect(service.getToken()).toBe('token-123');
  });

  it('clears the token', () => {
    service.setToken('token-123');
    service.clearToken();
    expect(service.getToken()).toBeNull();
  });

  it('returns null claims when no token is stored', () => {
    expect(service.getClaims()).toBeNull();
  });

  it('returns null claims for a malformed token', () => {
    service.setToken('not-a-jwt');
    expect(service.getClaims()).toBeNull();
  });

  it('decodes sub/isSystemAdmin from a valid token', () => {
    service.setToken(utf8Token({ sub: 'user-1', isSystemAdmin: true }));
    expect(service.getClaims()).toEqual({ sub: 'user-1', isSystemAdmin: true, name: undefined });
  });

  // US-074: die Sidebar-Nutzerkarte benötigt einen korrekt dekodierten Anzeigenamen — insbesondere
  // deutsche Namen mit Umlauten müssen UTF-8-sicher decodiert werden (ein naives `atob` allein
  // würde Mehrbyte-Zeichen verstümmeln, siehe `TokenStorageService.getClaims()`-Kommentar).
  it('decodes a multi-byte UTF-8 name claim correctly (US-074 Akzeptanzkriterium „Nutzerkarte")', () => {
    service.setToken(utf8Token({ sub: 'user-1', isSystemAdmin: false, name: 'Björn Müller' }));
    expect(service.getClaims()?.name).toBe('Björn Müller');
  });

  it('treats a missing or blank name claim as undefined', () => {
    service.setToken(utf8Token({ sub: 'user-1', isSystemAdmin: false }));
    expect(service.getClaims()?.name).toBeUndefined();

    service.setToken(utf8Token({ sub: 'user-1', isSystemAdmin: false, name: '   ' }));
    expect(service.getClaims()?.name).toBeUndefined();
  });
});
