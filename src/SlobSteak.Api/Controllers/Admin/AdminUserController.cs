using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers.Admin;

/// <summary>Request-DTO für <see cref="AdminUserController.CreateUser"/>. Validierung erfolgt an
/// der API-Grenze über Data Annotations (CLAUDE.md Abschnitt 3.7).</summary>
public sealed class CreateUserRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;

    [Required]
    public string Email { get; init; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string InitialPassword { get; init; } = string.Empty;
}

/// <summary>Request-DTO für <see cref="AdminUserController.ResetPassword"/> (US-013).</summary>
public sealed class ResetPasswordRequest
{
    [Required]
    [MinLength(8)]
    public string TemporaryPassword { get; init; } = string.Empty;
}

/// <summary>Response-DTO für einen angelegten Nutzer. Enthält bewusst keinen Passwort-Hash
/// (US-012 Akzeptanzkriterium 1). Wire-Contract camelCase gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record UserResponse(Guid Id, string Name, string Email, bool IsSystemAdmin, bool MustChangePassword, DateTimeOffset CreatedAt)
{
    public static UserResponse FromDomain(User user) =>
        new(user.Id, user.Name, user.Email.Value, user.IsSystemAdmin, user.MustChangePassword, user.CreatedAt);
}

/// <summary>Admin-API für Nutzerverwaltung (US-012/US-013). Ausschließlich für Systemadmins
/// erreichbar — keine Selbstregistrierung, kein Self-Service-Passwort-Reset (PRD Abschnitt 1.4).</summary>
[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]
public sealed class AdminUserController : ControllerBase
{
    private readonly CreateUserService _createUserService;
    private readonly ResetPasswordService _resetPasswordService;
    private readonly ListUsersService _listUsersService;

    public AdminUserController(CreateUserService createUserService, ResetPasswordService resetPasswordService, ListUsersService listUsersService)
    {
        _createUserService = createUserService;
        _resetPasswordService = resetPasswordService;
        _listUsersService = listUsersService;
    }

    /// <summary>Listet alle Nutzerkonten (US-016: Nutzerliste im Admin-Bereich).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListUsers(CancellationToken cancellationToken)
    {
        var users = await _listUsersService.ListUsersAsync(cancellationToken);
        return Ok(users.Select(UserResponse.FromDomain));
    }

    /// <summary>Legt ein neues Nutzerkonto an (<c>must_change_password = true</c>).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _createUserService.CreateUserAsync(request.Name, request.Email, request.InitialPassword, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, UserResponse.FromDomain(user));
        }
        catch (EmailAlreadyInUseError)
        {
            return Conflict(new { error = "EMAIL_ALREADY_IN_USE" });
        }
    }

    /// <summary>Setzt ein temporäres Passwort für einen bestehenden Nutzer und erzwingt einen
    /// Passwortwechsel beim nächsten Login (US-013).</summary>
    [HttpPost("{userId:guid}/reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var success = await _resetPasswordService.ResetPasswordAsync(userId, request.TemporaryPassword, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return Ok();
    }
}
