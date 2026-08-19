using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="CreateStakeholderService"/> (US-021) gegen ein gemocktes
/// <see cref="IStakeholderRepository"/> — ohne echte Datenbank.</summary>
public class CreateStakeholderServiceTests
{
    [Fact]
    public async Task CreateStakeholderAsync_ValidData_SavesStakeholder_NoSimilarWarning()
    {
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindSimilarNameInProjectAsync(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stakeholder?)null);
        var service = new CreateStakeholderService(repository.Object);
        var projectId = Guid.NewGuid();
        var createdBy = Guid.NewGuid();

        var result = await service.CreateStakeholderAsync(
            projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, createdBy);

        result.Stakeholder.Name.Should().Be("Max Mustermann");
        result.SimilarStakeholderWarning.Should().BeNull();
        repository.Verify(r => r.SaveAsync(It.Is<Stakeholder>(s => s.Name == "Max Mustermann"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateStakeholderAsync_SimilarNameExists_ReturnsWarning_ButStillSaves()
    {
        var existingStakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindSimilarNameInProjectAsync(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingStakeholder);
        var service = new CreateStakeholderService(repository.Object);

        var result = await service.CreateStakeholderAsync(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

        result.SimilarStakeholderWarning.Should().NotBeNull();
        result.SimilarStakeholderWarning!.Id.Should().Be(existingStakeholder.Id);
        result.SimilarStakeholderWarning.Name.Should().Be("Max Mustermann");
        repository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateStakeholderAsync_BlankName_ThrowsStakeholderNameRequiredError_DoesNotSave()
    {
        var repository = new Mock<IStakeholderRepository>();
        var service = new CreateStakeholderService(repository.Object);

        var act = async () => await service.CreateStakeholderAsync(
            Guid.NewGuid(), StakeholderType.Person, "   ", null, null, null, null, null, null, Guid.NewGuid());

        await act.Should().ThrowAsync<StakeholderNameRequiredError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateStakeholderAsync_InvalidEmail_ThrowsInvalidEmailFormatError_DoesNotSave()
    {
        var repository = new Mock<IStakeholderRepository>();
        var service = new CreateStakeholderService(repository.Object);

        var act = async () => await service.CreateStakeholderAsync(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, "keine-email", null, null, null, Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidEmailFormatError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
