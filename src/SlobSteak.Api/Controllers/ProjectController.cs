using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Api.Controllers;

/// <summary>Response-DTO für eine Zeile der Projektübersicht (US-018 Akzeptanzkriterium 1). Wire-
/// Contract camelCase gemäß CLAUDE.md Abschnitt 3.1.</summary>
public sealed record ProjectOverviewResponse(Guid Id, string Name, string Role, int StakeholderCount)
{
    public static ProjectOverviewResponse FromItem(ProjectOverviewItem item) =>
        new(item.ProjectId, item.ProjectName, item.Role.ToString(), item.StakeholderCount);
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
}
