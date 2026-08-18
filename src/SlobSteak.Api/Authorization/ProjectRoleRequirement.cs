using Microsoft.AspNetCore.Authorization;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Authorization;

/// <summary>Requirement für die Policy <see cref="AuthorizationPolicies.ProjectRole"/> (US-007):
/// trägt die für die jeweilige Controller-Action zugelassenen Rollen.</summary>
public sealed class ProjectRoleRequirement : IAuthorizationRequirement
{
    public ProjectRoleRequirement(params ProjectRole[] allowedRoles)
    {
        AllowedRoles = allowedRoles;
    }

    public IReadOnlyCollection<ProjectRole> AllowedRoles { get; }
}
