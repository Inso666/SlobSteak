using FluentAssertions;
using Moq;
using SlobSteak.Application.Map;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Map;

/// <summary>Tests für <see cref="StakeholderMapQuery"/> (US-031) gegen gemockte Repositories — ohne
/// echte Datenbank.</summary>
public class StakeholderMapQueryTests
{
    [Fact]
    public async Task GetForProjectAsync_ReturnsOnlyStakeholdersWithAssessmentInPerspective()
    {
        var projectId = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var assessedStakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Bewertet", null, null, null, null, null, null, creator);
        var unassessedStakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Unbewertet", null, null, null, null, null, null, creator);
        var assessment = StakeholderAssessment.Create(assessedStakeholder.Id, ProjectRole.PL, 40, 60, null, creator);

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { assessedStakeholder, unassessedStakeholder });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(assessedStakeholder.Id, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(assessment);
        assessmentRepository
            .Setup(r => r.FindByStakeholderAndRoleAsync(unassessedStakeholder.Id, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StakeholderAssessment?)null);

        var query = new StakeholderMapQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.PL);

        result.Should().HaveCount(1);
        result[0].StakeholderId.Should().Be(assessedStakeholder.Id);
        result[0].Name.Should().Be("Bewertet");
        result[0].Influence.Value.Should().Be(40);
        result[0].Interest.Value.Should().Be(60);
    }

    [Fact]
    public async Task GetForProjectAsync_NoActiveStakeholders_ReturnsEmptyList()
    {
        var projectId = Guid.NewGuid();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder>());

        var query = new StakeholderMapQuery(stakeholderRepository.Object, new Mock<IStakeholderAssessmentRepository>().Object);

        var result = await query.GetForProjectAsync(projectId, ProjectRole.Architect);

        result.Should().BeEmpty();
    }
}
