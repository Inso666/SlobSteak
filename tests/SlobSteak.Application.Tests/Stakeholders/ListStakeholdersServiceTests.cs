using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="ListStakeholdersService"/> (US-023, erweitert um US-025, US-072)
/// gegen gemockte <see cref="IStakeholderListQuery"/>/<see cref="IUserRepository"/>/
/// <see cref="ICommunicationTypeRepository"/> — ohne echte Datenbank.</summary>
public class ListStakeholdersServiceTests
{
    private static Mock<ICommunicationTypeRepository> EmptyCommunicationTypeRepository()
    {
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindAllAsync(false, It.IsAny<CancellationToken>())).ReturnsAsync(new List<CommunicationType>());
        return repository;
    }

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
        var service = new ListStakeholdersService(query.Object, userRepository.Object, EmptyCommunicationTypeRepository().Object);

        var result = await service.ListActiveStakeholdersAsync(projectId, ProjectRole.PL);

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
        var service = new ListStakeholdersService(query.Object, new Mock<IUserRepository>().Object, EmptyCommunicationTypeRepository().Object);

        await service.ListActiveStakeholdersAsync(projectId, ProjectRole.PL, "max", StakeholderType.Person, communicationTypeId);

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
        var service = new ListStakeholdersService(query.Object, userRepository.Object, EmptyCommunicationTypeRepository().Object);

        var result = await service.ListActiveStakeholdersAsync(projectId, ProjectRole.PL);

        result.Should().ContainSingle().Which.UpdatedByName.Should().Be("(unbekannter Nutzer)");
    }

    /// <summary>US-072 Akzeptanzkriterium 6/Invariante: für alle vier Projektrollen explizit
    /// verifiziert, dass <c>CommunicationTypeNames</c> ausschließlich für die drei
    /// perspektiv-tragenden Rollen befüllt wird und für <c>User</c> ein leeres Array bleibt.</summary>
    [Theory]
    [InlineData(ProjectRole.PL, true)]
    [InlineData(ProjectRole.Coreteam, true)]
    [InlineData(ProjectRole.Architect, true)]
    [InlineData(ProjectRole.User, false)]
    public async Task ListActiveStakeholdersAsync_CommunicationTypeNames_OnlyPopulatedForPerspectiveRoles(
        ProjectRole callerRole, bool expectPopulated)
    {
        var projectId = Guid.NewGuid();
        var communicationTypeId = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Monthly, CommunicationChannel.Email);

        var query = new Mock<IStakeholderListQuery>();
        query.Setup(q => q.SearchActiveByProjectAsync(projectId, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindAllAsync(false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CommunicationType> { new(communicationTypeId, "Newsletter", isActive: true, DateTimeOffset.UtcNow) });
        var service = new ListStakeholdersService(query.Object, userRepository.Object, communicationTypeRepository.Object);

        var result = await service.ListActiveStakeholdersAsync(projectId, callerRole);

        var item = result.Should().ContainSingle().Which;
        if (expectPopulated)
        {
            item.CommunicationTypeNames.Should().ContainSingle().Which.Should().Be("Newsletter");
            communicationTypeRepository.Verify(r => r.FindAllAsync(false, It.IsAny<CancellationToken>()), Times.Once);
        }
        else
        {
            item.CommunicationTypeNames.Should().BeEmpty();
            communicationTypeRepository.Verify(r => r.FindAllAsync(It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
