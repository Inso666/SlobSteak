using FluentAssertions;
using Moq;
using SlobSteak.Application.Map;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Map;

/// <summary>Tests für <see cref="StakeholderMapComparisonQuery"/> (US-033) gegen gemockte
/// Repositories — ohne echte Datenbank.</summary>
public class StakeholderMapComparisonQueryTests
{
    [Fact]
    public async Task GetForProjectAsync_StakeholderWithAssessmentInBothRoles_ReturnsBothValues()
    {
        var projectId = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Beide Rollen", null, null, null, null, null, null, creator);
        var primaryAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 40, 60, null, creator);
        var secondaryAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.Coreteam, 10, 20, null, creator);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(primaryAssessment);
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.Coreteam, It.IsAny<CancellationToken>()))
            .ReturnsAsync(secondaryAssessment);

        var query = new StakeholderMapComparisonQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.PL, ProjectRole.Coreteam);

        result.Should().HaveCount(1);
        result[0].StakeholderId.Should().Be(stakeholder.Id);
        result[0].Primary.Should().NotBeNull();
        result[0].Primary!.Influence.Value.Should().Be(40);
        result[0].Primary!.Interest.Value.Should().Be(60);
        result[0].Secondary.Should().NotBeNull();
        result[0].Secondary!.Influence.Value.Should().Be(10);
        result[0].Secondary!.Interest.Value.Should().Be(20);
    }

    [Fact]
    public async Task GetForProjectAsync_StakeholderWithAssessmentInOnlyOneRole_ReturnsNullForOtherRole()
    {
        var projectId = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Nur primär", null, null, null, null, null, null, creator);
        var primaryAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 40, 60, null, creator);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(primaryAssessment);
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.Coreteam, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StakeholderAssessment?)null);

        var query = new StakeholderMapComparisonQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.PL, ProjectRole.Coreteam);

        result.Should().HaveCount(1);
        result[0].Primary.Should().NotBeNull();
        result[0].Secondary.Should().BeNull();
    }

    [Fact]
    public async Task GetForProjectAsync_StakeholderWithoutAssessmentInEitherRole_IsExcluded()
    {
        var projectId = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Ohne Assessment", null, null, null, null, null, null, creator);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(stakeholder.Id, It.IsAny<ProjectRole>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StakeholderAssessment?)null);

        var query = new StakeholderMapComparisonQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.PL, ProjectRole.Coreteam);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetForProjectAsync_NoActiveStakeholders_ReturnsEmptyList()
    {
        var projectId = Guid.NewGuid();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder>());

        var query = new StakeholderMapComparisonQuery(stakeholderRepository.Object, new Mock<IStakeholderAssessmentRepository>().Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.PL, ProjectRole.Architect);

        result.Should().BeEmpty();
    }
}
