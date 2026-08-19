using FluentAssertions;
using Moq;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Application.Tests.Projects;

/// <summary>Tests für <see cref="ListProjectsService"/> (US-017) gegen ein gemocktes
/// <see cref="IProjectRepository"/> — ohne echte Datenbank.</summary>
public class ListProjectsServiceTests
{
    [Fact]
    public async Task ListProjectsAsync_DelegatesToRepository_FindAllAsync()
    {
        var projects = new List<Project> { Project.Create("Projekt A", null), Project.Create("Projekt B", "Beschreibung") };
        var repository = new Mock<IProjectRepository>();
        repository.Setup(r => r.FindAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(projects);
        var service = new ListProjectsService(repository.Object);

        var result = await service.ListProjectsAsync();

        result.Should().BeEquivalentTo(projects);
    }
}
