using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Map;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Controllers;

/// <summary>Response-DTO für einen Punkt der Stakeholder-Map (US-031 Akzeptanzkriterium 1). Wire-
/// Contract camelCase gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record StakeholderMapEntryResponse(Guid StakeholderId, string Name, int Influence, int Interest)
{
    public static StakeholderMapEntryResponse FromEntry(StakeholderMapEntry entry) =>
        new(entry.StakeholderId, entry.Name, entry.Influence.Value, entry.Interest.Value);
}

/// <summary>API für die Stakeholder-Map je Perspektive (US-031, Bounded Context StakeholderMap,
/// PRD F3.1). Ausschließlich für die drei perspektiv-tragenden Rollen erreichbar; Rolle
/// <see cref="ProjectRole.User"/> erhält <c>403 Forbidden</c> — konsistent mit der Sichtbarkeits-
/// regel aus US-030, durchgesetzt über dasselbe deklarative <see cref="RequireProjectRoleAttribute"/>
/// wie bei <see cref="AssessmentController"/>. Das Route-Segment <c>projectId</c> wird direkt von
/// der bereits registrierten <c>ProjectRoleAuthorizationHandler</c> (US-007/US-011) ausgewertet,
/// ohne eine zusätzliche Auflösung über einen Stakeholder wie bei
/// <see cref="AssessmentController"/> nötig zu machen.</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/map")]
[Authorize]
public sealed class MapController : ControllerBase
{
    private readonly StakeholderMapQuery _mapQuery;

    public MapController(StakeholderMapQuery mapQuery)
    {
        _mapQuery = mapQuery;
    }

    /// <summary>Liefert alle aktiven Stakeholder des Projekts, die in <paramref name="perspective"/>
    /// ein Assessment besitzen (Akzeptanzkriterium 1/2). Fehlt der Query-Parameter
    /// <c>perspective</c> oder ist er keine gültige <see cref="ProjectRole"/>, liefert der Endpoint
    /// <c>400 Bad Request</c> (Akzeptanzkriterium 4) — dies umfasst auch die Rolle <c>User</c>, die
    /// mangels eigenem Assessment fachlich keine gültige Perspektive für die Map ist.</summary>
    [HttpGet]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(IReadOnlyList<StakeholderMapEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMap(Guid projectId, [FromQuery] string? perspective, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(perspective) ||
            !Enum.TryParse<ProjectRole>(perspective, ignoreCase: true, out var parsedPerspective) ||
            parsedPerspective == ProjectRole.User)
        {
            return BadRequest(new { error = "INVALID_PERSPECTIVE" });
        }

        var entries = await _mapQuery.GetForProjectAsync(projectId, parsedPerspective, cancellationToken);

        return Ok(entries.Select(StakeholderMapEntryResponse.FromEntry));
    }
}
