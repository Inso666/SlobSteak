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
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(Guid userId, bool isSystemAdmin)
    {
        var signingKeyValue = _configuration[JwtSettings.SigningKeyConfigurationKey];
        if (string.IsNullOrWhiteSpace(signingKeyValue))
        {
            throw new InvalidOperationException(
                $"'{JwtSettings.SigningKeyConfigurationKey}' ist nicht konfiguriert — Token-Ausstellung nicht möglich.");
        }

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKeyValue)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtSettings.IsSystemAdminClaimType, isSystemAdmin ? "true" : "false"),
        };

        var token = new JwtSecurityToken(
            JwtSettings.Issuer,
            JwtSettings.Audience,
            claims,
            expires: DateTime.UtcNow.Add(JwtSettings.TokenLifetime),
            signingCredentials: signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
