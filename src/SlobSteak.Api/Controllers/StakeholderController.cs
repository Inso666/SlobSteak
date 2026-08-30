using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Shared;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Projects;
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

/// <summary>Response-DTO für einen Stakeholder (Anlegen US-021, Bearbeiten US-022, Papierkorb
/// US-024). Wire-Contract camelCase gemäß CLAUDE.md Abschnitt 3.1. <c>updatedByName</c>/
/// <c>updatedAt</c> speisen die künftige „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“-Anzeige
/// (US-022 Akzeptanzkriterium 4, Stakeholder-Detailseite folgt erst mit US-026). <c>deletedAt</c>/
/// <c>deletedByName</c> sind bei aktiven Stakeholdern stets <c>null</c> und ausschließlich in der
/// Papierkorb-Ansicht befüllt (US-024 Akzeptanzkriterium 1). <c>communicationTypeNames</c> (US-072,
/// additiv) ist ausschließlich im <see cref="FromListItem"/>-Zweig befüllt (Sichtbarkeitsgrenze aus
/// US-040, dort serverseitig bereits auf die Rollen <c>PL</c>/<c>Coreteam</c>/<c>Architect</c>
/// eingeschränkt) — in jedem anderen Zweig (Anlegen/Bearbeiten/Papierkorb) stets ein leeres Array,
/// da dort nicht relevant.</summary>
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
    SimilarStakeholderWarningResponse? SimilarStakeholderWarning,
    DateTimeOffset? DeletedAt,
    string? DeletedByName,
    IReadOnlyList<string> CommunicationTypeNames)
{
    public static StakeholderResponse FromCreateResult(CreateStakeholderResult result) =>
        FromDomain(result.Stakeholder, result.CreatedByName, result.SimilarStakeholderWarning, deletedByName: null, communicationTypeNames: Array.Empty<string>());

    public static StakeholderResponse FromUpdateResult(UpdateStakeholderDetailsResult result) =>
        FromDomain(result.Stakeholder, result.UpdatedByName, similarStakeholderWarning: null, deletedByName: null, communicationTypeNames: Array.Empty<string>());

    /// <summary>US-025: Eintrag der Stakeholderliste — derselbe Response-Contract wie Anlegen/
    /// Bearbeiten (nie ein <c>similarStakeholderWarning</c>, das ist ein reines Anlege-Konzept).
    /// US-072: einziger Zweig, der <c>communicationTypeNames</c> aus dem Item übernimmt.</summary>
    public static StakeholderResponse FromListItem(StakeholderListItem item) =>
        FromDomain(item.Stakeholder, item.UpdatedByName, similarStakeholderWarning: null, deletedByName: null, item.CommunicationTypeNames);

    /// <summary>US-024: Eintrag der Papierkorb-Ansicht — derselbe Response-Contract, zusätzlich mit
    /// aufgelöstem <c>deletedByName</c> (Akzeptanzkriterium 1).</summary>
    public static StakeholderResponse FromDeletedItem(DeletedStakeholderItem item) =>
        FromDomain(item.Stakeholder, item.UpdatedByName, similarStakeholderWarning: null, item.DeletedByName, communicationTypeNames: Array.Empty<string>());

    private static StakeholderResponse FromDomain(
        Stakeholder stakeholder,
        string updatedByName,
        SimilarStakeholderWarning? similarStakeholderWarning,
        string? deletedByName,
        IReadOnlyList<string> communicationTypeNames) =>
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
            similarStakeholderWarning is null ? null : SimilarStakeholderWarningResponse.FromDomain(similarStakeholderWarning),
            stakeholder.DeletedAt,
            deletedByName,
            communicationTypeNames);
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
    private readonly DeletedStakeholdersQuery _deletedStakeholdersQuery;
    private readonly RestoreStakeholderService _restoreStakeholderService;
    private readonly GetStakeholderService _getStakeholderService;
    private readonly IProjectRepository _projectRepository;

    public StakeholderController(
        CreateStakeholderService createStakeholderService,
        UpdateStakeholderDetailsService updateStakeholderDetailsService,
        SoftDeleteStakeholderService softDeleteStakeholderService,
        ListStakeholdersService listStakeholdersService,
        DeletedStakeholdersQuery deletedStakeholdersQuery,
        RestoreStakeholderService restoreStakeholderService,
        GetStakeholderService getStakeholderService,
        IProjectRepository projectRepository)
    {
        _createStakeholderService = createStakeholderService;
        _updateStakeholderDetailsService = updateStakeholderDetailsService;
        _softDeleteStakeholderService = softDeleteStakeholderService;
        _listStakeholdersService = listStakeholdersService;
        _deletedStakeholdersQuery = deletedStakeholdersQuery;
        _restoreStakeholderService = restoreStakeholderService;
        _getStakeholderService = getStakeholderService;
        _projectRepository = projectRepository;
    }

    /// <summary>Rollen, die ausschließlich für die Papierkorb-Ansicht zulässig sind (US-024
    /// Akzeptanzkriterium 1: <c>PL</c>/Admin mit eigener PL-Zuweisung — ein Systemadmin ohne
    /// eigene PL-Zuweisung im Projekt erhält ebenfalls <c>403</c>, analog zu
    /// <see cref="DeleteStakeholder"/>, PRD Abschnitt 2.3).</summary>
    private static readonly ProjectRole[] DeletedViewRoles = { ProjectRole.PL };

    /// <summary>Listet die aktiven (nicht soft-gelöschten) Stakeholder eines Projekts, optional
    /// durchsuchbar/filterbar (US-023 Akzeptanzkriterium 4, US-025 Akzeptanzkriterium 1/2). Für
    /// alle vier Projektrollen erreichbar (PRD Berechtigungsmatrix: „Stammdaten lesen“).
    /// <paramref name="type"/> ist ein ungültiger Wert, wird der Filter ignoriert statt mit
    /// <c>400</c> abgelehnt — eine fehlerhafte Filter-Query soll die Liste nicht blockieren.
    /// Mit <paramref name="deleted"/><c>=true</c> liefert derselbe Endpoint stattdessen
    /// ausschließlich soft-gelöschte Stakeholder (Papierkorb-Ansicht, US-024 Akzeptanzkriterium 1) —
    /// dafür ausschließlich für Rolle <c>PL</c> erreichbar, unabhängig vom deklarativen
    /// <see cref="RequireProjectRoleAttribute"/> auf dieser Action (das die für den Normalfall
    /// erlaubten vier Rollen abdeckt): eine query-parameterabhängige Rolleneinschränkung kann die
    /// attributbasierte Policy nicht ausdrücken, daher die zusätzliche manuelle Prüfung hier,
    /// analog zur framework-freien <see cref="ProjectRolePolicy"/>, die auch
    /// <c>ProjectRoleAuthorizationHandler</c> nutzt.</summary>
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
        [FromQuery] bool deleted,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        // US-072: einmalig geladen, für beide Zweige (Papierkorb-Rollenprüfung UND Auflösung der
        // eigenen Rolle für `communicationTypeNames`) genutzt, statt das Projekt zweimal zu laden.
        var project = await _projectRepository.FindByIdAsync(projectId, cancellationToken);

        if (deleted)
        {
            if (project is null || !ProjectRolePolicy.IsAllowed(project.Memberships, userId, DeletedViewRoles))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "FORBIDDEN" });
            }

            var deletedItems = await _deletedStakeholdersQuery.ListDeletedStakeholdersAsync(projectId, cancellationToken);
            return Ok(deletedItems.Select(StakeholderResponse.FromDeletedItem));
        }

        // Die eigene Rolle bestimmt, ob `communicationTypeNames` befüllt wird (US-072
        // Akzeptanzkriterium 6) — der `[RequireProjectRole]`-Aufsatz oben hat bereits sichergestellt,
        // dass irgendeine der vier Rollen vorliegt; ein `null` hierträte praktisch nur bei einem
        // parallelen Entzug der Mitgliedschaft zwischen Autorisierung und Ausführung auf.
        var callerRole = project?.Memberships.FirstOrDefault(m => m.UserId == userId)?.Role;
        if (callerRole is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "FORBIDDEN" });
        }

        StakeholderType? parsedType = Enum.TryParse<StakeholderType>(type, ignoreCase: true, out var typeValue) ? typeValue : null;

        var items = await _listStakeholdersService.ListActiveStakeholdersAsync(
            projectId, callerRole.Value, search, parsedType, communicationTypeId, cancellationToken);
        return Ok(items.Select(StakeholderResponse.FromListItem));
    }

    /// <summary>Liefert einen einzelnen Stakeholder für die Detailseite (US-026, Screen S4).
    /// Route ohne <c>projectId</c>-Segment, die Rollenprüfung erfolgt über
    /// <see cref="StakeholderProjectRoleAuthorizationHandler"/> (ADR-0007). Für alle vier
    /// Projektrollen erreichbar (Akzeptanzkriterium 1/2 — Bearbeiten bleibt über
    /// <see cref="UpdateStakeholder"/> weiterhin auf <c>PL</c>/<c>Coreteam</c>/<c>Architect</c>
    /// beschränkt, das ist eine reine UI-Ausblendung für Rolle <c>User</c> auf dieser Seite).
    /// Liefert <c>404</c>, wenn der Stakeholder nicht existiert oder bereits soft-gelöscht ist
    /// (Akzeptanzkriterium 5 „Nicht gefunden“-Ansicht, konsistent mit US-022/US-023).</summary>
    [HttpGet("/api/v1/stakeholders/{id:guid}")]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect, ProjectRole.User)]
    [ProducesResponseType(typeof(StakeholderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStakeholder(Guid id, CancellationToken cancellationToken)
    {
        var item = await _getStakeholderService.GetByIdAsync(id, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(StakeholderResponse.FromListItem(item));
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

    /// <summary>Macht ein Soft-Delete rückgängig (US-024 Akzeptanzkriterium 2). Ausschließlich für
    /// Rolle <c>PL</c> erreichbar, analog zu <see cref="DeleteStakeholder"/> — Route ohne
    /// <c>projectId</c>-Segment, die Rollenprüfung erfolgt über
    /// <see cref="StakeholderProjectRoleAuthorizationHandler"/> (ADR-0007), der den Stakeholder
    /// bewusst inklusive soft-gelöschter Datensätze auflöst. Idempotent: ein bereits aktiver
    /// Stakeholder liefert erneut <c>200 OK</c>. Der <c>404</c>-Zweig greift praktisch nur bei
    /// einem parallelen physischen Löschen zwischen Autorisierung und Ausführung — ein Aufruf mit
    /// einer global unbekannten Id scheitert bereits vorher an derselben Autorisierung (die den
    /// Stakeholder ebenfalls nicht auflösen kann) mit <c>403</c>, analog zu
    /// <see cref="DeleteStakeholder"/>.</summary>
    [HttpPost("/api/v1/stakeholders/{id:guid}/restore")]
    [RequireProjectRole(ProjectRole.PL)]
    [ProducesResponseType(typeof(StakeholderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreStakeholder(Guid id, CancellationToken cancellationToken)
    {
        var success = await _restoreStakeholderService.RestoreAsync(id, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return Ok();
    }
}
