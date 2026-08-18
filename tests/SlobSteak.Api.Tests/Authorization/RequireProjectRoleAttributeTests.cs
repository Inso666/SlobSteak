using FluentAssertions;
using SlobSteak.Api.Authorization;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Tests.Authorization;

/// <summary>Unit-Test für <see cref="RequireProjectRoleAttribute"/> (US-007 Akzeptanzkriterium 2:
/// deklaratives Binden der ProjectRole-Policy inkl. der pro Action zugelassenen Rollen).</summary>
public class RequireProjectRoleAttributeTests
{
    [Fact]
    public void GetRequirements_YieldsProjectRoleRequirement_WithGivenAllowedRoles()
    {
        var attribute = new RequireProjectRoleAttribute(ProjectRole.PL, ProjectRole.Coreteam);

        var requirement = attribute.GetRequirements().Should().ContainSingle().Subject;

        requirement.Should().BeOfType<ProjectRoleRequirement>()
            .Which.AllowedRoles.Should().BeEquivalentTo(new[] { ProjectRole.PL, ProjectRole.Coreteam });
    }
}
