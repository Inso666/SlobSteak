using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="UpdateStakeholderDetailsService"/> (US-022) gegen gemockte
/// <see cref="IStakeholderRepository"/>/<see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class UpdateStakeholderDetailsServiceTests
{
    [Fact]
    public async Task UpdateStakeholderDetailsAsync_ExistingStakeholder_UpdatesAndResolvesUpdatedByName()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Alter Name", null, null, null, null, null, null, Guid.NewGuid());
        var updatedBy = Guid.NewGuid();
        var updater = User.Create("Bearbeiter", $"bearbeiter-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(updatedBy, It.IsAny<CancellationToken>())).ReturnsAsync(updater);
        var service = new UpdateStakeholderDetailsService(stakeholderRepository.Object, userRepository.Object);

        var result = await service.UpdateStakeholderDetailsAsync(
            stakeholder.Id, StakeholderType.Person, "Neuer Name", null, null, null, null, null, null, updatedBy);

        result.Should().NotBeNull();
        result!.Stakeholder.Name.Should().Be("Neuer Name");
        result.Stakeholder.UpdatedBy.Should().Be(updatedBy);
        result.UpdatedByName.Should().Be("Bearbeiter");
        stakeholderRepository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateStakeholderDetailsAsync_NonExistentOrDeletedStakeholder_ReturnsNull_DoesNotSave()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), false, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var service = new UpdateStakeholderDetailsService(stakeholderRepository.Object, new Mock<IUserRepository>().Object);

        var result = await service.UpdateStakeholderDetailsAsync(
            Guid.NewGuid(), StakeholderType.Person, "Neuer Name", null, null, null, null, null, null, Guid.NewGuid());

        result.Should().BeNull();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStakeholderDetailsAsync_BlankName_ThrowsStakeholderNameRequiredError_DoesNotSave()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Alter Name", null, null, null, null, null, null, Guid.NewGuid());
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new UpdateStakeholderDetailsService(stakeholderRepository.Object, new Mock<IUserRepository>().Object);

        var act = async () => await service.UpdateStakeholderDetailsAsync(
            stakeholder.Id, StakeholderType.Person, "   ", null, null, null, null, null, null, Guid.NewGuid());

        await act.Should().ThrowAsync<StakeholderNameRequiredError>();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStakeholderDetailsAsync_InvalidEmail_ThrowsInvalidEmailFormatError_DoesNotSave()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Alter Name", null, null, null, null, null, null, Guid.NewGuid());
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new UpdateStakeholderDetailsService(stakeholderRepository.Object, new Mock<IUserRepository>().Object);

        var act = async () => await service.UpdateStakeholderDetailsAsync(
            stakeholder.Id, StakeholderType.Person, "Name", null, null, "keine-email", null, null, null, Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidEmailFormatError>();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
