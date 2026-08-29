using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// n:m-Zuordnung zwischen einem <see cref="Stakeholder"/> und einer Kommunikationsart (Bounded
/// Context StakeholderCommunication), Felder gemäß PRD Abschnitt 4.1 (Entität
/// <c>stakeholder_communication_assignments</c>). Teil des Aggregates <see cref="Stakeholder"/>
/// (US-039) — anders als die Referenz auf <c>CommunicationType</c> (anderer Bounded Context,
/// reine ID-Fremdschlüssel-Referenz ohne EF-Navigation) ist dies eine Intra-Aggregate-Beziehung,
/// analog zu <see cref="Projects.ProjectMembership"/> (US-011, siehe ADR-0006).
/// </summary>
/// <remarks>
/// US-039: Erzeugung/Änderung/Löschung dieser Entity erfolgt ausschließlich über die Methoden des
/// Aggregate Root <see cref="Stakeholder"/> (<c>AssignCommunication</c>/
/// <c>UpdateCommunicationAssignment</c>/<c>RemoveCommunicationAssignment</c>) — die Invariante
/// "höchstens eine Zuordnung je (StakeholderId, CommunicationTypeId)" wird dort in-memory geprüft
/// und zusätzlich über den DB-Unique-Index (<c>StakeholderCommunicationAssignmentConfiguration</c>)
/// als zweite Verteidigungslinie erzwungen.
/// </remarks>
public sealed class StakeholderCommunicationAssignment
{
    public StakeholderCommunicationAssignment(
        Guid id,
        Guid stakeholderId,
        Guid communicationTypeId,
        CommunicationFrequency frequency,
        CommunicationChannel channel)
    {
        Id = id;
        StakeholderId = stakeholderId;
        CommunicationTypeId = communicationTypeId;
        Frequency = frequency;
        Channel = channel;
    }

    public Guid Id { get; private set; }

    public Guid StakeholderId { get; private set; }

    public Guid CommunicationTypeId { get; private set; }

    public CommunicationFrequency Frequency { get; private set; }

    public CommunicationChannel Channel { get; private set; }

    /// <summary>Nur vom Aggregate Root <see cref="Stakeholder"/> (<see cref="Stakeholder.UpdateCommunicationAssignment"/>)
    /// aufzurufen — daher <c>internal</c> statt eines öffentlichen Setters.</summary>
    internal void UpdateFrequencyAndChannel(CommunicationFrequency frequency, CommunicationChannel channel)
    {
        Frequency = frequency;
        Channel = channel;
    }
}
