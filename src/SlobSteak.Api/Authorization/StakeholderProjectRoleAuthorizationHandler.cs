using Microsoft.AspNetCore.Authorization;
using SlobSteak.Application.Shared;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Api.Authorization;

/// <summary>
/// Zweiter Handler für dieselbe <see cref="ProjectRoleRequirement"/> (US-022): Routen wie
/// <c>PATCH /api/v1/stakeholders/{id}</c> referenzieren das Projekt nicht direkt über ein
/// <c>projectId</c>-Routensegment (anders als <c>ProjectRoleAuthorizationHandler</c>, US-007),
/// sondern indirekt über die Stakeholder-Id. Dieser Handler löst das referenzierte Projekt über
/// den Stakeholder auf. ASP.NET Core erlaubt mehrere Handler je Requirement — die Autorisierung
/// gilt als erfüllt, sobald irgendeiner <see cref="AuthorizationHandlerContext.Succeed"/> ruft;
/// für Routen mit <c>projectId</c>-Segment bleibt <see cref="ProjectRoleAuthorizationHandler"/>
/// zuständig, dieser Handler findet dort kein <c>id</c>-Segment und greift nicht ein.
/// </summary>
/// <remarks>
/// Bewusst mit <c>includeDeleted: true</c> aufgelöst: die Rollenprüfung muss unabhängig vom
/// Soft-Delete-Status des Stakeholders funktionieren, damit ein autorisierter Nutzer für einen
/// bereits gelöschten Stakeholder den fachlich korrekten <c>404</c> aus der Application-Schicht
/// erhält (US-022 Akzeptanzkriterium 5) statt eines irreführenden <c>403</c>, das entstünde, wenn
/// dieser Handler einen gelöschten Stakeholder wie einen nicht existierenden behandeln würde.
/// </remarks>
public sealed class StakeholderProjectRoleAuthorizationHandler : AuthorizationHandler<ProjectRoleRequirement>
{
    private const string StakeholderIdRouteKey = "id";

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IProjectRepository _projectRepository;

    public StakeholderProjectRoleAuthorizationHandler(
        IHttpContextAccessor httpContextAccessor,
        IStakeholderRepository stakeholderRepository,
        IProjectRepository projectRepository)
    {
        _httpContextAccessor = httpContextAccessor;
        _stakeholderRepository = stakeholderRepository;
        _projectRepository = projectRepository;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ProjectRoleRequirement requirement)
    {
        var userIdClaim = context.User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return;
        }

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null ||
            !httpContext.Request.RouteValues.TryGetValue(StakeholderIdRouteKey, out var stakeholderIdRouteValue) ||
            !Guid.TryParse(stakeholderIdRouteValue?.ToString(), out var stakeholderId))
        {
            return;
        }

        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: true);
        if (stakeholder is null)
        {
            return;
        }

        var project = await _projectRepository.FindByIdAsync(stakeholder.ProjectId);
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
