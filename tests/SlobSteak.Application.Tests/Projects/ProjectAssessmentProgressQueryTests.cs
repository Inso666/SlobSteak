using FluentAssertions;
using Moq;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Projects;

/// <summary>Tests für <see cref="ProjectAssessmentProgressQuery"/> (US-076) gegen gemockte
/// Repositories — ohne echte Datenbank. Deckt Akzeptanzkriterium 2/8 ab: korrekte, gerundete
/// Prozent-Berechnung je Rolle inklusive der Randfälle „0 aktive Stakeholder" (keine Division durch
/// 0), „0 %" (kein Assessment) und „100 %" (vollständige Bewertung).</summary>
public class ProjectAssessmentProgressQueryTests
{
    private static Stakeholder NewActiveStakeholder(Guid projectId, string name) =>
        Stakeholder.Create(projectId, StakeholderType.Person, name, null, null, null, null, null, null, Guid.NewGuid());

    [Fact]
    public async Task GetForProjectAsync_NoActiveStakeholders_ReturnsZeroPercentForAllRolesWithoutDivisionByZero()
    {
        var projectId = Guid.NewGuid();
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder>());

        var query = new ProjectAssessmentProgressQuery(stakeholderRepository.Object, new Mock<IStakeholderAssessmentRepository>().Object);

        var act = () => query.GetForProjectAsync(projectId);

        var result = await act.Should().NotThrowAsync();
        result.Subject.Pl.Should().Be(new RoleAssessmentProgress(0, 0));
        result.Subject.Coreteam.Should().Be(new RoleAssessmentProgress(0, 0));
        result.Subject.Architect.Should().Be(new RoleAssessmentProgress(0, 0));
    }

    [Fact]
    public async Task GetForProjectAsync_NoAssessmentsForRole_ReturnsZeroPercent()
    {
        var projectId = Guid.NewGuid();
        var stakeholder = NewActiveStakeholder(projectId, "Unbewertet");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { stakeholder });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(stakeholder.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment>());

        var query = new ProjectAssessmentProgressQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId);

        result.Pl.Should().Be(new RoleAssessmentProgress(0, 1));
    }

    [Fact]
    public async Task GetForProjectAsync_AllActiveStakeholdersAssessedForRole_Returns100Percent()
    {
        var projectId = Guid.NewGuid();
        var updater = Guid.NewGuid();
        var first = NewActiveStakeholder(projectId, "Erster");
        var second = NewActiveStakeholder(projectId, "Zweiter");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { first, second });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(first.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment> { StakeholderAssessment.Create(first.Id, ProjectRole.Coreteam, 10, 20, null, updater) });
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(second.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment> { StakeholderAssessment.Create(second.Id, ProjectRole.Coreteam, 30, 40, null, updater) });

        var query = new ProjectAssessmentProgressQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId);

        result.Coreteam.Should().Be(new RoleAssessmentProgress(100, 0));
    }

    [Fact]
    public async Task GetForProjectAsync_PartialAssessments_ReturnsRoundedPercentPerRole()
    {
        var projectId = Guid.NewGuid();
        var updater = Guid.NewGuid();
        var assessedForArchitect = NewActiveStakeholder(projectId, "Bewertet");
        var unassessed1 = NewActiveStakeholder(projectId, "Unbewertet1");
        var unassessed2 = NewActiveStakeholder(projectId, "Unbewertet2");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository
            .Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Stakeholder> { assessedForArchitect, unassessed1, unassessed2 });

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(assessedForArchitect.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment> { StakeholderAssessment.Create(assessedForArchitect.Id, ProjectRole.Architect, 50, 50, null, updater) });
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(unassessed1.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment>());
        assessmentRepository
            .Setup(r => r.FindAllByStakeholderAsync(unassessed2.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment>());

        var query = new ProjectAssessmentProgressQuery(stakeholderRepository.Object, assessmentRepository.Object);

        var result = await query.GetForProjectAsync(projectId);

        // 1 von 3 aktiven Stakeholdern bewertet ≈ 33,33 % → kaufmännisch gerundet 33 %.
        result.Architect.Should().Be(new RoleAssessmentProgress(33, 2));
    }
}
