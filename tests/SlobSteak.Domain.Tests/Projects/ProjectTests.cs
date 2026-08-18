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
}
