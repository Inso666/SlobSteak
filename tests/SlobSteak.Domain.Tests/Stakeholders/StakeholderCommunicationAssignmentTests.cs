using FluentAssertions;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Domain.Tests.Stakeholders;

/// <summary>
/// Unit-Tests für die Kommunikationszuordnungs-Verwaltung des <see cref="Stakeholder"/>-Aggregates
/// (US-039) — ohne Datenbank, Netzwerk oder Dateisystem (CLAUDE.md Abschnitt 2). Die DB-gestützten
/// Akzeptanzkriterien (Unique-Constraint bei parallelem Zugriff) laufen als Integrationstest im
/// Story-Test <c>US039_CommunicationAssignmentEntityTests</c>.
/// </summary>
public class StakeholderCommunicationAssignmentTests
{
    private static Stakeholder CreateStakeholder() =>
        Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

    [Fact]
    public void AssignCommunication_NewCommunicationType_AddsAssignmentWithGivenFrequencyAndChannel()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();

        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        stakeholder.CommunicationAssignments.Should().ContainSingle(a =>
            a.CommunicationTypeId == communicationTypeId &&
            a.Frequency == CommunicationFrequency.Weekly &&
            a.Channel == CommunicationChannel.Email &&
            a.StakeholderId == stakeholder.Id);
    }

    [Fact]
    public void AssignCommunication_DuplicateCommunicationType_ThrowsAssignmentAlreadyExistsError()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        var act = () => stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Monthly, CommunicationChannel.Meeting);

        act.Should().Throw<AssignmentAlreadyExistsError>();
        // Die ursprüngliche Zuordnung bleibt unverändert (kein teilweiser Effekt).
        stakeholder.CommunicationAssignments.Should().ContainSingle(a =>
            a.CommunicationTypeId == communicationTypeId && a.Frequency == CommunicationFrequency.Weekly);
    }

    [Fact]
    public void AssignCommunication_DifferentCommunicationTypes_AddsMultipleAssignments()
    {
        var stakeholder = CreateStakeholder();
        var firstTypeId = Guid.NewGuid();
        var secondTypeId = Guid.NewGuid();

        stakeholder.AssignCommunication(firstTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);
        stakeholder.AssignCommunication(secondTypeId, CommunicationFrequency.AdHoc, CommunicationChannel.Report);

        stakeholder.CommunicationAssignments.Should().HaveCount(2);
    }

    [Fact]
    public void UpdateCommunicationAssignment_ExistingAssignment_UpdatesFrequencyAndChannel()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        stakeholder.UpdateCommunicationAssignment(communicationTypeId, CommunicationFrequency.Quarterly, CommunicationChannel.Meeting);

        stakeholder.CommunicationAssignments.Should().ContainSingle(a =>
            a.CommunicationTypeId == communicationTypeId &&
            a.Frequency == CommunicationFrequency.Quarterly &&
            a.Channel == CommunicationChannel.Meeting);
    }

    [Fact]
    public void UpdateCommunicationAssignment_NoExistingAssignment_ThrowsAssignmentNotFoundError()
    {
        var stakeholder = CreateStakeholder();

        var act = () => stakeholder.UpdateCommunicationAssignment(Guid.NewGuid(), CommunicationFrequency.Weekly, CommunicationChannel.Email);

        act.Should().Throw<AssignmentNotFoundError>();
    }

    [Fact]
    public void RemoveCommunicationAssignment_ExistingAssignment_RemovesIt()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        stakeholder.RemoveCommunicationAssignment(communicationTypeId);

        stakeholder.CommunicationAssignments.Should().NotContain(a => a.CommunicationTypeId == communicationTypeId);
    }

    [Fact]
    public void RemoveCommunicationAssignment_NoExistingAssignment_IsIdempotent_DoesNotThrow()
    {
        var stakeholder = CreateStakeholder();

        var act = () => stakeholder.RemoveCommunicationAssignment(Guid.NewGuid());

        act.Should().NotThrow();
    }

    [Fact]
    public void AssignCommunication_AfterRemoveCommunicationAssignment_ForSameCommunicationType_IsAllowedAgain()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);
        stakeholder.RemoveCommunicationAssignment(communicationTypeId);

        var act = () => stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.AdHoc, CommunicationChannel.Report);

        act.Should().NotThrow();
    }

    // AC 4: frequency/channel akzeptieren ausschließlich Werte der Enums CommunicationFrequency/
    // CommunicationChannel aus US-002 — typsicher, keine Freitext-Strings möglich.
    [Theory]
    [InlineData(CommunicationFrequency.Weekly)]
    [InlineData(CommunicationFrequency.Monthly)]
    [InlineData(CommunicationFrequency.Quarterly)]
    [InlineData(CommunicationFrequency.AdHoc)]
    public void AssignCommunication_AcceptsAllCommunicationFrequencyValues(CommunicationFrequency frequency)
    {
        var stakeholder = CreateStakeholder();

        var act = () => stakeholder.AssignCommunication(Guid.NewGuid(), frequency, CommunicationChannel.Email);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(CommunicationChannel.Email)]
    [InlineData(CommunicationChannel.Meeting)]
    [InlineData(CommunicationChannel.Report)]
    public void AssignCommunication_AcceptsAllCommunicationChannelValues(CommunicationChannel channel)
    {
        var stakeholder = CreateStakeholder();

        var act = () => stakeholder.AssignCommunication(Guid.NewGuid(), CommunicationFrequency.Weekly, channel);

        act.Should().NotThrow();
    }
}
