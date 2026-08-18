using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SlobSteak.Application.Identity;

namespace SlobSteak.Api.Auth;

/// <summary>
/// Implementierung von <see cref="IJwtTokenGenerator"/> (US-006): signiert ein JWT (HMAC-SHA256)
/// mit den Claims <c>sub</c> (Nutzer-Id) und <c>isSystemAdmin</c> — bewusst keine
/// projektbezogenen Rollen (diese werden gemäß US-007 pro Request aus <c>project_memberships</c>
/// nachgeladen, nicht aus dem Token gelesen).
/// </summary>
public sealed class JwtTokenGenerator : IJwtTokenGenerator
{
    /// <summary>Name der Umgebungsvariable/Konfiguration für den symmetrischen Signierschlüssel
    /// (mindestens 32 Zeichen für HMAC-SHA256) — bewusst nicht im Code oder in
    /// <c>appsettings.json</c> hinterlegt (CLAUDE.md Abschnitt 3.7).</summary>
    public const string SigningKeyConfigurationKey = "JWT_SIGNING_KEY";

    private const string Issuer = "SlobSteak";
    private const string Audience = "SlobSteak.Api";
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(8);

    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(Guid userId, bool isSystemAdmin)
    {
        var signingKeyValue = _configuration[SigningKeyConfigurationKey];
        if (string.IsNullOrWhiteSpace(signingKeyValue))
        {
            throw new InvalidOperationException(
                $"'{SigningKeyConfigurationKey}' ist nicht konfiguriert — Token-Ausstellung nicht möglich.");
        }

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKeyValue)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("isSystemAdmin", isSystemAdmin ? "true" : "false"),
        };

        var token = new JwtSecurityToken(
            Issuer,
            Audience,
            claims,
            expires: DateTime.UtcNow.Add(TokenLifetime),
            signingCredentials: signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
