using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Authorization;

namespace SlobSteak.Api.Tests.Authorization;

/// <summary>Unit-Tests für <see cref="SystemAdminAuthorizationHandler"/> (US-007).</summary>
public class SystemAdminAuthorizationHandlerTests
{
    [Fact]
    public async Task HandleRequirementAsync_IsSystemAdminTrue_Succeeds()
    {
        var context = await RunHandlerAsync(isSystemAdmin: true);

        context.HasSucceeded.Should().BeTrue();
    }

    [Fact]
    public async Task HandleRequirementAsync_IsSystemAdminFalse_DoesNotSucceed()
    {
        var context = await RunHandlerAsync(isSystemAdmin: false);

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleRequirementAsync_NoIsSystemAdminClaim_DoesNotSucceed()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity());
        var context = await RunHandlerAsync(user);

        context.HasSucceeded.Should().BeFalse();
    }

    private static Task<AuthorizationHandlerContext> RunHandlerAsync(bool isSystemAdmin)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(JwtSettings.IsSystemAdminClaimType, isSystemAdmin ? "true" : "false") },
            authenticationType: "Test"));

        return RunHandlerAsync(user);
    }

    private static async Task<AuthorizationHandlerContext> RunHandlerAsync(ClaimsPrincipal user)
    {
        var handler = new SystemAdminAuthorizationHandler();
        var requirement = new SystemAdminRequirement();
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        return context;
    }
}
