using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="RestoreStakeholderService"/> (US-024) gegen einen gemockten
/// <see cref="IStakeholderRepository"/> — ohne echte Datenbank.</summary>
public class RestoreStakeholderServiceTests
{
    [Fact]
    public async Task RestoreAsync_DeletedStakeholder_ClearsDeletedAtAndSaves()
    {
        var stakeholder = Stakeholder.Create(Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(stakeholder.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new RestoreStakeholderService(repository.Object);

        var success = await service.RestoreAsync(stakeholder.Id);

        success.Should().BeTrue();
        stakeholder.IsDeleted().Should().BeFalse();
        repository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RestoreAsync_AlreadyActiveStakeholder_IsIdempotent_StillReturnsTrue()
    {
        var stakeholder = Stakeholder.Create(Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(stakeholder.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var service = new RestoreStakeholderService(repository.Object);

        var success = await service.RestoreAsync(stakeholder.Id);

        success.Should().BeTrue();
        stakeholder.IsDeleted().Should().BeFalse();
    }

    [Fact]
    public async Task RestoreAsync_UnknownStakeholder_ReturnsFalse_WithoutSaving()
    {
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), true, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var service = new RestoreStakeholderService(repository.Object);

        var success = await service.RestoreAsync(Guid.NewGuid());

        success.Should().BeFalse();
        repository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
