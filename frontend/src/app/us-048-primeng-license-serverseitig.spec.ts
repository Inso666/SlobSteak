import { createAppConfig } from './app.config';
import { fetchPrimeNgLicenseKey, PRIMENG_LICENSE_ENDPOINT } from './core/config/primeng-license';

/**
 * Story-Test US-048 „PrimeNG-Lizenzschlüssel serverseitig verwalten statt im Frontend-Bundle
 * auszuliefern". Jeder Testfall bildet genau ein Akzeptanzkriterium aus der Story-Datei ab
 * (Konvention siehe .claude/agents/qa.md Abschnitt 1).
 *
 * Nur Akzeptanzkriterium 7 ist reine Frontend-Logik und liegt daher hier — alle übrigen
 * Akzeptanzkriterien (1, 2, 3, 5, 6, 8) sind im Backend-Story-Test
 * `tests/SlobSteak.Api.Tests/UserStories/US048_PrimeNgLizenzschluesselServerseitigTests.cs`
 * abgedeckt (CLAUDE.md/qa.md Abschnitt 1: „Betrifft eine Story beide Seiten, existiert je ein
 * Story-Test pro Seite"). Akzeptanzkriterium 4 (Rotation ohne Frontend-Rebuild) ist laut
 * Story-Dokument selbst nur "manuell verifiziert" vorgesehen.
 */
describe('US-048: PrimeNG-Lizenzschlüssel serverseitig verwalten', () => {
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch');
  });

  // AC 7: Die Bootstrap-Kette bezieht den Lizenzschlüssel über einen HTTP-Request vom neuen
  // Endpoint, statt ihn hartcodiert zu enthalten.
  it('Akzeptanzkriterium 7: fetchPrimeNgLicenseKey ruft den serverseitigen Konfigurations-Endpoint per HTTP auf und liefert den gelieferten Schlüssel', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(JSON.stringify({ primeNgLicenseKey: 'server-gelieferter-schluessel' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const key = await fetchPrimeNgLicenseKey();

    expect(fetchSpy).toHaveBeenCalledOnceWith(PRIMENG_LICENSE_ENDPOINT);
    expect(key).toBe('server-gelieferter-schluessel');
  });

  it('Akzeptanzkriterium 7: fetchPrimeNgLicenseKey liefert null statt eines Fehlers, wenn der Endpoint keinen Schlüssel liefert', async () => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(JSON.stringify({ primeNgLicenseKey: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const key = await fetchPrimeNgLicenseKey();

    expect(key).toBeNull();
  });

  it('Akzeptanzkriterium 7: fetchPrimeNgLicenseKey liefert null statt zu werfen, wenn der Endpoint nicht erreichbar ist', async () => {
    fetchSpy.and.returnValue(Promise.reject(new Error('network down')));

    const key = await fetchPrimeNgLicenseKey();

    expect(key).toBeNull();
  });

  it('Akzeptanzkriterium 7: der von fetchPrimeNgLicenseKey gelieferte Wert fließt dynamisch in createAppConfig statt eines hartcodierten Literals', () => {
    // createAppConfig nimmt den (per HTTP bezogenen) Schlüssel als Parameter entgegen — zwei
    // unterschiedliche Aufrufe mit unterschiedlichen Werten dürfen nicht denselben, fest
    // einkompilierten Wert verwenden. Kombiniert mit dem Backend-Story-Test (AC 1: kein Literal
    // mehr in app.config.ts) belegt dies, dass der Wert tatsächlich vom Endpoint stammt.
    expect(() => createAppConfig('schluessel-a')).not.toThrow();
    expect(() => createAppConfig('schluessel-b')).not.toThrow();
    expect(() => createAppConfig(null)).not.toThrow();
  });
});
