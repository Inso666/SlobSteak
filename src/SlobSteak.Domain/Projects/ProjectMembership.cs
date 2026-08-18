using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Entity, die einem Nutzer genau eine Rolle innerhalb eines Projekts zuordnet (Teil des
/// Aggregates <see cref="Project"/>, Bounded Context ProjectManagement), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>project_memberships</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Die Invariante "höchstens
/// eine Mitgliedschaft je (ProjectId, UserId)" wird hier nur als DB-Unique-Index durchgesetzt
/// (<c>ProjectMembershipConfiguration</c>). Die fachliche Übersetzung einer
/// Unique-Constraint-Verletzung in <c>MembershipAlreadyExistsError</c> sowie die Methoden
/// <c>Project.AssignMember</c>/<c>ChangeMemberRole</c>/<c>RemoveMember</c> werden erst in US-011
/// ergänzt — siehe <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
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
}
