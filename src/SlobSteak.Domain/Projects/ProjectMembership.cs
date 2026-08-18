using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Entity, die einem Nutzer genau eine Rolle innerhalb eines Projekts zuordnet (Teil des
/// Aggregates <see cref="Project"/>, Bounded Context ProjectManagement), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>project_memberships</c>).
/// </summary>
/// <remarks>
/// US-011: Erzeugung/Löschung dieser Entity erfolgt ausschließlich über die Methoden des
/// Aggregate Root <see cref="Project"/> (<c>AssignMember</c>/<c>ChangeMemberRole</c>/
/// <c>RemoveMember</c>) — die Invariante "höchstens eine Mitgliedschaft je (ProjectId, UserId)"
/// wird dort in-memory geprüft und zusätzlich über den DB-Unique-Index
/// (<c>ProjectMembershipConfiguration</c>) als zweite Verteidigungslinie erzwungen.
/// </remarks>
public sealed class ProjectMembership
{
    public ProjectMembership(Guid id, Guid projectId, Guid userId, ProjectRole role)
    {
        Id = id;
        ProjectId = projectId;
        UserId = userId;
        Role = role;
    }

    public Guid Id { get; private set; }

    public Guid ProjectId { get; private set; }

    public Guid UserId { get; private set; }

    public ProjectRole Role { get; private set; }

    /// <summary>Nur vom Aggregate Root <see cref="Project"/> (<see cref="Project.ChangeMemberRole"/>)
    /// aufzurufen — daher <c>internal</c> statt eines öffentlichen Setters.</summary>
    internal void UpdateRole(ProjectRole newRole) => Role = newRole;
}
