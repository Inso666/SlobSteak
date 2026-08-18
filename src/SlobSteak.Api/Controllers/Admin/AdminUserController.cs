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

/// <summary>Response-DTO für einen angelegten Nutzer. Enthält bewusst keinen Passwort-Hash
/// (US-012 Akzeptanzkriterium 1). Wire-Contract camelCase gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record UserResponse(Guid Id, string Name, string Email, bool IsSystemAdmin, bool MustChangePassword, DateTimeOffset CreatedAt)
{
    public static UserResponse FromDomain(User user) =>
        new(user.Id, user.Name, user.Email.Value, user.IsSystemAdmin, user.MustChangePassword, user.CreatedAt);
}

/// <summary>Admin-API für Nutzerverwaltung (US-012). Ausschließlich für Systemadmins erreichbar —
/// keine Selbstregistrierung (PRD Abschnitt 1.4).</summary>
[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]
public sealed class AdminUserController : ControllerBase
{
    private readonly CreateUserService _createUserService;

    public AdminUserController(CreateUserService createUserService)
    {
        _createUserService = createUserService;
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
}
