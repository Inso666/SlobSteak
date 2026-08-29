namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für einen Stakeholder und eine Kommunikationsart bereits eine
/// <c>StakeholderCommunicationAssignment</c> existiert und erneut über
/// <see cref="Stakeholders.Stakeholder.AssignCommunication"/> eine Zuordnung angelegt werden soll —
/// Frequenz/Kanal müssen stattdessen über
/// <see cref="Stakeholders.Stakeholder.UpdateCommunicationAssignment"/> geändert werden (US-039).
/// </summary>
public sealed class AssignmentAlreadyExistsError : DomainException
{
    public AssignmentAlreadyExistsError(Guid stakeholderId, Guid communicationTypeId)
        : base($"Für Stakeholder '{stakeholderId}' existiert für Kommunikationsart '{communicationTypeId}' bereits eine Zuordnung.")
    {
        StakeholderId = stakeholderId;
        CommunicationTypeId = communicationTypeId;
    }

    public Guid StakeholderId { get; }

    public Guid CommunicationTypeId { get; }
}
