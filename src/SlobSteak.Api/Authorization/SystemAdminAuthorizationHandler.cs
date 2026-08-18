using Microsoft.AspNetCore.Authorization;
using SlobSteak.Api.Auth;

namespace SlobSteak.Api.Authorization;

/// <summary>
/// Handler für die Policy <see cref="AuthorizationPolicies.SystemAdmin"/> (US-007): lehnt Requests
/// ohne <c>IsSystemAdmin = true</c> ab (Claim <see cref="JwtSettings.IsSystemAdminClaimType"/> aus
/// dem JWT).
/// </summary>
public sealed class SystemAdminAuthorizationHandler : AuthorizationHandler<SystemAdminRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, SystemAdminRequirement requirement)
    {
        var isSystemAdminClaim = context.User.FindFirst(JwtSettings.IsSystemAdminClaimType)?.Value;
        if (bool.TryParse(isSystemAdminClaim, out var isSystemAdmin) && isSystemAdmin)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
