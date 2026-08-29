using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers;

/// <summary>Request-DTO für <see cref="StakeholderCommunicationController.AssignCommunication"/>
/// (US-040 Akzeptanzkriterium 1). <c>Frequency</c>/<c>Channel</c> sind der bestehende
/// String-Wire-Contract für Enums (analog <see cref="StakeholderDetailsRequest.Type"/>, US-021),
/// Validierung an der API-Grenze über Data Annotations (CLAUDE.md Abschnitt 3.7), die typsichere
/// Prüfung der konkreten Enum-Werte bleibt zweite Verteidigungslinie in der Action.</summary>
public sealed class AssignCommunicationRequest
{
    [Required]
    public Guid CommunicationTypeId { get; init; }

    [Required]
    public string Frequency { get; init; } = string.Empty;

    [Required]
    public string Channel { get; init; } = string.Empty;
}

/// <summary>Request-DTO für <see cref="StakeholderCommunicationController.UpdateCommunicationAssignment"/>
/// (US-040 Akzeptanzkriterium 2) — die Kommunikationsart selbst steht bereits im Routensegment und
/// ist hier nicht änderbar (ein Wechsel der Kommunikationsart ist fachlich ein Entfernen +
/// Neu-Zuordnen, kein Update).</summary>
public sealed class UpdateCommunicationAssignmentRequest
{
    [Required]
    public string Frequency { get; init; } = string.Empty;

    [Required]
    public string Channel { get; init; } = string.Empty;
}

/// <summary>Response-DTO für eine Kommunikationszuordnung (US-040). Wire-Contract camelCase gemäß
/// CLAUDE.md Abschnitt 3.1. <c>communicationTypeName</c>/<c>communicationTypeIsActive</c> sind für
/// die Listenanzeige auf der Stakeholder-Detailseite angereichert (Akzeptanzkriterium 5) — ein
/// deaktivierter Katalogeintrag bleibt an bereits zugeordneten Stakeholdern sichtbar (PRD Abschnitt
/// F5.3).</summary>
public sealed record CommunicationAssignmentResponse(
    Guid CommunicationTypeId,
    string CommunicationTypeName,
    bool CommunicationTypeIsActive,
    string Frequency,
    string Channel)
{
    public static CommunicationAssignmentResponse FromItem(CommunicationAssignmentItem item) =>
        new(item.CommunicationTypeId, item.CommunicationTypeName, item.CommunicationTypeIsActive, item.Frequency.ToString(), item.Channel.ToString());
}

/// <summary>API für Kommunikationszuordnungen an einem Stakeholder (US-040, Bounded Context
/// StakeholderCommunication). Lesen ist Teil der Stammdatenpflege (PRD F1/F4.2) und daher für alle
/// vier Projektrollen erreichbar, analog zu <see cref="StakeholderController.GetStakeholder"/>;
/// die drei schreibenden Endpunkte sind ausschließlich für <c>PL</c>/<c>Coreteam</c>/<c>Architect</c>
/// erreichbar (Akzeptanzkriterium 4) — <c>Architect</c> darf hier bewusst mitschreiben, obwohl er bei
/// Verteilerlisten (US-041/US-042) keinen Zugriff hat (PRD Abschnitt F4.2, nicht zu verwechseln).
/// Route ohne <c>projectId</c>-Segment, die Rollenprüfung erfolgt über
/// <see cref="StakeholderProjectRoleAuthorizationHandler"/> (ADR-0007), analog zu
/// <see cref="AssessmentController"/>.</summary>
[ApiController]
[Route("api/v1/stakeholders/{id:guid}/communications")]
[Authorize]
public sealed class StakeholderCommunicationController : ControllerBase
{
    private readonly ManageStakeholderCommunicationService _manageService;

    public StakeholderCommunicationController(ManageStakeholderCommunicationService manageService)
    {
        _manageService = manageService;
    }

    /// <summary>Liefert die Kommunikationszuordnungen des Stakeholders (Akzeptanzkriterium 5).</summary>
    [HttpGet]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect, ProjectRole.User)]
    [ProducesResponseType(typeof(IReadOnlyList<CommunicationAssignmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCommunicationAssignments(Guid id, CancellationToken cancellationToken)
    {
        var items = await _manageService.GetAssignmentsAsync(id, cancellationToken);
        if (items is null)
        {
            return NotFound();
        }

        return Ok(items.Select(CommunicationAssignmentResponse.FromItem));
    }

    /// <summary>Ordnet dem Stakeholder eine Kommunikationsart zu (Akzeptanzkriterium 1). Ein
    /// Duplikat (bereits existierende Zuordnung für dieselbe Kommunikationsart) liefert
    /// <c>409 Conflict</c> statt die bestehende Zuordnung stillschweigend zu überschreiben —
    /// Frequenz/Kanal müssen stattdessen über <see cref="UpdateCommunicationAssignment"/> geändert
    /// werden.</summary>
    [HttpPost]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(CommunicationAssignmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignCommunication(Guid id, [FromBody] AssignCommunicationRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<CommunicationFrequency>(request.Frequency, ignoreCase: true, out var frequency))
        {
            return BadRequest(new { error = "INVALID_FREQUENCY" });
        }

        if (!Enum.TryParse<CommunicationChannel>(request.Channel, ignoreCase: true, out var channel))
        {
            return BadRequest(new { error = "INVALID_CHANNEL" });
        }

        try
        {
            var result = await _manageService.AssignAsync(id, request.CommunicationTypeId, frequency, channel, cancellationToken);
            if (result is null)
            {
                return NotFound();
            }

            return StatusCode(StatusCodes.Status201Created, CommunicationAssignmentResponse.FromItem(result));
        }
        catch (AssignmentAlreadyExistsError)
        {
            return Conflict(new { error = "ASSIGNMENT_ALREADY_EXISTS" });
        }
    }

    /// <summary>Aktualisiert Frequenz/Kanal einer bestehenden Zuordnung (Akzeptanzkriterium 2).</summary>
    [HttpPatch("{communicationTypeId:guid}")]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(typeof(CommunicationAssignmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCommunicationAssignment(
        Guid id, Guid communicationTypeId, [FromBody] UpdateCommunicationAssignmentRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<CommunicationFrequency>(request.Frequency, ignoreCase: true, out var frequency))
        {
            return BadRequest(new { error = "INVALID_FREQUENCY" });
        }

        if (!Enum.TryParse<CommunicationChannel>(request.Channel, ignoreCase: true, out var channel))
        {
            return BadRequest(new { error = "INVALID_CHANNEL" });
        }

        try
        {
            var result = await _manageService.UpdateAsync(id, communicationTypeId, frequency, channel, cancellationToken);
            if (result is null)
            {
                return NotFound();
            }

            return Ok(CommunicationAssignmentResponse.FromItem(result));
        }
        catch (AssignmentNotFoundError)
        {
            return NotFound();
        }
    }

    /// <summary>Entfernt eine Zuordnung (Akzeptanzkriterium 3). Idempotent, analog zu
    /// <see cref="StakeholderController.RestoreStakeholder"/> — nur ein tatsächlich nicht
    /// existierender Stakeholder liefert <c>404</c>, eine bereits fehlende Zuordnung liefert erneut
    /// <c>200 OK</c>.</summary>
    [HttpDelete("{communicationTypeId:guid}")]
    [RequireProjectRole(ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveCommunicationAssignment(Guid id, Guid communicationTypeId, CancellationToken cancellationToken)
    {
        var success = await _manageService.RemoveAsync(id, communicationTypeId, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return Ok();
    }
}
