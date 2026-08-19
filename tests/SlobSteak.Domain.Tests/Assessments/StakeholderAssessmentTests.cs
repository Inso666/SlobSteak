using FluentAssertions;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Assessments;

/// <summary>Unit-Tests für <see cref="StakeholderAssessment"/> (US-027) — ohne Datenbank,
/// Netzwerk oder Dateisystem.</summary>
public class StakeholderAssessmentTests
{
    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    public void Create_PerspectiveBearingRole_Succeeds(ProjectRole role)
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), role, 50, 60, "Notiz", Guid.NewGuid());

        assessment.Role.Should().Be(role);
        assessment.Influence.Value.Should().Be(50);
        assessment.Interest.Value.Should().Be(60);
        assessment.Version.Should().Be(1);
    }

    [Fact]
    public void Create_RoleUser_ThrowsInvalidAssessmentRoleError()
    {
        var act = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.User, 50, 50, null, Guid.NewGuid());

        act.Should().Throw<InvalidAssessmentRoleError>().Which.Role.Should().Be(ProjectRole.User);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Create_InfluenceOutOfRange_ThrowsInvalidScoreRangeError(int invalidInfluence)
    {
        var act = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, invalidInfluence, 50, null, Guid.NewGuid());

        act.Should().Throw<InvalidScoreRangeError>();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Create_InterestOutOfRange_ThrowsInvalidScoreRangeError(int invalidInterest)
    {
        var act = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 50, invalidInterest, null, Guid.NewGuid());

        act.Should().Throw<InvalidScoreRangeError>();
    }

    [Fact]
    public void Update_ValidExpectedVersion_UpdatesValuesAndIncrementsVersion()
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());
        var updatedBy = Guid.NewGuid();

        assessment.Update(70, 80, "Neu", updatedBy, expectedVersion: 1);

        assessment.Influence.Value.Should().Be(70);
        assessment.Interest.Value.Should().Be(80);
        assessment.Notes.Should().Be("Neu");
        assessment.UpdatedBy.Should().Be(updatedBy);
        assessment.Version.Should().Be(2);
    }

    [Fact]
    public void Update_StaleExpectedVersion_ThrowsStaleAssessmentError_WithoutChangingState()
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());

        var act = () => assessment.Update(70, 80, "Neu", Guid.NewGuid(), expectedVersion: 0);

        act.Should().Throw<StaleAssessmentError>()
            .Which.Should().Match<StaleAssessmentError>(e => e.ExpectedVersion == 0 && e.ActualVersion == 1);
        assessment.Influence.Value.Should().Be(10);
        assessment.Version.Should().Be(1);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Update_InfluenceOutOfRange_ThrowsInvalidScoreRangeError(int invalidInfluence)
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 10, 20, null, Guid.NewGuid());

        var act = () => assessment.Update(invalidInfluence, 50, null, Guid.NewGuid(), expectedVersion: 1);

        act.Should().Throw<InvalidScoreRangeError>();
    }
}
