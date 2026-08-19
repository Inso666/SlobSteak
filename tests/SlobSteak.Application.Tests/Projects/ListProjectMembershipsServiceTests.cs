using FluentAssertions;
using Moq;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Tests.Projects;

/// <summary>Tests für <see cref="ListProjectMembershipsService"/> (US-017) gegen gemockte
/// <see cref="IProjectRepository"/>/<see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class ListProjectMembershipsServiceTests
{
    [Fact]
    public async Task ListMembershipsAsync_UnknownProject_ReturnsNull()
    {
        var projectRepository = new Mock<IProjectRepository>();
        projectRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Project?)null);
        var service = new ListProjectMembershipsService(projectRepository.Object, new Mock<IUserRepository>().Object);

        var result = await service.ListMembershipsAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task ListMembershipsAsync_ResolvesUserNameAndEmail_ForEachMembership()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var user = User.Create("Max Mustermann", "max@example.com", "correct-horse-battery-staple");
        project.AssignMember(user.Id, ProjectRole.PL);

        var projectRepository = new Mock<IProjectRepository>();
        projectRepository.Setup(r => r.FindByIdAsync(project.Id, It.IsAny<CancellationToken>())).ReturnsAsync(project);
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var service = new ListProjectMembershipsService(projectRepository.Object, userRepository.Object);

        var result = await service.ListMembershipsAsync(project.Id);

        result.Should().ContainSingle().Which.Should().BeEquivalentTo(
            new ProjectMembershipDetail(user.Id, "Max Mustermann", "max@example.com", ProjectRole.PL));
    }

    [Fact]
    public async Task ListMembershipsAsync_UserNoLongerExists_FallsBackToPlaceholderName()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var unknownUserId = Guid.NewGuid();
        project.AssignMember(unknownUserId, ProjectRole.User);

        var projectRepository = new Mock<IProjectRepository>();
        projectRepository.Setup(r => r.FindByIdAsync(project.Id, It.IsAny<CancellationToken>())).ReturnsAsync(project);
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(unknownUserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var service = new ListProjectMembershipsService(projectRepository.Object, userRepository.Object);

        var result = await service.ListMembershipsAsync(project.Id);

        result.Should().ContainSingle().Which.UserName.Should().Be("(unbekannter Nutzer)");
    }
}
