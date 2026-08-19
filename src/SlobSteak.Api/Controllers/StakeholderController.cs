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

    /// <summary>US-025: Eintrag der Stakeholderliste — derselbe Response-Contract wie Anlegen/
    /// Bearbeiten (nie ein <c>similarStakeholderWarning</c>, das ist ein reines Anlege-Konzept).</summary>
    public static StakeholderResponse FromListItem(StakeholderListItem item) =>
        FromDomain(item.Stakeholder, item.UpdatedByName, similarStakeholderWarning: null);

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

/// <summary>Response-DTO für die Lösch-Auswirkung eines Stakeholders (US-023 Akzeptanzkriterium 2).</summary>
public sealed record StakeholderDeletionImpactResponse(int AssessmentCount, int CommunicationAssignmentCount)
{
    public static StakeholderDeletionImpactResponse FromDomain(StakeholderDeletionImpact impact) =>
        new(impact.AssessmentCount, impact.CommunicationAssignmentCount);
}

/// <summary>API für Stakeholder-Stammdaten (US-021: Anlegen, US-022: Bearbeiten, US-023:
/// Soft-Delete). Ausschließlich für Projektmitglieder mit einer der erlaubten Rollen erreichbar
/// (PRD Berechtigungsmatrix, Abschnitt 2.3) — durchgesetzt über
/// <see cref="RequireProjectRoleAttribute"/> (US-007), für Routen ohne <c>projectId</c>-Segment
/// aufgelöst über die Stakeholder-Id (siehe <see cref="StakeholderProjectRoleAuthorizationHandler"/>,
/// ADR-0007).</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/stakeholders")]
[Authorize]
public sealed class StakeholderController : ControllerBase
{
    private readonly CreateStakeholderService _createStakeholderService;
    private readonly UpdateStakeholderDetailsService _updateStakeholderDetailsService;
    private readonly SoftDeleteStakeholderService _softDeleteStakeholderService;
    private readonly ListStakeholdersService _listStakeholdersService;

    public StakeholderController(
        CreateStakeholderService createStakeholderService,
        UpdateStakeholderDetailsService updateStakeholderDetailsService,
        SoftDeleteStakeholderService softDeleteStakeholderService,
        ListStakeholdersService listStakeholdersService)
    {
        _createStakeholderService = createStakeholderService;
        _updateStakeholderDetailsService = updateStakeholderDetailsService;
        _softDeleteStakeholderService = softDeleteStakeholderService;
        _listStakeholdersService = listStakeholdersService;
    }

    /// <summary>Listet die aktiven (nicht soft-gelöschten) Stakeholder eines Projekts, optional
    /// durchsuchbar/filterbar (US-023 Akzeptanzkriterium 4, US-025 Akzeptanzkriterium 1/2). Für
    /// alle vier Projektrollen erreichbar (PRD Berechtigungsmatrix: „Stammdaten lesen“).
    /// <paramref name="type"/> ist ein ungültiger Wert, wird der Filter ignoriert statt mit
    /// <c>400</c> abgelehnt — eine fehlerhafte Filter-Query soll die Liste nicht blockieren.</summary>
    [HttpGet]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect, ProjectRole.User)]
    [ProducesResponseType(typeof(IReadOnlyList<StakeholderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListStakeholders(
        Guid projectId,
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] Guid? communicationTypeId,
        CancellationToken cancellationToken)
    {
        StakeholderType? parsedType = Enum.TryParse<StakeholderType>(type, ignoreCase: true, out var typeValue) ? typeValue : null;

        var items = await _listStakeholdersService.ListActiveStakeholdersAsync(
            projectId, search, parsedType, communicationTypeId, cancellationToken);
        return Ok(items.Select(StakeholderResponse.FromListItem));
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

    /// <summary>Liefert die Anzahl betroffener Assessments/Kommunikationszuordnungen für den
    /// Lösch-Bestätigungsdialog (US-023 Akzeptanzkriterium 2) — vor dem eigentlichen <c>DELETE</c>
    /// aufzurufen. Dieselbe Rollenbeschränkung wie <see cref="DeleteStakeholder"/>: nur wer löschen
    /// darf, braucht auch die Impact-Zahlen dafür.</summary>
    [HttpGet("/api/v1/stakeholders/{id:guid}/deletion-impact")]
    [RequireProjectRole(ProjectRole.PL)]
    [ProducesResponseType(typeof(StakeholderDeletionImpactResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDeletionImpact(Guid id, CancellationToken cancellationToken)
    {
        var impact = await _softDeleteStakeholderService.GetDeletionImpactAsync(id, cancellationToken);
        if (impact is null)
        {
            return NotFound();
        }

        return Ok(StakeholderDeletionImpactResponse.FromDomain(impact));
    }

    /// <summary>Markiert einen Stakeholder als gelöscht (Soft-Delete, US-023). Ausschließlich für
    /// Rolle <c>PL</c> erreichbar (Akzeptanzkriterium 1 — ein Systemadmin ohne eigene
    /// PL-Zuweisung im Projekt erhält ebenfalls <c>403</c>, PRD Abschnitt 2.3). Idempotent: ein
    /// bereits gelöschter Stakeholder liefert erneut <c>200 OK</c>, ohne <c>deleted_at</c> zu
    /// ändern (Akzeptanzkriterium 5); nur ein tatsächlich nicht existierender Stakeholder liefert
    /// <c>404</c>.</summary>
    [HttpDelete("/api/v1/stakeholders/{id:guid}")]
    [RequireProjectRole(ProjectRole.PL)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteStakeholder(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var success = await _softDeleteStakeholderService.SoftDeleteAsync(id, userId, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return Ok();
    }
}
