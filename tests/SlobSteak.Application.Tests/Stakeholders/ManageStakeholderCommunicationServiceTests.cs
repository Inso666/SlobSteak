using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="ManageStakeholderCommunicationService"/> (US-040) gegen gemockte
/// <see cref="IStakeholderRepository"/>/<see cref="ICommunicationTypeRepository"/> — ohne echte
/// Datenbank.</summary>
public class ManageStakeholderCommunicationServiceTests
{
    private static Stakeholder CreateStakeholder() =>
        Stakeholder.Create(Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

    [Fact]
    public async Task AssignAsync_StakeholderNotFound_ReturnsNull()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stakeholder?)null);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CommunicationType.Create("Statusbericht"));
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await service.AssignAsync(Guid.NewGuid(), Guid.NewGuid(), CommunicationFrequency.Weekly, CommunicationChannel.Email);

        result.Should().BeNull();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AssignAsync_CommunicationTypeNotFound_ReturnsNull()
    {
        var stakeholder = CreateStakeholder();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CommunicationType?)null);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await service.AssignAsync(stakeholder.Id, Guid.NewGuid(), CommunicationFrequency.Weekly, CommunicationChannel.Email);

        result.Should().BeNull();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AssignAsync_ValidStakeholderAndCommunicationType_AssignsAndSaves_ReturnsEnrichedItem()
    {
        var stakeholder = CreateStakeholder();
        var communicationType = CommunicationType.Create("Statusbericht");
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(communicationType);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await service.AssignAsync(stakeholder.Id, communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Meeting);

        result.Should().NotBeNull();
        result!.CommunicationTypeId.Should().Be(communicationType.Id);
        result.CommunicationTypeName.Should().Be("Statusbericht");
        result.CommunicationTypeIsActive.Should().BeTrue();
        result.Frequency.Should().Be(CommunicationFrequency.Monthly);
        result.Channel.Should().Be(CommunicationChannel.Meeting);
        stakeholder.CommunicationAssignments.Should().ContainSingle(a => a.CommunicationTypeId == communicationType.Id);
        stakeholderRepository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AssignAsync_DuplicateAssignment_ThrowsAssignmentAlreadyExistsError()
    {
        var stakeholder = CreateStakeholder();
        var communicationType = CommunicationType.Create("Statusbericht");
        stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(communicationType);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var act = () => service.AssignAsync(stakeholder.Id, communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Report);

        await act.Should().ThrowAsync<AssignmentAlreadyExistsError>();
        stakeholderRepository.Verify(r => r.SaveAsync(It.IsAny<Stakeholder>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_StakeholderNotFound_ReturnsNull()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stakeholder?)null);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var result = await service.UpdateAsync(Guid.NewGuid(), Guid.NewGuid(), CommunicationFrequency.Weekly, CommunicationChannel.Email);

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_NoExistingAssignment_ThrowsAssignmentNotFoundError()
    {
        var stakeholder = CreateStakeholder();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var act = () => service.UpdateAsync(stakeholder.Id, Guid.NewGuid(), CommunicationFrequency.Weekly, CommunicationChannel.Email);

        await act.Should().ThrowAsync<AssignmentNotFoundError>();
    }

    [Fact]
    public async Task UpdateAsync_ExistingAssignment_UpdatesAndSaves_ReturnsEnrichedItem()
    {
        var stakeholder = CreateStakeholder();
        var communicationType = CommunicationType.Create("Statusbericht");
        stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(communicationType);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await service.UpdateAsync(stakeholder.Id, communicationType.Id, CommunicationFrequency.Quarterly, CommunicationChannel.Report);

        result.Should().NotBeNull();
        result!.Frequency.Should().Be(CommunicationFrequency.Quarterly);
        result.Channel.Should().Be(CommunicationChannel.Report);
        result.CommunicationTypeName.Should().Be("Statusbericht");
        stakeholder.CommunicationAssignments.Should().ContainSingle(a =>
            a.CommunicationTypeId == communicationType.Id && a.Frequency == CommunicationFrequency.Quarterly && a.Channel == CommunicationChannel.Report);
        stakeholderRepository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_StakeholderNotFound_ReturnsFalse()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stakeholder?)null);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var result = await service.RemoveAsync(Guid.NewGuid(), Guid.NewGuid());

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RemoveAsync_ExistingAssignment_RemovesAndSaves_ReturnsTrue()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var result = await service.RemoveAsync(stakeholder.Id, communicationTypeId);

        result.Should().BeTrue();
        stakeholder.CommunicationAssignments.Should().BeEmpty();
        stakeholderRepository.Verify(r => r.SaveAsync(stakeholder, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_NoExistingAssignment_IsIdempotent_ReturnsTrue()
    {
        var stakeholder = CreateStakeholder();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var result = await service.RemoveAsync(stakeholder.Id, Guid.NewGuid());

        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetAssignmentsAsync_StakeholderNotFound_ReturnsNull()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stakeholder?)null);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, new Mock<ICommunicationTypeRepository>().Object);

        var result = await service.GetAssignmentsAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAssignmentsAsync_ExistingAssignments_ReturnsEnrichedItems()
    {
        var stakeholder = CreateStakeholder();
        var communicationType = CommunicationType.Create("Statusbericht");
        stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.AdHoc, CommunicationChannel.Report);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholder);
        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository.Setup(r => r.FindByIdAsync(communicationType.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(communicationType);
        var service = new ManageStakeholderCommunicationService(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await service.GetAssignmentsAsync(stakeholder.Id);

        result.Should().ContainSingle();
        result![0].CommunicationTypeId.Should().Be(communicationType.Id);
        result[0].CommunicationTypeName.Should().Be("Statusbericht");
        result[0].Frequency.Should().Be(CommunicationFrequency.AdHoc);
        result[0].Channel.Should().Be(CommunicationChannel.Report);
    }
}
