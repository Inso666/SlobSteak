using FluentAssertions;
using Moq;
using SlobSteak.Application.Assessments;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Assessments;

/// <summary>Tests für <see cref="GetStakeholderAssessmentsQuery"/> (US-028) gegen gemockte
/// Repositories — ohne echte Datenbank.</summary>
public class GetStakeholderAssessmentsQueryTests
{
    [Fact]
    public async Task GetForStakeholderAsync_UnknownStakeholder_ReturnsNull()
    {
        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), false, It.IsAny<CancellationToken>())).ReturnsAsync((Stakeholder?)null);
        var query = new GetStakeholderAssessmentsQuery(
            stakeholderRepository.Object, new Mock<IStakeholderAssessmentRepository>().Object,
            new Mock<IProjectRepository>().Object, new Mock<IUserRepository>().Object);

        var result = await query.GetForStakeholderAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetForStakeholderAsync_MixesAssessedNotAssessedAndNoRoleAssigned()
    {
        var creator = Guid.NewGuid();
        var stakeholder = Stakeholder.Create(Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, creator);

        var project = Project.Create("Projekt Phoenix", null);
        var plUserId = Guid.NewGuid();
        var coreteamUserId = Guid.NewGuid();
        project.AssignMember(plUserId, ProjectRole.PL);
        project.AssignMember(coreteamUserId, ProjectRole.Coreteam);
        // Architect ist bewusst NICHT zugewiesen -> NO_ROLE_ASSIGNED erwartet.

        var plAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 80, 90, "PL-Sicht", plUserId);
        var updater = User.Create("PL Nutzer", $"pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var stakeholderRepository = new Mock<IStakeholderRepository>();
        stakeholderRepository.Setup(r => r.FindByIdAsync(stakeholder.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholder);
        var projectRepository = new Mock<IProjectRepository>();
        projectRepository.Setup(r => r.FindByIdAsync(stakeholder.ProjectId, It.IsAny<CancellationToken>())).ReturnsAsync(project);
        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository.Setup(r => r.FindAllByStakeholderAsync(stakeholder.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StakeholderAssessment> { plAssessment });
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(plUserId, It.IsAny<CancellationToken>())).ReturnsAsync(updater);

        var query = new GetStakeholderAssessmentsQuery(
            stakeholderRepository.Object, assessmentRepository.Object, projectRepository.Object, userRepository.Object);

        var result = await query.GetForStakeholderAsync(stakeholder.Id);

        result.Should().NotBeNull().And.HaveCount(3);
        var items = result!;
        items.Single(i => i.Role == ProjectRole.PL).Status.Should().Be(AssessmentRoleStatus.Assessed);
        items.Single(i => i.Role == ProjectRole.PL).UpdatedByName.Should().Be("PL Nutzer");
        items.Single(i => i.Role == ProjectRole.Coreteam).Status.Should().Be(AssessmentRoleStatus.NotAssessed);
        items.Single(i => i.Role == ProjectRole.Architect).Status.Should().Be(AssessmentRoleStatus.NoRoleAssigned);
    }
}
