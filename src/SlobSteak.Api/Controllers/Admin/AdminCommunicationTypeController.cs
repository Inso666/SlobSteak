using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Communications;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers.Admin;

/// <summary>Request-DTO für <see cref="AdminCommunicationTypeController.CreateCommunicationType"/>.
/// Validierung erfolgt an der API-Grenze über Data Annotations (CLAUDE.md Abschnitt 3.7) — ein
/// rein aus Leerzeichen bestehender Name wird davon nicht erfasst und fällt auf die zweite
/// Verteidigungslinie in <see cref="CommunicationType.Create"/> zurück.</summary>
public sealed class CreateCommunicationTypeRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;
}

/// <summary>Request-DTO für <see cref="AdminCommunicationTypeController.UpdateCommunicationType"/>.
/// Beide Felder sind bewusst optional (echtes PATCH-Semantik): <c>Name</c> benennt um
/// (Akzeptanzkriterium 2), <c>IsActive</c> aktiviert/deaktiviert (Akzeptanzkriterium 3) — unabhängig
/// voneinander, auch kombiniert in einem Request möglich.</summary>
public sealed class UpdateCommunicationTypeRequest
{
    public string? Name { get; init; }

    public bool? IsActive { get; init; }
}

/// <summary>Response-DTO für einen Kommunikationsarten-Katalogeintrag. Wire-Contract camelCase
/// gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record CommunicationTypeResponse(Guid Id, string Name, bool IsActive, DateTimeOffset CreatedAt)
{
    public static CommunicationTypeResponse FromDomain(CommunicationType communicationType) =>
        new(communicationType.Id, communicationType.Name, communicationType.IsActive, communicationType.CreatedAt);
}

/// <summary>Admin-API für den instanzweiten Kommunikationsarten-Katalog (US-037, Bounded Context
/// CommunicationCatalog). Ausschließlich für Systemadmins erreichbar (Akzeptanzkriterium 5) — der
/// lesende Zugriff für alle authentifizierten Nutzer liegt bewusst in einem separaten,
/// nicht-admin-beschränkten Controller (<see cref="CommunicationTypeController"/>), analog zur
/// bestehenden Trennung <c>AdminProjectController</c>/<c>ProjectController</c> (US-014/US-018).</summary>
[ApiController]
[Route("api/v1/admin/communication-types")]
[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]
public sealed class AdminCommunicationTypeController : ControllerBase
{
    private readonly CreateCommunicationTypeService _createCommunicationTypeService;
    private readonly UpdateCommunicationTypeService _updateCommunicationTypeService;

    public AdminCommunicationTypeController(
        CreateCommunicationTypeService createCommunicationTypeService,
        UpdateCommunicationTypeService updateCommunicationTypeService)
    {
        _createCommunicationTypeService = createCommunicationTypeService;
        _updateCommunicationTypeService = updateCommunicationTypeService;
    }

    /// <summary>Legt einen neuen Katalogeintrag an (<c>is_active = true</c>, Akzeptanzkriterium 1).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CommunicationTypeResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateCommunicationType([FromBody] CreateCommunicationTypeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var communicationType = await _createCommunicationTypeService.CreateCommunicationTypeAsync(request.Name, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, CommunicationTypeResponse.FromDomain(communicationType));
        }
        catch (CommunicationTypeNameRequiredError)
        {
            return BadRequest(new { error = "NAME_REQUIRED" });
        }
        catch (CommunicationTypeNameAlreadyInUseError)
        {
            return Conflict(new { error = "NAME_ALREADY_IN_USE" });
        }
    }

    /// <summary>Benennt einen Katalogeintrag um (Akzeptanzkriterium 2) und/oder aktiviert/
    /// deaktiviert ihn (Akzeptanzkriterium 3) — ein deaktivierter Eintrag bleibt in
    /// <c>communication_types</c> erhalten (kein Löschen).</summary>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(CommunicationTypeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateCommunicationType(Guid id, [FromBody] UpdateCommunicationTypeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var communicationType = await _updateCommunicationTypeService.UpdateAsync(id, request.Name, request.IsActive, cancellationToken);
            if (communicationType is null)
            {
                return NotFound();
            }

            return Ok(CommunicationTypeResponse.FromDomain(communicationType));
        }
        catch (CommunicationTypeNameRequiredError)
        {
            return BadRequest(new { error = "NAME_REQUIRED" });
        }
        catch (CommunicationTypeNameAlreadyInUseError)
        {
            return Conflict(new { error = "NAME_ALREADY_IN_USE" });
        }
    }
}
