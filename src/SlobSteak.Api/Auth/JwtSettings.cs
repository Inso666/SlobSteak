namespace SlobSteak.Api.Auth;

/// <summary>
/// Gemeinsame JWT-Konstanten, die sowohl von der Token-Ausstellung (<see cref="JwtTokenGenerator"/>,
/// US-006) als auch von der Token-Validierung/Autorisierung (<c>Program.cs</c>,
/// <c>SlobSteak.Api.Authorization</c>, US-007) verwendet werden — vermeidet abweichende
/// Issuer/Audience/Claim-Namen zwischen Ausstellung und Prüfung.
/// </summary>
public static class JwtSettings
{
    /// <summary>Name der Umgebungsvariable/Konfiguration für den symmetrischen Signierschlüssel
    /// (mindestens 32 Zeichen für HMAC-SHA256) — bewusst nicht im Code oder in
    /// <c>appsettings.json</c> hinterlegt (CLAUDE.md Abschnitt 3.7).</summary>
    public const string SigningKeyConfigurationKey = "JWT_SIGNING_KEY";

    public const string Issuer = "SlobSteak";

    public const string Audience = "SlobSteak.Api";

    /// <summary>Claim-Name für die Systemrolle im Token (siehe US-006 Akzeptanzkriterium 4:
    /// bewusst keine projektbezogenen Rollen im Token).</summary>
    public const string IsSystemAdminClaimType = "isSystemAdmin";

    public static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(8);
}
