using FluentAssertions;
using Moq;
using SlobSteak.Application.DistributionLists;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.DistributionLists;

/// <summary>Tests für <see cref="DistributionListQuery"/> (US-041) gegen gemockte
/// <see cref="IStakeholderRepository"/>/<see cref="ICommunicationTypeRepository"/> — ohne echte
/// Datenbank.</summary>
public class DistributionListQueryTests
{
    private static Stakeholder CreateStakeholder(
        Guid projectId, StakeholderType type, string name, string? email = null) =>
        Stakeholder.Create(projectId, type, name, null, null, email, null, null, null, Guid.NewGuid());

    private static (Mock<IStakeholderRepository> StakeholderRepository, Mock<ICommunicationTypeRepository> CommunicationTypeRepository) CreateMocks(
        Guid projectId, IReadOnlyList<Stakeholder> stakeholders, IReadOnlyList<CommunicationType> communicationTypes)
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(stakeholders);

        var communicationTypeRepository = new Mock<ICommunicationTypeRepository>();
        communicationTypeRepository
            .Setup(r => r.FindAllAsync(false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(communicationTypes);

        return (stakeholderRepository, communicationTypeRepository);
    }

    [Fact]
    public async Task GetForProjectAsync_NoFilters_ReturnsOneEntryPerAssignment()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");
        var statusReport = CommunicationType.Create("Statusbericht");

        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna", "anna@example.com");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        anna.AssignCommunication(statusReport.Id, CommunicationFrequency.Weekly, CommunicationChannel.Report);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna }, new List<CommunicationType> { newsletter, statusReport });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, null, null);

        result.Should().HaveCount(2);
        result.Should().Contain(e => e.CommunicationTypeId == newsletter.Id && e.Frequency == CommunicationFrequency.Monthly && e.Channel == CommunicationChannel.Email);
        result.Should().Contain(e => e.CommunicationTypeId == statusReport.Id && e.Frequency == CommunicationFrequency.Weekly && e.Channel == CommunicationChannel.Report);
        result.Should().OnlyContain(e => e.StakeholderId == anna.Id && e.StakeholderName == "Anna" && e.HasEmail);
    }

    [Fact]
    public async Task GetForProjectAsync_FilterByCommunicationTypeId_ReturnsOnlyMatchingAssignment()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");
        var statusReport = CommunicationType.Create("Statusbericht");

        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna", "anna@example.com");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        anna.AssignCommunication(statusReport.Id, CommunicationFrequency.Weekly, CommunicationChannel.Report);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna }, new List<CommunicationType> { newsletter, statusReport });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, newsletter.Id, null, null, null);

        result.Should().ContainSingle();
        result[0].CommunicationTypeId.Should().Be(newsletter.Id);
        result[0].CommunicationTypeName.Should().Be("Newsletter");
    }

    [Fact]
    public async Task GetForProjectAsync_FilterByFrequency_ReturnsOnlyMatching()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");

        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        var tom = CreateStakeholder(projectId, StakeholderType.Person, "Tom");
        tom.AssignCommunication(newsletter.Id, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna, tom }, new List<CommunicationType> { newsletter });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, CommunicationFrequency.Weekly, null, null);

        result.Should().ContainSingle();
        result[0].StakeholderName.Should().Be("Tom");
    }

    [Fact]
    public async Task GetForProjectAsync_FilterByChannel_ReturnsOnlyMatching()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");

        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        var tom = CreateStakeholder(projectId, StakeholderType.Person, "Tom");
        tom.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Meeting);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna, tom }, new List<CommunicationType> { newsletter });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, CommunicationChannel.Meeting, null);

        result.Should().ContainSingle();
        result[0].StakeholderName.Should().Be("Tom");
    }

    [Fact]
    public async Task GetForProjectAsync_FilterByStakeholderType_ReturnsOnlyMatching()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");

        var person = CreateStakeholder(projectId, StakeholderType.Person, "Anna");
        person.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        var organization = CreateStakeholder(projectId, StakeholderType.Organization, "ACME GmbH");
        organization.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { person, organization }, new List<CommunicationType> { newsletter });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, null, StakeholderType.Organization);

        result.Should().ContainSingle();
        result[0].StakeholderName.Should().Be("ACME GmbH");
    }

    [Fact]
    public async Task GetForProjectAsync_CombinedFilters_AppliedAsIntersection()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");
        var statusReport = CommunicationType.Create("Statusbericht");

        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
        anna.AssignCommunication(statusReport.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna }, new List<CommunicationType> { newsletter, statusReport });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email, StakeholderType.Person);

        result.Should().ContainSingle();
        result[0].CommunicationTypeId.Should().Be(newsletter.Id);
    }

    [Fact]
    public async Task GetForProjectAsync_StakeholderWithoutEmail_IncludedWithHasEmailFalse()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");

        var stakeholderWithoutEmail = CreateStakeholder(projectId, StakeholderType.Person, "Ohne E-Mail", email: null);
        stakeholderWithoutEmail.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { stakeholderWithoutEmail }, new List<CommunicationType> { newsletter });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, null, null);

        result.Should().ContainSingle();
        result[0].HasEmail.Should().BeFalse();
        result[0].Email.Should().BeNull();
    }

    [Fact]
    public async Task GetForProjectAsync_StakeholderWithoutAnyAssignment_IsNotIncluded()
    {
        var projectId = Guid.NewGuid();
        var withoutAssignment = CreateStakeholder(projectId, StakeholderType.Person, "Ohne Zuordnung");

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { withoutAssignment }, new List<CommunicationType>());
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, null, null);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetForProjectAsync_NoActiveStakeholders_ReturnsEmptyList()
    {
        var projectId = Guid.NewGuid();
        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder>(), new List<CommunicationType>());
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, null, null, null, null);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetForProjectAsync_NoFilterMatches_ReturnsEmptyList()
    {
        var projectId = Guid.NewGuid();
        var newsletter = CommunicationType.Create("Newsletter");
        var anna = CreateStakeholder(projectId, StakeholderType.Person, "Anna");
        anna.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);

        var (stakeholderRepository, communicationTypeRepository) =
            CreateMocks(projectId, new List<Stakeholder> { anna }, new List<CommunicationType> { newsletter });
        var query = new DistributionListQuery(stakeholderRepository.Object, communicationTypeRepository.Object);

        var result = await query.GetForProjectAsync(projectId, Guid.NewGuid(), null, null, null);

        result.Should().BeEmpty();
    }
}
