namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn <see cref="Stakeholders.Stakeholder.UpdateCommunicationAssignment"/> für
/// eine Kommunikationsart aufgerufen wird, für die bei diesem Stakeholder keine
/// <c>StakeholderCommunicationAssignment</c> existiert (US-039) — analog zu
/// <see cref="MembershipNotFoundError"/> (US-011).
/// </summary>
public sealed class AssignmentNotFoundError : DomainException
{
    public AssignmentNotFoundError(Guid stakeholderId, Guid communicationTypeId)
        : base($"Für Stakeholder '{stakeholderId}' existiert für Kommunikationsart '{communicationTypeId}' keine Zuordnung.")
    {
        StakeholderId = stakeholderId;
        CommunicationTypeId = communicationTypeId;
    }

    public Guid StakeholderId { get; }

    public Guid CommunicationTypeId { get; }
}
