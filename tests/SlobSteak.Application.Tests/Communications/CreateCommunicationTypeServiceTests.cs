using FluentAssertions;
using Moq;
using SlobSteak.Application.Communications;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Communications;

/// <summary>Tests für <see cref="CreateCommunicationTypeService"/> (US-037) gegen ein gemocktes
/// <see cref="ICommunicationTypeRepository"/> — ohne echte Datenbank.</summary>
public class CreateCommunicationTypeServiceTests
{
    [Fact]
    public async Task CreateCommunicationTypeAsync_NewName_CreatesActiveEntry()
    {
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.ExistsByNameAsync("Newsletter", null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = new CreateCommunicationTypeService(repository.Object);

        var communicationType = await service.CreateCommunicationTypeAsync("Newsletter");

        communicationType.Name.Should().Be("Newsletter");
        communicationType.IsActive.Should().BeTrue();
        repository.Verify(r => r.SaveAsync(communicationType, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCommunicationTypeAsync_DuplicateName_ThrowsCommunicationTypeNameAlreadyInUseError_DoesNotSave()
    {
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.ExistsByNameAsync("Newsletter", null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var service = new CreateCommunicationTypeService(repository.Object);

        var act = async () => await service.CreateCommunicationTypeAsync("Newsletter");

        await act.Should().ThrowAsync<CommunicationTypeNameAlreadyInUseError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<CommunicationType>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCommunicationTypeAsync_BlankName_ThrowsCommunicationTypeNameRequiredError_DoesNotSave()
    {
        var repository = new Mock<ICommunicationTypeRepository>();
        repository.Setup(r => r.ExistsByNameAsync("   ", null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = new CreateCommunicationTypeService(repository.Object);

        var act = async () => await service.CreateCommunicationTypeAsync("   ");

        await act.Should().ThrowAsync<CommunicationTypeNameRequiredError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<CommunicationType>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
