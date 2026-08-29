using FluentAssertions;
using Moq;
using SlobSteak.Application.Communications;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Communications;

/// <summary>Tests für <see cref="UpdateCommunicationTypeService"/> (US-037) gegen ein gemocktes
/// <see cref="ICommunicationTypeRepository"/> — ohne echte Datenbank.</summary>
public class UpdateCommunicationTypeServiceTests
{
    [Fact]
    public async Task UpdateAsync_UnknownId_ReturnsNull()
    {
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((CommunicationType?)null);

        var service = new UpdateCommunicationTypeService(repository.Object);

        var result = await service.UpdateAsync(Guid.NewGuid(), "Statusbericht", isActive: null);

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_WithNewName_RenamesEntry()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(communicationType);
        repository.Setup(r => r.ExistsByNameAsync("Statusbericht", communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = new UpdateCommunicationTypeService(repository.Object);

        var result = await service.UpdateAsync(communicationType.Id, "Statusbericht", isActive: null);

        result!.Name.Should().Be("Statusbericht");
        repository.Verify(r => r.SaveAsync(communicationType, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WithNameCollidingWithAnotherEntry_ThrowsCommunicationTypeNameAlreadyInUseError()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(communicationType);
        repository.Setup(r => r.ExistsByNameAsync("Statusbericht", communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var service = new UpdateCommunicationTypeService(repository.Object);

        var act = async () => await service.UpdateAsync(communicationType.Id, "Statusbericht", isActive: null);

        await act.Should().ThrowAsync<CommunicationTypeNameAlreadyInUseError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<CommunicationType>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_WithIsActiveFalse_DeactivatesEntry_WithoutRemovingIt()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(communicationType);

        var service = new UpdateCommunicationTypeService(repository.Object);

        var result = await service.UpdateAsync(communicationType.Id, name: null, isActive: false);

        result!.IsActive.Should().BeFalse();
        result.Name.Should().Be("Newsletter");
        repository.Verify(r => r.SaveAsync(communicationType, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WithIsActiveTrue_ReactivatesEntry()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        communicationType.Deactivate();
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>())).ReturnsAsync(communicationType);

        var service = new UpdateCommunicationTypeService(repository.Object);

        var result = await service.UpdateAsync(communicationType.Id, name: null, isActive: true);

        result!.IsActive.Should().BeTrue();
    }
}
