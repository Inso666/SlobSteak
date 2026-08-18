using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers;

/// <summary>Request-DTO für <see cref="AuthController.Login"/>. Validierung erfolgt an der
/// API-Grenze über Data Annotations (nicht auf der Domain-Klasse <c>User</c>), CLAUDE.md
/// Abschnitt 3.7.</summary>
public sealed class LoginRequest
{
    [Required]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}

/// <summary>Response-DTO für einen erfolgreichen Login. Wire-Contract ist camelCase
/// (<c>token</c>, <c>mustChangePassword</c>) gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record LoginResponse(string Token, bool MustChangePassword);

/// <summary>Request-DTO für <see cref="AuthController.ChangePassword"/> (US-008). Mindestlänge
/// wird bereits an der API-Grenze geprüft (spiegelt <see cref="PasswordTooShortError.MinimumLength"/>),
/// die Domain (<c>User.ChangePassword</c>) bleibt als zweite Verteidigungslinie bestehen.</summary>
public sealed class ChangePasswordRequest
{
    [Required]
    [MinLength(8)]
    public string NewPassword { get; init; } = string.Empty;
}

/// <summary>Controller für den IdentityAccess Bounded Context (US-006/US-008). Bewusst kein
/// <c>POST /api/v1/auth/register</c>-Endpoint — keine Selbstregistrierung vorgesehen.</summary>
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly LoginService _loginService;
    private readonly ChangePasswordService _changePasswordService;

    public AuthController(LoginService loginService, ChangePasswordService changePasswordService)
    {
        _loginService = loginService;
        _changePasswordService = changePasswordService;
    }

    /// <summary>Meldet einen Nutzer per E-Mail/Passwort an und stellt bei Erfolg ein
    /// Session-Token (JWT) aus.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _loginService.LoginAsync(request.Email, request.Password, cancellationToken);
        if (result is null)
        {
            return Unauthorized(new { error = "INVALID_CREDENTIALS" });
        }

        return Ok(new LoginResponse(result.Token, result.MustChangePassword));
    }

    /// <summary>Ändert das Passwort des angemeldeten Nutzers und setzt
    /// <c>must_change_password</c> auf <c>false</c> (US-008). Unter <c>/api/v1/auth</c> — bleibt
    /// dadurch von der <c>PasswordChangeRequiredMiddleware</c> ausgenommen erreichbar, auch
    /// solange der Nutzer sein Passwort noch ändern muss.</summary>
    [HttpPatch("password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var changed = await _changePasswordService.ChangePasswordAsync(userId, request.NewPassword, cancellationToken);
        if (!changed)
        {
            return Unauthorized();
        }

        return Ok();
    }
}
