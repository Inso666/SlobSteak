using Microsoft.AspNetCore.Authorization;

namespace SlobSteak.Api.Authorization;

/// <summary>Requirement für die Policy <see cref="AuthorizationPolicies.SystemAdmin"/> (US-007) —
/// reiner Marker, keine Parameter nötig.</summary>
public sealed class SystemAdminRequirement : IAuthorizationRequirement
{
}
