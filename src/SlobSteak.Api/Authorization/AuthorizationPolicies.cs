namespace SlobSteak.Api.Authorization;

/// <summary>Zentrale Policy-Namenskonstanten (US-007) — vermeidet magische Strings in
/// Controller-Attributen.</summary>
public static class AuthorizationPolicies
{
    /// <summary>Erfordert <c>IsSystemAdmin = true</c> (Claim <c>isSystemAdmin</c>).</summary>
    public const string SystemAdmin = "SystemAdmin";

    /// <summary>Erfordert eine <c>ProjectMembership</c> mit einer der für die jeweilige Action
    /// zugelassenen Rollen (siehe <see cref="RequireProjectRoleAttribute"/>) für das über die
    /// Route referenzierte <c>projectId</c>.</summary>
    public const string ProjectRole = "ProjectRole";
}
