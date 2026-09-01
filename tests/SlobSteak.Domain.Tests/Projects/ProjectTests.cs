using FluentAssertions;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Projects;

/// <summary>
/// Unit-Tests für das <see cref="Project"/>-Aggregate (US-010): decken jede in
/// <c>docs/usecases/US-010-project-aggregate.md</c> genannte Verhaltensregel/Invariante ab, ohne
/// Datenbank, Netzwerk oder Dateisystem.
/// </summary>
public class ProjectTests
{
    [Fact]
    public void Create_WithValidName_ProducesInstanceWithActiveStatus()
    {
        var project = Project.Create("Projekt Phoenix", "Beschreibung");

        project.Name.Should().Be("Projekt Phoenix");
        project.Description.Should().Be("Beschreibung");
        project.Status.Should().Be(ProjectStatus.Active);
    }

    [Fact]
    public void Create_WithNullDescription_IsAllowed()
    {
        var project = Project.Create("Projekt Phoenix", null);

        project.Description.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankName_ThrowsProjectNameRequiredError(string blankName)
    {
        var act = () => Project.Create(blankName, null);

        act.Should().Throw<ProjectNameRequiredError>();
    }

    [Fact]
    public void Archive_SetsStatusToArchived()
    {
        var project = Project.Create("Projekt Phoenix", null);

        project.Archive();

        project.Status.Should().Be(ProjectStatus.Archived);
    }

    [Fact]
    public void Reactivate_AfterArchive_SetsStatusBackToActive()
    {
        var project = Project.Create("Projekt Phoenix", null);
        project.Archive();

        project.Reactivate();

        project.Status.Should().Be(ProjectStatus.Active);
    }

    // US-076 Akzeptanzkriterium 1: UpdatedAt ist initial gleich CreatedAt und wird durch
    // Archive/Reactivate aktualisiert (AssignMember/ChangeMemberRole/RemoveMember siehe
    // ProjectMembershipTests, da sie eine bestehende Mitgliedschaft voraussetzen).

    [Fact]
    public void Create_SetsUpdatedAtEqualToCreatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);

        project.UpdatedAt.Should().Be(project.CreatedAt);
    }

    [Fact]
    public void Archive_UpdatesUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var initialUpdatedAt = project.UpdatedAt;
        Thread.Sleep(5);

        project.Archive();

        project.UpdatedAt.Should().BeAfter(initialUpdatedAt);
    }

    [Fact]
    public void Reactivate_UpdatesUpdatedAt()
    {
        var project = Project.Create("Projekt Phoenix", null);
        project.Archive();
        var updatedAtAfterArchive = project.UpdatedAt;
        Thread.Sleep(5);

        project.Reactivate();

        project.UpdatedAt.Should().BeAfter(updatedAtAfterArchive);
    }
}
