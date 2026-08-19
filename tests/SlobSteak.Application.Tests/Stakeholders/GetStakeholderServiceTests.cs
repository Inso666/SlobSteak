using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="GetStakeholderService"/> (US-026) gegen einen gemockten
/// <see cref="IStakeholderRepository"/> — ohne echte Datenbank.</summary>
public class GetStakeholderServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ActiveStakeholder_ResolvesUpdatedByName()
    {
        var updatedBy = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, updatedBy);
        var updater = User.Create("Bearbeiter", $"bearbeiter-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(updatedBy, It.IsAny<CancellationToken>())).ReturnsAsync(updater);
        var service = new GetStakeholderService(stakeholderRepository.Object, userRepository.Object);

        var result = await service.GetByIdAsync(stakeholder.Id);

        result.Should().NotBeNull();
        result!.Stakeholder.Should().Be(stakeholder);
        result.UpdatedByName.Should().Be("Bearbeiter");
    }

    [Fact]
    public async Task GetByIdAsync_UnknownOrDeletedStakeholder_ReturnsNull()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), false, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var service = new GetStakeholderService(stakeholderRepository.Object, new Mock<IUserRepository>().Object);

        var result = await service.GetByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }
}
