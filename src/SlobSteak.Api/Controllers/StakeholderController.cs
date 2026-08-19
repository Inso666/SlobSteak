using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Api.Controllers;

/// <summary>Request-DTO für <see cref="StakeholderController.CreateStakeholder"/> (US-021).
/// Validierung erfolgt an der API-Grenze über Data Annotations (CLAUDE.md Abschnitt 3.7) — die
/// Domain (<see cref="Stakeholder.Create"/>) bleibt als zweite Verteidigungslinie bestehen.</summary>
public sealed class CreateStakeholderRequest
{
    // Bewusst kein [Required] hier: [Required] würde einen rein aus Leerzeichen bestehenden
    // Namen bereits vor Erreichen des Controllers per automatischer ASP.NET-Core-Modellvalidierung
    // mit einem generischen ProblemDetails-Body ablehnen — die Story verlangt aber ausdrücklich
    // den Domain-Fehler-Body {"error":"NAME_REQUIRED"} (Akzeptanzkriterium 3), den erst
    // Stakeholder.Create/StakeholderNameRequiredError liefert (zweite Verteidigungslinie).
    public string Name { get; init; } = string.Empty;

    /// <summary><c>Person</c> oder <c>Organization</c>, analog zum bestehenden String-Wire-Contract
    /// für Enums (siehe <c>ProjectResponse.Status</c>, US-014).</summary>
    [Required]
    public string Type { get; init; } = string.Empty;

    public string? Organization { get; init; }

    public string? Position { get; init; }

    public string? Email { get; init; }

    public string? Phone { get; init; }

    public string? LocationDepartment { get; init; }

    public string? Description { get; init; }
}

/// <summary>Verweis auf einen ähnlich benannten, bereits existierenden Stakeholder — rein
/// informativ (US-021 Akzeptanzkriterium 4).</summary>
public sealed record SimilarStakeholderWarningResponse(Guid Id, string Name)
{
    public static SimilarStakeholderWarningResponse FromDomain(SimilarStakeholderWarning warning) =>
        new(warning.Id, warning.Name);
}

/// <summary>Response-DTO für einen angelegten Stakeholder. Wire-Contract camelCase gemäß
/// CLAUDE.md Abschnitt 3.1.</summary>
public sealed record StakeholderResponse(
    Guid Id,
    Guid ProjectId,
    string Type,
    string Name,
    string? Organization,
    string? Position,
    string? Email,
    string? Phone,
    string? LocationDepartment,
    string? Description,
    SimilarStakeholderWarningResponse? SimilarStakeholderWarning)
{
    public static StakeholderResponse FromResult(CreateStakeholderResult result)
    {
        var stakeholder = result.Stakeholder;
        return new StakeholderResponse(
            stakeholder.Id,
            stakeholder.ProjectId,
            stakeholder.Type.ToString(),
            stakeholder.Name,
            stakeholder.Organization,
            stakeholder.Position,
            stakeholder.Email?.Value,
            stakeholder.Phone,
            stakeholder.LocationDepartment,
            stakeholder.Description,
            result.SimilarStakeholderWarning is null ? null : SimilarStakeholderWarningResponse.FromDomain(result.SimilarStakeholderWarning));
    }
}

/// <summary>API für Stakeholder-Stammdaten (US-021: Anlegen). Ausschließlich für Projektmitglieder
/// mit einer der erlaubten Rollen erreichbar (PRD Berechtigungsmatrix, Abschnitt 2.3) —
/// durchgesetzt über <see cref="RequireProjectRoleAttribute"/> (US-007).</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/stakeholders")]
[Authorize]
public sealed class StakeholderController : ControllerBase
{
    private readonly CreateStakeholderService _createStakeholderService;

    public StakeholderController(CreateStakeholderService createStakeholderService)
    {
        _createStakeholderService = createStakeholderService;
    }

    /// <summary>Legt einen neuen Stakeholder im Projekt an. Ein Namensduplikat blockiert das
    /// Anlegen nicht, liefert aber zusätzlich <c>similarStakeholderWarning</c> (Akzeptanzkriterium 4).</summary>
    [HttpPost]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(StakeholderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateStakeholder(Guid projectId, [FromBody] CreateStakeholderRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        if (!Enum.TryParse<StakeholderType>(request.Type, ignoreCase: true, out var type))
        {
            return BadRequest(new { error = "INVALID_TYPE" });
        }

        try
        {
            var result = await _createStakeholderService.CreateStakeholderAsync(
                projectId, type, request.Name, request.Organization, request.Position, request.Email,
                request.Phone, request.LocationDepartment, request.Description, userId, cancellationToken);

            return StatusCode(StatusCodes.Status201Created, StakeholderResponse.FromResult(result));
        }
        catch (StakeholderNameRequiredError)
        {
            return BadRequest(new { error = "NAME_REQUIRED" });
        }
        catch (InvalidEmailFormatError)
        {
            return BadRequest(new { error = "INVALID_EMAIL_FORMAT" });
        }
    }
}
