using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers.Admin;

/// <summary>Request-DTO für <see cref="AdminProjectMembershipController.AssignMember"/> (US-015).
/// <c>Role</c> ist bewusst ein <c>string</c> (nicht der Enum-Typ direkt), analog zum
/// camelCase-String-Wire-Contract von <c>ProjectResponse.Status</c> (US-014).</summary>
public sealed class AssignMembershipRequest
{
    [Required]
    public Guid UserId { get; init; }

    [Required]
    public string Role { get; init; } = string.Empty;
}

/// <summary>Request-DTO für <see cref="AdminProjectMembershipController.ChangeMemberRole"/>.</summary>
public sealed class ChangeMembershipRoleRequest
{
    [Required]
    public string Role { get; init; } = string.Empty;
}

/// <summary>Admin-API für die Zuweisung von Nutzern zu Projekten mit Rolle (US-015).
/// Ausschließlich für Systemadmins erreichbar (PRD Berechtigungsmatrix, Abschnitt 2.3).</summary>
[ApiController]
[Route("api/v1/admin/projects/{projectId:guid}/memberships")]
[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]
public sealed class AdminProjectMembershipController : ControllerBase
{
    private readonly AssignProjectMembershipService _service;

    public AdminProjectMembershipController(AssignProjectMembershipService service)
    {
        _service = service;
    }

    /// <summary>Weist einen Nutzer dem Projekt mit einer Rolle zu.</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignMember(Guid projectId, [FromBody] AssignMembershipRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ProjectRole>(request.Role, ignoreCase: true, out var role))
        {
            return BadRequest(new { error = "INVALID_ROLE" });
        }

        try
        {
            var project = await _service.AssignMemberAsync(projectId, request.UserId, role, cancellationToken);
            if (project is null)
            {
                return NotFound();
            }

            return StatusCode(StatusCodes.Status201Created);
        }
        catch (MembershipAlreadyExistsError)
        {
            return Conflict(new { error = "MEMBERSHIP_ALREADY_EXISTS" });
        }
    }

    /// <summary>Ändert die Rolle einer bestehenden Zuweisung.</summary>
    [HttpPatch("{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeMemberRole(Guid projectId, Guid userId, [FromBody] ChangeMembershipRoleRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ProjectRole>(request.Role, ignoreCase: true, out var role))
        {
            return BadRequest(new { error = "INVALID_ROLE" });
        }

        try
        {
            var project = await _service.ChangeMemberRoleAsync(projectId, userId, role, cancellationToken);
            if (project is null)
            {
                return NotFound();
            }

            return Ok();
        }
        catch (MembershipNotFoundError)
        {
            return NotFound();
        }
    }

    /// <summary>Entzieht eine bestehende Zuweisung; bereits erfasste Assessments der Rolle bleiben
    /// unverändert (F5.2).</summary>
    [HttpDelete("{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMember(Guid projectId, Guid userId, CancellationToken cancellationToken)
    {
        var success = await _service.RemoveMemberAsync(projectId, userId, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
