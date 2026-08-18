namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für einen Nutzer in einem Projekt bereits eine <c>ProjectMembership</c>
/// existiert und erneut über <see cref="Projects.Project.AssignMember"/> eine Mitgliedschaft
/// angelegt werden soll — die Rolle muss stattdessen über
/// <see cref="Projects.Project.ChangeMemberRole"/> geändert werden (US-011).
/// </summary>
public sealed class MembershipAlreadyExistsError : DomainException
{
    public MembershipAlreadyExistsError(Guid projectId, Guid userId)
        : base($"Für Nutzer '{userId}' existiert in Projekt '{projectId}' bereits eine Mitgliedschaft.")
    {
        ProjectId = projectId;
        UserId = userId;
    }

    public Guid ProjectId { get; }

    public Guid UserId { get; }
}
