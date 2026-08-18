using FluentAssertions;
using SlobSteak.Application.Shared;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Tests.Shared;

/// <summary>
/// Tests für <see cref="ProjectRolePolicy"/> (US-007) anhand exemplarischer Kombinationen aus der
/// PRD-Berechtigungsmatrix (Abschnitt 2.3): PL darf Stakeholder löschen, Coreteam darf nicht, User
/// darf keine Assessments lesen.
/// </summary>
public class ProjectRolePolicyTests
{
    private static readonly Guid ProjectId = Guid.NewGuid();

    [Fact]
    public void IsAllowed_PLWithStakeholderDeletePolicy_ReturnsTrue()
    {
        var userId = Guid.NewGuid();
        var memberships = new[] { new ProjectMembership(Guid.NewGuid(), ProjectId, userId, ProjectRole.PL) };

        var result = ProjectRolePolicy.IsAllowed(memberships, userId, new[] { ProjectRole.PL });

        result.Should().BeTrue();
    }

    [Fact]
    public void IsAllowed_CoreteamWithStakeholderDeletePolicy_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var memberships = new[] { new ProjectMembership(Guid.NewGuid(), ProjectId, userId, ProjectRole.Coreteam) };

        var result = ProjectRolePolicy.IsAllowed(memberships, userId, new[] { ProjectRole.PL });

        result.Should().BeFalse();
    }

    [Fact]
    public void IsAllowed_UserWithReadAllAssessmentsPolicy_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var memberships = new[] { new ProjectMembership(Guid.NewGuid(), ProjectId, userId, ProjectRole.User) };

        var result = ProjectRolePolicy.IsAllowed(memberships, userId, new[] { ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect });

        result.Should().BeFalse();
    }

    [Fact]
    public void IsAllowed_UserWithoutAnyMembershipInProject_ReturnsFalse()
    {
        var userId = Guid.NewGuid();

        var result = ProjectRolePolicy.IsAllowed(Array.Empty<ProjectMembership>(), userId, new[] { ProjectRole.PL });

        result.Should().BeFalse();
    }

    [Fact]
    public void IsAllowed_MembershipBelongsToDifferentUser_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var memberships = new[] { new ProjectMembership(Guid.NewGuid(), ProjectId, otherUserId, ProjectRole.PL) };

        var result = ProjectRolePolicy.IsAllowed(memberships, userId, new[] { ProjectRole.PL });

        result.Should().BeFalse();
    }
}
