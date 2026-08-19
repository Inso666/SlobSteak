using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Api.Controllers;

/// <summary>Request-DTO für <see cref="StakeholderController.CreateStakeholder"/> (US-021) und
/// <see cref="StakeholderController.UpdateStakeholder"/> (US-022) — beide Endpunkte erwarten
/// dieselben Stammdatenfelder. Validierung erfolgt an der API-Grenze über Data Annotations
/// (CLAUDE.md Abschnitt 3.7) — die Domain (<see cref="Stakeholder.Create"/>/
/// <see cref="Stakeholder.UpdateDetails"/>) bleibt als zweite Verteidigungslinie bestehen.</summary>
public sealed class StakeholderDetailsRequest
{
    // Bewusst kein [Required] hier: [Required] würde einen rein aus Leerzeichen bestehenden
    // Namen bereits vor Erreichen des Controllers per automatischer ASP.NET-Core-Modellvalidierung
    // mit einem generischen ProblemDetails-Body ablehnen — die Story verlangt aber ausdrücklich
    // den Domain-Fehler-Body {"error":"NAME_REQUIRED"} (US-021 Akzeptanzkriterium 3), den erst
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

/// <summary>Response-DTO für einen Stakeholder (Anlegen US-021, Bearbeiten US-022). Wire-Contract
/// camelCase gemäß CLAUDE.md Abschnitt 3.1. <c>updatedByName</c>/<c>updatedAt</c> speisen die
/// künftige „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“-Anzeige (US-022 Akzeptanzkriterium 4,
/// Stakeholder-Detailseite folgt erst mit US-026).</summary>
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
    string UpdatedByName,
    DateTimeOffset UpdatedAt,
    SimilarStakeholderWarningResponse? SimilarStakeholderWarning)
{
    public static StakeholderResponse FromCreateResult(CreateStakeholderResult result) =>
        FromDomain(result.Stakeholder, result.CreatedByName, result.SimilarStakeholderWarning);

    public static StakeholderResponse FromUpdateResult(UpdateStakeholderDetailsResult result) =>
        FromDomain(result.Stakeholder, result.UpdatedByName, similarStakeholderWarning: null);

    private static StakeholderResponse FromDomain(Stakeholder stakeholder, string updatedByName, SimilarStakeholderWarning? similarStakeholderWarning) =>
        new(
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
            updatedByName,
            stakeholder.UpdatedAt,
            similarStakeholderWarning is null ? null : SimilarStakeholderWarningResponse.FromDomain(similarStakeholderWarning));
}

/// <summary>API für Stakeholder-Stammdaten (US-021: Anlegen, US-022: Bearbeiten). Ausschließlich
/// für Projektmitglieder mit einer der erlaubten Rollen erreichbar (PRD Berechtigungsmatrix,
/// Abschnitt 2.3) — durchgesetzt über <see cref="RequireProjectRoleAttribute"/> (US-007), für
/// <see cref="UpdateStakeholder"/> aufgelöst über die Stakeholder-Id statt eines
/// <c>projectId</c>-Routensegments (siehe <see cref="StakeholderProjectRoleAuthorizationHandler"/>).</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/stakeholders")]
[Authorize]
public sealed class StakeholderController : ControllerBase
{
    private readonly CreateStakeholderService _createStakeholderService;
    private readonly UpdateStakeholderDetailsService _updateStakeholderDetailsService;

    public StakeholderController(
        CreateStakeholderService createStakeholderService,
        UpdateStakeholderDetailsService updateStakeholderDetailsService)
    {
        _createStakeholderService = createStakeholderService;
        _updateStakeholderDetailsService = updateStakeholderDetailsService;
    }

    /// <summary>Legt einen neuen Stakeholder im Projekt an. Ein Namensduplikat blockiert das
    /// Anlegen nicht, liefert aber zusätzlich <c>similarStakeholderWarning</c> (Akzeptanzkriterium 4).</summary>
    [HttpPost]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(StakeholderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateStakeholder(Guid projectId, [FromBody] StakeholderDetailsRequest request, CancellationToken cancellationToken)
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

            return StatusCode(StatusCodes.Status201Created, StakeholderResponse.FromCreateResult(result));
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

    /// <summary>Aktualisiert die Stammdaten eines bestehenden Stakeholders (US-022). Liefert
    /// <c>404</c>, wenn der Stakeholder nicht existiert oder bereits soft-gelöscht ist
    /// (Akzeptanzkriterium 5) — unabhängig von der Route ohne <c>projectId</c>-Segment wird die
    /// Rolle des Nutzers im zugehörigen Projekt über
    /// <see cref="StakeholderProjectRoleAuthorizationHandler"/> geprüft (Akzeptanzkriterium 2).
    /// Keine Freigabe-/Draft-Logik — die Änderung ist mit dem <c>200 OK</c> sofort für alle
    /// Projektmitglieder sichtbar (Akzeptanzkriterium 3).</summary>
    [HttpPatch("/api/v1/stakeholders/{id:guid}")]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(StakeholderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStakeholder(Guid id, [FromBody] StakeholderDetailsRequest request, CancellationToken cancellationToken)
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
            var result = await _updateStakeholderDetailsService.UpdateStakeholderDetailsAsync(
                id, type, request.Name, request.Organization, request.Position, request.Email,
                request.Phone, request.LocationDepartment, request.Description, userId, cancellationToken);

            if (result is null)
            {
                return NotFound();
            }

            return Ok(StakeholderResponse.FromUpdateResult(result));
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
