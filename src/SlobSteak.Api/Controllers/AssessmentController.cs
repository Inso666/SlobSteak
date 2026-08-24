using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Assessments;
using SlobSteak.Application.Shared;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Api.Controllers;

/// <summary>Request-DTO für <see cref="AssessmentController.UpsertAssessment"/> (US-028).
/// <c>ExpectedVersion</c> ist bewusst nullable: fehlt der Wert, wird ohne Konfliktprüfung
/// gespeichert (Akzeptanzkriterium 4).</summary>
public sealed class UpsertAssessmentRequest
{
    public int Influence { get; init; }

    public int Interest { get; init; }

    public string? Notes { get; init; }

    public int? ExpectedVersion { get; init; }
}

/// <summary>Response-DTO für ein Assessment-Rollensegment (US-028 Akzeptanzkriterium 1/5). Wire-
/// Contract camelCase gemäß CLAUDE.md Abschnitt 3.1. Bei <c>status</c> ungleich <c>ASSESSED</c>
/// sind <c>influence</c>/<c>interest</c>/<c>notes</c>/<c>updatedByName</c>/<c>updatedAt</c>/
/// <c>version</c> <c>null</c>.</summary>
public sealed record AssessmentRoleResponse(
    string Role,
    string Status,
    int? Influence,
    int? Interest,
    string? Notes,
    string? UpdatedByName,
    DateTimeOffset? UpdatedAt,
    int? Version)
{
    public static AssessmentRoleResponse FromItem(AssessmentRoleItem item) =>
        new(
            item.Role.ToString(),
            StatusToWireValue(item.Status),
            item.Assessment?.Influence.Value,
            item.Assessment?.Interest.Value,
            item.Assessment?.Notes,
            item.UpdatedByName,
            item.Assessment?.UpdatedAt,
            item.Assessment?.Version);

    public static AssessmentRoleResponse FromUpsertResult(ProjectRole role, UpsertAssessmentResult result) =>
        new(
            role.ToString(),
            "ASSESSED",
            result.Assessment.Influence.Value,
            result.Assessment.Interest.Value,
            result.Assessment.Notes,
            result.UpdatedByName,
            result.Assessment.UpdatedAt,
            result.Assessment.Version);

    private static string StatusToWireValue(AssessmentRoleStatus status) => status switch
    {
        AssessmentRoleStatus.Assessed => "ASSESSED",
        AssessmentRoleStatus.NotAssessed => "NOT_ASSESSED",
        AssessmentRoleStatus.NoRoleAssigned => "NO_ROLE_ASSIGNED",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };
}

/// <summary>API für rollenspezifische Stakeholder-Assessments (US-028). Ausschließlich für
/// Projektmitglieder erreichbar; das Schreiben (<see cref="UpsertAssessment"/>) ist zusätzlich auf
/// das eigene Rollensegment beschränkt (Akzeptanzkriterium 2) — das kann das deklarative
/// <see cref="RequireProjectRoleAttribute"/> nicht ausdrücken, da die erlaubte Rolle vom
/// URL-Segment abhängt, daher die manuelle Prüfung über die framework-freie
/// <see cref="ProjectRolePolicy"/> direkt in der Action (analog zur <c>deleted=true</c>-Prüfung
/// aus US-024).</summary>
[ApiController]
[Route("api/v1/stakeholders/{id:guid}/assessments")]
[Authorize]
public sealed class AssessmentController : ControllerBase
{
    private readonly UpsertStakeholderAssessmentService _upsertService;
    private readonly GetStakeholderAssessmentsQuery _getAssessmentsQuery;
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IStakeholderAssessmentRepository _assessmentRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;

    public AssessmentController(
        UpsertStakeholderAssessmentService upsertService,
        GetStakeholderAssessmentsQuery getAssessmentsQuery,
        IStakeholderRepository stakeholderRepository,
        IStakeholderAssessmentRepository assessmentRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository)
    {
        _upsertService = upsertService;
        _getAssessmentsQuery = getAssessmentsQuery;
        _stakeholderRepository = stakeholderRepository;
        _assessmentRepository = assessmentRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert die Assessment-Übersicht des Stakeholders — je perspektiv-tragender Rolle
    /// genau ein Eintrag (Akzeptanzkriterium 5/6 aus US-028). Ausschließlich für die drei
    /// perspektiv-tragenden Rollen erreichbar; Nutzer mit Rolle <see cref="ProjectRole.User"/>
    /// erhalten <c>403 Forbidden</c> statt einer leeren/maskierten Liste (US-030, PRD Abschnitt
    /// 4.3 Punkt 4 / F2.3) — durchgesetzt über die deklarative <see cref="RequireProjectRoleAttribute"/>
    /// analog zum bestehenden Muster dieses Controllers, da hier (anders als bei
    /// <see cref="UpsertAssessment"/>) die erlaubte Rollenmenge statisch ist und keine manuelle
    /// Prüfung benötigt.</summary>
    [HttpGet]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(IReadOnlyList<AssessmentRoleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssessments(Guid id, CancellationToken cancellationToken)
    {
        var items = await _getAssessmentsQuery.GetForStakeholderAsync(id, cancellationToken);
        if (items is null)
        {
            return NotFound();
        }

        return Ok(items.Select(AssessmentRoleResponse.FromItem));
    }

    /// <summary>Legt ein Assessment für (Stakeholder, Rolle) an oder aktualisiert es
    /// (Akzeptanzkriterium 1). Nur der Nutzer mit exakt dieser Rolle im Projekt darf schreiben
    /// (Akzeptanzkriterium 2); ein <paramref name="role"/>-Segment, das keine gültige
    /// <see cref="ProjectRole"/> ist, liefert <c>400</c>.</summary>
    [HttpPut("{role}")]
    [ProducesResponseType(typeof(AssessmentRoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AssessmentRoleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpsertAssessment(Guid id, string role, [FromBody] UpsertAssessmentRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        if (!Enum.TryParse<ProjectRole>(role, ignoreCase: true, out var parsedRole))
        {
            return BadRequest(new { error = "INVALID_ROLE" });
        }

        var stakeholder = await _stakeholderRepository.FindByIdAsync(id, cancellationToken: cancellationToken);
        if (stakeholder is null)
        {
            return NotFound();
        }

        var project = await _projectRepository.FindByIdAsync(stakeholder.ProjectId, cancellationToken);
        if (project is null || !ProjectRolePolicy.IsAllowed(project.Memberships, userId, new[] { parsedRole }))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "FORBIDDEN" });
        }

        try
        {
            var result = await _upsertService.UpsertAsync(
                id, parsedRole, request.Influence, request.Interest, request.Notes, request.ExpectedVersion, userId, cancellationToken);

            var response = AssessmentRoleResponse.FromUpsertResult(parsedRole, result);
            return StatusCode(result.WasCreated ? StatusCodes.Status201Created : StatusCodes.Status200OK, response);
        }
        catch (StaleAssessmentError)
        {
            var current = await _assessmentRepository.FindByStakeholderAndRoleAsync(id, parsedRole, cancellationToken);
            var modifier = current is null ? null : await _userRepository.FindByIdAsync(current.UpdatedBy, cancellationToken);

            return Conflict(new
            {
                error = "ASSESSMENT_MODIFIED",
                modifiedBy = modifier?.Name ?? "(unbekannter Nutzer)",
                modifiedAt = current?.UpdatedAt,
            });
        }
        catch (InvalidAssessmentRoleError)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "FORBIDDEN" });
        }
        catch (InvalidScoreRangeError)
        {
            return BadRequest(new { error = "INVALID_SCORE_RANGE" });
        }
    }
}
