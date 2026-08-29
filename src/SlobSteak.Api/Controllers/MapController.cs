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

/// <summary>Response-DTO für einen Vergleichspunkt der Stakeholder-Map (US-033 Akzeptanzkriterium
/// 1). Wire-Contract camelCase gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record StakeholderMapComparisonValueResponse(int Influence, int Interest)
{
    public static StakeholderMapComparisonValueResponse? FromValue(StakeholderMapComparisonValue? value) =>
        value is null ? null : new StakeholderMapComparisonValueResponse(value.Influence.Value, value.Interest.Value);
}

/// <summary>Response-DTO für einen Punkt der Werte-Paarung zweier Perspektiven (US-033
/// Akzeptanzkriterium 1). <see cref="Primary"/>/<see cref="Secondary"/> sind <c>null</c>, wenn der
/// Stakeholder in der jeweiligen Perspektive kein Assessment besitzt.</summary>
public sealed record StakeholderMapComparisonEntryResponse(
    Guid StakeholderId,
    string Name,
    StakeholderMapComparisonValueResponse? Primary,
    StakeholderMapComparisonValueResponse? Secondary)
{
    public static StakeholderMapComparisonEntryResponse FromEntry(StakeholderMapComparisonEntry entry) =>
        new(
            entry.StakeholderId,
            entry.Name,
            StakeholderMapComparisonValueResponse.FromValue(entry.Primary),
            StakeholderMapComparisonValueResponse.FromValue(entry.Secondary));
}

/// <summary>API für die Stakeholder-Map je Perspektive (US-031) sowie deren Vergleichsmodus
/// (US-033, Bounded Context StakeholderMap, PRD F3.1/F3.2). Ausschließlich für die drei
/// perspektiv-tragenden Rollen erreichbar; Rolle <see cref="ProjectRole.User"/> erhält
/// <c>403 Forbidden</c> — konsistent mit der Sichtbarkeitsregel aus US-030, durchgesetzt über
/// dasselbe deklarative <see cref="RequireProjectRoleAttribute"/> wie bei
/// <see cref="AssessmentController"/>. Das Route-Segment <c>projectId</c> wird direkt von der
/// bereits registrierten <c>ProjectRoleAuthorizationHandler</c> (US-007/US-011) ausgewertet, ohne
/// eine zusätzliche Auflösung über einen Stakeholder wie bei <see cref="AssessmentController"/>
/// nötig zu machen.</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/map")]
[Authorize]
public sealed class MapController : ControllerBase
{
    private readonly StakeholderMapQuery _mapQuery;
    private readonly StakeholderMapComparisonQuery _comparisonQuery;

    public MapController(StakeholderMapQuery mapQuery, StakeholderMapComparisonQuery comparisonQuery)
    {
        _mapQuery = mapQuery;
        _comparisonQuery = comparisonQuery;
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

    /// <summary>Liefert je aktivem Stakeholder mit Assessment in mindestens einer der beiden
    /// gewählten Perspektiven <paramref name="primary"/>/<paramref name="secondary"/> einen
    /// Vergleichseintrag (Akzeptanzkriterium 1/3). Sind <paramref name="primary"/> oder
    /// <paramref name="secondary"/> keine gültigen perspektiv-tragenden Rollen, liefert der
    /// Endpoint <c>400 Bad Request</c> — analog zu <see cref="GetMap"/> (US-031). Sind
    /// <paramref name="primary"/> und <paramref name="secondary"/> identisch, liefert der Endpoint
    /// ebenfalls <c>400 Bad Request</c> (Akzeptanzkriterium 2), da ein Vergleich zweier gleicher
    /// Perspektiven fachlich sinnlos wäre.</summary>
    [HttpGet("compare")]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(IReadOnlyList<StakeholderMapComparisonEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetComparison(
        Guid projectId, [FromQuery] string? primary, [FromQuery] string? secondary, CancellationToken cancellationToken)
    {
        if (!TryParsePerspective(primary, out var parsedPrimary) || !TryParsePerspective(secondary, out var parsedSecondary))
        {
            return BadRequest(new { error = "INVALID_PERSPECTIVE" });
        }

        if (parsedPrimary == parsedSecondary)
        {
            return BadRequest(new { error = "PRIMARY_EQUALS_SECONDARY" });
        }

        var entries = await _comparisonQuery.GetForProjectAsync(projectId, parsedPrimary, parsedSecondary, cancellationToken);

        return Ok(entries.Select(StakeholderMapComparisonEntryResponse.FromEntry));
    }

    /// <summary>Parst einen Perspektiv-Query-Parameter analog zu <see cref="GetMap"/>: gültig sind
    /// ausschließlich die drei perspektiv-tragenden Rollen, nicht <see cref="ProjectRole.User"/>.</summary>
    private static bool TryParsePerspective(string? value, out ProjectRole perspective)
    {
        if (!string.IsNullOrWhiteSpace(value) &&
            Enum.TryParse(value, ignoreCase: true, out perspective) &&
            perspective != ProjectRole.User)
        {
            return true;
        }

        perspective = default;
        return false;
    }
}
