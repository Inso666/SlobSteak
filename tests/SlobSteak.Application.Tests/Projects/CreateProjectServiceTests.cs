using FluentAssertions;
using Moq;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Projects;

/// <summary>Tests für <see cref="CreateProjectService"/> (US-014) gegen ein gemocktes
/// <see cref="IProjectRepository"/> — ohne echte Datenbank.</summary>
public class CreateProjectServiceTests
{
    [Fact]
    public async Task CreateProjectAsync_ValidName_CreatesProject_WithActiveStatus()
    {
        var repository = new Mock<IProjectRepository>();
        var service = new CreateProjectService(repository.Object);

        var project = await service.CreateProjectAsync("Projekt Phoenix", "Beschreibung");

        project.Name.Should().Be("Projekt Phoenix");
        project.Status.Should().Be(ProjectStatus.Active);
        repository.Verify(r => r.SaveAsync(project, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateProjectAsync_BlankName_ThrowsProjectNameRequiredError_DoesNotSave()
    {
        var repository = new Mock<IProjectRepository>();
        var service = new CreateProjectService(repository.Object);

        var act = async () => await service.CreateProjectAsync("   ", null);

        await act.Should().ThrowAsync<ProjectNameRequiredError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<Project>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
