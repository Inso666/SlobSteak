using FluentAssertions;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Projects;

/// <summary>
/// Unit-Tests für die Mitgliederverwaltung des <see cref="Project"/>-Aggregates (US-011): decken
/// jede in <c>docs/usecases/US-011-project-membership.md</c> genannte Verhaltensregel/Invariante
/// ab, ohne Datenbank, Netzwerk oder Dateisystem (CLAUDE.md Kernregel 2). Die DB-gestützten
/// Akzeptanzkriterien (Unberührtheit von Stakeholder-Assessments bei Removal, Unique-Constraint
/// bei parallelem Zugriff) laufen als Integrationstest im Story-Test
/// <c>US011_ProjectMembershipTests</c>.
/// </summary>
public class ProjectMembershipTests
{
    [Fact]
    public void AssignMember_NewUser_AddsMembershipWithGivenRole()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();

        project.AssignMember(userId, ProjectRole.PL);

        project.Memberships.Should().ContainSingle(m => m.UserId == userId && m.Role == ProjectRole.PL);
    }

    [Fact]
    public void AssignMember_UserAlreadyMember_ThrowsMembershipAlreadyExistsError()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);

        var act = () => project.AssignMember(userId, ProjectRole.Coreteam);

        act.Should().Throw<MembershipAlreadyExistsError>();
    }

    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    [InlineData(ProjectRole.User)]
    public void AssignMember_AcceptsAllFourProjectRoleValues(ProjectRole role)
    {
        var project = Project.Create("Projekt Phoenix", null);

        var act = () => project.AssignMember(Guid.NewGuid(), role);

        act.Should().NotThrow();
    }

    [Fact]
    public void ChangeMemberRole_ExistingMembership_UpdatesRole()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);

        project.ChangeMemberRole(userId, ProjectRole.Architect);

        project.Memberships.Should().ContainSingle(m => m.UserId == userId && m.Role == ProjectRole.Architect);
    }

    [Fact]
    public void ChangeMemberRole_NoExistingMembership_ThrowsMembershipNotFoundError()
    {
        var project = Project.Create("Projekt Phoenix", null);

        var act = () => project.ChangeMemberRole(Guid.NewGuid(), ProjectRole.Architect);

        act.Should().Throw<MembershipNotFoundError>();
    }

    [Fact]
    public void RemoveMember_ExistingMembership_RemovesIt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);

        project.RemoveMember(userId);

        project.Memberships.Should().NotContain(m => m.UserId == userId);
    }

    [Fact]
    public void RemoveMember_NoExistingMembership_IsIdempotent_DoesNotThrow()
    {
        var project = Project.Create("Projekt Phoenix", null);

        var act = () => project.RemoveMember(Guid.NewGuid());

        act.Should().NotThrow();
    }

    [Fact]
    public void AssignMember_AfterRemoveMember_ForSameUser_IsAllowedAgain()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);
        project.RemoveMember(userId);

        var act = () => project.AssignMember(userId, ProjectRole.User);

        act.Should().NotThrow();
    }

    // US-076 Akzeptanzkriterium 1: AssignMember/ChangeMemberRole/RemoveMember aktualisieren
    // Project.UpdatedAt — RemoveMember jedoch nur bei tatsächlicher Entfernung (Idempotenz).

    [Fact]
    public void AssignMember_UpdatesUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var initialUpdatedAt = project.UpdatedAt;
        Thread.Sleep(5);

        project.AssignMember(Guid.NewGuid(), ProjectRole.PL);

        project.UpdatedAt.Should().BeAfter(initialUpdatedAt);
    }

    [Fact]
    public void ChangeMemberRole_UpdatesUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);
        var updatedAtAfterAssign = project.UpdatedAt;
        Thread.Sleep(5);

        project.ChangeMemberRole(userId, ProjectRole.Architect);

        project.UpdatedAt.Should().BeAfter(updatedAtAfterAssign);
    }

    [Fact]
    public void RemoveMember_ExistingMembership_UpdatesUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);
        var updatedAtAfterAssign = project.UpdatedAt;
        Thread.Sleep(5);

        project.RemoveMember(userId);

        project.UpdatedAt.Should().BeAfter(updatedAtAfterAssign);
    }

    [Fact]
    public void RemoveMember_NoExistingMembership_DoesNotChangeUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var initialUpdatedAt = project.UpdatedAt;
        Thread.Sleep(5);

        project.RemoveMember(Guid.NewGuid());

        project.UpdatedAt.Should().Be(initialUpdatedAt);
    }
}
