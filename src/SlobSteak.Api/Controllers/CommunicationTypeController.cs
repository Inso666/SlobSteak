using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Controllers.Admin;
using SlobSteak.Application.Communications;

namespace SlobSteak.Api.Controllers;

/// <summary>Lesender Zugriff auf den instanzweiten Kommunikationsarten-Katalog (US-037
/// Akzeptanzkriterium 4, Bounded Context CommunicationCatalog) — für jeden angemeldeten Nutzer
/// erreichbar (kein Admin-Gate laut Akzeptanzkriterium), im Unterschied zu den Schreib-Endpunkten
/// in <see cref="AdminCommunicationTypeController"/>, die ausschließlich Systemadmins vorbehalten
/// sind (Akzeptanzkriterium 5). Analog zur bestehenden Trennung <c>ProjectController</c>/
/// <c>AdminProjectController</c> (US-014/US-018).</summary>
[ApiController]
[Route("api/v1/communication-types")]
[Authorize]
public sealed class CommunicationTypeController : ControllerBase
{
    private readonly ListCommunicationTypesQuery _listCommunicationTypesQuery;

    public CommunicationTypeController(ListCommunicationTypesQuery listCommunicationTypesQuery)
    {
        _listCommunicationTypesQuery = listCommunicationTypesQuery;
    }

    /// <summary>Mit <c>activeOnly=true</c> ausschließlich aktive Einträge (Auswahl bei neuen
    /// Zuordnungen); ohne den Parameter alle Einträge inkl. deaktivierter (historische Anzeige an
    /// bereits zugeordneten Stakeholdern, PRD Abschnitt F5.3).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CommunicationTypeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListCommunicationTypes([FromQuery] bool activeOnly, CancellationToken cancellationToken)
    {
        var communicationTypes = await _listCommunicationTypesQuery.ListAsync(activeOnly, cancellationToken);
        return Ok(communicationTypes.Select(CommunicationTypeResponse.FromDomain));
    }
}
