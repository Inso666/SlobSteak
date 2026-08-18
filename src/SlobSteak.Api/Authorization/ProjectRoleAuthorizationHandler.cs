using Microsoft.AspNetCore.Authorization;
using SlobSteak.Application.Shared;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Api.Authorization;

/// <summary>
/// Handler für die Policy <see cref="AuthorizationPolicies.ProjectRole"/> (US-007): lädt das über
/// die Route referenzierte Projekt inkl. seiner Mitgliedschaften und delegiert die eigentliche
/// Entscheidung an die framework-freie <see cref="ProjectRolePolicy"/> (Application-Schicht).
/// <c>ProjectMembership.Role</c> wird bewusst bei jedem Request frisch aus der Datenbank
/// nachgeladen (nicht aus dem JWT gelesen) — ein Rollenwechsel wirkt so ohne Re-Login sofort
/// (US-007 Akzeptanzkriterium 5, US-006 Akzeptanzkriterium 4).
/// </summary>
public sealed class ProjectRoleAuthorizationHandler : AuthorizationHandler<ProjectRoleRequirement>
{
    private const string ProjectIdRouteKey = "projectId";

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IProjectRepository _projectRepository;

    public ProjectRoleAuthorizationHandler(IHttpContextAccessor httpContextAccessor, IProjectRepository projectRepository)
    {
        _httpContextAccessor = httpContextAccessor;
        _projectRepository = projectRepository;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ProjectRoleRequirement requirement)
    {
        var userIdClaim = context.User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return;
        }

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null ||
            !httpContext.Request.RouteValues.TryGetValue(ProjectIdRouteKey, out var projectIdRouteValue) ||
            !Guid.TryParse(projectIdRouteValue?.ToString(), out var projectId))
        {
            return;
        }

        var project = await _projectRepository.FindByIdAsync(projectId);
        if (project is null)
        {
            return;
        }

        if (ProjectRolePolicy.IsAllowed(project.Memberships, userId, requirement.AllowedRoles))
        {
            context.Succeed(requirement);
        }
    }
}
