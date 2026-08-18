namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn <see cref="Projects.Project.ChangeMemberRole"/> für einen Nutzer
/// aufgerufen wird, für den in diesem Projekt keine <c>ProjectMembership</c> existiert.
/// </summary>
public sealed class MembershipNotFoundError : DomainException
{
    public MembershipNotFoundError(Guid projectId, Guid userId)
        : base($"Für Nutzer '{userId}' existiert in Projekt '{projectId}' keine Mitgliedschaft.")
    {
        ProjectId = projectId;
        UserId = userId;
    }

    public Guid ProjectId { get; }

    public Guid UserId { get; }
}
