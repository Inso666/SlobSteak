using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.DistributionLists;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Controllers;

/// <summary>Response-DTO für einen Verteilerlisten-Eintrag (US-041). Wire-Contract camelCase gemäß
/// CLAUDE.md Abschnitt 3.1. <c>hasEmail</c> ist explizit (Akzeptanzkriterium 4) statt implizit über
/// <c>email == null</c> abgeleitet zu werden, damit das Frontend (US-042) nicht selbst zwischen
/// „keine E-Mail hinterlegt“ und einem potenziell leeren String unterscheiden muss.</summary>
public sealed record DistributionListEntryResponse(
    Guid StakeholderId,
    string Name,
    string StakeholderType,
    bool HasEmail,
    string? Email,
    Guid CommunicationTypeId,
    string CommunicationTypeName,
    string Frequency,
    string Channel)
{
    public static DistributionListEntryResponse FromEntry(DistributionListEntry entry) =>
        new(
            entry.StakeholderId,
            entry.StakeholderName,
            entry.StakeholderType.ToString(),
            entry.HasEmail,
            entry.Email,
            entry.CommunicationTypeId,
            entry.CommunicationTypeName,
            entry.Frequency.ToString(),
            entry.Channel.ToString());
}

/// <summary>API für die Verteilerlisten-Filter-Query (US-041, Bounded Context DistributionList, PRD
/// F4.1). Ausschließlich für die Rollen <c>PL</c>/<c>Coreteam</c> erreichbar (Akzeptanzkriterium 2,
/// PRD Berechtigungsmatrix Abschnitt 2.3) — anders als bei den Kommunikationszuordnungen selbst
/// (US-040, dort zusätzlich <c>Architect</c>) ist <c>Architect</c> hier bewusst NICHT erlaubt (PRD
/// Abschnitt F4.2 Abgrenzung, nicht mit US-040 zu verwechseln). Reine Lese-Query, kein UI in dieser
/// Story (folgt mit US-042).</summary>
[ApiController]
[Route("api/v1/projects/{projectId:guid}/distribution-list")]
[Authorize]
public sealed class DistributionListController : ControllerBase
{
    private readonly DistributionListQuery _distributionListQuery;

    public DistributionListController(DistributionListQuery distributionListQuery)
    {
        _distributionListQuery = distributionListQuery;
    }

    /// <summary>Liefert die gefilterte Verteilerliste des Projekts (Akzeptanzkriterium 1). Alle vier
    /// Filter sind optional und beliebig kombinierbar. Ein ungültiger Wert für
    /// <paramref name="frequency"/>/<paramref name="channel"/>/<paramref name="stakeholderType"/>
    /// wird ignoriert statt mit <c>400</c> abgelehnt — analog zum bestehenden Filter-Verhalten von
    /// <see cref="StakeholderController.ListStakeholders"/> (US-025): eine fehlerhafte Filter-Query
    /// soll die Liste nicht blockieren. Leeres Ergebnis liefert <c>200 OK</c> mit leerem Array
    /// (Akzeptanzkriterium 5), kein <c>404</c>.</summary>
    [HttpGet]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam)]
    [ProducesResponseType(typeof(IReadOnlyList<DistributionListEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetDistributionList(
        Guid projectId,
        [FromQuery] Guid? communicationTypeId,
        [FromQuery] string? frequency,
        [FromQuery] string? channel,
        [FromQuery] string? stakeholderType,
        CancellationToken cancellationToken)
    {
        CommunicationFrequency? parsedFrequency =
            Enum.TryParse<CommunicationFrequency>(frequency, ignoreCase: true, out var frequencyValue) ? frequencyValue : null;
        CommunicationChannel? parsedChannel =
            Enum.TryParse<CommunicationChannel>(channel, ignoreCase: true, out var channelValue) ? channelValue : null;
        StakeholderType? parsedType =
            Enum.TryParse<StakeholderType>(stakeholderType, ignoreCase: true, out var typeValue) ? typeValue : null;

        var entries = await _distributionListQuery.GetForProjectAsync(
            projectId, communicationTypeId, parsedFrequency, parsedChannel, parsedType, cancellationToken);

        return Ok(entries.Select(DistributionListEntryResponse.FromEntry));
    }
}
