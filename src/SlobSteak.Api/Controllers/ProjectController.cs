using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Api.Controllers;

/// <summary>Response-DTO für eine Zeile der Projektübersicht (US-018 Akzeptanzkriterium 1). Wire-
/// Contract camelCase gemäß CLAUDE.md Abschnitt 3.1. US-074: <c>Status</c>/<c>CreatedAt</c> additiv
/// ergänzt (analog <c>ProjectListItemResponse</c> im Admin-Bereich) — steuert die
/// „Archiviert"-Kennzeichnung bzw. das Sortierkriterium „Neu zuerst" auf der Projektübersicht.</summary>
public sealed record ProjectOverviewResponse(Guid Id, string Name, string Role, int StakeholderCount, string Status, DateTimeOffset CreatedAt)
{
    public static ProjectOverviewResponse FromItem(ProjectOverviewItem item) =>
        new(item.ProjectId, item.ProjectName, item.Role.ToString(), item.StakeholderCount, item.Status.ToString(), item.CreatedAt);
}

/// <summary>Controller für den ProjectManagement Bounded Context aus Sicht eines beliebigen
/// angemeldeten Nutzers (im Unterschied zu <c>AdminProjectController</c>, der nur Systemadmins
/// vorbehalten ist). US-018: Projektübersicht (Screen S2).</summary>
[ApiController]
[Route("api/v1/projects")]
[Authorize]
public sealed class ProjectController : ControllerBase
{
    private readonly IProjectOverviewQuery _projectOverviewQuery;

    public ProjectController(IProjectOverviewQuery projectOverviewQuery)
    {
        _projectOverviewQuery = projectOverviewQuery;
    }

    /// <summary>Listet ausschließlich die Projekte, in denen der angemeldete Nutzer eine
    /// <c>ProjectMembership</c> hat, mit seiner jeweiligen Rolle und der Stakeholder-Anzahl
    /// (US-018 Akzeptanzkriterium 1).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectOverviewResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMyProjects(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var items = await _projectOverviewQuery.GetForUserAsync(userId, cancellationToken);
        return Ok(items.Select(ProjectOverviewResponse.FromItem));
    }

    /// <summary>Liefert ein einzelnes Projekt aus Sicht des angemeldeten Nutzers inklusive eigener
    /// Rolle (US-019: Header/Rollen-Badge der Projekt-Workspace-Shell). <c>404</c>, wenn der
    /// Nutzer in diesem Projekt keine <c>ProjectMembership</c> hat — auch für Systemadmins ohne
    /// eigene Zuweisung (PRD Abschnitt 2.3: „Admin hat keinen fachlichen Zugriff … sofern sie sich
    /// nicht zusätzlich selbst einem Projekt zuweist“).</summary>
    [HttpGet("{projectId:guid}")]
    [ProducesResponseType(typeof(ProjectOverviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyProject(Guid projectId, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var items = await _projectOverviewQuery.GetForUserAsync(userId, cancellationToken);
        var item = items.SingleOrDefault(i => i.ProjectId == projectId);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(ProjectOverviewResponse.FromItem(item));
    }
}
