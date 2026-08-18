using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// n:m-Zuordnung zwischen einem <see cref="Stakeholder"/> und einer Kommunikationsart
/// (Bounded Context StakeholderCommunication, referenziert von Aggregate <see cref="Stakeholder"/>),
/// Felder gemäß PRD Abschnitt 4.1 (Entität <c>stakeholder_communication_assignments</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Die Invariante "höchstens
/// eine Zuordnung je (StakeholderId, CommunicationTypeId)" wird hier nur als DB-Unique-Index
/// durchgesetzt (<c>StakeholderCommunicationAssignmentConfiguration</c>). Die Methoden
/// <c>Stakeholder.AssignCommunication</c>/<c>UpdateCommunicationAssignment</c>/
/// <c>RemoveCommunicationAssignment</c> inkl. <c>AssignmentAlreadyExistsError</c> werden erst in
/// US-039 ergänzt — siehe <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
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
}
