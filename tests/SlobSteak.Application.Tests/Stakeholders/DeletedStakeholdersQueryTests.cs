using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="DeletedStakeholdersQuery"/> (US-024) gegen gemockte
/// <see cref="IStakeholderRepository"/>/<see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class DeletedStakeholdersQueryTests
{
    [Fact]
    public async Task ListDeletedStakeholdersAsync_ResolvesUpdatedByNameAndDeletedByName()
    {
        var projectId = Guid.NewGuid();
        var updatedBy = Guid.NewGuid();
        var deletedBy = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, updatedBy);
        stakeholder.SoftDelete(deletedBy);
        var updater = User.Create("Bearbeiter", $"bearbeiter-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        var deleter = User.Create("Löscher", $"loescher-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindDeletedByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(updatedBy, It.IsAny<CancellationToken>())).ReturnsAsync(updater);
        userRepository.Setup(r => r.FindByIdAsync(deletedBy, It.IsAny<CancellationToken>())).ReturnsAsync(deleter);
        var query = new DeletedStakeholdersQuery(stakeholderRepository.Object, userRepository.Object);

        var result = await query.ListDeletedStakeholdersAsync(projectId);

        var item = result.Should().ContainSingle().Subject;
        item.UpdatedByName.Should().Be("Bearbeiter");
        item.DeletedByName.Should().Be("Löscher");
    }

    [Fact]
    public async Task ListDeletedStakeholdersAsync_UnknownDeleter_FallsBackToPlaceholderName()
    {
        var projectId = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindDeletedByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var query = new DeletedStakeholdersQuery(stakeholderRepository.Object, userRepository.Object);

        var result = await query.ListDeletedStakeholdersAsync(projectId);

        result.Should().ContainSingle().Which.DeletedByName.Should().Be("(unbekannter Nutzer)");
    }
}
