using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="ListStakeholdersService"/> (US-023, erweitert um US-025) gegen
/// gemockte <see cref="IStakeholderListQuery"/>/<see cref="IUserRepository"/> — ohne echte
/// Datenbank.</summary>
public class ListStakeholdersServiceTests
{
    [Fact]
    public async Task ListActiveStakeholdersAsync_NoFilters_ResolvesUpdatedByName_ForEachStakeholder()
    {
        var projectId = Guid.NewGuid();
        var updatedBy = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, updatedBy);
        var updater = User.Create("Bearbeiter", $"bearbeiter-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var query = new Mock<IStakeholderListQuery>();
        query.Setup(q => q.SearchActiveByProjectAsync(projectId, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(updatedBy, It.IsAny<CancellationToken>())).ReturnsAsync(updater);
        var service = new ListStakeholdersService(query.Object, userRepository.Object);

        var result = await service.ListActiveStakeholdersAsync(projectId);

        result.Should().ContainSingle().Which.UpdatedByName.Should().Be("Bearbeiter");
    }

    [Fact]
    public async Task ListActiveStakeholdersAsync_WithFilters_PassesThemToQuery()
    {
        var projectId = Guid.NewGuid();
        var communicationTypeId = Guid.NewGuid();
        var query = new Mock<IStakeholderListQuery>();
        query.Setup(q => q.SearchActiveByProjectAsync(
                projectId, "max", StakeholderType.Person, communicationTypeId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder>());
        var service = new ListStakeholdersService(query.Object, new Mock<IUserRepository>().Object);

        await service.ListActiveStakeholdersAsync(projectId, "max", StakeholderType.Person, communicationTypeId);

        query.Verify(q => q.SearchActiveByProjectAsync(
            projectId, "max", StakeholderType.Person, communicationTypeId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListActiveStakeholdersAsync_UnknownUpdater_FallsBackToPlaceholderName()
    {
        var projectId = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var query = new Mock<IStakeholderListQuery>();
        query.Setup(q => q.SearchActiveByProjectAsync(projectId, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var service = new ListStakeholdersService(query.Object, userRepository.Object);

        var result = await service.ListActiveStakeholdersAsync(projectId);

        result.Should().ContainSingle().Which.UpdatedByName.Should().Be("(unbekannter Nutzer)");
    }
}
