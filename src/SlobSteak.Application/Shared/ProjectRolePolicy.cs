using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Shared;

/// <summary>
/// Fachliche Regel-Engine (US-007): entscheidet, ob ein Nutzer anhand seiner
/// <see cref="ProjectMembership"/> in einem Projekt eine der erlaubten Rollen hat. Framework-frei
/// (kein ASP.NET-Core-Bezug), damit sie sowohl vom
/// <c>SlobSteak.Api.Authorization.ProjectRoleAuthorizationHandler</c> als auch direkt in
/// Unit-Tests ohne HTTP-Pipeline geprüft werden kann.
/// </summary>
public static class ProjectRolePolicy
{
    /// <summary>Prüft, ob unter <paramref name="memberships"/> eine Mitgliedschaft für
    /// <paramref name="userId"/> mit einer der <paramref name="allowedRoles"/> existiert.</summary>
    public static bool IsAllowed(
        IEnumerable<ProjectMembership> memberships,
        Guid userId,
        IReadOnlyCollection<ProjectRole> allowedRoles) =>
        memberships.Any(m => m.UserId == userId && allowedRoles.Contains(m.Role));
}
