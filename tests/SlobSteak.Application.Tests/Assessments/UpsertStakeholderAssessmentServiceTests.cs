using FluentAssertions;
using Moq;
using SlobSteak.Application.Assessments;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Assessments;

/// <summary>Tests für <see cref="UpsertStakeholderAssessmentService"/> (US-028) gegen gemockte
/// <see cref="IStakeholderAssessmentRepository"/>/<see cref="IUserRepository"/> — ohne echte
/// Datenbank.</summary>
public class UpsertStakeholderAssessmentServiceTests
{
    [Fact]
    public async Task UpsertAsync_NoExistingAssessment_CreatesNew_ReturnsWasCreatedTrue()
    {
        var stakeholderId = Guid.NewGuid();
        var updatedBy = Guid.NewGuid();
        var updater = User.Create("Bewerter", $"bewerter-{Guid.NewGuid():N}@example.com", "correct-horse-battery");

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository.Setup(r => r.FindByStakeholderAndRoleAsync(stakeholderId, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StakeholderAssessment?)null);
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.FindByIdAsync(updatedBy, It.IsAny<CancellationToken>())).ReturnsAsync(updater);
        var service = new UpsertStakeholderAssessmentService(assessmentRepository.Object, userRepository.Object);

        var result = await service.UpsertAsync(stakeholderId, ProjectRole.PL, 40, 60, "Notiz", expectedVersion: null, updatedBy);

        result.WasCreated.Should().BeTrue();
        result.Assessment.Influence.Value.Should().Be(40);
        result.UpdatedByName.Should().Be("Bewerter");
        assessmentRepository.Verify(r => r.SaveAsync(It.IsAny<StakeholderAssessment>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpsertAsync_ExistingAssessment_WithMatchingExpectedVersion_Updates_ReturnsWasCreatedFalse()
    {
        var stakeholderId = Guid.NewGuid();
        var existing = StakeholderAssessment.Create(stakeholderId, ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());
        var updatedBy = Guid.NewGuid();

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository.Setup(r => r.FindByStakeholderAndRoleAsync(stakeholderId, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        var userRepository = new Mock<IUserRepository>();
        var service = new UpsertStakeholderAssessmentService(assessmentRepository.Object, userRepository.Object);

        var result = await service.UpsertAsync(stakeholderId, ProjectRole.PL, 90, 95, "Neu", expectedVersion: 1, updatedBy);

        result.WasCreated.Should().BeFalse();
        result.Assessment.Influence.Value.Should().Be(90);
        result.Assessment.Version.Should().Be(2);
    }

    [Fact]
    public async Task UpsertAsync_ExistingAssessment_WithoutExpectedVersion_SkipsConflictCheck()
    {
        var stakeholderId = Guid.NewGuid();
        var existing = StakeholderAssessment.Create(stakeholderId, ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());
        existing.Update(30, 40, "Zwischenzeitlich geändert", Guid.NewGuid(), expectedVersion: 1); // Version ist jetzt 2

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository.Setup(r => r.FindByStakeholderAndRoleAsync(stakeholderId, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        var service = new UpsertStakeholderAssessmentService(assessmentRepository.Object, new Mock<IUserRepository>().Object);

        var result = await service.UpsertAsync(stakeholderId, ProjectRole.PL, 70, 80, "Überschrieben", expectedVersion: null, Guid.NewGuid());

        result.Assessment.Influence.Value.Should().Be(70);
        result.Assessment.Version.Should().Be(3);
    }

    [Fact]
    public async Task UpsertAsync_ExistingAssessment_WithMismatchedExpectedVersion_ThrowsStaleAssessmentError()
    {
        var stakeholderId = Guid.NewGuid();
        var existing = StakeholderAssessment.Create(stakeholderId, ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());

        var assessmentRepository = new Mock<IStakeholderAssessmentRepository>();
        assessmentRepository.Setup(r => r.FindByStakeholderAndRoleAsync(stakeholderId, ProjectRole.PL, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        var service = new UpsertStakeholderAssessmentService(assessmentRepository.Object, new Mock<IUserRepository>().Object);

        var act = () => service.UpsertAsync(stakeholderId, ProjectRole.PL, 70, 80, null, expectedVersion: 99, Guid.NewGuid());

        await act.Should().ThrowAsync<StaleAssessmentError>();
        assessmentRepository.Verify(r => r.SaveAsync(It.IsAny<StakeholderAssessment>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
