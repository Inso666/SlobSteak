using Microsoft.AspNetCore.Mvc;

namespace SlobSteak.Api.Controllers.Config;

/// <summary>Response-DTO für <see cref="FrontendConfigController.GetPrimeNgLicense"/>. Wire-Contract
/// ist camelCase (<c>primeNgLicenseKey</c>) gemäß CLAUDE.md Abschnitt 3.1. Bewusst ein eigenes,
/// minimales DTO statt den rohen Konfigurationswert direkt zurückzugeben, damit der Endpoint bei
/// künftigem Bedarf um weitere, klar benannte Felder erweitert werden kann, ohne den bestehenden
/// Wire-Contract zu brechen.</summary>
public sealed record FrontendConfigResponse(string? PrimeNgLicenseKey);

/// <summary>
/// Bewusst unauthentifizierter Konfigurations-Endpoint (US-048): PrimeNG-Komponenten werden bereits
/// auf dem nicht-authentifizierten Login-Screen (US-009) verwendet, daher muss der Lizenzschlüssel
/// auch vor einer Anmeldung beziehbar sein. Der Endpoint gibt ausschließlich den
/// PrimeNG-Lizenzschlüssel (bzw. dessen Fehlen) preis — keine sonstigen Server-/
/// Umgebungsinformationen (Story-Datei „Wichtige Invarianten"), um die Angriffsfläche nicht
/// unnötig zu vergrößern. Kein Domain-/Application-Service nötig: reiner
/// Infrastructure-Durchreich-Konzern analog zum bisherigen <c>JWT_SIGNING_KEY</c>-Handling
/// (<see cref="SlobSteak.Api.Auth.JwtSettings"/>).
/// </summary>
[ApiController]
[Route("api/v1/config")]
public sealed class FrontendConfigController : ControllerBase
{
    /// <summary>Name der Umgebungsvariable für den PrimeNG-Lizenzschlüssel — bewusst nicht im Code
    /// oder in <c>appsettings.json</c> hinterlegt, ausschließlich per Umgebungsvariable mit leerem
    /// Dev-Default (siehe <c>docker-compose.yml</c>), analog zu <c>JWT_SIGNING_KEY</c>
    /// (CLAUDE.md Abschnitt 3.7).</summary>
    public const string PrimeNgLicenseKeyConfigurationKey = "PRIMENG_LICENSE_KEY";

    private readonly IConfiguration _configuration;

    public FrontendConfigController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>Liefert den aktuell konfigurierten PrimeNG-Lizenzschlüssel. Ist
    /// <see cref="PrimeNgLicenseKeyConfigurationKey"/> serverseitig nicht (oder nur als
    /// Leerstring/Whitespace) gesetzt, liefert der Endpoint einen definierten Leerwert
    /// (<c>primeNgLicenseKey: null</c>) statt eines Fehlers — der in ADR-0009 dokumentierte
    /// unlizenzierte Zustand (Community-Banner sichtbar, volle Funktionalität erhalten) bleibt für
    /// diesen Fall unverändert gültig.</summary>
    [HttpGet("primeng-license")]
    [ProducesResponseType(typeof(FrontendConfigResponse), StatusCodes.Status200OK)]
    public IActionResult GetPrimeNgLicense()
    {
        var configuredKey = _configuration[PrimeNgLicenseKeyConfigurationKey];
        var normalizedKey = string.IsNullOrWhiteSpace(configuredKey) ? null : configuredKey;
        return Ok(new FrontendConfigResponse(normalizedKey));
    }
}
