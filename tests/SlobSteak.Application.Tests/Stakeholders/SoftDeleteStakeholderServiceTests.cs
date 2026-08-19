using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="SoftDeleteStakeholderService"/> (US-023) gegen ein gemocktes
/// <see cref="IStakeholderRepository"/> — ohne echte Datenbank.</summary>
public class SoftDeleteStakeholderServiceTests
{
    [Fact]
    public async Task SoftDeleteAsync_ExistingActiveStakeholder_SetsDeletedAt_ReturnsTrue()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var deletedBy = Guid.NewGuid();
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(stakeholder.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new SoftDeleteStakeholderService(repository.Object);

        var success = await service.SoftDeleteAsync(stakeholder.Id, deletedBy);

        success.Should().BeTrue();
        stakeholder.IsDeleted().Should().BeTrue();
        repository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    // AC 5: erneutes DELETE auf einen bereits gelöschten Stakeholder ist idempotent — deleted_at
    // bleibt beim ursprünglichen Zeitpunkt.
    [Fact]
    public async Task SoftDeleteAsync_AlreadyDeletedStakeholder_IsIdempotent_DoesNotChangeDeletedAt()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());
        var firstDeletedAt = stakeholder.DeletedAt;
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(stakeholder.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new SoftDeleteStakeholderService(repository.Object);

        var success = await service.SoftDeleteAsync(stakeholder.Id, Guid.NewGuid());

        success.Should().BeTrue();
        stakeholder.DeletedAt.Should().Be(firstDeletedAt);
    }

    [Fact]
    public async Task SoftDeleteAsync_NonExistentStakeholder_ReturnsFalse_DoesNotSave()
    {
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), true, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var service = new SoftDeleteStakeholderService(repository.Object);

        var success = await service.SoftDeleteAsync(Guid.NewGuid(), Guid.NewGuid());

        success.Should().BeFalse();
        repository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetDeletionImpactAsync_ExistingStakeholder_ReturnsCounts()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(stakeholder.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        repository.Setup(r => r.GetDeletionImpactAsync(stakeholder.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StakeholderDeletionImpact(3, 2));
        var service = new SoftDeleteStakeholderService(repository.Object);

        var impact = await service.GetDeletionImpactAsync(stakeholder.Id);

        impact.Should().Be(new StakeholderDeletionImpact(3, 2));
    }

    [Fact]
    public async Task GetDeletionImpactAsync_NonExistentStakeholder_ReturnsNull()
    {
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), true, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var service = new SoftDeleteStakeholderService(repository.Object);

        var impact = await service.GetDeletionImpactAsync(Guid.NewGuid());

        impact.Should().BeNull();
    }
}
